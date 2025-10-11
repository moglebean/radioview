export function dbToY(value: number, dbMin: number, dbMax: number, height: number): number {
  const clamped = Math.max(dbMin, Math.min(dbMax, value))
  const norm = (clamped - dbMin) / Math.max(1e-9, dbMax - dbMin)
  return Math.round((1 - norm) * (height - 1))
}

export function hzToX(freq: number, centerHz: number, spanHz: number, width: number): number {
  const start = centerHz - spanHz / 2
  const norm = (freq - start) / spanHz
  return Math.round(norm * (width - 1))
}
