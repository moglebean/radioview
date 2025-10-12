<template>
  <div ref="plotContainer" class="sigplot-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import sigplot from "sigplot";

const plotContainer = ref(null);
let plot = null;
let rasterLayer = null;

const FS = 44100;
const FFTSIZE = 2048;
const XDELTA = FS / FFTSIZE;

const PLOT_OPTIONS = {
  autol: 3,
  colors: {
    bg: "#051116",
    fg: "#FFF",
  },
  font_family: "Montserrat",
  font_width: 12,
  autohide_panbars: true,
  autohide_readout: true,
  no_legend_button: true,
  nodragdrop: true,
  cmode: "LO",
};

const PIPE_OVERRIDES = {
  type: 2000, // raster layer type
  format: "CF",
  subsize: FFTSIZE / 2,
  xdelta: XDELTA,
  pipesize: (FFTSIZE / 2) * 8,
  xunits: 3,
};

const createRasterLayer = () => {
  if (!plot) {
    return;
  }

  if (rasterLayer !== null) {
    plot.remove_layer(rasterLayer);
    rasterLayer = null;
  }

  // Recreate the raster layer using overlay_pipe API (per SpectricLabs example)
  rasterLayer = plot.overlay_pipe({ ...PIPE_OVERRIDES });
};

onMounted(() => {
  if (!plotContainer.value) {
    return;
  }

  // Create the SigPlot instance
  plot = new sigplot.Plot(plotContainer.value, PLOT_OPTIONS);

  createRasterLayer();
});

onBeforeUnmount(() => {
  if (plot && rasterLayer !== null) {
    plot.remove_layer(rasterLayer);
  }
  plot = null;
  rasterLayer = null;
});

defineExpose({
  pushData(frame) {
    if (plot && rasterLayer != null) {
      plot.push(rasterLayer, frame);
    }
  },
  reset() {
    createRasterLayer();
  },
});
</script>

<style scoped>
.sigplot-container {
  width: 100%;
  height: 400px;
  border: 1px solid #ccc;
}
</style>
