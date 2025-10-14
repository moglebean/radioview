<template>
  <div ref="plotContainer" class="sigplot-container"></div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import sigplot from "sigplot";
import { useTheme } from "vuetify";

const props = defineProps({
  colorAxisMode: {
    type: String,
    default: "auto",
    validator: (value) => ["auto", "manual"].includes(value),
  },
  compression: {
    type: String,
    default: "max",
    validator: (value) =>
      ["decimate", "avg", "min", "max", "maxabs"].includes(value),
  },
  colorAxisMin: {
    type: Number,
    default: null,
  },
  colorAxisMax: {
    type: Number,
    default: null,
  },
  colormap: {
    type: String,
    default: "Greyscale",
    validator: (value) =>
      value == null ||
      ["Greyscale","Ramp Colormap","Color Wheel","Spectrum","calewhite","HotDesat","Sunset","Hot","Cold","Purple","BuGn","YlOrBl","YlGnBl","YlOrRed","GreyNRed"].includes(value),
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
  drawMode: {
    type: String,
    default: "scrolling",
    validator: (value) => ["scrolling", "rising", "falling"].includes(value),
  },
  drawDirection: {
    type: String,
    default: "vertical",
    validator: (value) => ["horizontal", "vertical"].includes(value),
  },
  plotBackgroundColor: {
    type: String,
    default: null,
  },
  plotForegroundColor: {
    type: String,
    default: null,
  },
});

const plotContainer = ref(null);
let plot = null;
let rasterLayer = null;
const theme = useTheme();

const DEFAULT_COMPRESSION = "max";
const DEFAULT_SUBSIZE = 1;
const DEFAULT_BYTES_PER_ELEMENT = 8;

let currentSubsize = null;
let currentBytesPerElement = DEFAULT_BYTES_PER_ELEMENT;
let lastDrawMode = null;
let lastDrawDirection = null;
let lastInvalidComboKey = null;
let lastColormapSelection = undefined;

const resolveThemeColor = (key, fallback) => {
  const colors = theme.current.value.colors ?? {};
  console.log("colors", colors);
  return colors[key] ?? fallback;
};

const resolvedBackgroundColor = computed(
  () => props.plotBackgroundColor ?? resolveThemeColor("surface", "#051116"),
);

const resolvedForegroundColor = computed(
  () =>
    props.plotForegroundColor ??
    resolveThemeColor("on-background", resolveThemeColor("on-surface", "#000")),
);

const BASE_PLOT_OPTIONS = {
  autol: 10,
  font_family: "Montserrat",
  font_width: 12,
  autohide_panbars: true,
  autohide_readout: true,
  noreadout: true,
  hide_note: true,
  xlabel: null,
  ylabel: null,
  nospecs: false,
  nopan: true,
  nomenu: true,
  no_legend_button: true,
  nodragdrop: true,
  autoz: 0,
  zmin: -120,
  zmax: -80
};

const COMPRESSION_TO_XCMP = {
  decimate: "smooth",
  avg: "avg",
  min: "min",
  max: "max",
  maxabs: "maxabs",
};

const resolveXcmp = () =>
  COMPRESSION_TO_XCMP[props.compression] ??
  COMPRESSION_TO_XCMP[DEFAULT_COMPRESSION];

const getColormapIndex = (name) => {
  if (typeof name !== "string") {
    return null;
  }

  const colormaps = sigplot?.m?.Mc?.colormap;
  if (!Array.isArray(colormaps)) {
    return null;
  }

  const index = colormaps.findIndex((entry) => entry?.name === name);
  return index >= 0 ? index : null;
};

const applyColormap = () => {
  if (!plot) {
    return;
  }

  const desiredSelection = props.colormap ?? null;
  if (desiredSelection === lastColormapSelection) {
    return;
  }

  if (desiredSelection === null) {
    plot.change_settings({ cmap: null });
    lastColormapSelection = null;
    return;
  }

  const index = getColormapIndex(desiredSelection);
  if (index === null) {
    // eslint-disable-next-line no-console
    console.warn(
      `[SigplotSpectrogram] Unknown colormap "${desiredSelection}". Falling back to default.`,
    );
    plot.change_settings({ cmap: null });
    lastColormapSelection = null;
    return;
  }

  plot.change_settings({ cmap: index });
  lastColormapSelection = desiredSelection;
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

const getEffectiveDrawSettings = () => {
  const drawdirection =
    typeof props.drawDirection === "string" ? props.drawDirection : "vertical";
  const requestedDrawMode =
    typeof props.drawMode === "string" ? props.drawMode : "scrolling";
  const invalidCombo =
    drawdirection === "horizontal" && requestedDrawMode !== "scrolling";

  return {
    drawmode: invalidCombo ? "scrolling" : requestedDrawMode,
    drawdirection,
    invalidCombo,
    requestedDrawMode,
  };
};

const warnInvalidCombination = (invalidCombo, requestedDrawMode, drawdirection) => {
  if (!invalidCombo) {
    lastInvalidComboKey = null;
    return;
  }

  const key = `${requestedDrawMode}-${drawdirection}`;
  if (lastInvalidComboKey !== key) {
    // eslint-disable-next-line no-console
    console.warn(
      `[SigplotSpectrogram] drawMode "${requestedDrawMode}" is not supported with drawDirection "${drawdirection}". Falling back to "scrolling".`,
    );
    lastInvalidComboKey = key;
  }
};

const applyDrawSettings = () => {
  if (!plot) {
    return;
  }

  const {
    drawmode,
    drawdirection,
    invalidCombo,
    requestedDrawMode,
  } = getEffectiveDrawSettings();

  warnInvalidCombination(invalidCombo, requestedDrawMode, drawdirection);

  if (drawmode === lastDrawMode && drawdirection === lastDrawDirection) {
    return;
  }
  lastDrawMode = drawmode;
  lastDrawDirection = drawdirection;

  plot.change_settings({
    drawmode,
    drawdirection,
  });
};

const buildPipeOverrides = (subsize, bytesPerElement) => ({
  type: 2000,
  subsize,
  xdelta: props.frequencyBinSpacing,
  xstart: props.frequencyOffset,
  pipesize: subsize * bytesPerElement,
});

const applyAxisSettings = (effectiveSubsize) => {
  if (!plot) {
    return;
  }

  const Gx = plot._Gx ?? {};
  const { drawdirection } = getEffectiveDrawSettings();
  const resolvedSubsize =
    Number.isFinite(effectiveSubsize) && effectiveSubsize > 0
      ? effectiveSubsize
      : currentSubsize ?? DEFAULT_SUBSIZE;

  const min = props.frequencyOffset;
  const max = props.frequencyOffset + props.frequencyBinSpacing * resolvedSubsize;

  const settings = {};
  if (drawdirection === "horizontal") {
    if (Gx.ymin !== min || Gx.ymax !== max) {
      settings.ymin = min;
      settings.ymax = max;
    }
  } else {
    if (Gx.xmin !== min || Gx.xmax !== max) {
      settings.xmin = min;
      settings.xmax = max;
    }
  }

  if (Object.keys(settings).length > 0) {
    plot.change_settings(settings);
  }
};

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

  const {
    drawmode,
    drawdirection,
    invalidCombo,
    requestedDrawMode,
  } = getEffectiveDrawSettings();

  warnInvalidCombination(invalidCombo, requestedDrawMode, drawdirection);

  currentSubsize = effectiveSubsize;
  currentBytesPerElement = effectiveBytesPerElement;
  lastDrawMode = drawmode;
  lastDrawDirection = drawdirection;

  // Recreate the raster layer using overlay_pipe API (per SpectricLabs example)
  rasterLayer = plot.overlay_pipe(
    buildPipeOverrides(effectiveSubsize, effectiveBytesPerElement),
    {
      drawmode,
      drawdirection,
      xcmp: resolveXcmp(),
    },
  );
  applyColorAxis();
  applyColorbarVisibility();
  applyAxisSettings(effectiveSubsize);
  applyColormap();

  console.log(
    `Created raster layer with subsize=${effectiveSubsize}, bytesPerElement=${effectiveBytesPerElement}, drawmode=${drawmode}, drawdirection=${drawdirection}, spacing=${props.frequencyBinSpacing}, offset=${props.frequencyOffset}`,
  );
};

const applyPlotColors = () => {
  if (!plot) {
    return;
  }

  plot.change_settings({
    colors: {
      bg: resolvedBackgroundColor.value,
      fg: resolvedForegroundColor.value,
    },
  });
};

onMounted(() => {
  if (!plotContainer.value) {
    return;
  }

  // Create the SigPlot instance
  plot = new sigplot.Plot(plotContainer.value, {
    ...BASE_PLOT_OPTIONS,
    colors: {
      bg: resolvedBackgroundColor.value,
      fg: resolvedForegroundColor.value,
    },
  });

  createRasterLayer();
  applyPlotColors();
  applyColormap();
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
  () => props.colormap,
  () => {
    applyColormap();
  },
);

watch(
  () => [resolvedBackgroundColor.value, resolvedForegroundColor.value],
  () => {
    applyPlotColors();
  },
);

watch(
  () => props.drawMode,
  () => {
    applyDrawSettings();
    applyAxisSettings();
  },
);

watch(
  () => props.drawDirection,
  () => {
    if (plot) {
      createRasterLayer(
        currentSubsize ?? DEFAULT_SUBSIZE,
        currentBytesPerElement,
      );
    }
  },
);

watch(
  () => props.compression,
  () => {
    if (plot) {
      createRasterLayer(
        currentSubsize ?? DEFAULT_SUBSIZE,
        currentBytesPerElement,
      );
    }
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
  /* border: 1px solid #ccc; */
}
</style>
