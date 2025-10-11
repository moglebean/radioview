/* SPDX-License-Identifier: GPL-3.0-or-later
 * Canvas-based panadapter + waterfall renderer.
 * Waterfall strategy mirrors common WebSDR UIs (including PhantomSDR/NovaSDR):
 * - Maintain an indexed row buffer (0..255), map to RGBA via precomputed colormap
 * - Use ImageData + putImageData() for fast vertical scroll blits
 * Refs: PhantomSDR backend + Svelte UI patterns; HTML hosting via html_root config.  // context
 */

import { WaterfallBuffer } from './WaterfallBuffer'
import { SpectrumPainter } from './SpectrumPainter'
import { VIRIDIS_LIKE } from './Colormaps'
import type { PanfallOptions, SpectrumFrame, WaterfallRow, Viewport } from './types'

export class PanfallRenderer {
  private wfCanvas: HTMLCanvasElement
  private spCanvas: HTMLCanvasElement
  private wfCtx: CanvasRenderingContext2D
  private spCtx: CanvasRenderingContext2D
  private wfBuffer: WaterfallBuffer
  private colormap: Uint8ClampedArray
  private viewport: Viewport = { centerHz: 0, spanHz: 1, dbMin: -120, dbMax: 0 }
  private spectrum: SpectrumPainter
  private rafId: number | null = null
  private needsRedraw = false
  private lastSpectrum: SpectrumFrame | null = null

  constructor(opts: PanfallOptions) {
    this.wfCanvas = opts.waterfallCanvas
    this.spCanvas = opts.spectrumCanvas
    const wf = this.wfCanvas.getContext('2d', { alpha: false })
    const sp = this.spCanvas.getContext('2d')
    if (!wf || !sp) throw new Error('2D context not available')
    this.wfCtx = wf
    this.spCtx = sp

    this.colormap = opts.colormap ?? VIRIDIS_LIKE
    const w = this.wfCanvas.width || 1024
    const h = this.wfCanvas.height || 256
    this.wfCanvas.width = w; this.wfCanvas.height = h
    this.spCanvas.width = w; this.spCanvas.height = 160

    this.wfBuffer = new WaterfallBuffer(w, h)
    if (opts.initialViewport) this.viewport = opts.initialViewport

    this.spectrum = new SpectrumPainter({
      ctx: this.spCtx,
      persistence: opts.spectrumPersistence ?? 0,
      strokeStyle: '#e6e6e6',
      lineWidth: 1
    })

    this.loop = this.loop.bind(this)
    this.rafId = requestAnimationFrame(this.loop)
  }

  setColormap(map: Uint8ClampedArray) { this.colormap = map; this.needsRedraw = true }
  setViewport(v: Viewport) { this.viewport = v; this.needsRedraw = true }

  ingestSpectrum(frame: SpectrumFrame) {
    this.lastSpectrum = frame
    this.needsRedraw = true
  }

  ingestWaterfallRow(row: WaterfallRow) {
    if (row.width !== this.wfCanvas.width) {
      this.resize(row.width, this.wfCanvas.height)
    }
    this.wfBuffer.pushRow(row.pixels)
    this.needsRedraw = true
  }

  draw() {
    const w = this.wfCanvas.width, h = this.wfCanvas.height

    // --- Waterfall: assemble and blit ---
    const indices = this.wfBuffer.assembleIndices() // width*height
    const img = this.indicesToImageData(indices, w, h)
    this.wfCtx.putImageData(img, 0, 0)

    // --- Spectrum: paint current frame (if any) ---
    this.spectrum.beginFrame(this.spCanvas.width, this.spCanvas.height)
    if (this.lastSpectrum) {
      this.spectrum.drawSpectrum(this.lastSpectrum, this.spCanvas.width, this.spCanvas.height)
    }
  }

  resize(width: number, height: number) {
    this.wfCanvas.width = width
    this.wfCanvas.height = height
    this.spCanvas.width = width
    this.wfBuffer.resize(width, height)
    this.needsRedraw = true
  }

  destroy() {
    if (this.rafId != null) cancelAnimationFrame(this.rafId)
  }

  // --- private ---

  private loop() {
    if (this.needsRedraw) {
      this.needsRedraw = false
      this.draw()
    }
    this.rafId = requestAnimationFrame(this.loop)
  }

  private indicesToImageData(indices: Uint8Array, width: number, height: number): ImageData {
    const rgba = new Uint8ClampedArray(width * height * 4)
    const cm = this.colormap
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i] * 4
      const o = i * 4
      rgba[o] = cm[idx]
      rgba[o + 1] = cm[idx + 1]
      rgba[o + 2] = cm[idx + 2]
      rgba[o + 3] = 255
    }
    return new ImageData(rgba, width, height, { colorSpace: 'srgb' })
  }
}
