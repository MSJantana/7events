export function parseDateParts(raw: string) {
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (m1) {
    return { y: Number(m1[1]), mo: Number(m1[2]), d: Number(m1[3]) }
  }
  const m2 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw)
  if (m2) {
    return { y: Number(m2[3]), mo: Number(m2[2]), d: Number(m2[1]) }
  }
  return null
}

export function parseTimeParts(raw: string) {
  const tm = /^(\d{2}):(\d{2})$/.exec(raw)
  if (tm) {
    return { hh: Number(tm[1]), mm: Number(tm[2]) }
  }
  return null
}
