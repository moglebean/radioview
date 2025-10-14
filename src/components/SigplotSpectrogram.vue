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

const emit = defineEmits([
  "mousedown",
  "mousemove",
  "mouseup",
  "click",
  "dblclick",
  "mouseenter",
  "mouseleave",
  "wheel",
  "zoom",
  "unzoom",
]);

const plotContainer = ref(null);
let plot = null;
let rasterLayer = null;
const theme = useTheme();

const plotEventListeners = [];
const domEventListeners = [];
let pointerInsidePlotArea = false;
let lastMousePayload = null;
const wheelListenerOptions = { passive: false };

const DEFAULT_COMPRESSION = "max";
const DEFAULT_SUBSIZE = 1;
const DEFAULT_BYTES_PER_ELEMENT = 8;

let currentSubsize = null;
let currentBytesPerElement = DEFAULT_BYTES_PER_ELEMENT;
let lastDrawMode = null;
let lastDrawDirection = null;
let lastInvalidComboKey = null;
let lastColormapSelection = undefined;

const getRasterLayer = () => {
  if (!plot || rasterLayer === null) {
    return null;
  }
  try {
    return plot.get_layer(rasterLayer);
  } catch (error) {
    return null;
  }
};

const getPlotMetrics = () => (plot ? plot._Mx ?? null : null);

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const isPixelWithinPlotArea = (x, y) => {
  const metrics = getPlotMetrics();
  if (!metrics || !isFiniteNumber(x) || !isFiniteNumber(y)) {
    return false;
  }

  return (
    x >= metrics.l &&
    x <= metrics.r &&
    y >= metrics.t &&
    y <= metrics.b
  );
};

const isEventInsidePlot = (event) => {
  const metrics = getPlotMetrics();
  if (!metrics) {
    return false;
  }

  const originalEvent = event?.originalEvent ?? event ?? null;
  const candidates = [];

  if (isFiniteNumber(event?.xpos) && isFiniteNumber(event?.ypos)) {
    candidates.push({ x: event.xpos, y: event.ypos });
  }

  if (metrics.canvas && originalEvent) {
    const rect = metrics.canvas.getBoundingClientRect();
    const x = originalEvent.clientX - rect.left;
    const y = originalEvent.clientY - rect.top;
    if (isFiniteNumber(x) && isFiniteNumber(y)) {
      candidates.push({ x, y });
    }
  }

  return candidates.some(({ x, y }) => isPixelWithinPlotArea(x, y));
};

const resolveZValue = (x, y) => {
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
    return null;
  }

  const layer = getRasterLayer();
  if (!layer) {
    return null;
  }

  if (typeof layer.get_z === "function") {
    try {
      const z = layer.get_z(x, y);
      if (isFiniteNumber(z)) {
        return z;
      }
    } catch (error) {
      // Layer may not support direct get_z for provided coordinates
    }
  }

  const hcb = layer.hcb ?? {};
  const xdelta = isFiniteNumber(hcb.xdelta) ? hcb.xdelta : layer.xdelta;
  const ydelta = isFiniteNumber(hcb.ydelta) ? hcb.ydelta : layer.ydelta;
  const xstart = isFiniteNumber(hcb.xstart) ? hcb.xstart : layer.xstart ?? 0;
  const ystart = isFiniteNumber(hcb.ystart) ? hcb.ystart : layer.ystart ?? 0;
  const subsize = Number.isInteger(hcb.subsize) ? hcb.subsize : layer?.hcb?.subsize;
  const zbuf = layer.zbuf;

  if (
    !isFiniteNumber(xdelta) ||
    xdelta === 0 ||
    !isFiniteNumber(ydelta) ||
    ydelta === 0 ||
    !Number.isInteger(subsize) ||
    subsize <= 0 ||
    (!Array.isArray(zbuf) &&
      !(zbuf instanceof Float32Array) &&
      !(zbuf instanceof Float64Array))
  ) {
    return null;
  }

  const xIndex = Math.floor((x - xstart) / xdelta);
  const yIndex = Math.floor((y - ystart) / ydelta);
  const width = subsize;

  if (xIndex < 0 || xIndex >= width || yIndex < 0) {
    return null;
  }

  const height = width > 0 ? Math.floor(zbuf.length / width) : 0;
  if (height > 0 && yIndex >= height) {
    return null;
  }

  const dataIndex = yIndex * width + xIndex;
  const value = zbuf[dataIndex];
  return isFiniteNumber(value) ? value : null;
};

const mapWhichToButton = (which) => {
  switch (which) {
    case 1:
      return 0;
    case 2:
      return 1;
    case 3:
      return 2;
    default:
      return null;
  }
};

const resolvePixelPosition = (event) => {
  const metrics = getPlotMetrics();
  const canvas = metrics?.canvas;
  const originalEvent = event?.originalEvent ?? event ?? null;
  const candidates = [];

  if (isFiniteNumber(event?.xpos) && isFiniteNumber(event?.ypos)) {
    candidates.push({ x: event.xpos, y: event.ypos });
  }

  if (canvas && originalEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = originalEvent.clientX - rect.left;
    const y = originalEvent.clientY - rect.top;
    if (isFiniteNumber(x) && isFiniteNumber(y)) {
      candidates.push({ x, y });
    }
  }

  if (candidates.length === 0) {
    return { x: null, y: null };
  }

  const inside = candidates.find(({ x, y }) => isPixelWithinPlotArea(x, y));
  if (inside) {
    return inside;
  }

  return candidates[0];
};

const buildMousePayload = (event, type) => {
  const originalEvent = event?.originalEvent ?? event ?? null;
  const pixel = resolvePixelPosition(event);
  const dataX = isFiniteNumber(event?.x) ? event.x : null;
  const dataY = isFiniteNumber(event?.y) ? event.y : null;
  const zValue =
    isFiniteNumber(dataX) && isFiniteNumber(dataY)
      ? resolveZValue(dataX, dataY)
      : null;

  const button =
    typeof originalEvent?.button === "number"
      ? originalEvent.button
      : mapWhichToButton(event?.which);

  const payload = {
    type,
    pixel: {
      x: pixel.x,
      y: pixel.y,
    },
    sigplot: {
      x: dataX,
      y: dataY,
      z: zValue,
    },
    button,
    buttons:
      typeof originalEvent?.buttons === "number"
        ? originalEvent.buttons
        : button === null
          ? 0
          : 1 << button,
    which:
      typeof event?.which === "number"
        ? event.which
        : typeof originalEvent?.which === "number"
          ? originalEvent.which
          : null,
    altKey: !!originalEvent?.altKey,
    ctrlKey: !!originalEvent?.ctrlKey,
    metaKey: !!originalEvent?.metaKey,
    shiftKey: !!(originalEvent?.shiftKey ?? event?.shift),
    nativeEvent: originalEvent,
    preventDefault: () => {
      if (typeof event?.preventDefault === "function") {
        event.preventDefault();
      } else if (typeof originalEvent?.preventDefault === "function") {
        originalEvent.preventDefault();
      }
    },
    stopPropagation: () => {
      if (typeof event?.stopPropagation === "function") {
        event.stopPropagation();
      } else if (typeof originalEvent?.stopPropagation === "function") {
        originalEvent.stopPropagation();
      }
    },
  };

  return payload;
};

const cloneMousePayloadWithType = (payload, type) => ({
  ...payload,
  type,
  pixel: {
    x: payload.pixel?.x ?? null,
    y: payload.pixel?.y ?? null,
  },
  sigplot: {
    x: payload.sigplot?.x ?? null,
    y: payload.sigplot?.y ?? null,
    z: payload.sigplot?.z ?? null,
  },
});

const addPlotListener = (eventName, handler) => {
  if (!plot || typeof plot.addListener !== "function") {
    return;
  }
  plot.addListener(eventName, handler);
  plotEventListeners.push({ eventName, handler });
};

const addDomListener = (target, eventName, handler, options) => {
  if (!target || typeof target.addEventListener !== "function") {
    return;
  }
  target.addEventListener(eventName, handler, options);
  domEventListeners.push({ target, eventName, handler, options });
};

const cleanupPlotListeners = () => {
  if (plot && typeof plot.removeListener === "function") {
    plotEventListeners.forEach(({ eventName, handler }) => {
      plot.removeListener(eventName, handler);
    });
  }
  plotEventListeners.length = 0;

  domEventListeners.forEach(({ target, eventName, handler, options }) => {
    target.removeEventListener(eventName, handler, options);
  });
  domEventListeners.length = 0;

  pointerInsidePlotArea = false;
  lastMousePayload = null;
};

const ensurePointerEntered = (payload) => {
  if (pointerInsidePlotArea) {
    return;
  }
  pointerInsidePlotArea = true;
  emit("mouseenter", cloneMousePayloadWithType(payload, "mouseenter"));
};

const handleMouseDown = (event) => {
  if (!isEventInsidePlot(event)) {
    return;
  }
  const payload = buildMousePayload(event, "mousedown");
  ensurePointerEntered(payload);
  lastMousePayload = payload;
  emit("mousedown", payload);
};

const handleMouseMove = (event) => {
  const inside = isEventInsidePlot(event);
  if (!inside) {
    if (pointerInsidePlotArea && lastMousePayload) {
      emit(
        "mouseleave",
        cloneMousePayloadWithType(lastMousePayload, "mouseleave"),
      );
    }
    pointerInsidePlotArea = false;
    lastMousePayload = null;
    return;
  }

  const payload = buildMousePayload(event, "mousemove");
  if (!pointerInsidePlotArea) {
    pointerInsidePlotArea = true;
    emit("mouseenter", cloneMousePayloadWithType(payload, "mouseenter"));
  }

  lastMousePayload = payload;
  emit("mousemove", payload);
};

const handleMouseUp = (event) => {
  if (!isEventInsidePlot(event)) {
    return;
  }
  const payload = buildMousePayload(event, "mouseup");
  ensurePointerEntered(payload);
  lastMousePayload = payload;
  emit("mouseup", payload);

};

const handleMouseClick = (event) => {
  if (!isEventInsidePlot(event)) {
    return;
  }
  const payload = buildMousePayload(event, "click");
  ensurePointerEntered(payload);
  lastMousePayload = payload;
  emit("click", payload);
};

const handleMouseDoubleClick = (event) => {
  if (!isEventInsidePlot(event)) {
    return;
  }
  const payload = buildMousePayload(event, "dblclick");
  ensurePointerEntered(payload);
  lastMousePayload = payload;
  emit("dblclick", payload);
};

const buildWheelPayload = (event) => {
  if (!plot) {
    return null;
  }

  const metrics = getPlotMetrics();
  const canvas = metrics?.canvas;
  if (!metrics || !canvas) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  const pixelX = event.clientX - rect.left;
  const pixelY = event.clientY - rect.top;

  if (!isPixelWithinPlotArea(pixelX, pixelY)) {
    return null;
  }

  const mxApi = sigplot && sigplot.mx;
  let data = { x: null, y: null };
  if (mxApi && typeof mxApi.pixel_to_real === "function") {
    try {
      const resolved = mxApi.pixel_to_real(metrics, pixelX, pixelY);
      if (resolved) {
        data = resolved;
      }
    } catch (error) {
      // Ignore failures to resolve data coordinates
    }
  }

  const zValue =
    isFiniteNumber(data.x) && isFiniteNumber(data.y)
      ? resolveZValue(data.x, data.y)
      : null;

  return {
    type: "wheel",
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    deltaZ: event.deltaZ,
    deltaMode: event.deltaMode,
    pixel: {
      x: pixelX,
      y: pixelY,
    },
    sigplot: {
      x: isFiniteNumber(data.x) ? data.x : null,
      y: isFiniteNumber(data.y) ? data.y : null,
      z: zValue,
    },
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    nativeEvent: event,
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
  };
};

const handleWheel = (event) => {
  const payload = buildWheelPayload(event);
  if (!payload) {
    return;
  }
  pointerInsidePlotArea = true;
  lastMousePayload = cloneMousePayloadWithType(payload, "wheel");
  emit("wheel", payload);
};

const registerPlotListeners = () => {
  cleanupPlotListeners();
  if (!plot) {
    return;
  }

  addPlotListener("mdown", handleMouseDown);
  addPlotListener("mmove", handleMouseMove);
  addPlotListener("mup", handleMouseUp);
  addPlotListener("mclick", handleMouseClick);
  addPlotListener("mdblclick", handleMouseDoubleClick);
  addPlotListener("zoom", (event) => {
    emit("zoom", {
      type: "zoom",
      level: event?.level ?? null,
      continuous: !!event?.inContinuousZoom,
      xmin: event?.xmin ?? null,
      xmax: event?.xmax ?? null,
      ymin: event?.ymin ?? null,
      ymax: event?.ymax ?? null,
    });
  });
  addPlotListener("unzoom", (event) => {
    emit("unzoom", {
      type: "unzoom",
      level: event?.level ?? null,
      xmin: event?.xmin ?? null,
      xmax: event?.xmax ?? null,
      ymin: event?.ymin ?? null,
      ymax: event?.ymax ?? null,
    });
  });

  if (plotContainer.value) {
    addDomListener(plotContainer.value, "wheel", handleWheel, wheelListenerOptions);
    addDomListener(
      plotContainer.value,
      "mouseleave",
      () => {
        if (pointerInsidePlotArea && lastMousePayload) {
          emit(
            "mouseleave",
            cloneMousePayloadWithType(lastMousePayload, "mouseleave"),
          );
        }
        pointerInsidePlotArea = false;
        lastMousePayload = null;
      },
      false,
    );
  }
};

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
  registerPlotListeners();
});

onBeforeUnmount(() => {
  cleanupPlotListeners();
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
  zoomTo({
    xmin,
    xmax,
    ymin,
    ymax,
    continuous = false,
  } = {}) {
    if (!plot || typeof plot.zoom !== "function") {
      return;
    }

    plot.zoom(
      {
        x: xmin,
        y: ymin,
      },
      {
        x: xmax,
        y: ymax,
      },
      continuous,
    );
  },
  zoomToPixels({
    x0,
    y0,
    x1,
    y1,
    continuous = false,
  } = {}) {
    if (
      !plot ||
      typeof plot.pixel_zoom !== "function" ||
      !isFiniteNumber(x0) ||
      !isFiniteNumber(y0) ||
      !isFiniteNumber(x1) ||
      !isFiniteNumber(y1)
    ) {
      return;
    }

    plot.pixel_zoom(x0, y0, x1, y1, continuous);
  },
  unzoom(levels = 1) {
    if (!plot || typeof plot.unzoom !== "function") {
      return;
    }
    plot.unzoom(levels);
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
