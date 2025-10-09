<template>
  <VueGridStackPane title="Goodbye World">
    <Panfall :spectrum-frame="spectrumFrame" :waterfall-row="waterfallRow" :viewport="viewport"/>

    <div class="hello-pane">
      <p class="hello-pane__body">
        This is a sample pane. Use the drag handle to move it and resize the panel corners to explore the workspace layout.
        Now is the time for all good men to come to the aid of their country.
        The quick brown fox jumps over the lazy dog.
        Friends, romans, countrymen, lend me your ears.  I come to bury Caesar, not to praise him.
        This is a sample pane. Use the drag handle to move it and resize the panel corners to explore the workspace layout.
        Now is the time for all good men to come to the aid of their country.
        The quick brown fox jumps over the lazy dog.
        Friends, romans, countrymen, lend me your ears.  I come to bury Caesar, not to praise him.
      </p>
    </div>
      

    <!-- Add the button to the actions slot-->
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
</style>
