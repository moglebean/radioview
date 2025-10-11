<template>
  <VueGridStackPane title="Phantom Spectrum">
    <PhantomSpectrum
      class="spectrum-container"
      :settings="settings"
      :buffer="buffer"
    />
  </VueGridStackPane>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import VueGridStackPane from './VueGridStackPane.vue'
import PhantomSpectrum from './PhantomSpectrum.vue'

const FFT_LENGTH = 1024

const settings = ref({
  fft_size: FFT_LENGTH,
  fft_result_size: FFT_LENGTH,
  basefreq: 0,
  sps: 1,
  total_bandwidth: 1,
  overlap: 0,
  waterfall_size: FFT_LENGTH
})

const buffer = ref(null)

const makeRandomFrame = () => {
  const data = new Int8Array(FFT_LENGTH)
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.floor(Math.random() * 256) - 128
  }
  return {
    data,
    l: 0,
    r: FFT_LENGTH
  }
}

const intervalHandle = setInterval(() => {
  buffer.value = makeRandomFrame()
  console.log('frame')
}, 250)

onBeforeUnmount(() => {
  clearInterval(intervalHandle)
})
</script>

<style scoped>
.phantom-spectrum-pane {
  display: flex;
  flex-direction: column;
}

.spectrum-container {
  width: 100%;
  height: 600px;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
  background: #000;
}
</style>
