// 印章 Tag。seal 是唯一允许旋转的变体（-1.5deg），父容器必须 overflow:visible。
// 反色区内的反转由 .on-ink .tag--* 在 components.css 里成套覆盖。
export default function Tag({ variant = 'seal', as: Comp = 'span', children, className = '', ...rest }) {
  return (
    <Comp className={`tag tag--${variant} ${className}`.trim()} {...rest}>
      {children}
    </Comp>
  )
}

export function Pill({ tone, children, className = '', ...rest }) {
  return (
    <span className={`pill ${tone ? `pill--${tone}` : ''} ${className}`.trim()} {...rest}>
      {children}
    </span>
  )
}
