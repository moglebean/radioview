export interface SpectrumFrame {
  fftSize: number
  bins: Float32Array // values already in dB or linear; interpreted with dbMin/max
  dbMin: number
  dbMax: number
}

export interface WaterfallRow {
  width: number         // pixels in a row
  pixels: Uint8Array    // 0..255 indices to colormap
}

export interface Viewport {
  centerHz: number
  spanHz: number
  dbMin: number
  dbMax: number
}

export interface PanfallOptions {
  waterfallCanvas: HTMLCanvasElement
  spectrumCanvas: HTMLCanvasElement
  colormap?: Uint8ClampedArray // 256*4 RGBA
  initialViewport?: Viewport
  spectrumPersistence?: number // 0..1 (alpha decay)
  drawGrid?: boolean
  font?: string
}
