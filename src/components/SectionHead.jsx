import { useId } from 'react'

// 区块头。编号与右侧英文小标「骑」在 2px 横线上（横线由 ::before 画，
// 两个 span 用 paper 底色把线压断），标题与右侧 meta 同基线。
export default function SectionHead({
  num,
  title,
  aside,
  sub,
  meta,
  id,
  className = '',
  children,
}) {
  const autoId = useId()
  const headingId = id || `${autoId}-head`

  return (
    <header className={`sec-head ${className}`.trim()}>
      {num ? <span className="num sec-head__num">{num}</span> : null}
      {aside ? <span className="eyebrow sec-head__aside">{aside}</span> : null}
      <div className="sec-head__row">
        <div>
          <h2 className="sec-head__title" id={headingId}>{title}</h2>
          {sub ? <p className="sec-head__sub">{sub}</p> : null}
        </div>
        {meta ? <span className="sec-head__meta">{meta}</span> : null}
      </div>
      {children}
    </header>
  )
}
