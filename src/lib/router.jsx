// 手写 hash 路由。不装 react-router：全站只有 7 个路由，且 #/table/g_01 这类
// 路径在静态托管下天然可用（不需要 rewrite 规则）。
import { useCallback, useEffect, useState } from 'react'

// 各路由第一段 → 参数名。admin 的第二段是 tab，其余都是 groupId。
const PARAM_BY_HEAD = { table: 'groupId', live: 'groupId', recap: 'groupId', admin: 'tab' }

export function parseHash(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  let raw = String(hash || '').replace(/^#/, '')
  if (!raw.startsWith('/')) raw = '/' + raw
  const [pathPart, queryPart = ''] = raw.split('?')
  const trimmed = pathPart.replace(/\/+$/, '')
  const path = trimmed === '' ? '/' : trimmed
  const segments = path === '/' ? [] : path.split('/').filter(Boolean)

  const query = {}
  new URLSearchParams(queryPart).forEach((value, key) => { query[key] = value })

  const params = {}
  const head = segments[0]
  if (head && PARAM_BY_HEAD[head] && segments[1]) {
    params[PARAM_BY_HEAD[head]] = decodeURIComponent(segments[1])
  }

  return { path, segments, params, query }
}

/** '/join' | '#/join?event=e_03' → '#/join?event=e_03' */
export function toHash(to) {
  let s = String(to ?? '/').trim()
  s = s.replace(/^#/, '')
  if (!s.startsWith('/')) s = '/' + s
  return '#' + s
}

/** 去掉 query 的路径，用于 isActive 比较 */
export function toPath(to) {
  return toHash(to).slice(1).split('?')[0].replace(/\/+$/, '') || '/'
}

export function navigate(to, opts = {}) {
  if (typeof window === 'undefined') return
  const hash = toHash(to)
  if (window.location.hash === hash) {
    if (!opts.keepScroll) window.scrollTo(0, 0)
    return
  }
  if (opts.replace) {
    // replaceState 不会触发 hashchange，手动补一次，让订阅方同步
    window.history.replaceState(null, '', window.location.pathname + window.location.search + hash)
    window.dispatchEvent(new Event('hashchange'))
    return
  }
  window.location.hash = hash
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash())

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])

  const isActive = useCallback((to) => {
    const target = toPath(to)
    if (target === '/') return route.path === '/'
    return route.path === target || route.path.startsWith(target + '/')
  }, [route.path])

  return { ...route, navigate, isActive }
}

/** 同页锚点：hash 路由下 `#how` 会被当成路径，所以滚动必须走 JS */
export function scrollToId(id, opts = {}) {
  if (typeof document === 'undefined') return false
  const el = document.getElementById(id)
  if (!el) return false
  const offset = opts.offset ?? 80
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: opts.smooth === false ? 'auto' : 'smooth' })
  return true
}

/**
 * 从任意页回到落地页的某个区块：先切路由，等挂载完成后再滚。
 * 找不到该区块（比如落地页还没写这一节）就只回首页，不报错。
 */
export function goSection(id) {
  navigate('/')
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scrollToId(id))
  })
}
