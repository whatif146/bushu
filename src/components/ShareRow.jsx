import { useEffect, useRef, useState } from 'react'

/**
 * 分享一条：复制链接 + 系统分享（手机上是微信/QQ 面板）。
 * 刻意不做「分享得积分」这类激励，也不弹二维码图——二维码要服务端生成，
 * 目前没有后端，给一张假码比不给更糟。
 */
export default function ShareRow({ title = '把这一局发给同学', text = '不熟的人，一起干件小事。', compact = false }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef(null)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => () => clearTimeout(timer.current), [])

  const url = typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setFailed(false)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      setFailed(true)
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: '不熟局', text, url })
    } catch {
      /* 用户取消不算失败 */
    }
  }

  return (
    <div className={`share-row${compact ? ' share-row--compact' : ''}`}>
      <p className="share-row__title">{title}</p>
      <div className="share-row__actions">
        <button type="button" className="share-row__btn" onClick={copy}>
          {copied ? '链接已复制' : failed ? '手动复制一下地址栏' : '复制链接'}
        </button>
        {canShare ? (
          <button type="button" className="share-row__btn" onClick={share}>
            发给同学
          </button>
        ) : null}
      </div>
      <p className="share-row__hint">微信里直接粘到群里就行，不用装 App。</p>
    </div>
  )
}
