<template>
  <div ref="plotContainer" class="sigplot-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import sigplot from "sigplot";

const props = defineProps({
  colorAxisMode: {
    type: String,
    default: "auto",
    validator: (value) => ["auto", "manual"].includes(value),
  },
  colorAxisMin: {
    type: Number,
    default: null,
  },
  colorAxisMax: {
    type: Number,
    default: null,
  },
  showColorbar: {
    type: Boolean,
    default: false,
  },
});

const plotContainer = ref(null);
let plot = null;
let rasterLayer = null;

const FS = 44100;
const FFTSIZE = 2048;
const XDELTA = FS / FFTSIZE;

const PLOT_OPTIONS = {
  autol: 10,
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
  autoz: 0,
  zmin: -120,
  zmax: -80
};




const PIPE_OVERRIDES = {
  // drawmode: "scrolling",
  type: 2000, // raster layer type
  // format: "SF",
  subsize: FFTSIZE,
  xdelta: XDELTA,
  pipesize: (FFTSIZE) * 8,
  // xunits: 3,
};

const applyColorAxis = () => {
  if (!plot) {
    return;
  }

  const settings = {};

  if (props.colorAxisMode === "manual") {
    settings.autoz = 0;
    if (props.colorAxisMin != null) {
      settings.zmin = props.colorAxisMin;
    }
    if (props.colorAxisMax != null) {
      settings.zmax = props.colorAxisMax;
    }
  } else {
    settings.autoz = 3;
  }
  console.log(settings)
  plot.change_settings(settings);
};

const applyColorbarVisibility = () => {
  if (!plot) {
    return;
  }

  const current = plot._Gx?.lg_colorbar ?? false;
  if (props.showColorbar !== current) {
    plot.change_settings({ lg_colorbar: true });
  }
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
  applyColorAxis();
  applyColorbarVisibility();
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

watch(
  () => [props.colorAxisMode, props.colorAxisMin, props.colorAxisMax],
  () => {
    applyColorAxis();
  },
);

watch(
  () => props.showColorbar,
  () => {
    applyColorbarVisibility();
  },
);
</script>

<style scoped>
.sigplot-container {
  width: 100%;
  height: 400px;
  border: 1px solid #ccc;
}
</style>
