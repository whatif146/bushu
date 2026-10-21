// 步骤条 / 细进度条 / 计数。三者在 design-spec §5.8、§5.11 里是同一族，
// 放一个文件，页面按需 import，避免三个组件三个文件。
const CheckIcon = () => (
  <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor"
    strokeWidth="2" aria-hidden="true">
    <path d="M2 6.5l2.5 2.5L10 3.5" />
  </svg>
)

/** 桌面 5 等分方块 + 连接线；移动端退化为「步骤 3 / 5 · 想遇见」+ 2px 进度条 */
export function StepBar({ steps = [], current = 1, className = '' }) {
  const total = steps.length || 1
  const safeCurrent = Math.min(Math.max(current, 1), total)
  const percent = Math.round((safeCurrent / total) * 100)
  const currentLabel = steps[safeCurrent - 1] || ''

  return (
    <div className={className}>
      <ol
        className="stepbar"
        style={{ '--steps': total }}
        aria-label={`步骤 ${safeCurrent} / ${total}：${currentLabel}`}
      >
        {steps.map((label, i) => {
          const step = i + 1
          const done = step < safeCurrent
          const isCurrent = step === safeCurrent
          return (
            <li
              key={label}
              className={`stepbar__item ${done ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`.trim()}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="stepbar__line" aria-hidden="true" />
              <span className="stepbar__dot">{done ? <CheckIcon /> : step}</span>
              <span className="stepbar__label">{label}</span>
            </li>
          )
        })}
      </ol>

      <div className="stepbar--mobile">
        <div className="stepbar__mobile-text">
          <span>步骤 {safeCurrent} / {total} · {currentLabel}</span>
          <span className="stepbar__mobile-num">{percent}%</span>
        </div>
        <div className="pbar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="pbar__fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  )
}

/** 2px 细进度条。value/max 用数字，label 给屏幕阅读器。 */
export function ProgressBar({ value = 0, max = 100, label, className = '' }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      className={`pbar ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="pbar__fill" style={{ width: `${percent}%` }} />
    </div>
  )
}

/** 计数 `3 / 12`：视觉只给数字，屏幕阅读器读「第 3 张，共 12 张」 */
export function Counter({ current = 0, total = 0, unit = '张', className = '' }) {
  const last = total > 0 && current >= total
  return (
    <span
      className={`counter ${last ? 'is-last' : ''} ${className}`.trim()}
      aria-label={`第 ${current} ${unit}，共 ${total} ${unit}`}
    >
      {current} / {total}
    </span>
  )
}

export default StepBar
