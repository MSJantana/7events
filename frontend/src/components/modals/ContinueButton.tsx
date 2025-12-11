import styles from './modal.module.css'

type Step = 1 | 2 | 3
type FlowStatus = { text: string; kind: 'ok' | 'err' | '' }

export default function ContinueButton(p: Readonly<{ disabled: boolean; dataId?: string; selectedTT: string; qty: number; maxQty: number; onCreateOrder: (dataId: string, selectedTT: string, qty: number, maxQty: number) => Promise<string>; setOrderId: (id: string)=>void; setFlowStatus: (s: FlowStatus)=>void; setStep: (s: Step)=>void }>) {
  return (
    <button className={`${styles.btn} ${styles.primary}`} onClick={async () => {
      if (!p.dataId || !p.selectedTT) { p.setFlowStatus({ text: 'Selecione um ingresso', kind: 'err' }); return }
      try {
        const id = await p.onCreateOrder(p.dataId, p.selectedTT, p.qty, p.maxQty)
        p.setOrderId(String(id || ''))
        p.setFlowStatus({ text: 'Pedido criado', kind: 'ok' })
        p.setStep(2)
      } catch { p.setFlowStatus({ text: 'Falha ao comprar', kind: 'err' }) }
    }} disabled={p.disabled}>Continuar</button>
  )
}

