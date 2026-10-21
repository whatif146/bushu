/**
 * 我的局 #/me —— 4 区块 × 5 阶段（site-spec §3.3 / design-spec §6.3 / content-plan §2.3）
 *
 * 数据只走 api.js：myGroupCards / myApplications / eventBoard / demoIdentities / actions。
 * 区块顺序（site-spec 锁定，不得增删改序）：
 *   1 状态头（含唯一的假登录入口「切换演示身份」）
 *   2 进行中的局（组卡，按阶段换话术与操作）
 *   3 我报过还没成组的（紧凑行，可退出）
 *   4 往期（行式历史）
 */
import { useEffect, useId, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import Tag from '../components/Tag.jsx'
import Modal from '../components/Modal.jsx'
import Empty from '../components/Empty.jsx'
import SectionHead from '../components/SectionHead.jsx'
import { GameCard } from '../components/Card.jsx'
import { useToast } from '../components/Toast.jsx'
import { countdown, fmtDate, fmtDateTime, fmtTime, fmtWeekday } from '../lib/format.js'
import {
  actions,
  demoIdentities,
  eventBoard,
  myApplications,
  myGroupCards,
  selectors,
  useStore,
  venueState,
} from '../lib/api.js'

/* ── 文案（content-plan §2.3 / §2.8 逐字） ───────────────── */
const C = {
  guestTitle: '还没有局。',
  guestBody: '从吃一顿饭开始最容易。体测八百都跑完了，局还没报一个——球局和自习局这周都缺人。',
  guestCta: '看看这周的局',
  guestLink: '先填问卷 →',
  submittedNote: '分桌之前还能改。改完要重新提交。',
  ctaEdit: '查看我填的',
  ctaCancel: '这周不去了，退出这一局',
  confirmCancel: '退出后位置给候补池里的下一个人，不退钱的部分是已产生的场地费。确定？',
  ctaGroup: '看同组',
  ctaLive: '去现场',
  historyEmpty: '还没有历史。第一局之后这里会有记录。',
  canceledNote: '人没凑够，这桌撤了。钱原路退回。',
  demoNote: '当前为演示环境，校园认证为本地校验，未接入学校系统。',
  retry: '没交上去。你填的都还在，过一分钟再试。',
  done: '记下了。',
}

/* 只读答卷的字段标签，复用问卷题干（content-plan §2.2） */
const ANSWER_ROWS = [
  ['selfDesc', '说说你是个什么样的人'],
  ['wantMeet', '你想遇见什么样的人'],
  ['recentState', '最近在过什么日子'],
  ['topicsWanted', '想聊的话题'],
  ['questionsAsked', '出一道题，问桌上的人'],
]

/* ── 每秒一跳的 now：倒计时需要，且不依赖滚动 ─────────────── */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/* site-spec §2.2 五阶段。lib/state.js 尚未产出，这里按契约逐条实现，全页只此一处判时间。 */
function stageOfGroup(card, now) {
  const group = card.group || {}
  const event = card.event || {}
  const start = new Date(event.startAt).getTime()
  const end = new Date(event.endAt).getTime()
  if (group.status === 'finished' || event.status === 'done') return 'ended'
  if (Number.isFinite(end) && now > end + 60 * 60 * 1000) return 'ended'
  if (group.status === 'ongoing') return 'live'
  if (Number.isFinite(start) && now >= start - 15 * 60 * 1000) return 'live'
  return 'matched'
}

const firstSentence = (text) => {
  const head = String(text || '').split('。')[0].trim()
  return head ? `${head}。` : ''
}

const listBadge = (app) => {
  if (app.status === 'waitlisted') return '候补中'
  return '排桌中'
}

/* ── 组卡：已揭晓 / 进行中（结束的降到往期行） ───────────── */
function GroupCard({ card, now, ink }) {
  const { group, event, type, tableNo, memberCount } = card
  const stage = stageOfGroup(card, now)
  const locked = venueState(event, now) === 'locked'
  const cd = countdown(event?.venueRevealAt, now)
  const reason = firstSentence(group?.matchReason)

  return (
    <article className={`p-me__card ${ink ? 'p-me__card--ink on-ink' : ''}`.trim()}>
      <div className="p-me__card-top">
        <span className="num">
          {event ? `${fmtWeekday(event.startAt)} ${fmtTime(event.startAt)}` : '时间待定'}
          {type?.name ? ` · ${type.name}` : ''}
        </span>
        <Tag variant={stage === 'live' ? 'seal' : 'ghost'}>
          {stage === 'live' ? '进行中' : `第 ${tableNo} 桌`}
        </Tag>
      </div>

      <div className="p-me__card-body">
        <div className="p-me__card-info">
          <h3 className="p-me__card-title">{event?.title || '这一局'}</h3>
          <p className="p-me__card-meta">
            {event ? fmtDateTime(event.startAt) : '时间待定'}
            {event?.campus ? ` · ${event.campus}` : ''}
          </p>
          <p className="p-me__card-meta">
            {memberCount} 个人
            {locked && event?.venueRevealAt
              ? `　·　集合地点 ${fmtDateTime(event.venueRevealAt)} 解锁`
              : '　·　集合地点已解锁'}
          </p>

          {group?.vibeLabel ? (
            <p className="p-me__card-vibe">
              <Tag variant="ghost">{group.vibeLabel}</Tag>
            </p>
          ) : null}

          {reason ? <p className="p-me__card-reason">{reason}</p> : null}
        </div>

        <div className="p-me__card-table" aria-hidden="true">
          <span className="p-me__table-no">{tableNo}</span>
          <span className="p-me__table-label">桌号</span>
        </div>
      </div>

      {locked ? (
        <p className="p-me__count">
          <span className="p-me__count-label">距解锁地点</span>
          <span className="p-me__count-num tnum">{cd.ended ? '到点了' : cd.short}</span>
        </p>
      ) : null}

      <div className="p-me__card-acts">
        {stage === 'live' ? (
          <Button as="a" href={`#/live/${group.id}`} className="p-me__cta-live" arrow>
            {C.ctaLive}
          </Button>
        ) : (
          <Button as="a" href={`#/table/${group.id}`} arrow>
            {C.ctaGroup}
          </Button>
        )}
      </div>
    </article>
  )
}

/* ── 报名卡：open / matching 阶段（唯一反色块，当这页没有组卡时） ── */
function PendingCard({ app, now, ink, onCancel }) {
  const event = app.event || {}
  const type = app.type
  const cd = countdown(event.applyDeadline, now)
  const answers = app.answers || {}

  return (
    <article className={`p-me__card p-me__card--pending ${ink ? 'p-me__card--ink on-ink' : ''}`.trim()}>
      <div className="p-me__card-top">
        <span className="num">{type?.name ? `${type.name} · ` : ''}{listBadge(app)}</span>
        <Tag variant={app.status === 'waitlisted' ? 'ghost' : 'seal'}>{listBadge(app)}</Tag>
      </div>

      <h3 className="p-me__card-title">{event.title || '这一场'}</h3>
      <p className="p-me__card-meta">
        {event.startAt ? fmtDateTime(event.startAt) : '时间待定'}
        {event.campus ? ` · ${event.campus}` : ''}
      </p>

      <p className="p-me__card-deadline">
        {event.applyDeadline ? `${fmtDateTime(event.applyDeadline)} 截止报名` : '报名已截止'}
        {event.matchAt ? `，${fmtDateTime(event.matchAt)} 出结果。` : '。'}
      </p>

      <p className="p-me__count">
        <span className="p-me__count-label">距报名截止</span>
        <span className="p-me__count-num tnum">{cd.ended ? '已截止' : cd.text}</span>
      </p>

      <details className="p-me__answers">
        <summary className="p-me__answers-summary">{C.ctaEdit}</summary>
        <p className="p-me__answers-note">{C.submittedNote}</p>
        <dl className="p-me__answers-list">
          {ANSWER_ROWS.map(([key, label]) => {
            const raw = answers[key]
            const value = Array.isArray(raw) ? raw.join('、') : raw
            if (!value) return null
            return (
              <div className="p-me__answers-row" key={key}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            )
          })}
        </dl>
      </details>

      <div className="p-me__card-acts">
        <Button variant="ghost" onClick={() => onCancel(app)}>
          {C.ctaCancel}
        </Button>
      </div>
    </article>
  )
}

/* ── 紧凑行：我报过还没成组的 ───────────────────────────── */
function PendingRow({ app, now, onCancel }) {
  const event = app.event || {}
  const cd = countdown(event.applyDeadline, now)
  return (
    <li className="p-me__row">
      <span className="p-me__row-date">{event.startAt ? fmtDate(event.startAt) : '—'}</span>
      <span className="p-me__row-main">
        <span className="p-me__row-title">{event.title || '这一场'}</span>
        <span className="p-me__row-sub">
          {listBadge(app)}
          {app.status === 'waitlisted' && app.waitlistRank
            ? ` · 前面还有 ${Math.max(0, app.waitlistRank - 1)} 人`
            : cd.ended
              ? ' · 报名已截止'
              : ` · 距截止 ${cd.text.replace('还有 ', '')}`}
        </span>
      </span>
      <span className="p-me__row-acts">
        <Button size="sm" variant="ghost" onClick={() => onCancel(app)}>
          退出这一局
        </Button>
      </span>
    </li>
  )
}

/* ── 往期行 ─────────────────────────────────────────────── */
function HistoryRow({ row }) {
  if (row.toggle) {
    return (
      <li className="p-me__row p-me__row--history">
        <button
          type="button"
          className="p-me__row-btn"
          aria-expanded={row.open}
          onClick={row.onToggle}
        >
          <span className="p-me__row-date">{row.date}</span>
          <span className="p-me__row-main">
            <span className="p-me__row-title">{row.title}</span>
            {row.open ? <span className="p-me__row-sub">{row.note}</span> : null}
          </span>
          <span className="p-me__row-end">
            <Tag variant="ghost">{row.badge}</Tag>
          </span>
        </button>
      </li>
    )
  }

  const inner = (
    <>
      <span className="p-me__row-date">{row.date}</span>
      <span className="p-me__row-main">
        <span className="p-me__row-title">{row.title}</span>
        {row.note ? <span className="p-me__row-sub">{row.note}</span> : null}
      </span>
      <span className="p-me__row-end">
        <Tag variant="ghost">{row.badge}</Tag>
        {row.href ? <span className="p-me__row-arrow" aria-hidden="true">→</span> : null}
      </span>
    </>
  )

  return (
    <li className="p-me__row p-me__row--history">
      {row.href ? (
        <a className="p-me__row-btn" href={row.href}>{inner}</a>
      ) : (
        <div className="p-me__row-btn">{inner}</div>
      )}
    </li>
  )
}

/* ── 页面 ──────────────────────────────────────────────── */
export default function Me() {
  const state = useStore()
  const now = useNow()
  const { showToast } = useToast()
  const switchId = useId()
  const [cancelTarget, setCancelTarget] = useState(null)
  const [openNote, setOpenNote] = useState(null)

  const user = selectors.currentUser(state)
  const isAdmin = selectors.isAdmin(state)
  const cards = useMemo(() => myGroupCards(state), [state])
  const apps = useMemo(() => myApplications(state), [state])
  const board = useMemo(() => eventBoard(state), [state])
  const identities = useMemo(() => demoIdentities(), [state])

  /* 组卡：已结束的降到往期；进行中的按开赛时间正序（最近的一场在前） */
  const groupCards = useMemo(() => cards
    .map((card) => ({ ...card, stage: stageOfGroup(card, now) }))
    .sort((a, b) => new Date(a.event?.startAt || 0) - new Date(b.event?.startAt || 0)), [cards, now])

  const activeCards = groupCards.filter((card) => card.stage !== 'ended')
  const endedCards = groupCards.filter((card) => card.stage === 'ended')

  /* 还没成组的报名（groupId 为空、且没被取消/失效） */
  const pendingApps = apps
    .filter((app) => !app.groupId && ['submitted', 'waitlisted'].includes(app.status))
    .sort((a, b) => new Date(a.event?.startAt || 0) - new Date(b.event?.startAt || 0))

  const inkApp = activeCards.length === 0 ? pendingApps[0] || null : null
  const restApps = inkApp ? pendingApps.slice(1) : pendingApps

  /* 往期：结束的组 + 已取消 / 未成局的报名 */
  const historyRows = useMemo(() => {
    const rows = []
    for (const card of endedCards) {
      rows.push({
        key: `g-${card.group.id}`,
        sortAt: new Date(card.event?.startAt || 0).getTime(),
        date: card.event?.startAt ? fmtDate(card.event.startAt) : '—',
        title: `${card.event?.title || '这一局'} · ${card.memberCount} 人`,
        badge: '已结束',
        href: `#/recap/${card.group.id}`,
      })
    }
    for (const app of apps) {
      if (!['canceled', 'expired'].includes(app.status)) continue
      const canceled = app.status === 'canceled'
      rows.push({
        key: `a-${app.id}`,
        sortAt: new Date(app.event?.startAt || 0).getTime(),
        date: app.event?.startAt ? fmtDate(app.event.startAt) : '—',
        title: app.event?.title || '这一场',
        badge: canceled ? '已取消' : '未成局',
        note: canceled ? C.canceledNote : '这一场人没凑够，没有成组。',
        toggle: canceled,
        open: openNote === app.id,
        onToggle: () => setOpenNote(openNote === app.id ? null : app.id),
      })
    }
    return rows.sort((a, b) => b.sortAt - a.sortAt)
  }, [endedCards, apps, openNote])

  /* 页头那句话：这一页真正的标题（design-spec §6.3 视觉要点 1） */
  const liveCard = activeCards.find((card) => card.stage === 'live')
  const matchedCard = activeCards.find((card) => card.stage === 'matched')

  let stage = 'guest'
  let statusLine = `你还没报过局。这周有 ${board.length} 个局在等人。`
  if (liveCard) {
    stage = 'live'
    statusLine = '时间到了。物料在你手机里。'
  } else if (matchedCard) {
    stage = 'matched'
    statusLine = `你被排进第 ${matchedCard.tableNo} 桌。看一眼都有谁。`
  } else if (pendingApps.length) {
    stage = 'submitted'
    const at = pendingApps[0].event?.matchAt
    statusLine = at ? `桌还没排。${fmtDateTime(at)} 之前会告诉你结果。` : '桌还没排。出结果会在这里出现。'
  } else if (cards.length || apps.length) {
    stage = 'ended'
    statusLine = '这局散了。回顾已经可以看。'
  }

  const hasAnything = activeCards.length > 0 || pendingApps.length > 0 || historyRows.length > 0

  /* 区块编号跟着「实际渲染了哪几块」走：没有进行中的局时，「在等的报名」就是 01，不留空号 */
  let sectionSeq = 0
  const numNow = activeCards.length > 0 ? String((sectionSeq += 1)).padStart(2, '0') : ''
  const numWaiting = pendingApps.length > 0 ? String((sectionSeq += 1)).padStart(2, '0') : ''
  const numHistory = String((sectionSeq += 1)).padStart(2, '0')

  const askCancel = (app) => setCancelTarget(app)
  const closeCancel = () => setCancelTarget(null)

  const doCancel = () => {
    if (!cancelTarget) return
    const res = actions.cancelApplication(cancelTarget.id, '本人在「我的局」退出')
    if (res && res.ok) showToast(C.done, 'ok')
    else showToast((res && res.error) || C.retry, 'error')
    closeCancel()
  }

  const onSwitch = (event) => {
    const id = event.target.value
    if (!id || id === user?.id) return
    const res = actions.switchSession(id)
    if (res && res.ok) showToast(C.done, 'ok')
    else showToast((res && res.error) || C.retry, 'error')
  }

  return (
    <div className={`p-me p-me--${stage}`}>
      {/* 1 · 状态头 */}
      <header className="p-me__head wrap wrap--content">
        <div className="p-me__head-top">
          <p className="eyebrow">02 · YOUR DESK</p>
          <Button as="a" href="#/join" size="sm" variant="secondary" arrow>报新局</Button>
        </div>

        <h1 className="p-me__h1">我的局</h1>
        <p className="p-me__status">{statusLine}</p>

        <div className="p-me__who">
          <p className="p-me__who-id">
            <span className="p-me__who-name">{user?.nickname || '未登录'}</span>
            <span className="p-me__who-meta">
              {user?.school ? selectors.schoolShort(user.school) : '—'}
              {user?.grade ? ` · ${user.grade}` : ''}
              {isAdmin ? ' · 管理员视角' : ''}
            </span>
          </p>

          <div className="p-me__who-switch">
            <label className="p-me__who-label" htmlFor={switchId}>切换演示身份</label>
            <div className="select-wrap">
              <select
                id={switchId}
                className="select"
                value={user?.id || ''}
                onChange={onSwitch}
              >
                {identities.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-me__rule" aria-hidden="true" />
      </header>

      {/* 2 · 进行中的局 */}
      {activeCards.length > 0 ? (
        <section className="p-me__sec wrap wrap--content" aria-labelledby="me-now">
          <SectionHead
            id="me-now"
            num={numNow}
            aside="NOW"
            title="进行中的局"
            meta={`${activeCards.length} 个`}
          />
          <div className="p-me__cards">
            {activeCards.map((card, i) => (
              <GroupCard key={card.group.id} card={card} now={now} ink={i === 0} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 3 · 我报过还没成组的 */}
      {pendingApps.length > 0 ? (
        <section className="p-me__sec wrap wrap--content" aria-labelledby="me-waiting">
          <SectionHead
            id="me-waiting"
            num={numWaiting}
            aside="WAITING"
            title="我报过还没成组的"
            meta={`${pendingApps.length} 个`}
          />
          {inkApp ? <PendingCard app={inkApp} now={now} ink onCancel={askCancel} /> : null}
          {restApps.length > 0 ? (
            <ul className="p-me__rows">
              {restApps.map((app) => (
                <PendingRow key={app.id} app={app} now={now} onCancel={askCancel} />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* 4 · 往期 */}
      <section className="p-me__sec wrap wrap--content" aria-labelledby="me-history">
        <SectionHead id="me-history" num={numHistory} aside="ARCHIVE" title="往期" />

        {historyRows.length > 0 ? (
          <ul className="p-me__rows p-me__rows--history">
            {historyRows.map((row) => <HistoryRow key={row.key} row={row} />)}
          </ul>
        ) : (
          <p className="p-me__history-empty">{C.historyEmpty}</p>
        )}
      </section>

      {/* 空态：什么都没报过，或切了一个干净身份 */}
      {!hasAnything ? (
        <section className="p-me__sec p-me__sec--guest wrap wrap--content" aria-labelledby="me-guest">
          <Empty
            title={C.guestTitle}
            text={C.guestBody}
            action={(
              <div className="p-me__guest-acts">
                <Button as="a" href="#/" arrow>{C.guestCta}</Button>
                <a className="p-me__guest-link" href="#/join">{C.guestLink}</a>
              </div>
            )}
          />
          {board.length > 0 ? (
            <div className="p-me__guest-cards">
              {board.slice(0, 3).map((item, i) => (
                <GameCard
                  key={item.id}
                  event={item}
                  type={item.type}
                  index={i}
                  remain={item.seatsLeft}
                  href={`#/join?event=${item.id}`}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="p-me__demo-note wrap wrap--content">{C.demoNote}</p>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={closeCancel}
        title="退出这一局？"
        footer={(
          <div className="p-me__modal-foot">
            <Button variant="secondary" onClick={closeCancel}>再想想</Button>
            <Button variant="danger" onClick={doCancel}>退出这一局</Button>
          </div>
        )}
      >
        <p className="p-me__confirm">{C.confirmCancel}</p>
      </Modal>
    </div>
  )
}
