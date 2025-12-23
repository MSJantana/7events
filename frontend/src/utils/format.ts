export function fmtMoneyBRL(n?: number) {
  try { return (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) } catch { return `R$ ${(n ?? 0).toFixed(2)}` }
}

function toLocalDateInternal(iso?: string, endOfDay = false) {
  try {
    const s = String(iso || '')
    if (!s) return new Date(Number.NaN)
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (m) {
      const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
      return new Date(y, mo - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    }
    const d = new Date(s)
    if (!endOfDay) return d
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  } catch { return new Date(Number.NaN) }
}

export function toLocalDate(iso?: string, endOfDay = false) {
  return toLocalDateInternal(iso, endOfDay)
}

export function fmtDate(iso?: string) {
  if (!iso) return ''
  try { return toLocalDateInternal(iso).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' }) } catch { return iso }
}

export function fmtDateLine(iso?: string) {
  if (!iso) return ''
  try {
    const d = toLocalDateInternal(iso)
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' })
    const day = d.toLocaleDateString('pt-BR', { day: '2-digit' })
    const month = d.toLocaleDateString('pt-BR', { month: 'short' })
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const weekClean = weekday.replace('-feira', '')
    const monthClean = month.replace('.', '')
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    return `${cap(weekClean)}, ${day} de ${cap(monthClean)} às ${time}`
  } catch { return iso }
}

export function fmtEventDuration(startIso?: string, endIso?: string) {
  if (!startIso) return ''
  try {
    const fmt = (iso: string) => {
      const d = toLocalDateInternal(iso)
      const day = d.toLocaleDateString('pt-BR', { day: '2-digit' })
      const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      const year = d.getFullYear()
      const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return `${day} ${month} - ${year} • ${time}`
    }
    const start = fmt(startIso)
    if (!endIso) return start
    const end = fmt(endIso)
    return `${start} > ${end}`
  } catch { return startIso }
}
