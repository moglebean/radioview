<template>
  <VueGridStackPane title="Goodbye World">
    <div class="spectrogram-pane">
      <SigplotSpectrogram ref="spectrogram" />
    </div>
  </VueGridStackPane>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import VueGridStackPane from './VueGridStackPane.vue';
import SigplotSpectrogram from './SigplotSpectrogram.vue';

const spectrogram = ref(null);
let intervalId = null;
onMounted(() => {
  // Push new random data at 10 Hz
  intervalId = setInterval(() => {
    const frameSize = 512;
    const data = new Float32Array(frameSize).map(() => Math.random() * 2 - 1);
    spectrogram.value?.pushData(data);
  }, 100); // 10 times per second (100ms)
});
onBeforeUnmount(() => {
  clearInterval(intervalId);
});

</script>

<style scoped>
.spectrogram-pane {
  width: 100%;
  height: 100%;
}
</style>
