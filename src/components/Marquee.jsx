import { Fragment } from 'react'

// 横向滚动带：内容复制两份，第二份 aria-hidden，translateX(-50%) 无缝循环。
// 它是背景质感，不做 hover 暂停；prefers-reduced-motion 下退化为一行静态词。
const FALLBACK = ['饭局', '自习局', '夜跑', '桌游', 'CITY WALK', '技能交换', '羽毛球', '观影']

export default function Marquee({ items = FALLBACK, tone = 'ink', className = '' }) {
  const words = items.length ? items : FALLBACK
  const fast = words.length > 12

  const group = (hidden) => (
    <div className="marquee__group" aria-hidden={hidden || undefined}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="marquee__item">{word}</span>
          <span className="marquee__sep" aria-hidden="true">○</span>
        </Fragment>
      ))}
    </div>
  )

  return (
    <div className={`marquee ${tone === 'vermilion' ? 'marquee--vermilion' : ''} ${className}`.trim()}>
      <div className={`marquee__track ${fast ? 'marquee__track--fast' : ''}`.trim()}>
        {group(false)}
        {group(true)}
      </div>
    </div>
  )
}
