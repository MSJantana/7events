type Props = Readonly<{ qty: number; maxQty: number; onChangeQty: (n: number) => void }>

function clampQty(n: number, max: number) {
  return Math.max(1, Math.min(max, Number(n) || 1))
}

export default function QuantityInput({ qty, maxQty, onChangeQty }: Props) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ color: 'var(--gray)' }}>Quantidade</span>
      <input type="number" min={1} max={maxQty} value={Math.min(qty, maxQty)} onChange={(e) => { onChangeQty(clampQty(Number(e.target.value), maxQty)) }} style={{ width:80, padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)' }} />
    </label>
  )
}

