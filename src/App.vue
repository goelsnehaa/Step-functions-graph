<template>
  <StateMachineGraph/>
</template>

<script>
import StateMachineGraph from './components/StateMachineGraph.vue'

export default {
  name: 'App',
  components: {
    StateMachineGraph
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
