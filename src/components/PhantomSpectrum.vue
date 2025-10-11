<template>
  <div ref="root" class="phantom-spectrum">
    <canvas ref="waterfallCanvas" class="phantom-spectrum__waterfall"></canvas>
    <canvas ref="graduationCanvas" class="phantom-spectrum__graduation"></canvas>
    <canvas ref="spectrumCanvas" class="phantom-spectrum__spectrum"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue'
import SpectrumWaterfall from '../phantomSpectrum/waterfall.js'

type WaterfallSettings = {
  fft_size: number
  fft_result_size: number
  basefreq?: number
  sps?: number
  total_bandwidth?: number
  overlap?: number
  waterfall_size?: number
  waterfall_compression?: string
  decoder?: unknown
}

type WaterfallFrame = {
  data: ArrayLike<number> | ArrayBufferLike
  l?: number
  r?: number
}

type BufferPayload = ArrayBuffer | ArrayBufferView | WaterfallFrame | WaterfallFrame[]
type ClientMap = Record<string, [number, number]>

const props = defineProps({
  settings: { type: Object as PropType<WaterfallSettings>, required: true },
  buffer: { type: null as unknown as PropType<BufferPayload | null>, default: null },
  colormap: { type: String, default: 'gqrx' },
  colourShift: { type: Number, default: 80 },
  alpha: { type: Number, default: 0.5 },
  spectrum: { type: Boolean, default: true },
  waterfall: { type: Boolean, default: true },
  clients: { type: null as unknown as PropType<ClientMap>, default: () => ({}) }
})

const emit = defineEmits<{
  (event: 'range-change', payload: { l: number, r: number }): void
}>()

const root = ref<HTMLDivElement | null>(null)
const waterfallCanvas = ref<HTMLCanvasElement | null>(null)
const spectrumCanvas = ref<HTMLCanvasElement | null>(null)
const graduationCanvas = ref<HTMLCanvasElement | null>(null)

let instance: SpectrumWaterfall | null = null
let tempCanvas: HTMLCanvasElement | null = null
let ro: ResizeObserver | null = null

const applySettings = (settings: WaterfallSettings | null | undefined) => {
  if (!instance || !settings) {
    return
  }
  try {
    instance.configure(settings)
  } catch (err) {
    console.error('SpectrumWaterfall configure failed', err)
  }
}

const ingest = (payload: BufferPayload | null | undefined) => {
  if (!instance || payload == null) {
    return
  }
  try {
    instance.ingestWaterfallBuffer(payload)
  } catch (err) {
    console.error('SpectrumWaterfall ingest failed', err)
  }
}

const applyColormap = (value: string) => {
  if (!instance) {
    return
  }
  instance.setColormap(value)
}

const applyClients = (clients: ClientMap) => {
  if (!instance) {
    return
  }
  instance.setClients(clients)
}

onMounted(() => {
  const wf = waterfallCanvas.value
  const sp = spectrumCanvas.value
  const grad = graduationCanvas.value

  if (!wf || !sp || !grad) {
    console.error('PhantomSpectrum requires canvas refs to mount')
    return
  }

  tempCanvas = document.createElement('canvas')
  instance = new SpectrumWaterfall({
    initialColormap: props.colormap,
    onRangeChange: (range) => emit('range-change', range)
  })
  instance.initCanvas({
    canvasElem: wf,
    spectrumCanvasElem: sp,
    graduationCanvasElem: grad,
    tempCanvasElem: tempCanvas
  })
  instance.setSpectrum(props.spectrum)
  instance.setWaterfall(props.waterfall)
  instance.setOffset(props.colourShift)
  instance.setAlpha(props.alpha)
  applyClients(props.clients)
  applySettings(props.settings)
  ingest(props.buffer)

  if (typeof ResizeObserver !== 'undefined' && root.value) {
    ro = new ResizeObserver(() => {
      if (!instance) {
        return
      }
      instance.setCanvasWidth()
      instance.updateGraduation()
      instance.redrawWaterfall()
    })
    ro.observe(root.value)
  }
})

watch(() => props.settings, (settings) => applySettings(settings), { deep: true })
watch(() => props.buffer, (payload) => ingest(payload))
watch(() => props.colormap, (value) => applyColormap(value))
watch(() => props.colourShift, (value) => instance?.setOffset(value))
watch(() => props.alpha, (value) => instance?.setAlpha(value))
watch(() => props.spectrum, (value) => instance?.setSpectrum(value))
watch(() => props.waterfall, (value) => instance?.setWaterfall(value))
watch(() => props.clients, (clients) => applyClients(clients || {}), { deep: true })

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  instance?.destroy()
  instance = null
  tempCanvas = null
})

defineExpose({
  getInstance: () => instance
})
</script>

<style scoped>
.phantom-spectrum {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.phantom-spectrum__waterfall,
.phantom-spectrum__spectrum,
.phantom-spectrum__graduation {
  width: 100%;
  display: block;
}

.phantom-spectrum__waterfall {
  height: 100%;
  image-rendering: pixelated;
}

.phantom-spectrum__graduation {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.phantom-spectrum__spectrum {
  position: absolute;
  left: 0;
  pointer-events: none;
}
</style>
