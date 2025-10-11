/* SPDX-License-Identifier: GPL-3.0-or-later
 * Lightweight spectrum line renderer with optional persistence.
 */

import { dbToY } from './Scales.ts'
import type { SpectrumFrame } from './types.ts'

export interface SpectrumPainterOptions {
  ctx: CanvasRenderingContext2D
  persistence?: number // 0..1 alpha decay per frame
  strokeStyle?: string
  fillStyle?: string | null
  lineWidth?: number
}

export class SpectrumPainter {
  private ctx: CanvasRenderingContext2D
  private persistence = 0
  private lineWidth = 1
  private strokeStyle = '#ddd'
  private fillStyle: string | null = null

  constructor(opts: SpectrumPainterOptions) {
    this.ctx = opts.ctx
    if (opts.persistence != null) this.persistence = opts.persistence
    if (opts.strokeStyle) this.strokeStyle = opts.strokeStyle
    if (opts.fillStyle !== undefined) this.fillStyle = opts.fillStyle
    if (opts.lineWidth) this.lineWidth = opts.lineWidth
  }

  beginFrame(width: number, height: number) {
    if (this.persistence > 0) {
      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.fillStyle = `rgba(0,0,0,${this.persistence})`
      this.ctx.fillRect(0, 0, width, height)
    } else {
      this.ctx.clearRect(0, 0, width, height)
    }
  }

  drawSpectrum(frame: SpectrumFrame, width: number, height: number) {
    const { bins, dbMin, dbMax } = frame
    const ctx = this.ctx
    ctx.lineWidth = this.lineWidth
    ctx.strokeStyle = this.strokeStyle
    ctx.beginPath()
    const n = bins.length
    const xScale = (width - 1) / Math.max(1, n - 1)

    for (let i = 0; i < n; i++) {
      const x = i * xScale
      const y = dbToY(bins[i], dbMin, dbMax, height)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    if (this.fillStyle) {
      ctx.lineTo(width - 1, height)
      ctx.lineTo(0, height)
      ctx.closePath()
      const prev = ctx.fillStyle
      ctx.fillStyle = this.fillStyle
      ctx.fill()
      ctx.fillStyle = prev
    }
  }
}
