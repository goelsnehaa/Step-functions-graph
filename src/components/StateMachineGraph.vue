<template>
  <div>
    <h1>Step Function Execution Visualization</h1>
    <div v-if="loading">Loading diagram...</div>
    <div ref="mermaidChart" class="mermaid" v-html="diagramText" v-else></div>
  </div>
</template>

<script>
import mermaid from "mermaid";
import axios from "axios";

export default {
  data() {
    return {
      stateData: {
        states: [],
        transitions: [],
      },
      diagramText: "",
      loading: true,
    };
  },
  computed: {
    generateMermaidDiagram() {
      let diagram = "stateDiagram-v2\n";

      // Generate nodes
      this.stateData.states.forEach((state) => {
        diagram += `${state.id}: ${state.label}\n`;
      });

      // Generate transitions
      this.stateData.transitions.forEach((transition) => {
        if (transition?.condition != null) {
          diagram += `${transition.from} --> ${transition.to}: ${transition.condition}\n`;
        } else {
          diagram += `${transition.from} --> ${transition.to}\n`;
        }
      });

      // Add classes for states
      this.stateData.states.forEach((state) => {
        diagram += `class ${state.id} ${state.status}\n`;
      });

      // Define class styles
      diagram += "classDef success fill:#2bd62e\n";
      diagram += "classDef failure fill:#f44336\n";
      diagram += "classDef normal fill:#ffda75\n";
      diagram += "classDef in_progress fill:#ffeb3b\n";
      diagram += "classDef not_started fill:white\n";
      diagram += "classDef caught_error fill:#ffa500\n";
      return diagram;
    },
  },
  methods: {
    async renderDiagram() {
      try {
        this.diagramText = this.generateMermaidDiagram;

        this.initializeMermaid();

        this.loading = false;
      } catch (error) {
        console.error("Mermaid error:", error);
      }
    },
    async fetchStateData() {
      const res = await axios.get("http://localhost:3000/state-machine");
      this.stateData = { ...res.data.stateData };

      await this.renderDiagram();
    },
    initializeMermaid() {
      mermaid.initialize({ startOnLoad: false });
    },
    async runMermaid() {
      await mermaid.run({
        querySelector: ".mermaid",
      });
    },
  },
  async beforeMount() {
    await this.fetchStateData();
  },
  async updated() {
    this.$nextTick(async () => {
      await this.runMermaid();
    });
  },
  watch: {
    diagramText: {
      handler() {
        this.renderDiagram();
      },
    },
  },
};
</script>

<style scoped>
.mermaid {
  text-align: center;
  margin: 20px;
  font-family: Arial, sans-serif;
}
</style>
