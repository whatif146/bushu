import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

// 弹窗。三条关闭路径齐全（Esc / 遮罩 / 关闭按钮），打开时锁 body 滚动、
// 焦点锁在面板内，关闭后焦点回到触发元素。挂在 body 的 portal 上，
// 避免父级 overflow 或 transform 造成的层叠上下文把 fixed 关进小盒子里。
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'textarea:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  labelledBy,
  className = '',
  variant,
  hideClose = false,
}) {
  const panelRef = useRef(null)
  const restoreRef = useRef(null)
  const autoId = useId()
  const titleId = `${autoId}-title`
  const isMenu = variant === 'menu'

  useEffect(() => {
    if (!open) return undefined

    restoreRef.current = document.activeElement
    document.body.classList.add('no-scroll')

    const panel = panelRef.current
    const first = panel?.querySelector(FOCUSABLE)
    if (first) first.focus()
    else panel?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null)
      if (!nodes.length) return
      const firstNode = nodes[0]
      const lastNode = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault()
        lastNode.focus()
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault()
        firstNode.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.classList.remove('no-scroll')
      const back = restoreRef.current
      if (back && typeof back.focus === 'function') back.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const overlay = (
    <div
      className={`modal ${isMenu ? 'modal--menu' : ''} ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy || (isMenu ? undefined : titleId)}
    >
      <div className="modal__overlay" onClick={onClose} aria-hidden="true" />
      <div
        className={`modal__panel ${isMenu ? 'modal__panel--menu on-ink' : ''}`.trim()}
        ref={panelRef}
        tabIndex={-1}
      >
        {isMenu ? children : (
          <>
            <div className="modal__head">
              <h3 className="modal__title" id={titleId}>{title}</h3>
              {hideClose ? null : (
                <button className="modal__close" type="button" onClick={onClose} aria-label="关闭">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none"
                    stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M4 4l12 12M16 4L4 16" />
                  </svg>
                </button>
              )}
            </div>
            <div className="modal__body">{children}</div>
            {footer ? <div className="modal__foot">{footer}</div> : null}
          </>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return overlay
  return createPortal(overlay, document.body)
}
