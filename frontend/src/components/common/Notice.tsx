export type NoticeKind = 'ok' | 'err' | 'info'
export type NoticeStyles = { notice: string; noticeOk: string; noticeErr: string; noticeInfo: string }

export function renderNotice(styles: NoticeStyles, kind: NoticeKind, text: string, style?: Record<string, unknown>) {
  const cls = kind === 'ok' ? styles.noticeOk : kind === 'err' ? styles.noticeErr : styles.noticeInfo
  const icon = kind === 'ok' ? '✅' : kind === 'err' ? '⛔' : 'ℹ️'
  return (
    <div className={`${styles.notice} ${cls}`} style={style}>
      <span aria-hidden>{icon}</span>
      <span>{text}</span>
    </div>
  )
}
