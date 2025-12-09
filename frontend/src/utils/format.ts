export function fmtMoneyBRL(n?: number) {
  try { return (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) } catch { return `R$ ${(n ?? 0).toFixed(2)}` }
}

export function fmtDate(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' }) } catch { return iso }
}

export function fmtDateLine(iso?: string) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
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
