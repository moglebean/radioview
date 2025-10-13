<template>
  <VueGridStackPane title="Goodbye World">

      <SigplotSpectrogram
        class="spectrogram-pane"
        ref="spectrogram"
        color-axis-mode="manual"
        :color-axis-min="-120.0"
        :color-axis-max="-80.0"
        :frequency-bin-spacing="100e6/2048"
        :frequency-offset="25e6"
        draw-mode="falling"
        draw-direction="vertical"
        compression="max"
      />

    <template #actions>
      <v-btn block class="bg-primary" @click="resetSpectrogram">
        Reset
      </v-btn>
    </template>


</VueGridStackPane>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import VueGridStackPane from './VueGridStackPane.vue';
import SigplotSpectrogram from './SigplotSpectrogram.vue';

const props = defineProps({
  
});

const FRAME_SIZE = 2048;

const spectrogram = ref(null);
let intervalId = null;

const resetSpectrogram = () => {
  spectrogram.value?.reset();
};

onMounted(() => {
  // Push new random data at 10 Hz
  intervalId = setInterval(() => {
    const data = new Float32Array(FRAME_SIZE).map(
      () => Math.random() * 10.0 - 100.0,
    );
    data[1022] = -50;
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
