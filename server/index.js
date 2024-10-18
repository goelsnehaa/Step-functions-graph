const express = require('express');
const app = express();
const { SFNClient, DescribeStateMachineCommand, GetExecutionHistoryCommand } = require("@aws-sdk/client-sfn");
const cors = require('cors')

app.use(cors())

app.use(express.json());
const client = new SFNClient({ region: "us-west-2" });
  
  app.get('/state-machine', async (req, res) => {
    const stateMachineArn = "arn:aws:states:us-west-2:180294203358:stateMachine:PDF-EPUB-conversion-state-machine"
    try {
        // Create command to describe the state machine
        const stateMachineCommand = new DescribeStateMachineCommand({ stateMachineArn });
        
        // Send command and retrieve response
        let response = await client.send(stateMachineCommand);

        const stateDefinition = JSON.parse(response.definition)

        const stateMachine = processStateDefinition(stateDefinition.States)
        // console.log("State Machine States:", stateMachine);
          
        // success execution arm
        const executionArn = "arn:aws:states:us-west-2:180294203358:execution:PDF-EPUB-conversion-state-machine:0476b12a-90e0-2071-6a2d-b0400a7c086b_46cacfd5-d009-8993-6ae8-4bfe8c1baf5f"
        // failure execution arm
        // const executionArn = "arn:aws:states:us-west-2:180294203358:execution:PDF-EPUB-conversion-state-machine:7da934ad-cb15-70f5-228d-7a2d88465a34_93a7f12f-d4d5-90b1-2770-d18fccaf64e5"
        
        const params = {
            executionArn: executionArn,
            maxResults: 1000
        };

        const executionHistoryCommand = new GetExecutionHistoryCommand(params);
        const data = await client.send(executionHistoryCommand);

        const events = processExecutionHistory(data.events, stateMachine)
        // console.log("Execution history events:", events);
        
        res.json(events);
      } catch (err) {
        console.error("Error fetching execution history", err);
      }
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

function processStateDefinition(stateDefinition) {
    const states = [{id: "Start", label: "Start", status: "not_started"}]
    const transitions = []

    for(const [key, value] of Object.entries(stateDefinition)) {
        states.push({
            id: toCamelCase(key),
            label: key,
            status: "not_started"
        })

        if(!transitions.length) {
            transitions.push({from: "Start", to: toCamelCase(key)})
        } 
        
        if(value.Type == 'Choice') {
            for(let Choice of value.Choices) {
                transitions.push({
                    from: toCamelCase(key),
                    to: toCamelCase(Choice.Next),
                    condition: Choice.BooleanEquals
                })
            }
        } else {
            if(key == "EndProcessing" || key == "Handle Error" || key == "End Process") {
                transitions.push({from: toCamelCase(key), to: "End"})
            }else {
                transitions.push({
                    from: toCamelCase(key),
                    to: toCamelCase(value.Next)
                })
                
                if(value?.Catch) {
                    transitions.push({
                        from: toCamelCase(key),
                        to: toCamelCase(value?.Catch[0].Next)
                    })
                }
            }
        }
    }

    states.push({
        id: "End",
        label: "End",
        status: "not_started"
    })

    return {
        stateData: {
            states,
            transitions
        }
    }
}

function toCamelCase(input) {
    return input
        .split(' ') // Split the string by spaces
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize the first letter of each word
        .join(''); // Join the words back together without spaces
}

function updateStateStatus(stateMachine, targetId, newStatus) {
    const state = stateMachine.stateData.states.find(state => state.id === targetId);
    if (state) {
        state.status = newStatus;
    }
    return stateMachine
}

function processExecutionHistory(events, stateMachine) {      
    let prevEventId = null;
      events.forEach((event) => {
          if (event.type === "ExecutionStarted") {
                stateMachine = updateStateStatus(stateMachine, "Start", "normal")
            }
            
        else if (event.type === "TaskStateEntered" || event.type === "ChoiceStateEntered" || event.type === "SucceedStateEntered") {
            let id = toCamelCase(event.stateEnteredEventDetails.name)
            stateMachine = updateStateStatus(stateMachine, id, "in_progress")
            prevEventId = id;
        }
        else if (event.type === "TaskStateExited" || event.type === "ChoiceStateExited" || event.type === "SucceedStateExited") {
            let id = toCamelCase(event.stateExitedEventDetails.name)
            let status = JSON.parse(event.stateExitedEventDetails.output).errorInfo
            ? "caught_error"
            : "success";
            stateMachine = updateStateStatus(stateMachine, id, status)
            prevEventId = id;
        }
        else if (event.type === "FailStateEntered") {
            prevEventId = toCamelCase(event.stateEnteredEventDetails.name);
        }
        else if(event.type === "ExecutionFailed") {
            stateMachine = updateStateStatus(stateMachine, prevEventId, "failure")
        }
        else if (
            event.type === "ExecutionSucceeded") {
            stateMachine = updateStateStatus(stateMachine, "End", "normal")
        }
      });

    return stateMachine
}