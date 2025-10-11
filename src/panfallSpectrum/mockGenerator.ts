import type { SpectrumFrame, WaterfallRow } from '../src/core/types'

let t = 0
export function makeMockSpectrum(): SpectrumFrame {
  const n = 2048
  const bins = new Float32Array(n)
  const c = 0.5 + 0.5 * Math.sin(t / 40)
  for (let i = 0; i < n; i++) {
    const dx = (i - n * (0.2 + 0.6 * c)) / (n * 0.03)
    const peak = -10 * Math.exp(-dx * dx)
    const noise = -110 + 5 * Math.sin((i + t) * 0.03)
    bins[i] = noise + peak
  }
  t++
  return { fftSize: n, bins, dbMin: -120, dbMax: 0 }
}

export function makeMockWaterfallRow(): WaterfallRow {
  const n = 2048
  const row = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    row[i] = (Math.sin((i + t) * 0.02) * 127 + 128) & 255
  }
  return { width: n, pixels: row }
}
