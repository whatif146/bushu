import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 全站同一时刻只显示 1 条，新的替换旧的（不堆叠）。
// 除了 useToast() 的 hook，还导出模块级 showToast()，方便在 action 回调里直接调。
const ToastContext = createContext({ showToast: () => {} })
let pushExternal = null

export function showToast(message, tone = 'info') {
  pushExternal?.(message, tone)
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const hideTimer = useRef(null)
  const leaveTimer = useRef(null)

  const showToast = useCallback((message, tone = 'info') => {
    if (!message) return
    clearTimeout(hideTimer.current)
    clearTimeout(leaveTimer.current)
    setToast({ id: `${Date.now()}-${Math.random()}`, message, tone, leaving: false })
    hideTimer.current = setTimeout(() => {
      setToast(t => (t ? { ...t, leaving: true } : t))
      leaveTimer.current = setTimeout(() => setToast(null), 180)
    }, 4000)
  }, [])

  useEffect(() => {
    pushExternal = showToast
    return () => { if (pushExternal === showToast) pushExternal = null }
  }, [showToast])

  useEffect(() => () => {
    clearTimeout(hideTimer.current)
    clearTimeout(leaveTimer.current)
  }, [])

  const node = toast ? (
    <div
      className={`toast toast--${toast.tone} ${toast.leaving ? 'is-leaving' : ''}`.trim()}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast__bar" aria-hidden="true" />
      <span className="toast__text">{toast.message}</span>
    </div>
  ) : null

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {node && typeof document !== 'undefined' ? createPortal(node, document.body) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

export default ToastProvider
