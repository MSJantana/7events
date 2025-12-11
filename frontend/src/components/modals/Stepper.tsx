import styles from './modal.module.css'

type Step = 1 | 2 | 3

export default function Stepper({ step }: Readonly<{ step: Step }>) {
  return (
    <div className={styles.stepper}>
      {(() => {
        let pillClass = styles.pillInactive
        if (step === 1) pillClass = styles.pillActive
        else if (step > 1) pillClass = styles.pillDone
        return (
          <div className={`${styles.pill} ${pillClass}`}>
            <span className="mi" aria-hidden>shopping_cart</span>
            <span>Carrinho</span>
          </div>
        )
      })()}
      <span aria-hidden>→</span>
      {(() => {
        let pillClass = styles.pillInactive
        if (step === 2) pillClass = styles.pillActive
        else if (step > 2) pillClass = styles.pillDone
        return (
          <div className={`${styles.pill} ${pillClass}`}><span className="mi" aria-hidden>credit_card</span><span>Pagamento</span></div>
        )
      })()}
      <span aria-hidden>→</span>
      <div className={`${styles.pill} ${step===3 ? styles.pillActive : styles.pillInactive}`}><span className="mi" aria-hidden>check_circle</span><span>Confirmação</span></div>
    </div>
  )
}

