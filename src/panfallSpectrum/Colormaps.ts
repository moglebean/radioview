/* SPDX-License-Identifier: GPL-3.0-or-later
 * Portions conceptually inspired by PhantomSDR-Plus/NovaSDR Svelte frontend palettes.
 * See: https://github.com/Steven9101/PhantomSDR-Plus (renamed NovaSDR)  // citation context
 */

export function makeLinearGradient(start: [number, number, number], end: [number, number, number]) {
  const out = new Uint8ClampedArray(256 * 4)
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    const r = Math.round(start[0] + (end[0] - start[0]) * t)
    const g = Math.round(start[1] + (end[1] - start[1]) * t)
    const b = Math.round(start[2] + (end[2] - start[2]) * t)
    const o = i * 4
    out[o + 0] = r
    out[o + 1] = g
    out[o + 2] = b
    out[o + 3] = 255
  }
  return out
}

// A decent default reminiscent of “viridis”-style palettes (BSD-like sources exist).
export const VIRIDIS_LIKE = (() => {
  const stops: [number, number, number][] = [
    [68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]
  ]
  const out = new Uint8ClampedArray(256 * 4)
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    const p = t * (stops.length - 1)
    const i0 = Math.floor(p), i1 = Math.min(stops.length - 1, i0 + 1)
    const f = p - i0
    const s0 = stops[i0], s1 = stops[i1]
    const r = Math.round(s0[0] + (s1[0] - s0[0]) * f)
    const g = Math.round(s0[1] + (s1[1] - s0[1]) * f)
    const b = Math.round(s0[2] + (s1[2] - s0[2]) * f)
    const o = i * 4
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255
  }
  return out
})()

// Placeholder for SpectraVU-like; you can paste NovaSDR’s array here under GPL header.
export const SPECTRAVU_LIKE = makeLinearGradient([0, 0, 0], [255, 255, 255])
