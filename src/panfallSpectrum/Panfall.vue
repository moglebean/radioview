<template>
  <div ref="container" class="panfall">
    <canvas ref="wf" class="wf"></canvas>
    <canvas ref="sp" class="sp"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { PanfallRenderer, type SpectrumFrame, type WaterfallRow, type Viewport, VIRIDIS_LIKE } from '.'

const props = defineProps<{
  spectrumFrame?: SpectrumFrame
  waterfallRow?: WaterfallRow
  viewport?: Viewport
  colormap?: Uint8ClampedArray
}>()

const container = ref<HTMLDivElement | null>(null)
const wf = ref<HTMLCanvasElement | null>(null)
const sp = ref<HTMLCanvasElement | null>(null)

let renderer: PanfallRenderer | null = null
let ro: ResizeObserver | null = null

onMounted(() => {
  const wfEl = wf.value!, spEl = sp.value!
  // Device-pixel ratio sizing
  const fit = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const rect = container.value!.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width * dpr))
    const wfHeightCss = Math.max(80, Math.floor(rect.height * 0.65))
    const spHeightCss = Math.max(60, rect.height - wfHeightCss)
    wfEl.width = width; wfEl.height = wfHeightCss
    spEl.width = width; spEl.height = spHeightCss
    renderer?.resize(width, wfHeightCss)
  }

  renderer = new PanfallRenderer({
    waterfallCanvas: wfEl,
    spectrumCanvas: spEl,
    colormap: props.colormap ?? VIRIDIS_LIKE
  })

  if (props.viewport) renderer.setViewport(props.viewport)
  if (props.spectrumFrame) renderer.ingestSpectrum(props.spectrumFrame)
  if (props.waterfallRow) renderer.ingestWaterfallRow(props.waterfallRow)

  fit()
  ro = new ResizeObserver(fit)
  ro.observe(container.value!)
})

watch(() => props.viewport, v => v && renderer?.setViewport(v))
watch(() => props.spectrumFrame, f => f && renderer?.ingestSpectrum(f))
watch(() => props.waterfallRow, r => r && renderer?.ingestWaterfallRow(r))
onBeforeUnmount(() => { renderer?.destroy(); ro?.disconnect() })
</script>

<style scoped>
.panfall { position: relative; width: 100%; height: 100%; }
.wf, .sp { width: 100%; display: block; image-rendering: pixelated; }
.sp { position: absolute; left: 0; bottom: 0; }
</style>
