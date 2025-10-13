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
  frequencyBinSpacing: {
    type: Number,
    default: 100e6 / 2048,
  },
  frequencyOffset: {
    type: Number,
    default: 0,
  },
});

const plotContainer = ref(null);
let plot = null;
let rasterLayer = null;

const DEFAULT_SUBSIZE = 1;
const DEFAULT_BYTES_PER_ELEMENT = 8;

let currentSubsize = null;
let currentBytesPerElement = DEFAULT_BYTES_PER_ELEMENT;

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

const buildPipeOverrides = (subsize, bytesPerElement) => ({
  type: 2000,
  subsize,
  xdelta: props.frequencyBinSpacing,
  xstart: props.frequencyOffset,
  pipesize: subsize * bytesPerElement,
});

const createRasterLayer = (
  requestedSubsize = DEFAULT_SUBSIZE,
  requestedBytesPerElement = DEFAULT_BYTES_PER_ELEMENT,
) => {
  if (!plot) {
    return;
  }

  if (rasterLayer !== null) {
    plot.remove_layer(rasterLayer);
    rasterLayer = null;
  }

  const effectiveSubsize =
    Number.isFinite(requestedSubsize) && requestedSubsize > 0
      ? requestedSubsize
      : DEFAULT_SUBSIZE;
  const effectiveBytesPerElement =
    Number.isFinite(requestedBytesPerElement) && requestedBytesPerElement > 0
      ? requestedBytesPerElement
      : DEFAULT_BYTES_PER_ELEMENT;

  currentSubsize = effectiveSubsize;
  currentBytesPerElement = effectiveBytesPerElement;

  // Recreate the raster layer using overlay_pipe API (per SpectricLabs example)
  rasterLayer = plot.overlay_pipe(
    buildPipeOverrides(effectiveSubsize, effectiveBytesPerElement),
  );
  const xmin = props.frequencyOffset;
  const xmax =
    props.frequencyOffset + props.frequencyBinSpacing * effectiveSubsize;
  plot.change_settings({
    xmin,
    xmax,
  });
  applyColorAxis();
  applyColorbarVisibility();


  console.log(
    `Created raster layer with subsize=${effectiveSubsize}, bytesPerElement=${effectiveBytesPerElement}, xmin=${xmin}, xmax=${xmax} spacing=${props.frequencyBinSpacing}, offset=${props.frequencyOffset}`,)
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
    if (!plot) {
      return;
    }

    const subsize =
      typeof frame?.length === "number" && frame.length > 0 ? frame.length : null;
    const bytesPerElement =
      typeof frame?.BYTES_PER_ELEMENT === "number"
        ? frame.BYTES_PER_ELEMENT
        : DEFAULT_BYTES_PER_ELEMENT;

    if (
      subsize &&
      (rasterLayer === null ||
        currentSubsize !== subsize ||
        currentBytesPerElement !== bytesPerElement)
    ) {
      createRasterLayer(subsize, bytesPerElement);
    } else if (rasterLayer === null) {
      createRasterLayer();
    }

    if (rasterLayer !== null) {
      plot.push(rasterLayer, frame);
    }
  },
  reset() {
    if (!plot) {
      return;
    }

    if (rasterLayer !== null) {
      createRasterLayer(
        currentSubsize ?? DEFAULT_SUBSIZE,
        currentBytesPerElement,
      );
    } else {
      createRasterLayer();
    }
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

watch(
  () => [props.frequencyBinSpacing, props.frequencyOffset],
  () => {
    if (plot && rasterLayer !== null) {
      createRasterLayer(
        currentSubsize ?? DEFAULT_SUBSIZE,
        currentBytesPerElement,
      );
    }
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
