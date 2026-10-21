import { useEffect, useId } from 'react'
import { useRoute } from './lib/router.jsx'
import { actions, demoIdentities, selectors, useStore } from './lib/store.js'
import { useToast } from './components/Toast.jsx'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import Grain from './components/Grain.jsx'
import Button from './components/Button.jsx'
import Landing from './pages/Landing.jsx'
import Join from './pages/Join.jsx'
import Me from './pages/Me.jsx'
import Table from './pages/Table.jsx'
import Live from './pages/Live.jsx'
import Recap from './pages/Recap.jsx'
import Admin from './pages/Admin.jsx'

// 后台有自己的顶栏与左栏，所以不进前台导航/页脚；其余页面共用同一套壳。
const BARE_ROUTES = new Set(['admin'])

function NotFound() {
  return (
    <section className="section wrap wrap--content" aria-labelledby="nf-title">
      <p className="eyebrow">404 / NOT FOUND</p>
      <h1 id="nf-title" style={{ marginTop: 'var(--s-4)' }}>这页不存在。</h1>
      <p className="lead measure" style={{ marginTop: 'var(--s-5)' }}>
        可能是链接抄错了，也可能这局已经下架。回落地页看看这周还开着什么。
      </p>
      <div className="row" style={{ marginTop: 'var(--s-6)' }}>
        <Button as="a" href="#/" arrow>回落地页</Button>
        <Button as="a" href="#/me" variant="secondary">我的局</Button>
      </div>
    </section>
  )
}

// 非管理员进 /admin 的守卫。切身份后不跳转，页面自己会重新渲染出后台。
function AdminGuard({ children }) {
  // 必须返回原始值：若在这里新建对象，useSyncExternalStore 每次比较都不相等，
  // 会陷入「渲染 → 快照变化 → 再渲染」的死循环（表现为页面卡死、快照工具无响应）。
  const isAdmin = useStore(selectors.isAdmin)
  const { showToast } = useToast()
  const selectId = useId()

  if (isAdmin) return children

  return (
    <section className="section wrap wrap--narrow" aria-labelledby="guard-title">
      <p className="eyebrow">ADMIN ONLY</p>
      <h1 id="guard-title" style={{ marginTop: 'var(--s-4)' }}>需要管理员身份。</h1>
      <p className="lead" style={{ marginTop: 'var(--s-5)' }}>
        后台是演示用的假登录。切一个演示身份就能进去，不用密码。
      </p>

      <div className="field" style={{ marginTop: 'var(--s-6)' }}>
        <label className="field__label" htmlFor={selectId}>切换演示身份</label>
        <div className="select-wrap">
          <select
            id={selectId}
            className="select"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return
              const res = actions.switchSession(e.target.value)
              if (res.ok) showToast('身份已切换', 'ok')
              else showToast(res.error || '切换失败，请稍后重试', 'error')
            }}
          >
            <option value="">选一个身份…</option>
            {demoIdentities().map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
      </div>

      <div className="row" style={{ marginTop: 'var(--s-6)' }}>
        <Button onClick={() => {
          const res = actions.switchSession('admin')
          showToast(res.ok ? '已切到管理员' : '切换失败', res.ok ? 'ok' : 'error')
        }}>直接切到管理员</Button>
        <Button as="a" href="#/" variant="secondary">回落地页</Button>
      </div>
    </section>
  )
}

// 标题按 content-plan 的逐页 document.title 定稿；父级 effect 在子 effect 之后跑，
// 所以标题只能在 App 里写一次，页面不要自己改（改了会被这里覆盖）。
function titleFor(state, route) {
  const head = route.segments[0]
  if (!head) return '不熟局 · 广州大学城组局，不熟的人一起干件小事'
  if (head === 'join') return '报名 · 不熟局'
  if (head === 'me') return '我的局 · 不熟局'
  if (head === 'admin') return '后台 · 不熟局'
  if (head === 'table' || head === 'live' || head === 'recap') {
    const group = selectors.group(state, route.params.groupId)
    if (!group) return head === 'recap' ? '回顾 · 不熟局' : '不熟局'
    if (head === 'table') return `第 ${group.tableNo} 桌 · 不熟局`
    if (head === 'live') return `第 ${group.tableNo} 桌 · 现场`
    return `第 ${group.tableNo} 桌的回顾 · 不熟局`
  }
  return '页面不存在 · 不熟局'
}

function renderPage(segments) {
  const [head, second] = segments
  if (!head) return <Landing />
  switch (head) {
    case 'join':
      return <Join />
    case 'me':
      return <Me />
    case 'table':
      return second ? <Table /> : <NotFound />
    case 'live':
      return second ? <Live /> : <NotFound />
    case 'recap':
      return second ? <Recap /> : <NotFound />
    case 'admin':
      return <AdminGuard><Admin /></AdminGuard>
    default:
      return <NotFound />
  }
}

export default function App() {
  const route = useRoute()
  const state = useStore()
  const head = route.segments[0]
  const bare = BARE_ROUTES.has(head)

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = titleFor(state, route)
    // 路由变了只更新标题与滚动位置；路由分段变化才算换页
  }, [route.path])

  return (
    <div className="app">
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          const main = document.getElementById('main')
          if (main) { main.focus(); main.scrollIntoView({ block: 'start' }) }
        }}
      >
        跳到主要内容
      </a>

      {bare ? null : <Nav />}

      <main id="main" className="page" key={route.path} tabIndex={-1}>
        {renderPage(route.segments)}
      </main>

      {bare ? null : <Footer />}

      <Grain />
    </div>
  )
}
