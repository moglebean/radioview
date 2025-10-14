<template>
  <VueGridStackPane title="Goodbye World">

      <SigplotSpectrogram
        class="spectrogram-pane"
        ref="spectrogram"
        color-axis-mode="manual"
        :color-axis-min="-120.0"
        :color-axis-max="-80.0"
        colormap="Greyscale"
        :frequency-bin-spacing="100e6/2048"
        :frequency-offset="25e6"
        draw-mode="falling"
        draw-direction="vertical"
        compression="max"
        :disable-default-click-behavior="true"
        @mousedown="handleMouseDown"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @contextmenu="handleContextMenu"
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

const logEvent = (label, payload) => {
  // eslint-disable-next-line no-console
  console.log(`[Spectrogram] ${label}`, {
    pixel: payload?.pixel,
    sigplot: payload?.sigplot,
    button: payload?.button,
    buttons: payload?.buttons,
    ctrlKey: payload?.ctrlKey,
    altKey: payload?.altKey,
    metaKey: payload?.metaKey,
    shiftKey: payload?.shiftKey,
  });
};

const resetSpectrogram = () => {
  spectrogram.value?.reset();
};

const handleMouseDown = (event) => {
  if (event?.button === 0 && event?.ctrlKey) {
    logEvent('Ctrl+Left click', event);
  } else if (event?.button === 0) {
    logEvent('Left click', event);
  }
};

const handleContextMenu = (event) => {
  if (event?.button === 2) {
    logEvent('Right click', event);
  }
};

const handleMouseMove = (event) => {
  console.log('Mouse move:', event.sigplot.x,event.sigplot.y,event.sigplot.z);
};

const handleMouseEnter = (event) => {
  logEvent('Mouse over', event);
};

const handleMouseLeave = (event) => {
  logEvent('Mouse out', event);
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
