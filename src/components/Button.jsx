// 按钮。变体语义固定：primary 实心 / secondary 描边 / ghost 只有下划线 / danger 永远描边。
// danger 与 primary 同色系（都是朱红），靠「实心 vs 描边」区分，不靠色相。
const ArrowIcon = () => (
  <svg className="btn__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
    <path d="M2 8h11M9 4l4 4-4 4" />
  </svg>
)

export default function Button({
  as = 'button',
  variant = 'primary',
  size,
  block = false,
  arrow = false,
  icon = null,
  children,
  className = '',
  disabled = false,
  type,
  ...rest
}) {
  const cls = [
    'btn',
    `btn--${variant}`,
    size === 'sm' ? 'btn--sm' : '',
    block ? 'btn--block' : '',
    className,
  ].filter(Boolean).join(' ')

  const content = (
    <>
      {icon}
      <span>{children}</span>
      {arrow ? <ArrowIcon /> : null}
    </>
  )

  if (as === 'a') {
    return (
      <a className={cls} aria-disabled={disabled || undefined} {...rest}>
        {content}
      </a>
    )
  }

  return (
    <button className={cls} type={type || 'button'} disabled={disabled} {...rest}>
      {content}
    </button>
  )
}
