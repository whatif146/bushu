import { useEffect, useMemo, useRef, useState } from 'react'
import { navigate, useRoute } from '../lib/router.jsx'
import { actions, groupView, selectors, useStore } from '../lib/api.js'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import Tag from '../components/Tag.jsx'
import { useToast } from '../components/Toast.jsx'
import { fmtDateWeek, fmtTime } from '../lib/format.js'

/**
 * 现场引导 #/live/:groupId —— 全屏、无 nav、无 footer、移动优先（design-spec §6.5 / §8.2）
 *
 * 铁律（实现时刻意遵守的几条）：
 *  1. 整页不滚动（height:100svh + overflow:hidden）；只有打卡表/赛制/课程表在舞台区内滚。
 *  2. 一屏一张卡、一个主按钮；主按钮在底部拇指区，56px 高、18px 字。
 *  3. 必读层 ≥18px（题面 24 / 按钮 18 / 打卡人名与比分 18）；辅助层 11–14px 只放标记与署名。
 *  4. 不显示任何统计（跳过数、完成率、排名一律不做）。
 *  5. AI 到这里退场：页面上不出现推荐、评价、分享、slogan。
 */

/* ── 文案：现场页专用短句（content-plan 没覆盖的几句集中在这里，便于统一改） ── */
const DEPTH_LABEL = { icebreak: '破冰', interest: '兴趣与经历', opinion: '观点' }
const DEPTH_HINT = {
  icebreak: '不用想太久，想到什么说什么。',
  interest: '讲一件真事，别总结。',
  opinion: '可以不同意，这题没有标准答案。',
}
const INTRO_LINE = '从这里开始，屏幕就没用了。谁抽到谁答，答不上来就跳过。'
const FAREWELL = '牌翻完了，接下来不用看屏幕。'
const PLAYS = [
  '每个人说手机里最后一个打开的 App，说不上来的那人去倒水。',
  '一人说一件今天出门前做过的事，最不像真的那件算赢。',
  '挑一个人，其余人各说一句关于他的猜测，猜对的得一分。',
]
const SAFETY_LEAD = '不舒服就点这里'

const KIND_MAP = {
  cards: 'cards',
  topicCards: 'cards',
  goal: 'goal',
  checkinSheet: 'goal',
  tournament: 'tournament',
  curriculum: 'curriculum',
  skillSchedule: 'curriculum',
}
const kindOf = (material) => KIND_MAP[material && material.kind] || 'cards'

const DEPTH_OF_INTENSITY = { 1: 'icebreak', 2: 'interest', 3: 'opinion' }

/** 物料 → 统一的牌堆结构。兼容两种形状：
 *  A. lib/materials.js buildMaterial：payload.deck（depth/intensity/kind/ownerId）
 *  B. store 的种子物料：payload.cards（questions.js 的 depth 1/2/3） */
function deckOf(material) {
  const p = (material && material.payload) || {}
  const raw = Array.isArray(p.deck) ? p.deck : Array.isArray(p.cards) ? p.cards : []
  return raw
    .filter(Boolean)
    .map((c, i) => {
      const depth = c.depth || DEPTH_OF_INTENSITY[c.intensity] || 'icebreak'
      return {
        key: String(c.id || `card_${i}`),
        text: String(c.text || ''),
        depth,
        intensity: Number(c.intensity) || (depth === 'opinion' ? 3 : depth === 'interest' ? 2 : 1),
        isPrompt: c.kind === 'prompt',
        ownerId: c.ownerId || null,
      }
    })
    .filter((c) => c.text)
}

/** 牌堆按段分组（进度点分段显示，暗示「还有多久进深水区」） */
function segmentsOf(deck) {
  const out = []
  deck.forEach((card, i) => {
    const last = out[out.length - 1]
    if (last && last.depth === card.depth) last.items.push(i)
    else out.push({ depth: card.depth, items: [i] })
  })
  return out
}


/** 按组 id 做种子的洗牌：每一桌的牌序都不一样，但同一桌刷新后不会变。
 *  线性发牌会让人预判「下一张该讲深了」，随机抽才像真的在抽牌。 */
function shuffleSeeded(list, seedStr) {
  let seed = 0
  for (const ch of String(seedStr || '')) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export default function Live() {
  const route = useRoute()
  const state = useStore()
  const { showToast } = useToast()
  const gid = route.params.groupId

  const view = gid ? groupView(state, gid) : null
  const group = view && view.group
  const event = view && view.event
  const type = view && view.type
  const members = (view && view.members) || []
  const material = view && view.material
  const venue = view && view.venue
  const me = state.session.userId

  const checkins = gid ? selectors.checkinsOf(state, gid) : []
  const iChecked = checkins.some((c) => c.userId === me)

  const kind = kindOf(material)
  const deck = useMemo(() => shuffleSeeded(deckOf(material), gid), [material, gid])
  const segments = useMemo(() => segmentsOf(deck), [deck])
  const progress = (material && material.progress) || {}
  const savedIndex = Number.isFinite(progress.index) ? progress.index : 0

  /* ── 弹窗与本地态 ── */
  const [dialog, setDialog] = useState(null) // quit | checkin | safety | play | person | round
  const [personId, setPersonId] = useState(null)
  const [playIndex, setPlayIndex] = useState(() => Math.floor(Math.random() * PLAYS.length))
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const codeRef = useRef(null)

  const [flipped, setFlipped] = useState(false)
  const [cardIndex, setCardIndex] = useState(() => Math.min(Math.max(0, savedIndex), Math.max(0, deck.length - 1)))
  const [introOpen, setIntroOpen] = useState(() => deck.length > 0 && savedIndex === 0)
  const [manualEnd, setManualEnd] = useState(false)

  const [round, setRound] = useState(0) // 竞技：第几轮（0 基）
  const [slot, setSlot] = useState(0) // 技能：第几节（0 基）
  const [winners, setWinners] = useState({}) // 竞技：本地点选胜方
  const [warmupDone, setWarmupDone] = useState([])
  const [localMarks, setLocalMarks] = useState(null)

  const swipeRef = useRef(null)

  /* ── body 上加 .is-live：隐藏全站导航与页脚（卸载时移除） ── */
  useEffect(() => {
    document.body.classList.add('is-live')
    return () => document.body.classList.remove('is-live')
  }, [])

  /* ── 时间闸门：物料已印（组已锁定）就算到了现场；未开组的散场外拦一下 ── */
  const startAt = event && event.startAt ? new Date(event.startAt).getTime() : NaN
  const endAt = event && event.endAt ? new Date(event.endAt).getTime() : NaN
  const lockedStatus = group && ['locked', 'ongoing', 'finished'].includes(group.status)
  const notStarted = Number.isFinite(startAt) && Date.now() < startAt - 15 * 60 * 1000 && !lockedStatus
  const timeEnded = Number.isFinite(endAt) && Date.now() > endAt
  const ended = manualEnd || timeEnded || (group && group.status === 'finished')

  const total = deck.length
  const current = deck[cardIndex] || null
  const answerer = members.length ? members[cardIndex % members.length] : null
  const owner = current && current.ownerId ? members.find((m) => m.id === current.ownerId) : null

  const goalP = (material && material.payload) || {}
  const myGoalCard = Array.isArray(goalP.goalCards) ? goalP.goalCards.find((c) => c.userId === me) : null
  const goalFields = goalP.goalCard || null

  const tour = kind === 'tournament' ? goalP : null
  const rounds = (tour && Array.isArray(tour.rounds) && tour.rounds) || []
  const currentRound = rounds[Math.min(round, Math.max(0, rounds.length - 1))] || null

  const timetable = kind === 'curriculum' && Array.isArray(goalP.timetable) ? goalP.timetable : []
  const currentSlot = timetable[Math.min(slot, Math.max(0, timetable.length - 1))] || null

  /* ── 进度：顶栏文字 + 2px 条 ── */
  let progressText = ''
  let progressRatio = 0
  if (kind === 'cards') {
    const shown = introOpen ? 0 : cardIndex + 1
    progressText = `第 ${shown} / ${total} 题`
    progressRatio = total ? shown / total : 0
  } else if (kind === 'goal') {
    const startMs = Number.isFinite(startAt) ? startAt : Date.now()
    const spent = Math.max(0, Math.round((Date.now() - startMs) / 60000))
    progressText = `已坐 ${spent} 分钟`
    progressRatio = Number.isFinite(endAt) && endAt > startMs ? Math.min(1, (Date.now() - startMs) / (endAt - startMs)) : 0
  } else if (kind === 'tournament') {
    progressText = `第 ${Math.min(round + 1, Math.max(1, rounds.length))} / ${Math.max(1, rounds.length)} 轮`
    progressRatio = rounds.length ? (round + 1) / rounds.length : 0
  } else {
    progressText = `第 ${Math.min(slot + 1, Math.max(1, timetable.length))} / ${Math.max(1, timetable.length)} 节`
    progressRatio = timetable.length ? (slot + 1) / timetable.length : 0
  }

  /* ── 键盘：← → 翻页（输入框与弹窗内不接管） ── */
  useEffect(() => {
    if (dialog || ended || kind !== 'cards') return undefined
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!gid || !view || !group) {
    return (
      <section className="p-live p-live--blank">
        <h1 className="sr-only">现场引导</h1>
        <p className="live__blank-line">找不到这一桌。</p>
        <Button as="a" href="#/me" variant="secondary">回我的局</Button>
      </section>
    )
  }

  /* ── 动作封装：统一失败提示 ── */
  function run(res, okMsg) {
    if (res && res.ok) {
      if (okMsg) showToast(okMsg, 'ok')
      return true
    }
    showToast((res && res.error) || '没存上，再点一次试试。', 'error')
    return false
  }

  function persist(payload) {
    actions.saveMaterialProgress(gid, payload)
  }

  function goPrev() {
    if (cardIndex <= 0) return
    setFlipped(false)
    setCardIndex((i) => i - 1)
    persist({ index: Math.max(0, cardIndex - 1) })
  }

  function goNext() {
    setFlipped(false)
    if (cardIndex >= total - 1) {
      setManualEnd(true)
      return
    }
    setCardIndex((i) => i + 1)
    persist({ index: Math.min(total - 1, cardIndex + 1) })
  }

  function skip() {
    setFlipped(false)
    const next = Math.min(total - 1, cardIndex + 1)
    const skipped = Array.from(new Set([...(progress.skipped || []), cardIndex]))
    persist({ skipped, index: next })
    if (cardIndex >= total - 1) {
      setManualEnd(true)
      return
    }
    setCardIndex(next)
  }

  function markTalked() {
    const talked = Array.from(new Set([...(progress.talked || []), current ? current.key : cardIndex]))
    run(actions.saveMaterialProgress(gid, { talked }), '记下了。')
  }

  function submitCode(e) {
    e && e.preventDefault()
    const entered = code.trim()
    if (entered.length !== 6) {
      setCodeError('还差几位。码是 6 位数字。')
      return
    }
    if (entered !== String(group.checkinCode || '')) {
      setCodeError('码不对。看看纸的页脚，或者问现场负责人。')
      return
    }
    const res = actions.checkIn(gid)
    if (res && res.ok) {
      setDialog(null)
      setCode('')
      setCodeError('')
      const done = members.length - (res.remaining || 0)
      showToast(`签到了，${fmtTime(Date.now())}。这一桌 ${done} / ${members.length} 人已到。`, 'ok')
    } else {
      setCodeError((res && res.error) || '没签上，再试一次。')
    }
  }

  /* ── 打卡格：本桌 7 天 ── */
  const savedMarks = progress.marks || {}
  const rows = Array.isArray(goalP.checkinSheet && goalP.checkinSheet.rows) ? goalP.checkinSheet.rows : []
  const sheetRows = (rows.length ? rows : members.map((m) => ({ userId: m.id, nickname: m.nickname }))).map((r) => {
    const saved = savedMarks[r.userId]
    const base = Array.isArray(saved) ? saved : Array.isArray(r.days) ? r.days.map(Boolean) : Array(7).fill(false)
    return { userId: r.userId, nickname: r.nickname, days: base }
  })
  const todayIdx = (new Date().getDay() + 6) % 7 // 周一 = 0
  const todayDone = sheetRows.filter((r) => r.days[todayIdx]).length

  function toggleCell(userId, dayIdx) {
    const next = sheetRows.map((r) => (r.userId === userId ? { ...r, days: r.days.map((d, i) => (i === dayIdx ? !d : d)) } : r))
    const marks = {}
    next.forEach((r) => { marks[r.userId] = r.days })
    setLocalMarks(marks)
    const ok = run(actions.saveMaterialProgress(gid, { marks }))
    if (ok) showToast(`记下了，${fmtTime(Date.now())}。`, 'ok')
    else setLocalMarks(null)
  }
  const shownRows = localMarks
    ? sheetRows.map((r) => (localMarks[r.userId] ? { ...r, days: localMarks[r.userId] } : r))
    : sheetRows

  /* ── 竞技：计分与热身 ── */
  const scores = progress.scores || {}
  const scoreA = Number(scores.teamA) || 0
  const scoreB = Number(scores.teamB) || 0
  const teams = (tour && tour.teams) || []

  function bumpScore(side, delta) {
    const nextScores = { ...scores, teamA: scoreA, teamB: scoreB }
    nextScores[side] = Math.max(0, Math.min(99, nextScores[side] + delta))
    run(actions.saveMaterialProgress(gid, { scores: nextScores }))
  }

  const warmDone = warmupDone.length ? warmupDone : progress.warmup || []
  function toggleWarm(stepNo) {
    setWarmupDone(warmDone.includes(stepNo) ? warmDone.filter((n) => n !== stepNo) : [...warmDone, stepNo])
  }

  const memberName = (uid) => {
    const m = members.find((x) => x.id === uid)
    return m ? m.nickname : '有人'
  }

  const person = members.find((m) => m.id === personId) || null
  const peopleByIdentity = members

  /* ── 散场 ── */
  if (ended) {
    return (
      <section className="p-live p-live--end">
        <h1 className="sr-only">第 {group.tableNo} 桌 现场引导</h1>
        <div className="live__end">
          <p className="live__end-eyebrow">散场</p>
          <p className="live__end-line">这局结束了。</p>
          <p className="live__end-note">{FAREWELL}</p>
          <Button block onClick={() => navigate(`/recap/${gid}`)} arrow>看看这局的回顾</Button>
          <button type="button" className="live__end-exit" onClick={() => navigate('/me')}>回我的局</button>
        </div>
      </section>
    )
  }

  /* ── 还没到点（物料没印、组没锁） ── */
  if (notStarted) {
    return (
      <section className="p-live p-live--blank">
        <h1 className="sr-only">第 {group.tableNo} 桌 现场引导</h1>
        <div className="live__lock">
          <p className="live__lock-eyebrow">{type ? type.name : '不熟局'}</p>
          <p className="live__lock-line">现场页 {fmtTime(event.startAt)} 开放</p>
          <p className="live__lock-sub">{fmtDateWeek(event.startAt)} · 牌还在印，开始前 2 小时会好。</p>
          <Button as="a" href="#/me" variant="secondary">回我的局</Button>
        </div>
      </section>
    )
  }

  /* ──────────────────────────── 正常态 ──────────────────────────── */
  return (
    <section className={`p-live p-live--${kind}`}>
      <h1 className="sr-only">第 {group.tableNo} 桌 现场引导</h1>

      {/* 区块 1 顶条 */}
      <header className="live__top">
        <span className="live__table">第 {group.tableNo} 桌</span>
        <span className="live__count" aria-hidden="true">{progressText}</span>
        {iChecked ? (
          <span className="live__checked">已签到</span>
        ) : (
          <button
            type="button"
            className="live__chip"
            onClick={() => { setDialog('checkin'); setCodeError(''); }}
          >
            签到
          </button>
        )}
        <button type="button" className="live__quit" onClick={() => setDialog('quit')} aria-label="退出这局">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" />
          </svg>
        </button>
      </header>

      {/* 2px 进度条：信息由图形承担 */}
      <div className="live__progress" aria-hidden="true">
        <span className="live__progress-fill" style={{ width: `${Math.max(0, Math.min(1, progressRatio)) * 100}%` }} />
      </div>

      {/* 读屏播报：题号变化 / 翻面后的补充信息 */}
      <p className="sr-only" aria-live="polite">
        {kind === 'cards'
          ? introOpen
            ? INTRO_LINE
            : `第 ${cardIndex + 1} 题，共 ${total} 题。${current ? current.text : ''}${flipped && answerer ? ` 由 ${answerer.nickname} 先答。` : ''}`
          : progressText}
      </p>

      {/* 区块 2 舞台 */}
      <div className={`live__stage ${kind === 'cards' ? 'live__stage--deck' : 'live__stage--scroll'}`}>
        {kind === 'cards' && (
          <TopicDeck
            deck={deck}
            segments={segments}
            cardIndex={cardIndex}
            current={current}
            introOpen={introOpen}
            flipped={flipped}
            answerer={answerer}
            owner={owner}
            talked={(progress.talked || []).includes(current ? current.key : '')}
            onFlip={() => setFlipped((v) => !v)}
            onStart={() => setIntroOpen(false)}
            onPrev={goPrev}
            onTalked={markTalked}
            onSkip={skip}
            onNext={goNext}
            swipeRef={swipeRef}
            isLast={cardIndex >= total - 1}
          />
        )}

        {kind === 'goal' && (
          <GoalSheet
            goalFields={goalFields}
            myCard={myGoalCard}
            rows={shownRows}
            todayIdx={todayIdx}
            todayDone={todayDone}
            memberCount={members.length}
            onToggle={toggleCell}
          />
        )}

        {kind === 'tournament' && (
          <TournamentSheet
            tour={tour}
            rounds={rounds}
            currentRound={currentRound}
            roundNo={round}
            winners={winners}
            onPick={(key, side) => setWinners((w) => ({ ...w, [key]: side }))}
            warmDone={warmDone}
            onWarm={toggleWarm}
            scoreA={scoreA}
            scoreB={scoreB}
            teams={teams}
            onBump={bumpScore}
            memberName={memberName}
            onNextRound={() => setDialog('round')}
            isLastRound={round >= rounds.length - 1}
          />
        )}

        {kind === 'curriculum' && (
          <SkillSheet
            timetable={timetable}
            currentSlot={currentSlot}
            slotNo={slot}
            swapNote={goalP.swapRound && goalP.swapRound.note}
            materialsNote={goalP.materialsNote}
            eventStart={event.startAt}
            isLastSlot={slot >= timetable.length - 1}
            onNextSlot={() => {
              if (slot >= timetable.length - 1) { setManualEnd(true); return }
              setSlot((s) => s + 1)
              if (timetable[slot + 1]) showToast(`换人。${timetable[slot + 1].teacherName} 教 ${timetable[slot + 1].learnerName}。`, 'info')
            }}
          />
        )}
      </div>

      {/* 区块 3–4：固定底部三层（引导句 25 + 身份卡条 96 + 安全条 44） */}
      <div className="live__bottom">
        <p className="live__lead-line">想不出话的时候，翻这个。</p>
        <div className="live__strip" role="list">
          {peopleByIdentity.map((m) => (
            <button
              type="button"
              role="listitem"
              key={m.id}
              className="live__person"
              onClick={() => { setPersonId(m.id); setDialog('person') }}
            >
              <span className="live__person-name">{m.nickname}</span>
              <span className="live__person-meta">{[m.schoolShort, m.majorBroad, m.grade].filter(Boolean).join(' · ')}</span>
              <span className="live__person-q">{m.question ? `「${m.question}」` : '还没写想问的问题'}</span>
            </button>
          ))}
        </div>
        <div className="live__safety">
          <span className="live__safety-icon" aria-hidden="true" />
          <span className="live__safety-text">{SAFETY_LEAD}</span>
          <button type="button" className="live__safety-btn" onClick={() => setDialog('safety')}>反馈</button>
          <button type="button" className="live__safety-btn live__safety-btn--play" onClick={() => setDialog('play')}>卡住了？</button>
        </div>
      </div>

      {/* ── 弹窗 ── */}
      <Modal
        open={dialog === 'quit'}
        onClose={() => setDialog(null)}
        title="现在退出？"
        footer={(
          <div className="live__modal-row">
            <Button variant="secondary" onClick={() => setDialog(null)}>继续</Button>
            <Button onClick={() => navigate('/me')}>退出</Button>
          </div>
        )}
      >
        <p className="live__modal-text">
          现在退出，进度会停在 {kind === 'cards' ? `${introOpen ? 0 : cardIndex + 1}/${total}` : progressText}。下次进来接着看。
        </p>
      </Modal>

      <Modal
        open={dialog === 'checkin'}
        onClose={() => setDialog(null)}
        title="输入签到码"
        footer={(
          <Button block onClick={() => submitCode()} disabled={code.trim().length !== 6}>签到</Button>
        )}
      >
        <form onSubmit={submitCode}>
          <p className="live__modal-text">码在打印纸页脚，或问现场负责人。</p>
          <label className="live__code" htmlFor="live-checkin-code">
            <span className="sr-only">6 位签到码</span>
            <span className="live__code-boxes" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`live__code-box ${code[i] ? 'is-filled' : ''}`.trim()}>{code[i] || ''}</span>
              ))}
            </span>
            <input
              id="live-checkin-code"
              ref={codeRef}
              className="live__code-input"
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-invalid={codeError ? 'true' : undefined}
              aria-describedby="live-checkin-err"
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                setCodeError('')
              }}
            />
          </label>
          <p
            id="live-checkin-err"
            className={`live__code-err ${codeError ? 'is-error' : ''}`.trim()}
            role={codeError ? 'alert' : undefined}
          >
            {codeError || (iChecked ? '' : `这一桌 ${checkins.length} / ${members.length} 人已签到。`)}
          </p>
        </form>
      </Modal>

      <Modal open={dialog === 'safety'} onClose={() => setDialog(null)} title={SAFETY_LEAD}>
        <p className="live__modal-text">这一版后台还收不到在线反馈。现在最快的两条路：</p>
        <ul className="live__modal-list">
          <li>找现场负责人说一句，{venue ? venue.name : '场地方'}的人知道流程。</li>
          <li>直接走。不用解释，也不用回来打招呼。</li>
        </ul>
      </Modal>

      <Modal
        open={dialog === 'play'}
        onClose={() => setDialog(null)}
        title="卡住了？"
        footer={(
          <div className="live__modal-row">
            <Button variant="secondary" onClick={() => setPlayIndex((i) => (i + 1) % PLAYS.length)}>换一条</Button>
            <Button onClick={() => setDialog(null)}>接着聊</Button>
          </div>
        )}
      >
        <p className="live__modal-text">{PLAYS[playIndex]}</p>
      </Modal>

      <Modal
        open={dialog === 'person'}
        onClose={() => { setDialog(null); setPersonId(null) }}
        title={person ? person.nickname : '同桌的人'}
      >
        {person && (
          <>
            <p className="live__modal-text">{[person.schoolShort, person.majorBroad, person.grade].filter(Boolean).join(' · ')}</p>
            {person.question ? (
              <p className="live__modal-quote">「{person.question}」</p>
            ) : (
              <p className="live__modal-text">这个人没写想问的问题。</p>
            )}
            {person.isHost && <Tag variant="solid">组长</Tag>}
          </>
        )}
      </Modal>

      <Modal
        open={dialog === 'round'}
        onClose={() => setDialog(null)}
        title={`第 ${round + 1} 轮结束`}
        footer={(
          <div className="live__modal-row">
            <Button variant="secondary" onClick={() => setDialog(null)}>再看一眼</Button>
            <Button
              onClick={() => {
                setDialog(null)
                if (round >= rounds.length - 1) { setManualEnd(true); return }
                setRound((r) => r + 1)
              }}
            >
              下一轮
            </Button>
          </div>
        )}
      >
        <p className="live__modal-text">这一轮的比分是 {scoreA}:{scoreB}，记下了？</p>
      </Modal>
    </section>
  )
}

/* ══════════════════════ 2A 话题卡牌 ══════════════════════ */
function TopicDeck({
  deck, segments, cardIndex, current, introOpen, flipped, answerer, owner, talked,
  onFlip, onStart, onPrev, onTalked, onSkip, onNext, swipeRef, isLast,
}) {
  const depth = current ? current.depth : 'icebreak'
  const no = String(cardIndex + 1).padStart(2, '0')

  function onPointerDown(e) {
    swipeRef.current = e.clientX
  }
  function onPointerUp(e) {
    if (swipeRef.current == null) return
    const dx = e.clientX - swipeRef.current
    swipeRef.current = null
    if (dx > 56) onPrev()
    else if (dx < -56) onNext()
  }

  if (introOpen) {
    return (
      <>
        <div className="deck deck--intro">
          <div className="deck__inner">
            <div className="deck__face deck__face--front deck__face--intro">
              <span className="deck__seg">开场</span>
              <p className="deck__intro">{INTRO_LINE}</p>
              <span className="deck__hint">牌在桌上，也在你手机里。谁抽到谁答。</span>
            </div>
          </div>
        </div>
        <div className="deck__dots" aria-hidden="true" />
        <div className="deck__nav">
          <Button block onClick={onStart}>开始</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <div
        className={`deck ${flipped ? 'is-flipped' : ''}`.trim()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <span className="deck__under" aria-hidden="true" />
        <span className="deck__under deck__under--2" aria-hidden="true" />
        <span className="deck__under deck__under--3" aria-hidden="true" />
        <div className="deck__inner" key={current ? current.key : 'end'}>
          {/* 正面朝上时是牌背：抽到的牌先盖着，点一下才翻过来 */}
          <div className="deck__face deck__face--front">
            <button type="button" className="deck__hit deck__hit--cover" onClick={onFlip}>
              <span className="deck__cover" aria-hidden="true">
                <span className="deck__cover-mark">不熟局</span>
                <span className="deck__cover-no">NO.{no}</span>
              </span>
              <span className="deck__cover-hint">抽一张，翻开看题</span>
              <span className="sr-only">点一下翻牌，看这道题。</span>
            </button>
          </div>
          <div className="deck__face deck__face--back">
            <span className="deck__seg">
              {DEPTH_LABEL[depth] || '破冰'} <em className="deck__no">{no}</em>
            </span>
            <button type="button" className="deck__hit" onClick={onFlip}>
              <span className={`deck__text ${current && current.isPrompt ? 'deck__text--prompt' : ''}`.trim()}>
                {current ? current.text : '牌翻完了。'}
              </span>
              {current && !current.isPrompt && <span className="deck__hint">{DEPTH_HINT[depth]}</span>}
              <span className="deck__back-line">
                {answerer ? `由 ${answerer.nickname} 先答，其他人可以补一句。` : '由抽到的人先答。'}
              </span>
              {owner && <span className="deck__by">—— {owner.nickname}出的题</span>}
              <span className="sr-only">点一下把牌盖回去。</span>
            </button>
          </div>
        </div>
      </div>

      <p className="deck__left" aria-live="polite">
        还剩 {Math.max(0, deck.length - cardIndex - 1)} 张
      </p>

      <div className="deck__dots">
        <div className="deck__dots-groups" aria-hidden="true">
          {segments.map((seg) => (
            <span className="deck__dots-group" key={`${seg.depth}-${seg.items[0]}`}>
              {seg.items.map((i) => (
                <span
                  key={i}
                  className={`deck__dot ${i === cardIndex ? 'is-on' : ''} ${i < cardIndex ? 'is-done' : ''}`.trim()}
                />
              ))}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="deck__talked"
          onClick={onTalked}
          aria-pressed={talked}
        >
          {talked ? '这题聊开了' : '这题聊开了？'}
        </button>
      </div>

      <div className="deck__nav">
        <Button variant="secondary" block onClick={onSkip}>跳过</Button>
        <Button block onClick={onNext}>{isLast ? '牌翻完了' : '下一题'}</Button>
      </div>
    </>
  )
}

/* ══════════════════════ 2B 打卡表（搭子型） ══════════════════════ */
function GoalSheet({ goalFields, myCard, rows, todayIdx, todayDone, memberCount, onToggle }) {
  const goal = (myCard && myCard.goalText) || (goalFields && (goalFields.goal || goalFields.title)) || '目标还没写，现场补一句。'
  const deadline = (myCard && myCard.deadline) || '没填，现场说定'
  const stake = (goalFields && goalFields.stake) || '掉队的人请下一轮奶茶。'
  const days = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <div className="goal">
      <section className="goal__card" aria-label="我的目标卡">
        <p className="goal__card-label">我的目标</p>
        <p className="goal__card-goal">{goal}</p>
        <dl className="goal__card-meta">
          <div><dt>截止</dt><dd>{deadline}</dd></div>
          <div><dt>押注</dt><dd>{stake}</dd></div>
        </dl>
        {goalFields && Array.isArray(goalFields.fields) && (
          <ul className="goal__card-fields">
            {goalFields.fields.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}
      </section>

      <p className="goal__today">本组今天打卡 {todayDone} / {memberCount} 人</p>

      <div className="goal__sheet">
        <div className="goal__head" aria-hidden="true">
          <span className="goal__name" />
          {days.map((d) => <span className="goal__day" key={d}>{d}</span>)}
        </div>
        {rows.map((r) => (
          <div className="goal__row" key={r.userId}>
            <span className="goal__name">{r.nickname}</span>
            {r.days.map((on, i) => (
              <button
                key={i}
                type="button"
                className={`goal__cell ${on ? 'is-on' : ''}`.trim()}
                onClick={() => onToggle(r.userId, i)}
                aria-pressed={on}
                aria-label={`${r.nickname} 周${days[i]}${on ? '已打卡，点一下取消' : '未打卡，点一下打勾'}`}
              >
                {on ? '✓' : ''}
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="goal__note">打不上也没关系，明天再打。</p>
    </div>
  )
}

/* ══════════════════════ 2C 赛制页（竞技型） ══════════════════════ */
function TournamentSheet({
  tour, rounds, currentRound, roundNo, winners, onPick, warmDone, onWarm,
  scoreA, scoreB, teams, onBump, memberName, onNextRound, isLastRound,
}) {
  if (!tour) {
    return <p className="live__modal-text">这桌的赛制还没印出来。</p>
  }
  const warmup = Array.isArray(tour.warmup) ? tour.warmup : []
  const teamName = (k) => {
    const t = teams.find((x) => x.key === k)
    return t ? t.name : `${k} 队`
  }

  return (
    <div className="tour">
      <section className="tour__block">
        <h2 className="tour__title">热身 {tour.warmupTotalMin || 0} 分钟</h2>
        <ul className="tour__warm">
          {warmup.map((s) => {
            const no = s.step || s.no
            const on = warmDone.includes(no)
            return (
              <li key={no}>
                <button
                  type="button"
                  className={`tour__warm-row ${on ? 'is-on' : ''}`.trim()}
                  onClick={() => onWarm(no)}
                  aria-pressed={on}
                >
                  <span className="tour__warm-box" aria-hidden="true">{on ? '✓' : no}</span>
                  <span className="tour__warm-name">{s.name}</span>
                  <span className="tour__warm-min">{s.minutes || s.min} 分钟</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="tour__block">
        <h2 className="tour__title">第 {roundNo + 1} 轮</h2>
        {currentRound && (
          <>
            <p className="tour__rule">{currentRound.rule}</p>
            <ul className="tour__matches">
              {(currentRound.matches || []).map((m, i) => {
                const key = `${roundNo}-${i}`
                const pick = winners[key]
                return (
                  <li className="tour__match" key={key}>
                    {m.label ? (
                      <span className="tour__match-label">{m.label}</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`tour__side ${pick === 'a' ? 'is-on' : ''}`.trim()}
                          onClick={() => onPick(key, 'a')}
                          aria-pressed={pick === 'a'}
                        >
                          {memberName(m.a)}
                        </button>
                        <span className="tour__vs" aria-hidden="true">vs</span>
                        <button
                          type="button"
                          className={`tour__side ${pick === 'b' ? 'is-on' : ''}`.trim()}
                          onClick={() => onPick(key, 'b')}
                          aria-pressed={pick === 'b'}
                        >
                          {memberName(m.b)}
                        </button>
                      </>
                    )}
                    <span className="tour__court">场地 {m.court || i + 1} · {currentRound.min} 分钟</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <Button block onClick={onNextRound}>{isLastRound ? '打完了' : '下一轮'}</Button>
      </section>

      <section className="tour__block">
        <h2 className="tour__title">计分</h2>
        <div className="tour__score">
          <div className="tour__score-side">
            <span className="tour__score-name">{teamName('A')}</span>
            <div className="tour__score-btns">
              <button type="button" className="tour__score-btn" onClick={() => onBump('teamA', -1)} aria-label={`${teamName('A')} 减一分`}>−</button>
              <span className="tour__score-num">{scoreA}</span>
              <button type="button" className="tour__score-btn" onClick={() => onBump('teamA', 1)} aria-label={`${teamName('A')} 加一分`}>+</button>
            </div>
          </div>
          <span className="tour__score-colon" aria-hidden="true">:</span>
          <div className="tour__score-side">
            <span className="tour__score-name">{teamName('B')}</span>
            <div className="tour__score-btns">
              <button type="button" className="tour__score-btn" onClick={() => onBump('teamB', -1)} aria-label={`${teamName('B')} 减一分`}>−</button>
              <span className="tour__score-num">{scoreB}</span>
              <button type="button" className="tour__score-btn" onClick={() => onBump('teamB', 1)} aria-label={`${teamName('B')} 加一分`}>+</button>
            </div>
          </div>
        </div>
        <p className="tour__rule">
          {tour.scoring
            ? `${tour.scoring.note || '每球得分'}（先到 ${tour.scoring.scoreTo} 分，净胜 ${tour.scoring.winBy} 分，封顶 ${tour.scoring.cap} 分）`
            : '先到 11 分，净胜 2 分。'}
        </p>
        {tour.safetyNote && <p className="tour__note">{tour.safetyNote}</p>}
      </section>
    </div>
  )
}

/* ══════════════════════ 2D 课程表（技能型） ══════════════════════ */
function SkillSheet({ timetable, currentSlot, slotNo, swapNote, materialsNote, eventStart, isLastSlot, onNextSlot }) {
  const startMs = eventStart ? new Date(eventStart).getTime() : NaN
  const slotTime = (s) => {
    if (!s) return ''
    if (Number.isFinite(startMs) && Number.isFinite(s.startMin)) return fmtTime(startMs + s.startMin * 60000)
    return `第 ${s.slot} 节`
  }

  if (!timetable.length) {
    return <p className="live__modal-text">这桌的课表还没印出来。</p>
  }

  return (
    <div className="skill">
      <ol className="skill__list">
        {timetable.map((s, i) => (
          <li key={s.slot || i} className={`skill__item ${i === slotNo ? 'is-now' : ''} ${i < slotNo ? 'is-done' : ''}`.trim()}>
            <div className="skill__time">
              <span className="skill__no">第 {s.slot || i + 1} 节</span>
              <span className="skill__clock">{slotTime(s)}</span>
            </div>
            <div className="skill__body">
              <p className="skill__who">{s.teacherName} 教 {s.learnerName}</p>
              <p className="skill__topic">{s.topic}</p>
              <p className="skill__output">产出：{s.output}</p>
              <p className="skill__min">{s.durationMin || 25} 分钟</p>
            </div>
            {i === slotNo && <span className="skill__now" aria-label="当前这一节">现在</span>}
          </li>
        ))}
      </ol>
      {swapNote && <p className="skill__swap">{swapNote}</p>}
      {materialsNote && <p className="skill__note">{materialsNote}</p>}
      <Button block onClick={onNextSlot}>{isLastSlot ? '上完了' : '下一节'}</Button>
    </div>
  )
}
