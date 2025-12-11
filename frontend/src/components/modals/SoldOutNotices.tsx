import styles from './modal.module.css'
import { renderNotice } from '../common/Notice'
import type { NoticeStyles } from '../common/Notice'

export default function SoldOutNotices({ show }: Readonly<{ show: boolean }>) {
  if (!show) return null
  return renderNotice(styles as unknown as NoticeStyles, 'err', 'Ingressos Esgotados', { display:'inline-flex', alignItems:'center', gap:8, marginTop:8 })
}

