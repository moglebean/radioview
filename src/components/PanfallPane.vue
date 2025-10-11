<template>
  <VueGridStackPane title="Goodbye World">
    <Panfall class="spectrum-container" :spectrum-frame="spectrumFrame" :waterfall-row="waterfallRow" :viewport="viewport"/>
  </VueGridStackPane>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import VueGridStackPane from './VueGridStackPane.vue'
import  Panfall  from '../panfallSpectrum/Panfall.vue'
import { makeMockSpectrum, makeMockWaterfallRow } from '../panfallSpectrum/mockGenerator'

const spectrumFrame = ref()
const waterfallRow = ref()
const viewport = ref({ centerHz: 50e6, spanHz: 100e6, dbMin: -120, dbMax: 0 })

setInterval(() => {
  spectrumFrame.value = makeMockSpectrum()
  waterfallRow.value = makeMockWaterfallRow()
}, 50)

</script>

<style scoped>
.hello-pane {
  display: flex;
  flex-direction: column;
}

.hello-pane__body {
  margin: 0;
  color: rgba(0, 0, 0, 0.7);
}

.spectrum-container {
  width: 100%;
  height: 1800px; /* or whatever height you want */
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
}
</style>
