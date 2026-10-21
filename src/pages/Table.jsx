/**
 * 同组速览 #/table/:groupId —— 6 区块（site-spec §3.4 / design-spec §6.4 / content-plan §2.4）
 *
 * 1 桌头 / 2 氛围与理由 / 3 同组的人 / 4 共同话题 / 5 集合信息（场地锁）/ 6 物料预览 + A4 打印页
 *
 * 只有三件事必须记住：
 *  1. 未到 venueRevealAt 时，场地名与地址不得进 DOM（api.groupView 已经把 venue 置 null，页面不要再从别处拼出来）。
 *  2. 同组卡不显示 traits 数值、精确专业、手机号、别人的 reasonForUser（api 已脱敏，页面不许"补"）。
 *  3. 打印件按 kind 出单页 A4；打印时才挂载签到码，平时 DOM 里没有这串数字。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../components/Button.jsx'
import Tag from '../components/Tag.jsx'
import Modal from '../components/Modal.jsx'
import Empty from '../components/Empty.jsx'
import SectionHead from '../components/SectionHead.jsx'
import { useToast } from '../components/Toast.jsx'
import { navigate, useRoute } from '../lib/router.jsx'
import { countdown, fmtDate, fmtDateTime, fmtTime, fmtWeekday, pad2 } from '../lib/format.js'
import { groupView, selectors, useStore, venueState } from '../lib/api.js'

/* ── 文案（content-plan §2.4 / §8.5 逐字） ───────────────── */
const C = {
  h1: '第 {tableNo} 桌',
  reasonTitle: '为什么是你们这几个人',
  expandOne: '展开每人一句',
  cardMore: '就这些。剩下的见面聊。',
  topicsTitle: '你们可能会聊到的',
  topicsFallback: '没有特别重合的话题。这通常比「爱好完全一样」有意思，牌会从最日常的开始。',
  lockedHint: '现在能给的就这些。地点提前给，这局就散了。',
  lockedNext: '出发前 30 分钟，这里会变成地址。',
  openTitle: '可以出发了',
  openTime: '开始，提前 5 分钟到。第 {tableNo} 桌。',
  ctaCopy: '复制集合信息',
  ctaCopied: '已复制',
  openFoot: '找不着就打电话，别站在门口自己找。',
  ownerNote: '负责人会在解锁时一并出现',
  ownerLabel: '活动负责人',
  arrivedLabel: '到齐',
  materialTitle: '这局怎么走',
  ctaLive: '进现场页',
  ctaPrint: '导出打印',
  endedRow: '本局已结束 · 看回顾',
  // 种子里 Venue 还没有 hostName / hostPhone 两个字段（site-spec §5.16 要求有），
  // 这一组是演示占位：号码段从未启用，且只在解锁后才进 DOM。
  hostName: '阿树',
  hostPhone: '020-3934-3123',
  tagline: '不熟的人，一起干件小事。',
  notFound: '这一桌不在了。',
  notFoundText: '链接可能少了一个字符，也可能这局已经撤了。回「我的局」看看还在的。',
  redirecting: '这一桌不在你名下，正在把你送回「我的局」。',
  copyFail: '这台设备不让复制，手动选一下文字。',
}

/* legacy 种子物料与 buildMaterial 的 kind 不是一套命名，这里只做只读归一化 */
const KIND_ALIAS = {
  cards: 'topicCards',
  goal: 'checkinSheet',
  curriculum: 'skillSchedule',
  tournament: 'tournament',
  topicCards: 'topicCards',
  checkinSheet: 'checkinSheet',
  skillSchedule: 'skillSchedule',
}
const KIND_LABEL = {
  topicCards: '话题卡',
  checkinSheet: '目标与打卡表',
  tournament: '赛制',
  skillSchedule: '互教课程表',
}

const kindOf = (material) => KIND_ALIAS[material?.kind] || 'topicCards'

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function stageOf(group, event, now) {
  const start = new Date(event?.startAt).getTime()
  const end = new Date(event?.endAt).getTime()
  if (group?.status === 'finished' || event?.status === 'done') return 'ended'
  if (Number.isFinite(end) && now > end + 60 * 60 * 1000) return 'ended'
  if (group?.status === 'ongoing') return 'live'
  if (Number.isFinite(start) && now >= start - 15 * 60 * 1000) return 'live'
  return 'matched'
}

/* ── 物料摘要（四种 kind 各有各的摘要，不许共用一句） ────── */
function summaryOf(material, kind) {
  const p = material?.payload || {}

  if (kind === 'topicCards') {
    const all = p.deck || p.cards || []
    const questions = all.filter((card) => card.kind !== 'prompt')
    return {
      title: `牌一共 ${questions.length} 张`,
      text: `牌一共 ${questions.length} 张，想跳就跳，没人会问为什么。`,
      lines: questions.slice(0, 3).map((card, i) => ({ no: pad2(i + 1), text: card.text })),
    }
  }

  if (kind === 'checkinSheet') {
    const rawGoal = p.goalCards?.[0]?.goalText || p.goalCard?.goal || p.goalCard?.title || '现场补一句'
    const goalText = String(rawGoal).replace(/[。．.\s]+$/, '')
    return {
      title: '今天的表',
      text: `目标：${goalText}。每 45 分钟打一次卡，打不上也没人说你。`,
      lines: (p.checkTable || []).slice(0, 3).map((item, i) => ({ no: pad2(i + 1), text: item.label })),
    }
  }

  if (kind === 'tournament') {
    const warmupMin = p.warmupTotalMin
      ?? (Array.isArray(p.warmup) ? p.warmup.reduce((sum, step) => sum + (Number(step.minutes) || 0), 0) : 0)
    const rounds = Array.isArray(p.rounds) ? p.rounds.length : (Number(p.rounds) || 0)
    const format = p.format || p.rule || '按现场人数排'
    const roundItems = Array.isArray(p.rounds) ? p.rounds : []
    const warmItems = Array.isArray(p.warmup) ? p.warmup : []
    return {
      title: '今天的赛制',
      text: `热身 ${warmupMin} 分钟，${rounds} 轮，${format}。`,
      lines: (roundItems.length
        ? roundItems.map((round, i) => ({
          no: pad2(round.round || i + 1),
          text: `${round.min ? `${round.min} 分钟` : '一轮'}${round.rule ? ` · ${round.rule}` : ''}`,
        }))
        : warmItems.map((step, i) => ({
          no: pad2(i + 1),
          text: `${step.name || step.label || '热身'} · ${step.minutes || 0} 分钟`,
        }))).slice(0, 3),
    }
  }

  const timetable = Array.isArray(p.timetable) ? p.timetable : []
  const first = timetable[0] || {}
  const second = timetable[1] || {}
  const sessions = Array.isArray(p.sessions) ? p.sessions : []
  return {
    title: '今天的课表',
    text: timetable.length
      ? `第 1 节 ${first.teacherName || 'A'} 教 ${first.topic || '一样技能'}，第 2 节 ${second.teacherName || 'B'} 教 ${second.topic || '另一样'}，各 ${first.minutes || 40} 分钟。`
      : `第 1 节 A 教一样技能，第 2 节 B 教另一样，各 ${sessions[0]?.minutes || 40} 分钟。`,
    lines: (timetable.length ? timetable : sessions).slice(0, 3).map((item, i) => ({
      no: pad2(item.slot || i + 1),
      text: item.topic
        ? `${item.teacherName || 'A'} 教 ${item.learnerName || 'B'} · ${item.topic}`
        : (item.title || '一节'),
    })),
  }
}

/* ── 打印结构：canonical 用 printSheet，legacy 用 payload 现搭 ── */
function sheetOf(view, kind) {
  const material = view.material || {}
  const meta = material.meta || {}
  const p = material.payload || {}
  const members = view.members || []
  const ps = material.printSheet

  if (ps) {
    return {
      header: {
        activityLine: ps.header?.activityLine || '',
        campusLine: ps.header?.campusLine || '',
        code: ps.header?.code || '',
      },
      left: ps.left,
      right: ps.right,
      footer: ps.footer,
    }
  }

  const people = {
    type: 'cards',
    title: `${members.length} 张身份卡`,
    items: members.map((m) => ({
      name: m.nickname,
      line: `${m.schoolShort} · ${m.grade} · ${m.majorBroad}`,
      bio: m.bio,
      question: m.question,
    })),
  }

  if (kind === 'topicCards') {
    const questions = (p.cards || p.deck || []).filter((card) => card.kind !== 'prompt')
    return {
      header: { activityLine: '', campusLine: '', code: '' },
      left: {
        title: '今天的牌',
        blocks: [{
          type: 'list',
          title: `${questions.length} 张`,
          items: questions.map((card, i) => ({ no: i + 1, text: card.text, meta: '' })),
        }],
      },
      right: { title: '同桌的人', blocks: [people] },
      footer: { lines: [], tagline: C.tagline },
    }
  }

  if (kind === 'checkinSheet') {
    return {
      header: { activityLine: '', campusLine: '', code: '' },
      left: {
        title: '这周的安排',
        blocks: [
          {
            type: 'kv',
            title: p.goalCard?.title || '这一局要推进的一件事',
            pairs: (p.checkTable || []).map((item, i) => ({ k: pad2(i + 1), v: item.label })),
          },
        ],
      },
      right: { title: '同桌的人', blocks: [people] },
      footer: { lines: [], tagline: C.tagline },
    }
  }

  if (kind === 'tournament') {
    return {
      header: { activityLine: '', campusLine: '', code: '' },
      left: {
        title: '今天怎么打',
        blocks: [
          {
            type: 'list',
            title: '热身',
            items: (p.warmup || []).map((step, i) => ({
              no: i + 1,
              text: `${step.name || step.label || '热身'} · ${step.minutes || 0} 分钟`,
              meta: step.cue || '',
            })),
          },
        ],
      },
      right: {
        title: '赛制与计分',
        blocks: [
          { type: 'note', text: p.rule || p.format || '' },
          { type: 'kv', title: '轮次', pairs: [{ k: '轮次', v: `${Array.isArray(p.rounds) ? p.rounds.length : (p.rounds || 0)} 轮` }] },
        ],
      },
      footer: { lines: [], tagline: C.tagline },
    }
  }

  return {
    header: { activityLine: '', campusLine: '', code: '' },
    left: {
      title: '今天的课表',
      blocks: [{
        type: 'list',
        title: '两节',
        items: (p.sessions || []).map((session, i) => ({
          no: i + 1,
          text: `${session.title || '一节'} · ${session.minutes || 40} 分钟`,
          meta: '',
        })),
      }],
    },
    right: { title: '同桌的人', blocks: [people] },
    footer: { lines: [], tagline: C.tagline },
  }
}

/* ── 打印稿单个内容块 ─────────────────────────────────── */
function PrintBlock({ block }) {
  if (!block) return null
  if (block.type === 'note') {
    return <p className="p-table__pb-note">{block.text}</p>
  }
  if (block.type === 'kv') {
    return (
      <section className="p-table__pb">
        {block.title ? <h4 className="p-table__pb-title">{block.title}</h4> : null}
        <dl className="p-table__pb-kv">
          {(block.pairs || []).map((pair, i) => (
            <div className="p-table__pb-kv-row" key={`${pair.k}-${i}`}>
              <dt>{pair.k}</dt>
              <dd>{pair.v}</dd>
            </div>
          ))}
        </dl>
      </section>
    )
  }
  if (block.type === 'table') {
    return (
      <section className="p-table__pb">
        {block.title ? <h4 className="p-table__pb-title">{block.title}</h4> : null}
        <table className="p-table__pb-table">
          <thead>
            <tr>{(block.head || []).map((cell, i) => <th key={i}>{cell}</th>)}</tr>
          </thead>
          <tbody>
            {(block.rows || []).map((row, i) => (
              <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </section>
    )
  }
  if (block.type === 'cards') {
    return (
      <section className="p-table__pb">
        {block.title ? <h4 className="p-table__pb-title">{block.title}</h4> : null}
        <div className="p-table__pb-cards">
          {(block.items || []).map((item, i) => (
            <div className="p-table__pb-card" key={`${item.name}-${i}`}>
              <p className="p-table__pb-card-name">{item.name}</p>
              {item.line ? <p className="p-table__pb-card-line">{item.line}</p> : null}
              {item.bio ? <p className="p-table__pb-card-bio">{item.bio}</p> : null}
              {item.question ? <p className="p-table__pb-card-q">想问：{item.question}</p> : null}
            </div>
          ))}
        </div>
      </section>
    )
  }
  return (
    <section className="p-table__pb">
      {block.title ? <h4 className="p-table__pb-title">{block.title}</h4> : null}
      <ol className="p-table__pb-list">
        {(block.items || []).map((item, i) => (
          <li key={`${item.no}-${i}`}>
            <span className="p-table__pb-no">{pad2(item.no || i + 1)}</span>
            <span>{item.text}</span>
            {item.meta ? <span className="p-table__pb-meta">{item.meta}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ── A4 打印页（只在点「导出打印」后挂载） ─────────────── */
function PrintSheet({ view, kind, sheet, isRevealed }) {
  const material = view.material || {}
  const meta = material.meta || {}
  const group = view.group || {}
  const event = view.event || {}
  const groupNo = meta.groupNo || group.tableNo || '—'
  const codeText = meta.codeText || group.checkinCode || ''
  const campus = meta.campus || event.campus || ''
  const venueText = isRevealed ? (view.venue?.name || meta.venue || '') : '地点出发前 30 分钟解锁'

  const footer = sheet.footer || {}
  const footerLines = (footer.lines && footer.lines.length)
    ? footer.lines
    : [
      `组号 ${groupNo} · ${campus}${isRevealed && venueText ? ` · ${venueText}` : ''} · 第 1 页 / 共 1 页`,
      '规则摘要：手机静音 / 到点开始 / 中途离开说一声 / 不问成绩 / 散场前 10 分钟复盘',
    ]

  return (
    <div className="p-table__print" aria-hidden="true">
      <header className="p-table__print-head">
        <div className="p-table__print-brand">
          <span className="p-table__print-mark">不熟局</span>
          <span className="p-table__print-sub">BU SHU</span>
        </div>

        <div className="p-table__print-mid">
          <p className="p-table__print-activity">
            {sheet.header.activityLine || `${meta.activityName || view.type?.name || '不熟局'} · ${meta.dateText || fmtDate(event.startAt)}`}
          </p>
          <p className="p-table__print-campus">{campus ? `${campus} · ${venueText}` : venueText}</p>
        </div>

        <p className="p-table__print-no">{groupNo}</p>

        <div className="p-table__print-code">
          <div className="p-table__print-frame">
            <span className="p-table__corner p-table__corner--tl" aria-hidden="true" />
            <span className="p-table__corner p-table__corner--tr" aria-hidden="true" />
            <span className="p-table__corner p-table__corner--bl" aria-hidden="true" />
            <span className="p-table__corner p-table__corner--br" aria-hidden="true" />
            <span className="p-table__print-code-num">{codeText || '— — — — — —'}</span>
          </div>
          <span className="p-table__print-code-label">现场签到码</span>
          <span className="p-table__print-code-line">{`GROUP ${groupNo} · CODE ${codeText}`}</span>
        </div>
      </header>

      <div className="p-table__print-body">
        <div className="p-table__print-col p-table__print-col--left">
          <h3 className="p-table__print-h">{sheet.left?.title || '今天的安排'}</h3>
          {(sheet.left?.blocks || []).map((block, i) => <PrintBlock key={i} block={block} />)}
        </div>
        <div className="p-table__print-col p-table__print-col--right">
          <h3 className="p-table__print-h p-table__print-h--sm">{sheet.right?.title || '同桌的人'}</h3>
          {(sheet.right?.blocks || []).map((block, i) => <PrintBlock key={i} block={block} />)}
        </div>
      </div>

      <footer className="p-table__print-foot">
        <div className="p-table__print-foot-lines">
          {footerLines.map((line) => <p key={line}>{line}</p>)}
        </div>
        <div className="p-table__print-foot-end">
          <p className="p-table__print-tagline">{footer.tagline || C.tagline}</p>
          <p className="p-table__print-note">本页由后台导出</p>
          <p className="p-table__print-page">{footer.page || '第 1 页 / 共 1 页'}</p>
        </div>
      </footer>
    </div>
  )
}

/* ── 页面 ──────────────────────────────────────────────── */
export default function Table() {
  const { params } = useRoute()
  const state = useStore()
  const now = useNow()
  const { showToast } = useToast()
  const [asking, setAsking] = useState(null)
  const [printing, setPrinting] = useState(false)
  const [copied, setCopied] = useState(false)
  const printedRef = useRef(false)
  const copyTimer = useRef(null)

  const view = groupView(state, params.groupId)
  const isMe = Boolean(view?.isMe)

  /* 非本组成员：直接送回我的局（site-spec §2.3 矩阵） */
  useEffect(() => {
    if (view && !view.isMe) navigate('/me', { replace: true })
  }, [view])

  /* 打印：先挂载 A4 稿，再开系统打印；afterprint 或「关闭对话框后页面重新聚焦」时卸载 */
  useEffect(() => {
    if (!printing) return undefined
    if (printedRef.current) return undefined
    printedRef.current = true

    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      printedRef.current = false
      setPrinting(false)
      document.body.classList.remove('is-printing')
    }

    document.body.classList.add('is-printing')
    window.addEventListener('afterprint', done)

    const raf = requestAnimationFrame(() => {
      window.print()
      // Safari 的 print() 不阻塞、也不派发 afterprint；关闭对话框后页面会重新聚焦
      window.addEventListener('focus', done, { once: true })
    })
    // 任何浏览器都不该让「打印态」超过 30 秒，超时自己收尾
    const safety = window.setTimeout(done, 30000)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(safety)
      window.removeEventListener('afterprint', done)
      window.removeEventListener('focus', done)
      document.body.classList.remove('is-printing')
    }
  }, [printing])

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  const meta = useMemo(() => {
    if (!view) return null
    const kind = kindOf(view.material)
    return {
      kind,
      summary: summaryOf(view.material, kind),
      stage: stageOf(view.group, view.event, now),
    }
  }, [view, now])

  if (!view) {
    return (
      <div className="p-table p-table--notfound">
        <div className="wrap wrap--content">
          <Empty
            title={C.notFound}
            text={C.notFoundText}
            action={<Button as="a" href="#/me" arrow>我的局</Button>}
          />
        </div>
      </div>
    )
  }

  if (!isMe) {
    return (
      <div className="p-table p-table--notfound">
        <div className="wrap wrap--content">
          <p className="p-table__note">{C.redirecting}</p>
        </div>
      </div>
    )
  }

  const { group, event, type, members, material, host } = view
  const revealed = venueState(event, now) === 'revealed'
  const cd = countdown(event?.venueRevealAt, now)
  const { kind, summary, stage } = meta
  const topics = Array.isArray(material?.payload?.sharedTopics) ? material.payload.sharedTopics : []
  const sheet = printing ? sheetOf(view, kind) : null

  /* 到齐状态：只数真实签到记录，method 为 none 的占位不算 */
  const arrived = selectors.checkinsOf(state, group.id).filter((row) => row.method !== 'none').length
  const allHere = members.length > 0 && arrived >= members.length
  const hostName = view.venue?.hostName || C.hostName
  const hostPhone = view.venue?.hostPhone || C.hostPhone

  const closePrint = () => {
    printedRef.current = false
    setPrinting(false)
    document.body.classList.remove('is-printing')
  }

  const openPrint = () => {
    printedRef.current = false
    setPrinting(true)
  }

  const copyVenue = async () => {
    const lines = [
      view.venue?.name || '',
      view.venue?.mapHint || view.venue?.address || view.venue?.detail || view.venue?.blurb || '',
      event ? `${fmtDateTime(event.startAt)} 开始，提前 5 分钟到。第 ${group.tableNo} 桌。` : '',
      `${C.ownerLabel} ${hostName} ${hostPhone}`,
    ].filter(Boolean)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1200)
    } catch (err) {
      showToast(C.copyFail, 'error')
    }
  }

  return (
    <div className={`p-table p-table--${stage}`}>
      <div className="p-table__screen">
        {/* 1 · 桌头 */}
        <header className="p-table__head wrap wrap--content">
          <div className="p-table__head-top">
            <p className="eyebrow">03 · YOUR TABLE</p>
            <div className="p-table__head-acts">
              <Button as="a" href="#/me" size="sm" variant="secondary">我的局</Button>
              <Button size="sm" variant="ghost" onClick={openPrint}>{C.ctaPrint} ↗</Button>
            </div>
          </div>

          <div className="p-table__title-row">
            <h1 className="p-table__no">
              <span aria-hidden="true">{group.tableNo}</span>
              <span className="sr-only">{C.h1.replace('{tableNo}', group.tableNo)}</span>
            </h1>
            <span className="p-table__title-rule" aria-hidden="true" />
          </div>

          <p className="p-table__meta">
            {type?.name || '不熟局'}　·　{event ? fmtDateTime(event.startAt) : '时间待定'}　·　{members.length} 人
          </p>

          <div className="p-table__badges">
            {group.vibeLabel ? <Tag variant="seal">{group.vibeLabel}</Tag> : null}
            {host ? <Tag variant="ghost">{`带节奏 · ${host.nickname}`}</Tag> : null}
          </div>

          <div className="p-table__rule" aria-hidden="true" />
        </header>

        {/* 2 · 氛围与理由 */}
        <section className="p-table__sec wrap wrap--content" aria-labelledby="tb-reason">
          <SectionHead id="tb-reason" num="01" aside="WHY YOU" title={C.reasonTitle} />

          <div className="p-table__reason">
            <div className="p-table__quote">
              <p className="quote">{group.matchReason || '这一桌按填写的节奏排的。'}</p>
              <details className="p-table__one">
                <summary className="p-table__one-summary">
                  <span>{C.expandOne}</span>
                  <span className="p-table__one-count">{members.length} 句</span>
                </summary>
                <ul className="p-table__one-list">
                  {members.map((m) => (
                    <li key={m.id}>
                      <span className="p-table__one-name">{m.nickname}</span>
                      <span className="p-table__one-text">{m.reasonForUser || m.bio || '这一位还没写。'}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>

            <aside className="p-table__vibe">
              <p className="p-table__vibe-label">{group.vibeLabel || '这一桌的氛围'}</p>
              <p className="p-table__vibe-note">{group.vibeNote || ''}</p>
            </aside>
          </div>
        </section>

        {/* 3 · 同组的人 */}
        <section className="p-table__sec wrap wrap--content" aria-labelledby="tb-people">
          <SectionHead id="tb-people" num="02" aside="THE TABLE" title="同组的人" meta={`${members.length} 人`} />

          <ul className={`p-table__members ${stage === 'ended' ? 'is-ended' : ''}`.trim()}>
            {members.map((m) => {
              const inner = (
                <>
                  <span className={`p-table__av p-table__av--${Number(m.avatarSeed || 0) % 6}`} aria-hidden="true" />
                  <span className="p-table__member-head">
                    <span className="p-table__member-name">{m.nickname}</span>
                    <span className="p-table__member-tags">
                      {m.isHost ? <Tag variant="solid">带节奏</Tag> : null}
                      {m.isMe ? <Tag variant="seal">你</Tag> : null}
                    </span>
                  </span>
                  <span className="p-table__member-sub">
                    {[m.schoolShort, m.grade, m.majorBroad].filter(Boolean).join(' · ')}
                  </span>
                  {m.bio ? <span className="p-table__member-bio">{m.bio}</span> : null}
                  {m.tags?.length ? (
                    <span className="p-table__member-chips">
                      {m.tags.slice(0, 4).map((tag) => <Tag key={tag} variant="ghost">{tag}</Tag>)}
                    </span>
                  ) : null}
                  {m.question ? (
                    <span className="p-table__member-q">他/她想问：{m.question}</span>
                  ) : null}
                </>
              )

              return (
                <li key={m.id} className={`p-table__member ${m.isMe ? 'is-me' : ''}`.trim()}>
                  {m.question ? (
                    <button
                      type="button"
                      className="p-table__member-inner"
                      onClick={() => setAsking(m)}
                      aria-label={`${m.nickname} 出的题`}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className="p-table__member-inner">{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>

          <p className="p-table__members-note">{C.cardMore}</p>
        </section>

        {/* 4 · 共同话题 */}
        <section className="p-table__sec wrap wrap--content" aria-labelledby="tb-topics">
          <SectionHead id="tb-topics" num="03" aside="TOPICS" title={C.topicsTitle} />

          {topics.length > 0 ? (
            <ol className="p-table__topics">
              {topics.slice(0, 3).map((item, i) => (
                <li key={item.topic}>
                  <span className="num">{pad2(i + 1)}</span>
                  <span className="p-table__topic-text">{`你们都选了「${item.topic}」`}</span>
                  <span className="p-table__topic-count">{`${item.count} 人`}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-table__topics-empty">{C.topicsFallback}</p>
          )}
        </section>

        {/* 5 · 集合信息（场地锁） */}
        <section className="p-table__sec wrap wrap--content" aria-labelledby="tb-meet">
          <SectionHead
            id="tb-meet"
            num="04"
            aside="MEETUP"
            title="集合信息"
            meta={revealed ? '已解锁' : '未解锁'}
          />

          {revealed ? (
            <div className="p-table__open">
              <div className="p-table__open-top">
                <h3 className="p-table__open-title">{C.openTitle}</h3>
                <p className="p-table__open-time">
                  {event ? `${fmtTime(event.startAt)} ` : ''}
                  {C.openTime.replace('{tableNo}', group.tableNo)}
                </p>
              </div>

              <p className="p-table__venue-name">{view.venue?.name || '场地信息稍后补'}</p>
              <p className="p-table__venue-detail">
                {view.venue?.mapHint || view.venue?.address || view.venue?.detail || view.venue?.blurb || ''}
              </p>

              <dl className="p-table__open-grid">
                <div>
                  <dt>时间</dt>
                  <dd className="tnum">{event ? fmtTime(event.startAt) : '—'}</dd>
                </div>
                <div>
                  <dt>组号</dt>
                  <dd className="tnum">{group.tableNo}</dd>
                </div>
                <div className="p-table__open-owner">
                  <dt>{C.ownerLabel}</dt>
                  <dd>
                    <span className="p-table__host-name">{hostName}</span>
                    <a className="p-table__host-tel" href={`tel:${hostPhone.replace(/[^\d+]/g, '')}`}>{hostPhone}</a>
                  </dd>
                </div>
              </dl>

              <div className="p-table__open-acts">
                <Button variant="secondary" onClick={copyVenue}>{copied ? C.ctaCopied : C.ctaCopy}</Button>
              </div>

              <p className="p-table__open-foot">{C.openFoot}</p>
            </div>
          ) : (
            <div className="p-table__lock">
              <svg
                className="p-table__lock-icon"
                viewBox="0 0 32 32" width="32" height="32" fill="none"
                stroke="currentColor" strokeWidth="2" aria-hidden="true"
              >
                <rect x="6" y="14" width="20" height="14" />
                <path d="M10 14v-4a6 6 0 0 1 12 0v4" />
              </svg>

              <p className="p-table__lock-title">
                {event?.venueRevealAt
                  ? `集合地点 ${fmtDate(event.venueRevealAt)} ${fmtTime(event.venueRevealAt)} 解锁`
                  : '集合地点还没定'}
              </p>

              <p className="p-table__lock-cd">
                <span className="p-table__lock-cd-pre">还有</span>
                <span className="p-table__lock-cd-num tnum">{cd.ended ? '00:00:00' : cd.short}</span>
                <span className="p-table__lock-cd-post">解锁</span>
              </p>

              <p className="p-table__lock-next">{C.lockedNext}</p>

              <dl className="p-table__lock-grid">
                <div>
                  <dt>时间</dt>
                  <dd>{event ? `${fmtWeekday(event.startAt)} ${fmtTime(event.startAt)} 开始` : '待定'}</dd>
                </div>
                <div>
                  <dt>片区</dt>
                  <dd>{event?.campus || '大学城'}</dd>
                </div>
                <div>
                  <dt>人数</dt>
                  <dd className="tnum">{members.length} 人</dd>
                </div>
              </dl>

              <p className="p-table__lock-hint">{C.lockedHint}</p>
              <p className="p-table__lock-owner">{C.ownerNote}</p>
            </div>
          )}

          <div className="p-table__arrived-row">
            <span className="p-table__arrived-label">{C.arrivedLabel}</span>
            <span className={`p-table__arrived ${allHere ? 'is-full' : ''}`.trim()}>
              {`已到 ${arrived}/${members.length}`}
            </span>
          </div>
        </section>

        {/* 6 · 物料预览 */}
        <section className="p-table__sec wrap wrap--content" aria-labelledby="tb-material">
          <SectionHead
            id="tb-material"
            num="05"
            aside="MATERIAL"
            title={C.materialTitle}
            meta={KIND_LABEL[kind]}
          />

          {stage === 'ended' ? (
            <p className="p-table__ended-row">
              <a href={`#/recap/${group.id}`}>{C.endedRow} →</a>
            </p>
          ) : (
            <div className="p-table__material">
              <div className="p-table__mat-summary">
                <p className="p-table__mat-title">{summary.title}</p>
                <p className="p-table__mat-text">{summary.text}</p>
                <div className="p-table__mat-acts">
                  <Button as="a" href={`#/live/${group.id}`} arrow>{C.ctaLive}</Button>
                  <Button variant="secondary" onClick={openPrint}>{C.ctaPrint}</Button>
                </div>
              </div>

              <div className="p-table__mat-preview">
                {kind === 'checkinSheet' && Array.isArray(material?.payload?.checkinSheet?.days) ? (
                  <div className="p-table__checkin-wrap">
                    <ul className="p-table__checkin-head" aria-hidden="true">
                      <li>
                        <span className="p-table__checkin-name" />
                        <span className="p-table__checkin-cells">
                          {material.payload.checkinSheet.days.map((day) => (
                            <span key={day} className="p-table__cell p-table__cell--head">
                              {String(day).replace('周', '')}
                            </span>
                          ))}
                        </span>
                      </li>
                    </ul>
                    <ul className="p-table__checkin">
                      {material.payload.checkinSheet.rows.map((row) => (
                        <li key={row.nickname}>
                          <span className="p-table__checkin-name">{row.nickname}</span>
                          <span className="p-table__checkin-cells">
                            {row.days.map((cell, i) => (
                              <span key={i} className={`p-table__cell ${cell ? 'is-on' : ''}`.trim()}>
                                {cell ? '○' : ''}
                              </span>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ol className="p-table__preview-list">
                    {summary.lines.map((line) => (
                      <li key={line.no}>
                        <span className="num">{line.no}</span>
                        <span>{line.text}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="p-table__preview-foot">{KIND_LABEL[kind]}</p>
              </div>
            </div>
          )}
        </section>

        <p className="p-table__footnote wrap wrap--content">
          {event ? `场次：${fmtDate(event.startAt)} ${fmtWeekday(event.startAt)} · 组号 ${group.tableNo}` : `组号 ${group.tableNo}`}
        </p>
      </div>

      {printing && sheet ? <PrintSheet view={view} kind={kind} sheet={sheet} isRevealed={revealed} /> : null}

      <Modal
        open={Boolean(asking)}
        onClose={() => setAsking(null)}
        title={asking ? `${asking.nickname} 出的题` : '出的题'}
      >
        <p className="p-table__ask">{asking?.question || ''}</p>
      </Modal>

      {/* 打印收尾：afterprint 在某些浏览器不触发，给一个可点出口 */}
      {printing ? (
        <button type="button" className="p-table__print-exit" onClick={closePrint}>打印完了，回到页面</button>
      ) : null}
    </div>
  )
}
