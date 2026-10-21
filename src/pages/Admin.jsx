/**
 * 运营后台 #/admin/* —— 7 个 tab（桌面优先）
 *
 * 数据一律走 lib/api.js：actions 写、selectors 读，不碰 localStorage、不 import data/*。
 * 匹配工作台的分数与告警**不是页面里写死的**：组得分、加权拆解来自 lib/match.js 的
 * explainScore，硬约束来自 validateGroup，整组理由来自 makeMatchReason。
 *
 * 路由：#/admin/:tab（lib/router.jsx 把第二段解析成 params.tab），#/admin 默认概览。
 * 管理员守卫在 App.jsx 外层做过，这里不再重复鉴权。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import api, { actions, selectors, useStore, demoIdentities } from '../lib/api.js'
import { useRoute } from '../lib/router.jsx'
import { useToast } from '../components/Toast.jsx'
import Button from '../components/Button.jsx'
import Tag, { Pill } from '../components/Tag.jsx'
import Empty from '../components/Empty.jsx'
import Modal from '../components/Modal.jsx'
import { ProgressBar } from '../components/Progress.jsx'
import { Input, Select, Textarea } from '../components/Field.jsx'
import { StatCard } from '../components/Card.jsx'
import {
  explainScore,
  validateGroup,
  makeMatchReason,
  predictVibe,
  toMember,
  LEVEL_CN,
  GRADE_CN,
} from '../lib/match.js'
import { buildMaterial } from '../lib/materials.js'
import { fmtDate, fmtDateTime, fmtDuration, fmtGroupSize, relativeTime } from '../lib/format.js'

/* ── 词表（文案与枚举以 site-spec / content-plan 为准） ───────────── */

const TAB_IDS = ['overview', 'match', 'activities', 'venues', 'library', 'materials', 'tasks']

const TABS = [
  { id: 'overview', name: '概览', hint: '本周场次、报名、成组和待办，一屏看完。' },
  { id: 'match', name: '匹配工作台', hint: '跑匹配，看每组得分和告警，手动换人换场地。' },
  { id: 'activities', name: '活动类型', hint: '16 类局的开关、价格、组规模、时长。' },
  { id: 'venues', name: '场地库', hint: '场地库、能放几组、今天开不开。' },
  { id: 'library', name: '题库与玩法库', hint: '话题题、热身流程、赛制模板，三张表。' },
  { id: 'materials', name: '物料导出', hint: '按场次生成和打印，一组一份。' },
  { id: 'tasks', name: '任务清单', hint: '场地确认、物料下发、候补补位，按截止日排。' },
]

const CATEGORY_CN = { social: '社交型', buddy: '搭子型', competitive: '竞技型', skill: '技能型' }
const STATUS_CN = { open: '报名中', matching: '排桌中', locked: '已锁定', done: '已结束', canceled: '已取消' }
const GROUP_STATUS_CN = { forming: '待锁定', locked: '已锁定', ongoing: '进行中', finished: '已结束', disbanded: '已解散' }
const TYPE_CN = {
  venue_assign: '场地确认',
  material_export: '物料下发',
  waitlist_fill: '候补补位',
  reminder_push: '提醒推送',
  checkin_audit: '签到核对',
  report_handle: '反馈处理',
}
const KIND_CN = {
  cards: '话题卡牌',
  goal: '目标卡',
  tournament: '赛制单',
  curriculum: '课程表',
  topicCards: '话题卡牌',
  checkinSheet: '目标卡',
  tournamentSheet: '赛制单',
  skillSchedule: '课程表',
}
const SEGMENTS = [
  { id: 'icebreak', name: '破冰' },
  { id: 'interest', name: '兴趣经历' },
  { id: 'opinion', name: '观点深度' },
]
const WEEK_CN = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/* ── 小工具 ───────────────────────────────────────────────── */

const cx = (...parts) => parts.filter(Boolean).join(' ')
const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0))
const pct = (n) => `${clamp01(n) * 100}%`
const clip = (text, max = 14) => {
  const s = String(text || '')
  return s.length > max ? `${s.slice(0, max)}…` : s
}

/** 让 Modal 的 onClose 引用恒定：Modal 的副作用依赖 onClose，
 *  表单里每敲一个字都换一个新函数会把焦点抢回第一个可聚焦元素。 */
function useStable(fn) {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args) => ref.current(...args), [])
}

/** 所有破坏性操作的统一外壳：动作 → 影响范围 → 能否撤销 */
function ConfirmModal({ open, title, children, confirmText, tone = 'danger', onCancel, onConfirm }) {
  const close = useStable(onCancel)
  const ok = useStable(onConfirm)
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      footer={(
        <>
          <Button variant="secondary" onClick={close}>先不做</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={ok}>{confirmText}</Button>
        </>
      )}
    >
      <div className="p-admin__confirm">{children}</div>
    </Modal>
  )
}

/* ── 后台外壳 ─────────────────────────────────────────────── */

export default function Admin() {
  const route = useRoute()
  const state = useStore()
  const { showToast } = useToast()
  const tabId = TAB_IDS.includes(route.params.tab) ? route.params.tab : 'overview'
  const tab = TABS.find((t) => t.id === tabId) || TABS[0]
  const identities = demoIdentities()

  return (
    <div className="p-admin">
      <header className="p-admin__top">
        <a className="p-admin__brand" href="#/admin">
          <span className="p-admin__brandmark">不熟局</span>
          <span className="p-admin__brandsub">BU SHU · ADMIN</span>
        </a>
        <span className="p-admin__env">演示环境 · 数据存在本机</span>
      </header>

      <div className="p-admin__body">
        <aside className="p-admin__rail">
          <nav className="p-admin__tabs" aria-label="后台分栏">
            {TABS.map((t) => (
              <a
                key={t.id}
                className={cx('p-admin__tab', t.id === tabId && 'is-active')}
                href={`#/admin/${t.id}`}
                aria-current={t.id === tabId ? 'page' : undefined}
              >
                {t.name}
              </a>
            ))}
          </nav>

          <div className="p-admin__railfoot">
            <label className="p-admin__idlabel" htmlFor="admin-identity">切换演示身份</label>
            <div className="select-wrap">
              <select
                id="admin-identity"
                className="select p-admin__idselect"
                value={state.session.userId}
                onChange={(e) => {
                  const res = actions.switchSession(e.target.value)
                  showToast(res.ok ? '身份已切换' : (res.error || '切换失败，请稍后重试'), res.ok ? 'ok' : 'error')
                }}
              >
                {identities.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
            <a className="p-admin__back" href="#/">回到前台 →</a>
          </div>
        </aside>

        <div className="p-admin__main">
          <div className="p-admin__head">
            <h1 className="p-admin__title">{tab.name}</h1>
            <p className="p-admin__sub">{tab.hint}</p>
          </div>

          {tabId === 'overview' && <OverviewTab state={state} />}
          {tabId === 'match' && <MatchTab state={state} />}
          {tabId === 'activities' && <ActivitiesTab state={state} />}
          {tabId === 'venues' && <VenuesTab state={state} />}
          {tabId === 'library' && <LibraryTab state={state} />}
          {tabId === 'materials' && <MaterialsTab state={state} />}
          {tabId === 'tasks' && <TasksTab state={state} />}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Tab 1 概览
   ══════════════════════════════════════════════════════════ */

function OverviewTab({ state }) {
  const { showToast } = useToast()
  const stats = api.adminStats(state)
  const [askReset, setAskReset] = useState(false)
  const closeReset = useStable(() => setAskReset(false))

  const order = ['open', 'matching', 'locked', 'done', 'canceled']
  const dist = order
    .map((s) => ({ status: s, n: state.events.filter((e) => e.status === s).length }))
    .filter((x) => x.n > 0)
  const distTotal = dist.reduce((sum, x) => sum + x.n, 0)

  const scored = state.groups.filter((g) => ['locked', 'ongoing', 'finished'].includes(g.status))
  const lowScore = scored.filter((g) => (g.groupScore || 0) < 0.62).length

  const cards = [
    { label: '场次总数', value: stats.events },
    { label: '报名中场次', value: stats.openEvents },
    { label: '报名总数', value: stats.applications },
    { label: '成组数', value: stats.groups },
    { label: '已锁定组', value: stats.lockedGroups },
    { label: '在校用户', value: stats.users },
    { label: '场地数', value: stats.venues },
    { label: '待办任务', value: stats.pendingTasks },
  ]

  return (
    <>
      <div className="p-admin__stats">
        {cards.map((c) => <StatCard key={c.label} label={c.label} value={c.value} />)}
      </div>

      <div className="p-admin__panels">
        <section className="p-admin__panel p-admin__panel--span2" aria-labelledby="ov-dist">
          <h2 className="p-admin__panel-title" id="ov-dist">本周场次状态分布</h2>
          <div
            className="p-admin__stack"
            role="img"
            aria-label={`共 ${distTotal} 场：${dist.map((d) => `${STATUS_CN[d.status]} ${d.n} 场`).join('，')}`}
          >
            {dist.map((d) => (
              <span
                key={d.status}
                className={`p-admin__stackseg is-${d.status}`}
                style={{ flexGrow: d.n }}
              />
            ))}
          </div>
          <ul className="p-admin__legend">
            {dist.map((d) => (
              <li key={d.status} className="p-admin__legenditem">
                <span className={`p-admin__swatch is-${d.status}`} aria-hidden="true" />
                <span>{STATUS_CN[d.status]}</span>
                <span className="mono">{d.n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="p-admin__panel" aria-labelledby="ov-avg">
          <h2 className="p-admin__panel-title" id="ov-avg">平均组得分</h2>
          <p className="p-admin__big mono">{stats.avgScore.toFixed(4)}</p>
          <ProgressBar value={stats.avgScore * 100} label="平均组得分" />
          <p className="p-admin__hint">低于 0.62 这条线的有 {lowScore} 组，它们不进桌。</p>
        </section>

        <section className="p-admin__panel" aria-labelledby="ov-wait">
          <h2 className="p-admin__panel-title" id="ov-wait">候补人数</h2>
          <p className="p-admin__big mono">{stats.waitlist}</p>
          <p className="p-admin__hint">按报名时间排位，有人取消时按序补进。</p>
          <a className="p-admin__link" href="#/admin/match">去匹配工作台 →</a>
        </section>

        <section className="p-admin__panel p-admin__panel--span4 p-admin__panel--demo" aria-labelledby="ov-demo">
          <div>
            <h2 className="p-admin__panel-title" id="ov-demo">演示数据</h2>
            <p className="p-admin__hint">
              这里的数字来自本机浏览器里的演示种子，加上你刚才的每一次改动。
              评审前想回到初始状态，点右边；日常演示不用管它。
            </p>
          </div>
          <Button variant="danger" onClick={() => setAskReset(true)}>重置演示数据</Button>
        </section>
      </div>

      <ConfirmModal
        open={askReset}
        title="重置演示数据？"
        confirmText="重置并退出后台"
        onCancel={closeReset}
        onConfirm={() => {
          actions.resetDemo()
          setAskReset(false)
          showToast('演示数据已重置，身份回到学生', 'ok')
        }}
      >
        <p>会清掉：新加的场地与活动类型、跑出来的分组、报名与候补、勾过的任务。全部回到种子状态。</p>
        <p>演示身份也会还原成学生「南亭路口等红灯」，你会被退出后台；再切回管理员就能继续。</p>
        <p className="p-admin__dangerline">这一步不能撤销。</p>
      </ConfirmModal>
    </>
  )
}

/* ══════════════════════════════════════════════════════════
   Tab 2 匹配工作台
   ══════════════════════════════════════════════════════════ */

function pickMatchEvent(state) {
  const cands = state.events.filter((e) => ['open', 'matching', 'locked'].includes(e.status))
  if (!cands.length) return ''
  const pendingOf = (id) => state.applications.filter((a) => a.eventId === id && a.status === 'submitted').length
  // 排桌中（等人锁）优先，其次报名中按待匹配人数，最后已锁定（只读回看）
  const rank = (e) => (e.status === 'matching' ? 0 : e.status === 'open' ? 1 : 2)
  return [...cands]
    .sort((a, b) => (rank(a) - rank(b))
      || (pendingOf(b.id) - pendingOf(a.id))
      || (new Date(a.startAt) - new Date(b.startAt)))[0].id
}

function memberRow(state, event, type, uid) {
  const u = selectors.user(state, uid) || {}
  const app = state.applications.find((a) => a.eventId === event.id && a.userId === uid) || null
  const m = toMember(u, app, type)
  const answers = (app && app.answers) || {}
  return {
    id: uid,
    nickname: u.nickname || '一位同学',
    schoolShort: api.schoolShortOf(u.school || ''),
    grade: GRADE_CN[u.grade] || u.grade || '',
    gender: m.gender === 'female' ? '女' : m.gender === 'male' ? '男' : '其他',
    level: m.level ? (LEVEL_CN[m.level] || m.level) : '',
    goal: String(answers.goalText || '').trim(),
    teach: String(answers.teachSkill || '').trim(),
    learn: String(answers.learnSkill || '').trim(),
    topics: (m.topicsWanted.length ? m.topicsWanted : m.interestTags).slice(0, 2).join(' / '),
    profile: m.profile,
  }
}

function memberMeta(row, category) {
  if (category === 'competitive') return row.level ? `段位 ${row.level}` : '段位未填'
  if (category === 'buddy') return row.goal ? `目标「${clip(row.goal, 14)}」` : '目标未填'
  if (category === 'skill') {
    if (!row.teach && !row.learn) return '技能未填'
    return `${row.teach ? `教 ${clip(row.teach, 6)}` : '教 ?'} / ${row.learn ? `学 ${clip(row.learn, 6)}` : '学 ?'}`
  }
  return row.topics ? `话题 ${row.topics}` : '话题未填'
}

const CORE_CHECKS = [
  ['C1', '人数'],
  ['C2', '性别比例'],
  ['C3', '内外向配比'],
  ['C4', '带节奏的人'],
  ['C5', '同校聚集'],
  ['C9', '话题连通'],
  ['C11', '质量线'],
]
const EXTRA_CHECKS = [['C6', '同专业聚集'], ['C7', '隐私边界'], ['C8', '段位跨度'], ['C10', '技能闭环']]

function MatchTab({ state }) {
  const { showToast } = useToast()
  const [eventId, setEventId] = useState(() => pickMatchEvent(state))
  const [ask, setAsk] = useState(null) // 'match' | 'lock'
  const [openIds, setOpenIds] = useState([])
  const [notes, setNotes] = useState([])
  const closeAsk = useStable(() => setAsk(null))

  const ev = eventId ? selectors.event(state, eventId) : null
  const type = ev ? selectors.activityType(state, ev.typeId) : null

  const apps = useMemo(
    () => (ev ? state.applications.filter((a) => a.eventId === ev.id) : []),
    [state, ev],
  )
  const groups = useMemo(
    () => (ev
      ? state.groups
        .filter((g) => g.eventId === ev.id && g.status !== 'disbanded')
        .slice()
        .sort((a, b) => (a.index || 0) - (b.index || 0))
      : []),
    [state, ev],
  )

  const pending = apps.filter((a) => a.status === 'submitted')
  const registered = apps.filter((a) => !['canceled', 'expired'].includes(a.status))
  const minSize = Math.max(2, Number(type?.groupSize?.[0] ?? ev?.groupSize ?? 3))
  const capacity = ev ? (ev.capacityGroups || 1) * (ev.groupSize || 4) : 0
  const freeSlots = ev ? Math.max(0, (ev.capacityGroups || 1) - groups.length) : 0
  const canMake = Math.min(freeSlots, Math.floor(pending.length / minSize))
  const seatsLeft = ev ? selectors.seatsLeft(state, ev.id) : 0
  const waitlistRows = ev ? selectors.waitlistOf(state, ev.id) : []

  // 组得分 / 拆解 / 硬约束 / 理由：优先用引擎落库的 explanation（matchScore 就是它的 total），
  // 种子组没有这个字段才现算——两条路都出自 lib/match.js，页面上没有写死的分数。
  const computed = useMemo(() => {
    if (!ev || !type) return []
    const appsHere = state.applications.filter((a) => a.eventId === ev.id)
    return groups.map((g) => {
      const category = type.category || g.matchProfile || 'social'
      const ctx = { event: ev, activityType: type, users: state.users, applications: appsHere }
      const explain = (g.explanation && Array.isArray(g.explanation.terms) && g.explanation.terms.length)
        ? g.explanation
        : explainScore(g, category, ctx)
      const check = validateGroup(g, { ...ctx, category })
      const reason = g.matchReason || makeMatchReason(g, category, ctx)
      // 组员的 member 对象（match.js 口径）：画像、段位、氛围都用它，不从存储里猜
      const memberObjs = (g.memberIds || []).map((uid) => toMember(
        selectors.user(state, uid) || { id: uid },
        appsHere.find((a) => a.userId === uid) || null,
        type,
      ))
      // 老数据没有 explanation 时，explainScore 算氛围拿不到成员，这里补一次
      const vibe = explain.vibe || predictVibe({ members: memberObjs }, category)
      const members = (g.memberIds || []).map((uid, i) => ({
        ...memberRow(state, ev, type, uid),
        isHost: g.hostId === uid,
        profile: memberObjs[i].profile,
      }))
      return { g, category, explain, check, reason, vibe, members }
    })
  }, [state, ev, type, groups])

  const toggle = (id) => setOpenIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  const summary = useMemo(() => {
    const scores = computed.map((c) => c.explain.total)
    const avg = scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0
    return {
      avg,
      warn: computed.filter((c) => !c.check.ok).length,
      low: scores.filter((s) => s < 0.62).length,
    }
  }, [computed])

  if (!ev) {
    return (
      <Empty
        title="还没有可排的场次。"
        text="先在本周开一场，报名进来之后这里才有东西可排。"
        action={<Button as="a" href="#/admin/activities">去看活动类型</Button>}
      />
    )
  }

  const locked = ev.status === 'locked'
  const matchDisabled = locked || groups.length > 0 || pending.length < minSize

  return (
    <>
      <div className="p-admin__toolbar">
        <EventPicker state={state} value={eventId} onChange={setEventId} statuses={['open', 'matching', 'locked']} />

        <div className="p-admin__tstats">
          <span className="p-admin__tstat">报名 <b className="mono">{registered.length}</b> 人
            <em>（待匹配 {pending.length} · 候补 {waitlistRows.length}）</em>
          </span>
          <span className="p-admin__tstat">
            {groups.length
              ? <>已开 <b className="mono">{groups.length}</b> 桌</>
              : <>可分 <b className="mono">{canMake}</b> 组</>}
          </span>
          <span className="p-admin__tstat">余位 <b className="mono">{seatsLeft}</b> / {capacity}</span>
          <Pill tone={locked ? 'info' : 'ok'}>{STATUS_CN[ev.status] || ev.status}</Pill>
        </div>

        {groups.length ? (
          <div className="p-admin__actions">
            <Button variant="secondary" disabled>重新匹配</Button>
            <Button variant="primary" onClick={() => setAsk('lock')} disabled={locked}>
              锁定分组
            </Button>
          </div>
        ) : null}
      </div>

      <p className="p-admin__hint">
        组得分、加权拆解、硬约束都是这里现算的（lib/match.js，权重按 site-spec §6.3），
        不是存储里的粗算值；同一场两次跑出来分数一致。
      </p>

      {groups.length === 0 && pending.length > 0 && pending.length < minSize ? (
        <p className="p-admin__hint">
          待匹配 {pending.length} 人，不够一桌的 {minSize} 人成局线；等人再多一点，或把这场并到别的场次。
        </p>
      ) : null}
      {groups.length > 0 && !locked ? (
        <p className="p-admin__hint">
          已开 {groups.length} 桌。重跑只会给还没排的人补桌，已经开的桌不会再拆；要整场重排，去概览重置演示数据。
        </p>
      ) : null}
      {locked ? (
        <p className="p-admin__hint">这一场已锁定，物料开始生成。锁定后不能再改分组。</p>
      ) : null}

      {notes.length ? (
        <section className="p-admin__notes" aria-labelledby="run-notes">
          <h2 className="p-admin__panel-title" id="run-notes">本次编排说明</h2>
          <ul>
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
          <p className="p-admin__hint">这段是引擎跑完当场给的，只在本页有效；换场次或刷新就没了。</p>
        </section>
      ) : null}

      <div className="p-admin__groups">
        {computed.map((data) => (
          <GroupCard
            key={data.g.id}
            data={data}
            open={openIds.includes(data.g.id)}
            onToggle={() => toggle(data.g.id)}
          />
        ))}
      </div>

      {groups.length === 0 ? (
        <Empty
          title="还没到分组时间。"
          text="报名截止后这里会自动跑一遍，跑完等人看。也可以现在手动跑一次，跑完不会自动锁定。"
          action={<Button onClick={() => setAsk('match')} disabled={matchDisabled}>开始匹配</Button>}
          className="p-admin__emptyblock"
        />
      ) : null}

      {groups.length ? (
        <div className="p-admin__summary">
          <span>未分组 <b className="mono">{pending.length}</b> 人</span>
          <span>候补 <b className="mono">{waitlistRows.length}</b> 人</span>
          <span>平均组得分 <b className="mono">{summary.avg.toFixed(4)}</b></span>
          <span>告警 <b className="mono">{summary.warn}</b> 组</span>
          {summary.low ? (
            <span className="p-admin__summary-warn">! C11 质量线：{summary.low} 组低于 0.62</span>
          ) : null}
        </div>
      ) : null}

      {waitlistRows.length ? (
        <section className="p-admin__panel p-admin__panel--plain" aria-labelledby="wait-title">
          <h2 className="p-admin__panel-title" id="wait-title">候补池 · {waitlistRows.length} 人</h2>
          <ul className="p-admin__waitlist">
            {waitlistRows.map((w) => {
              const u = selectors.user(state, w.userId) || {}
              const g = w.promotedGroupId ? selectors.group(state, w.promotedGroupId) : null
              const reason = w.status === 'promoted'
                ? `已补进 ${g ? `${g.tableNo} 桌` : '某一桌'}${w.promotedAt ? ` · ${fmtDateTime(w.promotedAt)}` : ''}`
                : (w.reason || `这一场开组时没排进来，候补第 ${w.rank} 位；有人取消时按序补进。`)
              return (
                <li key={w.id} className="p-admin__waitrow">
                  <span className="p-admin__waitrank mono">#{w.rank}</span>
                  <span className="p-admin__waitname">{u.nickname || w.userId}</span>
                  <span className="p-admin__waitmeta">{api.schoolShortOf(u.school || '')}</span>
                  <span className="p-admin__waitwhy">{reason}</span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <ConfirmModal
        open={ask === 'match'}
        title="跑一次匹配？"
        confirmText="跑吧"
        tone="primary"
        onCancel={closeAsk}
        onConfirm={() => {
          setAsk(null)
          let res
          try {
            res = actions.runMatching(ev.id)
          } catch (err) {
            showToast('匹配跑崩了，不是你操作的问题；数据没变，稍后再试', 'error')
            return
          }
          if (!res.ok) {
            setNotes([])
            showToast(res.error || '匹配没跑起来，请稍后重试', 'error')
            return
          }
          setNotes(res.notes || [])
          showToast(
            `跑完了，开出 ${res.created} 桌${res.waitlisted ? `，候补排到第 ${res.waitlisted} 位` : ''}`,
            'ok',
          )
        }}
      >
        <p>这一场 {registered.length} 人报名，将排出最多 {canMake} 桌。</p>
        <p>跑完给你看，不会自动锁定；锁定要你另外点一次。</p>
      </ConfirmModal>

      <ConfirmModal
        open={ask === 'lock'}
        title="锁定这一场的分组？"
        confirmText="确认锁定"
        onCancel={closeAsk}
        onConfirm={() => {
          setAsk(null)
          let res
          try {
            res = actions.lockEvent(ev.id)
          } catch (err) {
            showToast('锁定没成功，数据没变，稍后再试', 'error')
            return
          }
          if (!res.ok) {
            showToast(res.error || '锁定失败，请稍后重试', 'error')
            return
          }
          showToast(`已锁定 ${res.groups} 桌，物料开始生成`, 'ok')
        }}
      >
        <p>锁定后这一场 {groups.length} 桌的人才能看到彼此，也会开始生成物料。</p>
        <p>本期没有「解锁」接口，锁了不会自动撤回；要整场重排，只能去概览重置演示数据。</p>
        {summary.low ? (
          <p className="p-admin__dangerline">
            有 {summary.low} 组低于质量线 0.62，照样会生成物料。建议先看清「为什么这样分」再锁。
          </p>
        ) : null}
      </ConfirmModal>
    </>
  )
}

function GroupCard({ data, open, onToggle }) {
  const { g, explain, check, members, category } = data
  const panelId = `why-${g.id}`
  return (
    <article className="p-admin__group">
      <header className="p-admin__grouphead">
        <div className="p-admin__groupno">
          <span className="p-admin__tableNo mono">{g.tableNo}</span>
          <span className="p-admin__groupsub">
            {members.length} 人 · {GROUP_STATUS_CN[g.status] || g.status}
          </span>
        </div>

        <div className="p-admin__score">
          <span className="p-admin__scoreNum mono">{explain.total.toFixed(4)}</span>
          <span className="p-admin__scorebar" aria-hidden="true">
            <span style={{ width: pct(explain.total) }} />
          </span>
          <span className="sr-only">组得分 {explain.total.toFixed(4)}，满分 1</span>
        </div>

        <div className="p-admin__groupflags">
          {check.ok
            ? <Pill tone="ok">✓ 硬约束通过</Pill>
            : <Pill tone="danger">! {check.violated.length} 条违例</Pill>}
        </div>

        <Button
          size="sm"
          variant="secondary"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          {open ? '收起拆解' : '为什么这样分'}
        </Button>
      </header>

      <ul className="p-admin__members">
        {members.map((m) => (
          <li key={m.id} className="p-admin__member">
            <span className="p-admin__avatar" aria-hidden="true">{m.nickname.slice(0, 1)}</span>
            <span className="p-admin__mname">
              {m.nickname}
              {m.isHost ? <Tag variant="solid" className="p-admin__hosttag">组长</Tag> : null}
            </span>
            <span className="p-admin__mmeta">
              {m.schoolShort} · {m.grade} · {memberMeta(m, category)}
            </span>
          </li>
        ))}
      </ul>

      {open ? <WhyPanel id={panelId} data={data} /> : null}
    </article>
  )
}

export function WhyPanel({ id, data }) {
  const { explain, check, reason, vibe, category, members } = data
  const sumTerms = explain.terms.reduce((sum, t) => sum + t.contribution, 0)
  const weightSum = explain.terms.reduce((sum, t) => sum + t.weight, 0)
  const baseDelta = explain.base - sumTerms
  const totalCheck = sumTerms + baseDelta + explain.bonus - explain.penalty
  const agrees = Math.abs(totalCheck - explain.total) < 0.001
  const byCode = new Map((check.violated || []).map((v) => [v.code, v]))
  const extra = (check.violated || []).filter((v) => !CORE_CHECKS.some(([code]) => code === v.code))

  return (
    <div className="p-admin__why" id={id}>
      <section className="p-admin__whyblock">
        <h3 className="p-admin__whyblock-title">整组一句话</h3>
        <p className="p-admin__reason">{reason}</p>
        <p className="p-admin__vibe">
          <Pill tone="info">{vibe.tag}</Pill>
          <span>{vibe.note}</span>
        </p>
      </section>

      <section className="p-admin__whyblock">
        <h3 className="p-admin__whyblock-title">
          加权拆解
          <span className="p-admin__whyblock-meta mono">
            {explain.pairCount} 对 · 权重合计 {weightSum.toFixed(2)}
          </span>
        </h3>

        <div className="p-admin__terms">
          {explain.terms.map((t) => (
            <div className="p-admin__term" key={t.key}>
              <span className="p-admin__term-label">{t.label}</span>
              <span className="p-admin__term-w mono">{t.weight.toFixed(2)} × {t.meanRaw.toFixed(2)}</span>
              <span className="p-admin__track" aria-hidden="true">
                <span className="p-admin__fill" style={{ width: pct(t.meanRaw) }} />
              </span>
              <span className="p-admin__term-c mono">{t.contribution.toFixed(4)}</span>
            </div>
          ))}
        </div>

        <dl className="p-admin__adjust">
          <div>
            <dt>Σ 加权项</dt>
            <dd className="mono">{sumTerms.toFixed(4)}</dd>
          </div>
          <div>
            <dt>组级修正{category === 'competitive' ? '（最低一对 + 分队均衡）' : '（最低一对折算）'}</dt>
            <dd className="mono">{baseDelta >= 0 ? '+' : ''}{baseDelta.toFixed(4)}</dd>
          </div>
          <div>
            <dt>氛围加成</dt>
            <dd className="mono">+{explain.bonus.toFixed(2)}</dd>
          </div>
          <div>
            <dt>硬伤惩罚</dt>
            <dd className="mono">−{explain.penalty.toFixed(4)}</dd>
          </div>
          <div className="p-admin__adjust-total">
            <dt>组得分</dt>
            <dd className="mono">{explain.total.toFixed(4)}</dd>
          </div>
        </dl>

        <p className={cx('p-admin__reconcile', agrees ? 'is-pass' : 'is-fail')}>
          {agrees
            ? `✓ 对账一致：${sumTerms.toFixed(4)} ${baseDelta >= 0 ? '+' : '−'} ${Math.abs(baseDelta).toFixed(4)} + ${explain.bonus.toFixed(2)} − ${explain.penalty.toFixed(4)} = ${explain.total.toFixed(4)}`
            : `! 对账差了 ${(totalCheck - explain.total).toFixed(4)}，先别信这个分`}
        </p>

        <ul className="p-admin__penalties">
          {explain.penalties.length ? explain.penalties.map((p) => (
            <li key={p.key}>
              <span className="p-admin__penalty-label">{p.label}</span>
              <span className="mono">−{p.amount.toFixed(4)}</span>
              <span className="p-admin__penalty-detail">{p.detail}</span>
            </li>
          )) : <li className="p-admin__penalty-none">没有触发任何惩罚项。</li>}
        </ul>
      </section>

      <section className="p-admin__whyblock">
        <h3 className="p-admin__whyblock-title">
          硬约束
          <span className="p-admin__whyblock-meta">
            {check.ok ? '全部通过' : `${check.violated.length} 条没过`}
          </span>
        </h3>
        <ul className="p-admin__checks">
          {CORE_CHECKS.map(([code, label]) => {
            const bad = byCode.get(code)
            return (
              <li key={code} className={cx('p-admin__check', bad ? 'is-fail' : 'is-pass')}>
                <span className="p-admin__checkmark" aria-hidden="true">{bad ? '!' : '✓'}</span>
                <span className="p-admin__checkname">{label}</span>
                <span className="p-admin__checkdetail">{bad ? bad.detail : '通过'}</span>
              </li>
            )
          })}
          {extra.map((v) => (
            <li key={v.code} className="p-admin__check is-fail">
              <span className="p-admin__checkmark" aria-hidden="true">!</span>
              <span className="p-admin__checkname">{v.label}</span>
              <span className="p-admin__checkdetail">{v.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="p-admin__whyblock">
        <h3 className="p-admin__whyblock-title">
          组员画像
          <span className="p-admin__whyblock-meta">由问卷推导，和匹配用的是同一套</span>
        </h3>
        <div className="p-admin__tablewrap">
          <table className="p-admin__table p-admin__table--tight">
            <caption className="sr-only">组员画像（社交能量 / 表达欲 / 开放性 / 目标强度）</caption>
            <thead>
              <tr>
                <th scope="col">成员</th>
                <th scope="col">性别</th>
                <th scope="col">社交能量</th>
                <th scope="col">表达欲</th>
                <th scope="col">开放性</th>
                <th scope="col">目标强度</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td data-label="成员">
                    <span className="p-admin__cellmain">{m.nickname}</span>
                    <span className="p-admin__cellsub">{m.schoolShort} · {m.grade}</span>
                  </td>
                  <td data-label="性别">{m.gender}</td>
                  <td data-label="社交能量"><MiniBar value={m.profile.socialEnergy} /></td>
                  <td data-label="表达欲"><MiniBar value={m.profile.expressiveness} /></td>
                  <td data-label="开放性"><MiniBar value={m.profile.openness} /></td>
                  <td data-label="目标强度"><MiniBar value={m.profile.goalIntensity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function MiniBar({ value }) {
  const v = Number(value) || 0
  return (
    <span className="p-admin__minibar">
      <span className="p-admin__minitrack" aria-hidden="true">
        <span className="p-admin__minifill" style={{ width: pct(v) }} />
      </span>
      <span className="mono">{v.toFixed(2)}</span>
    </span>
  )
}

/* ══════════════════════════════════════════════════════════
   Tab 3 活动类型
   ══════════════════════════════════════════════════════════ */

function isOn(type) {
  return type.active !== false
}

function ActivitiesTab({ state }) {
  const { showToast } = useToast()
  const types = useMemo(
    () => [...state.activityTypes].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [state.activityTypes],
  )
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState({})
  const [askOffline, setAskOffline] = useState(null)
  const closeDraft = useStable(() => { setDraft(null); setErrors({}) })
  const closeOffline = useStable(() => setAskOffline(null))

  const openNew = () => {
    setErrors({})
    setDraft({
      id: '', isNew: true, name: '', category: 'social',
      duration: '120', min: '4', max: '6', levelRequired: false, priceLabel: '不收费',
    })
  }

  const openEdit = (t) => {
    setErrors({})
    setDraft({
      id: t.id, isNew: false, name: t.name, category: t.category || 'social',
      duration: String(t.duration ?? 120),
      min: String(t.groupSize?.[0] ?? 4),
      max: String(t.groupSize?.[1] ?? 6),
      levelRequired: Boolean(t.levelRequired),
      priceLabel: t.priceLabel || '不收费',
    })
  }

  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const save = () => {
    const name = draft.name.trim()
    const next = {}
    if (!name) next.name = '这一项得填。'
    const duration = Number(draft.duration)
    if (!Number.isFinite(duration) || duration <= 0) next.duration = '填分钟数，比如 90。'
    const min = Number(draft.min)
    const max = Number(draft.max)
    if (!Number.isFinite(min) || min < 2) next.min = '至少 2 人。'
    if (!Number.isFinite(max) || max < min) next.max = '不能小于最少人数。'
    if (Object.keys(next).length) { setErrors(next); return }

    const payload = {
      name,
      category: draft.category,
      duration,
      groupSize: [min, max],
      levelRequired: Boolean(draft.levelRequired),
      priceLabel: draft.priceLabel.trim() || '不收费',
    }
    if (!draft.isNew) payload.id = draft.id
    else payload.id = `custom_${Date.now().toString(36)}`

    const res = actions.upsertActivityType(payload)
    if (!res.ok) {
      showToast(res.error || '没保存上，过一分钟再试', 'error')
      return
    }
    setDraft(null)
    showToast(res.created ? `加上了「${name}」` : `改好了「${name}」`, 'ok')
  }

  const offlineCountOf = (id) => state.groups.filter(
    (g) => g.typeId === id && !['finished', 'disbanded'].includes(g.status),
  ).length

  const toggleActive = (t) => {
    if (isOn(t)) { setAskOffline(t); return }
    const res = actions.upsertActivityType({ id: t.id, name: t.name, active: true })
    showToast(res.ok ? `「${t.name}」已上架` : (res.error || '操作没成功，请稍后重试'), res.ok ? 'ok' : 'error')
  }

  return (
    <>
      <div className="p-admin__toolbar">
        <p className="p-admin__toolbar-note">下线一个类型，本周已开的桌照常进行。</p>
        <div className="p-admin__actions">
          <Button onClick={openNew}>新增类型</Button>
        </div>
      </div>

      <div className="p-admin__tablewrap">
        <table className="p-admin__table p-admin__table--sticky">
          <caption className="sr-only">16 个活动类型的分类、时长、组规模、段位要求与价格档</caption>
          <thead>
            <tr>
              <th scope="col">名称</th>
              <th scope="col">分类</th>
              <th scope="col">时长</th>
              <th scope="col">每组人数</th>
              <th scope="col">段位必填</th>
              <th scope="col">价格档</th>
              <th scope="col">上架状态</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => {
              const on = isOn(t)
              return (
                <tr key={t.id} className={cx(!on && 'is-off')}>
                  <td data-label="名称">
                    <span className="p-admin__cellmain">{t.name}</span>
                    <span className="p-admin__cellsub mono">{t.id}</span>
                  </td>
                  <td data-label="分类">{CATEGORY_CN[t.category] || t.category}</td>
                  <td data-label="时长" className="mono">{fmtDuration(t.duration)}</td>
                  <td data-label="每组人数" className="mono">
                    {fmtGroupSize(t.groupSize?.[0], t.groupSize?.[1])}
                  </td>
                  <td data-label="段位必填">
                    <span className={t.levelRequired ? 'p-admin__yes' : 'p-admin__no'}>
                      {t.levelRequired ? '✓ 必填' : '— 不限'}
                    </span>
                  </td>
                  <td data-label="价格档">{t.priceLabel || '不收费'}</td>
                  <td data-label="上架状态">
                    <button
                      type="button"
                      className={cx('p-admin__switch', on ? 'is-on' : 'is-off')}
                      aria-pressed={on}
                      onClick={() => toggleActive(t)}
                    >
                      {on ? '✓ 已上架' : '✗ 已下架'}
                    </button>
                  </td>
                  <td data-label="操作">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>编辑</Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={closeDraft}
        title={draft?.isNew ? '新增活动类型' : `编辑「${draft?.name || ''}」`}
        footer={(
          <>
            <Button variant="secondary" onClick={closeDraft}>先不改</Button>
            <Button onClick={save}>保存</Button>
          </>
        )}
      >
        {draft ? (
          <div className="p-admin__form">
            <Input
              label="名称"
              required
              value={draft.name}
              error={errors.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="比如：夜宵局"
              hint={draft.isNew ? '新类型的 id 会自动加 custom_ 前缀。' : `id：${draft.id}`}
            />
            <Select
              label="分类"
              value={draft.category}
              onChange={(e) => set('category', e.target.value)}
              options={[
                { value: 'social', label: '社交型 · 性格配比与话题' },
                { value: 'buddy', label: '搭子型 · 目标与作息' },
                { value: 'competitive', label: '竞技型 · 段位接近' },
                { value: 'skill', label: '技能型 · 教与学互补' },
              ]}
            />
            <Input
              label="时长（分钟）"
              required
              type="number"
              min="15"
              step="15"
              value={draft.duration}
              error={errors.duration}
              onChange={(e) => set('duration', e.target.value)}
            />
            <div className="p-admin__formgrid">
              <Input
                label="每组最少"
                required
                type="number"
                min="2"
                value={draft.min}
                error={errors.min}
                onChange={(e) => set('min', e.target.value)}
              />
              <Input
                label="每组最多"
                required
                type="number"
                min="2"
                value={draft.max}
                error={errors.max}
                onChange={(e) => set('max', e.target.value)}
              />
            </div>
            <Input
              label="价格档"
              value={draft.priceLabel}
              onChange={(e) => set('priceLabel', e.target.value)}
              hint="写人话：AA · 人均 45 上下 / 不收费 / AA · 场地费均摊。"
            />
            <label className="p-admin__inlinecheck">
              <input
                type="checkbox"
                checked={draft.levelRequired}
                onChange={(e) => set('levelRequired', e.target.checked)}
              />
              <span>报名时要填段位（竞技型、技能型用）</span>
            </label>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={Boolean(askOffline)}
        title={`下线「${askOffline?.name || ''}」？`}
        confirmText="确认下线"
        onCancel={closeOffline}
        onConfirm={() => {
          const t = askOffline
          const res = actions.upsertActivityType({ id: t.id, name: t.name, active: false })
          setAskOffline(null)
          showToast(res.ok ? `「${t.name}」已下架` : (res.error || '操作没成功，请稍后重试'), res.ok ? 'ok' : 'error')
        }}
      >
        <p>本周 {askOffline ? offlineCountOf(askOffline.id) : 0} 桌照常进行，但首页不再展示、不能再报。</p>
        <p>历史报名与物料不受影响。想再开，点一下就能上架。</p>
      </ConfirmModal>
    </>
  )
}

/* ══════════════════════════════════════════════════════════
   Tab 4 场地库
   ══════════════════════════════════════════════════════════ */

function formatDays(days = []) {
  const list = [...new Set(days.map(Number))].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b)
  if (!list.length) return '未填'
  if (list.length === 7) return '每天'
  const contiguous = list.every((d, i) => i === 0 || d === list[i - 1] + 1)
  if (contiguous && list.length >= 2) return `${WEEK_CN[list[0] - 1]}–${WEEK_CN[list[list.length - 1] - 1]}`
  return list.map((d) => WEEK_CN[d - 1]).join('、')
}

function inUseGroups(state, venueId) {
  return state.groups.filter((g) => g.venueId === venueId && g.status !== 'disbanded').length
}

function VenuesTab({ state }) {
  const { showToast } = useToast()
  const [filter, setFilter] = useState('all')
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState({})
  const [askStop, setAskStop] = useState(null)
  const closeDraft = useStable(() => { setDraft(null); setErrors({}) })
  const closeStop = useStable(() => setAskStop(null))

  const venues = useMemo(
    () => [...state.venues].sort((a, b) => a.name.localeCompare(b.name, 'zh')),
    [state.venues],
  )
  const counts = {
    all: venues.length,
    in: venues.filter((v) => v.kind === '校内').length,
    out: venues.filter((v) => v.kind === '校外').length,
  }
  const shown = venues.filter((v) => (filter === 'all' ? true : filter === 'in' ? v.kind === '校内' : v.kind === '校外'))

  const campusOptions = useMemo(() => {
    const set = new Set(state.venues.map((v) => v.campus).filter(Boolean))
    state.users.forEach((u) => { if (u.school) set.add(u.school) })
    return [...set].sort((a, b) => a.localeCompare(b, 'zh')).map((c) => ({ value: c, label: c }))
  }, [state.venues, state.users])

  const typeName = (id) => (selectors.activityType(state, id) || {}).name || id

  const openNew = () => {
    setErrors({})
    setDraft({
      id: '', isNew: true, name: '', kind: '校外', campus: '大学城公共',
      capacityGroups: '2', openDays: [1, 2, 3, 4, 5, 6, 7], activityTypes: [], detail: '',
    })
  }

  const openEdit = (v) => {
    setErrors({})
    setDraft({
      id: v.id, isNew: false, name: v.name, kind: v.kind || '校外', campus: v.campus || '大学城公共',
      capacityGroups: String(v.capacityGroups ?? 1),
      openDays: Array.isArray(v.openDays) && v.openDays.length ? [...v.openDays] : [1, 2, 3, 4, 5, 6, 7],
      activityTypes: Array.isArray(v.activityTypes) ? [...v.activityTypes] : [],
      detail: v.detail || '',
    })
  }

  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const toggleDay = (day) => {
    setDraft((d) => ({
      ...d,
      openDays: d.openDays.includes(day) ? d.openDays.filter((x) => x !== day) : [...d.openDays, day].sort((a, b) => a - b),
    }))
    setErrors((e) => (e.openDays ? { ...e, openDays: undefined } : e))
  }

  const toggleType = (id) => {
    setDraft((d) => ({
      ...d,
      activityTypes: d.activityTypes.includes(id)
        ? d.activityTypes.filter((x) => x !== id)
        : [...d.activityTypes, id],
    }))
  }

  const save = () => {
    const name = draft.name.trim()
    const next = {}
    if (!name) next.name = '这一项得填。'
    const cap = Number(draft.capacityGroups)
    if (!Number.isFinite(cap) || cap < 1) next.capacityGroups = '至少 1 组。'
    if (!draft.openDays.length) next.openDays = '至少选一天。'
    if (Object.keys(next).length) { setErrors(next); return }

    const payload = {
      name,
      kind: draft.kind,
      campus: draft.campus,
      capacityGroups: cap,
      openDays: draft.openDays,
      activityTypes: draft.activityTypes,
      detail: draft.detail.trim(),
    }
    if (!draft.isNew) payload.id = draft.id

    const res = actions.upsertVenue(payload)
    if (!res.ok) {
      showToast(res.error || '没保存上，过一分钟再试', 'error')
      return
    }
    setDraft(null)
    showToast(res.created ? `加上了「${name}」` : `改好了「${name}」`, 'ok')
  }

  const stopVenue = (v) => {
    const res = actions.upsertVenue({ id: v.id, name: v.name, active: false })
    setAskStop(null)
    showToast(res.ok ? `「${v.name}」已停用` : (res.error || '操作没成功，请稍后重试'), res.ok ? 'ok' : 'error')
  }

  const startVenue = (v) => {
    const res = actions.upsertVenue({ id: v.id, name: v.name, active: true })
    showToast(res.ok ? `「${v.name}」已启用` : (res.error || '操作没成功，请稍后重试'), res.ok ? 'ok' : 'error')
  }

  return (
    <>
      <div className="p-admin__toolbar">
        <p className="p-admin__toolbar-note">容量不够就别硬塞。两组挤一个包间，体验会明显变差。</p>
        <div className="p-admin__actions">
          <Button onClick={openNew}>新增场地</Button>
        </div>
      </div>

      <div className="p-admin__filters" role="group" aria-label="按校内校外筛选">
        {[
          { id: 'all', label: `全部 ${counts.all}` },
          { id: 'in', label: `校内 ${counts.in}` },
          { id: 'out', label: `校外 ${counts.out}` },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={cx('p-admin__chip', filter === f.id && 'is-on')}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty
          title="这一档还没有场地。"
          text="场地库是空的。先加三个：一个吃饭的、一个自习的、一个球类场地。"
          action={<Button onClick={openNew}>新增场地</Button>}
        />
      ) : (
        <div className="p-admin__tablewrap">
          <table className="p-admin__table">
            <caption className="sr-only">场地库：名称、校内校外、校区、可容纳组数、开放日与适合的活动类型</caption>
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col">校内校外</th>
                <th scope="col">校区</th>
                <th scope="col">可容纳组数</th>
                <th scope="col">开放日</th>
                <th scope="col">适合哪几类</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => {
                const off = v.active === false
                const types = (v.activityTypes || []).map(typeName)
                const typeText = types.length
                  ? `${types.slice(0, 3).join('、')}${types.length > 3 ? ` 等 ${types.length} 类` : ''}`
                  : '未标注'
                return (
                  <tr key={v.id} className={cx(off && 'is-off')}>
                    <td data-label="名称">
                      <span className="p-admin__cellmain">{v.name}</span>
                      <span className="p-admin__cellsub" title={v.blurb || v.detail || ''}>
                        {v.blurb || v.detail || '—'}
                      </span>
                      {off ? <Pill tone="warn">已停用</Pill> : null}
                    </td>
                    <td data-label="校内校外">{v.kind || '校外'}</td>
                    <td data-label="校区">{v.campus || '—'}</td>
                    <td data-label="可容纳组数" className="mono">{v.capacityGroups ?? 1} 组</td>
                    <td data-label="开放日">{formatDays(v.openDays)}</td>
                    <td data-label="适合哪几类">{typeText}</td>
                    <td data-label="操作">
                      <span className="p-admin__rowactions">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(v)}>编辑</Button>
                        {off
                          ? <Button size="sm" variant="ghost" onClick={() => startVenue(v)}>启用</Button>
                          : <Button size="sm" variant="danger" onClick={() => setAskStop(v)}>停用</Button>}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(draft)}
        onClose={closeDraft}
        title={draft?.isNew ? '新增场地' : `编辑「${draft?.name || ''}」`}
        footer={(
          <>
            <Button variant="secondary" onClick={closeDraft}>先不改</Button>
            <Button onClick={save}>保存</Button>
          </>
        )}
      >
        {draft ? (
          <div className="p-admin__form">
            <Input
              label="名称"
              required
              value={draft.name}
              error={errors.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="比如：三饭二楼"
            />
            <div className="p-admin__formgrid">
              <Select
                label="校内 / 校外"
                value={draft.kind}
                onChange={(e) => set('kind', e.target.value)}
                options={['校内', '校外']}
              />
              <Select
                label="校区"
                value={draft.campus}
                onChange={(e) => set('campus', e.target.value)}
                options={campusOptions}
              />
            </div>
            <Input
              label="可容纳组数"
              required
              type="number"
              min="1"
              value={draft.capacityGroups}
              error={errors.capacityGroups}
              onChange={(e) => set('capacityGroups', e.target.value)}
              hint="同一时段能同时开几桌。别按「挤一挤」估。"
            />
            <div className="p-admin__fieldblock">
              <p className="p-admin__fieldlabel">开放日</p>
              <div className="p-admin__days" role="group" aria-label="开放日">
                {WEEK_CN.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    className={cx('p-admin__day', draft.openDays.includes(i + 1) && 'is-on')}
                    aria-pressed={draft.openDays.includes(i + 1)}
                    onClick={() => toggleDay(i + 1)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {errors.openDays ? <p className="p-admin__fielderr" role="alert">× {errors.openDays}</p> : null}
            </div>
            <div className="p-admin__fieldblock">
              <p className="p-admin__fieldlabel">适合哪几类</p>
              <div className="p-admin__chips" role="group" aria-label="适合的活动类型">
                {state.activityTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={cx('p-admin__chip', draft.activityTypes.includes(t.id) && 'is-on')}
                    aria-pressed={draft.activityTypes.includes(t.id)}
                    onClick={() => toggleType(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              label="怎么走（不是「在哪」）"
              value={draft.detail}
              rows={3}
              maxLength={80}
              onChange={(e) => set('detail', e.target.value)}
              hint="写「商场 3 层扶梯口右手第二家」这种。会印在物料页眉的地点上，写虚了到场会尴尬。"
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={Boolean(askStop)}
        title={`停用「${askStop?.name || ''}」？`}
        confirmText="确认停用"
        onCancel={closeStop}
        onConfirm={() => stopVenue(askStop)}
      >
        <p>已分配给它的 {askStop ? inUseGroups(state, askStop.id) : 0} 组照常使用，物料上仍印原地点。</p>
        <p>本期停用只打标记：场次里已有的场地池不会自动清掉，需要的话手动改场次。随时可以再启用。</p>
      </ConfirmModal>
    </>
  )
}

/* ══════════════════════════════════════════════════════════
   Tab 5 题库与玩法库
   ══════════════════════════════════════════════════════════ */

/** 只读视图：题库全量表要等 /api/questions，这里统计现有物料里实际用到的题卡 */
function buildLibrary(state) {
  const segments = { icebreak: new Map(), interest: new Map(), opinion: new Map() }
  const play = { warmup: new Set(), rounds: 0, slots: 0, pairs: 0, checks: 0 }

  for (const g of state.groups) {
    if (g.status === 'disbanded') continue
    const ev = selectors.event(state, g.eventId)
    if (!ev) continue
    const type = selectors.activityType(state, g.activityTypeId || ev.typeId)
    if (!type) continue
    const material = buildMaterial({
      group: g,
      event: ev,
      activityType: type,
      users: state.users,
      applications: state.applications.filter((a) => a.eventId === ev.id),
      venue: selectors.venue(state, g.venueId || ev.venueId),
    })
    const payload = material.payload || {}
    if (material.kind === 'topicCards') {
      for (const card of payload.deck || []) {
        if (card.kind === 'prompt') continue
        const bucket = segments[card.depth]
        if (!bucket) continue
        const depthNo = { icebreak: 1, interest: 2, opinion: 3 }[card.depth] || card.depth
        const row = bucket.get(card.id) || { id: card.id, text: card.text, depth: depthNo, uses: 0 }
        row.uses += 1
        bucket.set(card.id, row)
      }
    }
    if (material.kind === 'tournament') {
      for (const step of payload.warmup || []) play.warmup.add(`${step.name}·${step.minutes}分`)
      play.rounds += (payload.rounds || []).length
    }
    if (material.kind === 'skillSchedule') {
      play.slots += (payload.timetable || []).length
      play.pairs += (payload.pairs || []).length
    }
    if (material.kind === 'checkinSheet') {
      play.checks += (payload.checkTable || []).length
    }
  }

  return {
    segments,
    play,
    total: Object.values(segments).reduce((sum, bucket) => sum + bucket.size, 0),
  }
}

function playSummary(play) {
  const bits = [
    play.warmup.size ? `热身流程 ${play.warmup.size} 条` : '',
    play.rounds ? `赛制轮次 ${play.rounds} 轮` : '',
    play.slots ? `技能课节 ${play.slots} 节` : '',
    play.checks ? `打卡项 ${play.checks} 条` : '',
  ].filter(Boolean)
  if (!bits.length) {
    return '玩法库：现有物料里还没有赛制单或课程表，等开了竞技型 / 技能型的局再统计。'
  }
  return `玩法库：${bits.join(' · ')}。`
}

function LibraryTab({ state }) {
  const [seg, setSeg] = useState('icebreak')
  const lib = useMemo(() => buildLibrary(state), [state])
  const counts = SEGMENTS.map((s) => ({ ...s, n: lib.segments[s.id].size }))
  const maxCount = Math.max(1, ...counts.map((c) => c.n))
  const rows = [...lib.segments[seg].values()].sort((a, b) => (b.uses - a.uses) || a.id.localeCompare(b.id))

  return (
    <>
      <p className="p-admin__toolbar-note">改一句就换一句。已经发出去的物料不会跟着变。</p>

      <section className="p-admin__panel p-admin__panel--plain" aria-labelledby="lib-stats">
        <h2 className="p-admin__panel-title" id="lib-stats">分类统计 · 共 {lib.total} 题（去重）</h2>
        <div className="p-admin__libstats">
          {counts.map((c) => (
            <div className="p-admin__libbar" key={c.id}>
              <span className="p-admin__liblabel">{c.name}</span>
              <span className="p-admin__track" aria-hidden="true">
                <span className="p-admin__fill" style={{ width: pct(c.n / maxCount) }} />
              </span>
              <span className="mono">{c.n} 题</span>
            </div>
          ))}
        </div>
        <p className="p-admin__hint">{playSummary(lib.play)}</p>
      </section>

      <div className="p-admin__segs" role="tablist" aria-label="题目分段">
        {counts.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            id={`seg-${c.id}`}
            aria-selected={seg === c.id}
            aria-controls={`segpanel-${c.id}`}
            className={cx('p-admin__seg', seg === c.id && 'is-on')}
            onClick={() => setSeg(c.id)}
          >
            {c.name}<span className="mono p-admin__segcount">{c.n}</span>
          </button>
        ))}
      </div>

      <div
        className="p-admin__libbody"
        role="tabpanel"
        id={`segpanel-${seg}`}
        aria-labelledby={`seg-${seg}`}
      >
        {rows.length === 0 ? (
          <Empty
            title="这一档还没有题。"
            text="先有物料，这里才统计得到用过哪些题。去物料导出看看，或者等下一场跑完匹配。"
            action={<Button as="a" href="#/admin/materials" variant="secondary">去看物料</Button>}
            className="p-admin__emptyblock"
          />
        ) : (
          <ul className="p-admin__qlist">
            {rows.map((r) => (
              <li key={r.id} className="p-admin__q">
                <span className="p-admin__qid mono">{r.id}</span>
                <div className="p-admin__qbody">
                  <p className="p-admin__qtext">{r.text}</p>
                  <p className="p-admin__qmeta">
                    深度 {r.depth}（{r.depth === 3 ? '深' : r.depth === 2 ? '中' : '轻'}） ·
                    用过 {r.uses} 次
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="p-admin__hint p-admin__footnote">
        只读浏览。列表来自现有物料里实际出现的题卡，「用过几次」= 出现在几组物料里，没编数。
        题库全量维护（新增 / 停用 / 批量导入）需要后端开一个题目接口，本期没有。
      </p>
    </>
  )
}

/* ══════════════════════════════════════════════════════════
   Tab 6 物料导出
   ══════════════════════════════════════════════════════════ */

function pickMaterialsEvent(state) {
  const withGroups = state.events.filter((e) => state.groups.some((g) => g.eventId === e.id && g.status !== 'disbanded'))
  if (!withGroups.length) return ''
  const stored = (id) => state.materials.filter((m) => {
    const g = selectors.group(state, m.groupId)
    return g && g.eventId === id
  }).length
  const rank = (e) => (e.status === 'done' ? 2 : 1)
  return [...withGroups].sort((a, b) => (rank(a) - rank(b))
    || (stored(b.id) - stored(a.id))
    || (new Date(a.startAt) - new Date(b.startAt)))[0].id
}

function warningsOf(sheet) {
  const out = []
  if (!sheet || !sheet.meta) return out
  if (sheet.meta.venue === '地点待定') out.push('场地未分配')
  const p = sheet.payload || {}
  if (sheet.kind === 'topicCards') {
    const n = (p.deck || []).filter((c) => c.kind !== 'prompt').length
    if (n < 20) out.push(`题目数 ${n} < 20`)
    if (!(p.identityCards || []).length) out.push('身份卡缺失')
    if (!(p.sharedTopics || []).length) out.push('没有共同话题')
  }
  return out
}

/* ── A4 物料（预览与打印共用同一份 DOM 结构与样式） ───────────── */

function SheetBlocks({ blocks = [], title }) {
  return (
    <section className="p-admin__a4col">
      {title ? <h4 className="p-admin__a4coltitle">{title}</h4> : null}
      {blocks.map((b, i) => {
        const head = b.title ? <h5 className="p-admin__a4sub">{b.title}</h5> : null
        if (b.type === 'list') {
          return (
            <div className="p-admin__a4block" key={i}>
              {head}
              <ol className="p-admin__a4list">
                {(b.items || []).map((it, k) => (
                  <li key={`${it.no ?? 'x'}-${k}`}>
                    <span className="p-admin__a4no mono">{it.no}</span>
                    <span>
                      {it.text}
                      {it.meta ? <em className="p-admin__a4meta">{it.meta}</em> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )
        }
        if (b.type === 'kv') {
          return (
            <div className="p-admin__a4block" key={i}>
              {head}
              <dl className="p-admin__a4kv">
                {(b.pairs || []).map((p, k) => (
                  <div key={k}>
                    <dt>{p.k}</dt>
                    <dd>{p.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )
        }
        if (b.type === 'table') {
          return (
            <div className="p-admin__a4block" key={i}>
              {head}
              <table className="p-admin__a4table">
                <thead>
                  <tr>{(b.head || []).map((h, k) => <th key={k} scope="col">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(b.rows || []).map((row, k) => (
                    <tr key={k}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (b.type === 'cards') {
          return (
            <div className="p-admin__a4block" key={i}>
              {head}
              <ul className="p-admin__a4cards">
                {(b.items || []).map((c, k) => (
                  <li key={k}>
                    <p className="p-admin__a4cname">{c.name}</p>
                    <p className="p-admin__a4cline">{c.line}</p>
                    {c.bio ? <p className="p-admin__a4cbio">{c.bio}</p> : null}
                    {c.question ? <p className="p-admin__a4cq">「{c.question}」</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        return (
          <div className="p-admin__a4block" key={i}>
            {head}
            <p className="p-admin__a4note">{b.text}</p>
          </div>
        )
      })}
    </section>
  )
}

function PrintSheet({ sheet }) {
  if (!sheet || !sheet.header) return null
  const head = sheet.header || {}
  const foot = sheet.footer || {}
  return (
    <article className="p-admin__a4">
      <header className="p-admin__a4head">
        <div>
          <p className="p-admin__a4brand">{head.brand}</p>
          <p className="p-admin__a4activity">{head.activityLine}</p>
        </div>
        <div className="p-admin__a4ids">
          <p className="p-admin__a4group mono">{head.groupNo}</p>
          <p className="p-admin__a4campus">{head.campusLine}</p>
          <p className="p-admin__a4code mono">{head.code}</p>
        </div>
      </header>

      <div className="p-admin__a4cols">
        <SheetBlocks blocks={sheet.left?.blocks} title={sheet.left?.title} />
        <SheetBlocks blocks={sheet.right?.blocks} title={sheet.right?.title} />
      </div>

      <footer className="p-admin__a4foot">
        <div>
          {(foot.lines || []).map((line, i) => <p key={i}>{line}</p>)}
        </div>
        <div className="p-admin__a4footright">
          <p className="p-admin__a4tagline">{foot.tagline}</p>
          <p className="mono">{foot.page}</p>
        </div>
      </footer>
    </article>
  )
}

function MaterialsTab({ state }) {
  const { showToast } = useToast()
  const [eventId, setEventId] = useState(() => pickMaterialsEvent(state))
  const [preview, setPreview] = useState(null)
  const [printJob, setPrintJob] = useState(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const closePreview = useStable(() => setPreview(null))
  const closeBatch = useStable(() => setBatchOpen(false))
  const counter = useRef(0)

  const ev = eventId ? selectors.event(state, eventId) : null

  const rows = useMemo(() => {
    if (!ev) return []
    const appsHere = state.applications.filter((a) => a.eventId === ev.id)
    return state.groups
      .filter((g) => g.eventId === ev.id && g.status !== 'disbanded')
      .slice()
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((g) => {
        const stored = selectors.materialOf(state, g.id)
        const type = selectors.activityType(state, g.activityTypeId || ev.typeId)
        const venue = selectors.venue(state, g.venueId || ev.venueId)
        const sheet = buildMaterial({
          group: g,
          event: ev,
          activityType: type,
          users: state.users,
          applications: appsHere,
          venue,
          version: stored?.version || 1,
        })
        return { g, stored, sheet, warns: warningsOf(sheet) }
      })
  }, [state, ev])

  useEffect(() => {
    if (!printJob) return undefined
    const timer = setTimeout(() => {
      window.print()
    }, 80)
    return () => clearTimeout(timer)
  }, [printJob])

  const print = (sheet) => {
    counter.current += 1
    setPrintJob({ id: counter.current, sheet })
    showToast('打印里只出这一张 A4，其他元素不进纸', 'info')
  }

  return (
    <>
      <div className="p-admin__toolbar">
        <EventPicker state={state} value={eventId} onChange={setEventId} statuses={['open', 'matching', 'locked', 'done']} />
        <div className="p-admin__tstats">
          <span className="p-admin__tstat">本场 <b className="mono">{rows.length}</b> 组</span>
          <span className="p-admin__tstat">已生成 <b className="mono">{rows.filter((r) => r.stored).length}</b> 份</span>
        </div>
        <div className="p-admin__actions">
          <Button variant="secondary" onClick={() => setBatchOpen(true)}>整场批量</Button>
        </div>
      </div>

      <p className="p-admin__toolbar-note">导出前确认每桌都有场地。缺场地的会印成「地点待定」，到场会尴尬。</p>

      {!ev || rows.length === 0 ? (
        <Empty
          title="还没有分组，导不出东西。"
          text="先去匹配工作台跑一次，锁定之后物料就会生成。"
          action={<Button as="a" href="#/admin/match">去匹配工作台</Button>}
        />
      ) : (
        <div className="p-admin__tablewrap">
          <table className="p-admin__table">
            <caption className="sr-only">本场各组的物料类型、版本、生成时间与预警</caption>
            <thead>
              <tr>
                <th scope="col">桌号</th>
                <th scope="col">物料类型</th>
                <th scope="col">版本</th>
                <th scope="col">生成时间</th>
                <th scope="col">场地</th>
                <th scope="col">预警</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ g, stored, sheet, warns }) => (
                <tr key={g.id}>
                  <td data-label="桌号"><span className="mono p-admin__cellmain">{g.tableNo}</span></td>
                  <td data-label="物料类型">{KIND_CN[sheet.specKind] || KIND_CN[sheet.kind] || sheet.kind}</td>
                  <td data-label="版本" className="mono">{stored ? `v${stored.version}` : '—'}</td>
                  <td data-label="生成时间" className="mono">
                    {stored ? fmtDateTime(stored.generatedAt) : '未生成'}
                  </td>
                  <td data-label="场地">{sheet.meta?.venue || '地点待定'}</td>
                  <td data-label="预警">
                    {warns.length ? (
                      <ul className="p-admin__warns">
                        {warns.map((w) => <li key={w}>! {w}</li>)}
                      </ul>
                    ) : <span className="p-admin__yes">✓ 无异常</span>}
                  </td>
                  <td data-label="操作">
                    <span className="p-admin__rowactions">
                      <Button size="sm" variant="secondary" onClick={() => setPreview({ g, sheet })}>预览</Button>
                      <Button size="sm" variant="ghost" onClick={() => print(sheet.printSheet)}>导出打印</Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(preview)}
        onClose={closePreview}
        title={`预览 · ${preview?.g.tableNo || ''} 桌`}
        className="p-admin__modal--wide"
        footer={(
          <>
            <Button variant="secondary" onClick={closePreview}>关闭</Button>
            <Button onClick={() => print(preview.sheet.printSheet)}>导出打印</Button>
          </>
        )}
      >
        <div className="p-admin__preview">
          <PrintSheet sheet={preview?.sheet?.printSheet} />
        </div>
      </Modal>

      <Modal
        open={batchOpen}
        onClose={closeBatch}
        title="整场批量打印"
        footer={<Button variant="secondary" onClick={closeBatch}>知道了</Button>}
      >
        <div className="p-admin__confirm">
          <p>本场 {rows.length} 组，一组一份 A4。浏览器打印没法一次连续出 {rows.length} 张，
            每次都会弹一次打印对话框。</p>
          <p>本期只做单张导出：一张一张点「导出打印」，页眉里带校区、场地、组号和日期。</p>
          <p className="p-admin__hint">真要批量，得后端把 {rows.length} 份合成一个 PDF；接口没开，这里不假装能。</p>
        </div>
      </Modal>

      {printJob
        ? createPortal(
          <div className="p-admin__print">
            <PrintSheet sheet={printJob.sheet} />
          </div>,
          document.body,
        )
        : null}
    </>
  )
}

/* ══════════════════════════════════════════════════════════
   Tab 7 任务清单
   ══════════════════════════════════════════════════════════ */

function taskRefText(state, task) {
  if (task.refKind === 'event') {
    const ev = selectors.event(state, task.refId)
    return ev ? `${ev.title} · ${fmtDate(ev.startAt)}` : task.refId
  }
  if (task.refKind === 'group') {
    const g = selectors.group(state, task.refId)
    const ev = g ? selectors.event(state, g.eventId) : null
    return g ? `${g.tableNo} 桌${ev ? ` · ${ev.title}` : ''}` : task.refId
  }
  if (task.refKind === 'material') {
    const m = state.materials.find((x) => x.id === task.refId)
    const g = m ? selectors.group(state, m.groupId) : null
    return g ? `${g.tableNo} 桌的物料` : task.refId
  }
  if (task.refKind === 'report') {
    const r = state.reports.find((x) => x.id === task.refId)
    return r ? `反馈：${clip(r.text, 14)}` : `反馈 ${task.refId}`
  }
  return task.refId || '—'
}

function TaskRow({ state, task, onToggle }) {
  const isDone = task.status === 'done'
  const overdue = !isDone && task.dueAt && new Date(task.dueAt).getTime() < Date.now()
  return (
    <li className={cx('p-admin__task', isDone && 'is-done')}>
      <input
        type="checkbox"
        className="p-admin__taskcheck"
        id={`task-${task.id}`}
        checked={isDone}
        onChange={() => onToggle(task)}
        aria-label={`${isDone ? '取消完成' : '标记完成'}：${task.title}`}
      />
      <label className="p-admin__taskbody" htmlFor={`task-${task.id}`}>
        <span className="p-admin__tasktitle">{task.title}</span>
        <span className="p-admin__taskmeta">
          <span>{TYPE_CN[task.type] || task.type}</span>
          <span>{taskRefText(state, task)}</span>
          <span>负责人 {task.assignee || '未指派'}</span>
          <span className={cx(overdue && 'is-late')}>
            截止 {task.dueAt ? fmtDateTime(task.dueAt) : '未定'}
            {task.dueAt ? ` · ${relativeTime(task.dueAt)}` : ''}
          </span>
        </span>
        {task.detail ? <span className="p-admin__taskdetail">{task.detail}</span> : null}
      </label>
    </li>
  )
}

function TasksTab({ state }) {
  const { showToast } = useToast()
  const tasks = useMemo(
    () => [...state.adminTasks].sort((a, b) => new Date(a.dueAt || 0) - new Date(b.dueAt || 0)),
    [state.adminTasks],
  )
  const done = tasks.filter((t) => t.status === 'done')
  const open = tasks.filter((t) => t.status !== 'done')
  const percent = tasks.length ? done.length / tasks.length : 0

  const toggle = (t) => {
    const res = actions.toggleAdminTask(t.id)
    if (!res.ok) {
      showToast(res.error || '没勾上，过一分钟再试', 'error')
      return
    }
    showToast(res.status === 'done' ? `「${t.title}」已勾掉` : `「${t.title}」放回未完成`, 'ok')
  }

  return (
    <>
      <section className="p-admin__panel p-admin__panel--plain" aria-labelledby="task-progress">
        <h2 className="p-admin__panel-title" id="task-progress">
          完成率
          <span className="p-admin__whyblock-meta mono">{done.length} / {tasks.length} · {Math.round(percent * 100)}%</span>
        </h2>
        <ProgressBar value={percent * 100} label="任务完成率" />
      </section>

      <div className="p-admin__taskcols">
        <section className="p-admin__taskgroup" aria-labelledby="task-open">
          <h2 className="p-admin__panel-title" id="task-open">未完成 · {open.length}</h2>
          {open.length ? (
            <ul className="p-admin__tasks">
              {open.map((t) => <TaskRow key={t.id} state={state} task={t} onToggle={toggle} />)}
            </ul>
          ) : (
            <p className="p-admin__taskempty">这一列空了。</p>
          )}
        </section>

        <section className="p-admin__taskgroup" aria-labelledby="task-done">
          <h2 className="p-admin__panel-title" id="task-done">已完成 · {done.length}</h2>
          {done.length ? (
            <ul className="p-admin__tasks">
              {done.map((t) => <TaskRow key={t.id} state={state} task={t} onToggle={toggle} />)}
            </ul>
          ) : (
            <p className="p-admin__taskempty">这一列空了。</p>
          )}
        </section>
      </div>

      <p className="p-admin__hint p-admin__footnote">
        勾一下只会改「完成 / 未完成」两种状态。种子里标了「进行中」的条目不保留中间态，
        需要三列看板的话得让后端把 AdminTask 的状态机开出来。
      </p>
    </>
  )
}

/* ── 共用：场次选择器 ─────────────────────────────────────── */

function EventPicker({ state, value, onChange, statuses }) {
  const events = state.events
    .filter((e) => statuses.includes(e.status))
    .slice()
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))

  return (
    <label className="p-admin__picker">
      <span className="p-admin__pickerlabel">场次</span>
      <span className="select-wrap">
        <select className="select p-admin__select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} · {fmtDate(ev.startAt)}（{STATUS_CN[ev.status] || ev.status}）
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}
