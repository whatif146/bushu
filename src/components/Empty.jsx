// 空状态：一个虚线方框 + 一句人话 + 一个可点的下一步动作（不能只有一句话）。
const DefaultIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
    strokeWidth="1.4" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" />
    <path d="M3.5 9.5h17M8 4.5v15" />
  </svg>
)

export default function Empty({ title, text, action, icon, className = '' }) {
  return (
    <div className={`empty ${className}`.trim()}>
      <div className="empty__box" aria-hidden="true">{icon || <DefaultIcon />}</div>
      {title ? <p className="empty__title">{title}</p> : null}
      {text ? <p className="empty__text">{text}</p> : null}
      {action}
    </div>
  )
}
