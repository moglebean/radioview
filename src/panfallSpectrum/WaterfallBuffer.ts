/* SPDX-License-Identifier: GPL-3.0-or-later
 * Waterfall ring buffer with ImageData assembly for efficient blits.
 */

export class WaterfallBuffer {
  private width: number
  private height: number
  private rows: Uint8Array[] // each row is indices 0..255
  private head = 0
  private count = 0

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.rows = Array.from({ length: height }, () => new Uint8Array(width))
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.rows = Array.from({ length: height }, () => new Uint8Array(width))
    this.head = 0
    this.count = 0
  }

  pushRow(row: Uint8Array) {
    if (row.length !== this.width) throw new Error('Row width mismatch')
    this.rows[this.head] = row
    this.head = (this.head + 1) % this.height
    this.count = Math.min(this.count + 1, this.height)
  }

  // Assemble contiguous buffer newest->oldest for putImageData mapping
  assembleIndices(): Uint8Array {
    const out = new Uint8Array(this.width * this.height)
    const available = this.count
    for (let y = 0; y < this.height; y++) {
      const srcIdx = (this.head - 1 - y + this.height) % this.height
      const src = this.rows[srcIdx]
      out.set(src, y * this.width)
      if (y >= available - 1) break
    }
    return out
  }
}
