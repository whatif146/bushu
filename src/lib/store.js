// 单一数据源。所有页面禁止直接读写 localStorage，一律走 actions / selectors。
// 结构：一个 localStorage key（bushu.v1）+ 内存快照 + 订阅。每次写操作 = clone → 改 → commit(save+notify)。
import { useSyncExternalStore } from 'react'
import { activityTypes as seedActivityTypes, activityTypeMap } from '../data/activityTypes.js'
import { venues as seedVenues } from '../data/venues.js'
import { users as seedUsers, schoolShort } from '../data/users.js'
import {
  events as seedEvents,
  groups as seedGroups,
  applicantIds,
  materials as seedMaterials,
  checkins as seedCheckins,
  reviews as seedReviews,
  quotes as seedQuotes,
  waitlist as seedWaitlist,
  adminTasks as seedAdminTasks,
  reports as seedReports,
  reseatVotes as seedReseatVotes,
} from '../data/events.js'
import { topicBank, sportWarmup, skillOpeners } from '../data/questions.js'
import { buildGroups } from './match.js'
import { buildMaterial } from './materials.js'

const KEY = 'bushu.v1'
const VERSION = '2026-10-20.3'

export const DEMO_STUDENTS = ['u_001', 'u_007', 'u_022']
export const ADMIN_ID = 'admin'

const ADMIN_USER = {
  id: ADMIN_ID,
  nickname: '运营值班',
  school: '不熟局',
  campus: '大学城公共',
  grade: '—',
  major: '广州大学城',
  role: 'admin',
  verified: true,
}

// ── 基础工具 ─────────────────────────────────────────
const clone = (v) => (typeof structuredClone === 'function'
  ? structuredClone(v)
  : JSON.parse(JSON.stringify(v)))

const nowISO = () => new Date().toISOString()
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const randCode = () => String(Math.floor(100000 + Math.random() * 900000))

function hashIndex(str, mod) {
  let h = 0
  for (let i = 0; i < String(str).length; i += 1) h = (h * 31 + String(str).charCodeAt(i)) % 100000
  return h % mod
}

// ── 种子展开：把「组的 memberIds」「applicantIds」补成完整记录 ──
const RECENT_STATES = [
  '刚交完一份作业，周末想出去走走。',
  '这周课不多，但一直没睡好。',
  '最近在准备一个考试，想找点别的事做。',
  '刚开学没多久，还没认识几个人。',
  '在宿舍待了三天，想出门见见活人。',
  '实习刚结束，突然空下来一段时间。',
]

function privacyLevelOf(privacy) {
  if (privacy >= 0.7) return 'high'
  if (privacy >= 0.45) return 'mid'
  return 'low'
}

function answersFor(user, type) {
  if (!type) return {}
  const isBuddy = type.category === 'buddy'
  const isSkill = type.category === 'skill'
  const isCompetitive = type.category === 'competitive'
  return {
    selfDesc: user.bio,
    wantMeet: user.wantMeet,
    recentState: RECENT_STATES[hashIndex(user.id, RECENT_STATES.length)],
    topicsWanted: user.tags.slice(0, 2),
    privacyLevel: privacyLevelOf(user.traits.privacy),
    levelChoice: isCompetitive ? user.traits.level : null,
    gearHave: type.equipmentRequired ? ['自备'] : [],
    goalText: isBuddy ? '把手上的事往前推一章，三小时不看手机。' : '',
    // 冻结格式：d{1-7}_{am|pm|night}，共 21 格（site-spec §5.6）
    availableSlots: isBuddy ? ['d3_night', 'd6_pm'] : [],
    teachSkill: isSkill ? '剪一条三分钟的片' : '',
    learnSkill: isSkill ? '弹会一首完整的歌' : '',
    questionsAsked: [user.question],
    contactChannel: user.traits.privacy >= 0.7 ? 'none' : 'wechat',
    agreePrivacy: true,
    agreeNoPromise: true,
  }
}

const REASONS = [
  '你提的问题和另外两个人的方向接近，所以放到了同一桌。',
  '你的作息和这桌其他人最接近，约的时间不用谁迁就谁。',
  '这桌的表达欲差得开，不会有人一直说、也不会有人一直听。',
  '你和大家的段位在一个区间里，玩起来不用互相等。',
  '你写的目标和这桌一致，前半段可以直接进正题。',
]

function snapshotOf(user) {
  return {
    socialEnergy: user.traits.socialEnergy,
    expressiveness: user.traits.expression,
    openness: user.traits.openness,
    chrono: user.traits.schedule,
    goalIntensity: user.traits.goalDrive,
    privacyBoundary: user.traits.privacy,
    level: user.traits.level,
    interestTags: user.tags,
    school: user.school,
    grade: user.grade,
    major: user.major,
    nickname: user.nickname,
  }
}

function makeApplication({ id, eventId, userId, typeId, status, groupId = null, waitlistRank = null, submittedAt, matchedAt = null, checkedIn = false }) {
  const user = seedUsers.find(u => u.id === userId)
  const type = activityTypeMap[typeId]
  return {
    id, eventId, userId, activityTypeId: typeId, typeId,
    status: checkedIn && status === 'matched' ? 'checked_in' : status,
    answers: answersFor(user, type),
    groupId,
    waitlistRank,
    shareContact: user.traits.privacy < 0.7,
    cancelReason: null,
    submittedAt,
    matchedAt,
    updatedAt: matchedAt || submittedAt,
  }
}

const CARD_BANKS = {
  cards: () => [...topicBank.icebreak.slice(0, 4), ...topicBank.interest.slice(0, 4)],
  goal: () => [...sportWarmup.slice(0, 4)],
  tournament: () => [...sportWarmup.slice(0, 6)],
  curriculum: () => [...skillOpeners.slice(0, 6)],
}

function materialFor(group, typeId) {
  const type = activityTypeMap[typeId]
  const kind = type?.materialKind || 'cards'
  const now = nowISO()
  if (kind === 'goal') {
    return {
      id: `m_${group.id}`, groupId: group.id, kind,
      payload: {
        note: '目标强度接近，第一轮直接写具体章节，不做自我介绍。',
        goalCard: { title: '这三小时要推进的一件事', fields: ['具体到哪一章 / 哪一节', '卡在哪一步', '结束后做到什么算完成'] },
        checkTable: [
          { id: 'ck1', label: '开始十分钟，各写一句今天的目标' },
          { id: 'ck2', label: '中间一次互看进度（不说话，只看纸）' },
          { id: 'ck3', label: '整点起来走两分钟' },
          { id: 'ck4', label: '结束前写下没做完的部分' },
        ],
      },
      progress: { index: 0, skipped: [], checkedIn: [], scores: {}, updatedAt: now },
      version: 1, generatedAt: now, generatedBy: 'rule', printedAt: null, printCount: 0,
    }
  }
  if (kind === 'tournament') {
    return {
      id: `m_${group.id}`, groupId: group.id, kind,
      payload: {
        note: '段位接近，先热身再分队，避免一上来就崩。',
        warmup: sportWarmup.slice(0, 4),
        rule: '按段位交叉分队，每队各有一个老手；先打到 11 分，输的队下楼买水。',
        rounds: 3,
      },
      progress: { index: 0, skipped: [], checkedIn: [], scores: { teamA: 0, teamB: 0 }, updatedAt: now },
      version: 1, generatedAt: now, generatedBy: 'rule', printedAt: null, printCount: 0,
    }
  }
  if (kind === 'curriculum') {
    return {
      id: `m_${group.id}`, groupId: group.id, kind,
      payload: {
        note: '每人一件能教的小事，两节课各 40 分钟，中间休息 10 分钟。',
        openers: skillOpeners,
        sessions: [
          { id: 's1', title: '第一节 · A 教 B', minutes: 40 },
          { id: 's2', title: '第二节 · B 教 A', minutes: 40 },
        ],
      },
      progress: { index: 0, skipped: [], checkedIn: [], scores: {}, updatedAt: now },
      version: 1, generatedAt: now, generatedBy: 'rule', printedAt: null, printCount: 0,
    }
  }
  return {
    id: `m_${group.id}`, groupId: group.id, kind: 'cards',
    payload: {
      note: '整组表达欲中等，前四张压短，第五张开始进兴趣。',
      cards: CARD_BANKS.cards(),
      identityCard: { nickname: '—', question: '你最近一次觉得「活着真好」是什么时候？' },
    },
    progress: { index: 0, skipped: [], checkedIn: [], scores: {}, updatedAt: now },
    version: 1, generatedAt: now, generatedBy: 'rule', printedAt: null, printCount: 0,
  }
}


// 种子用的是固定日期。放几天再打开，「这周开的局」就全过了报名截止，点「报这个」直接报「已截止」。
// 所以种子重建时，把还没开始的场次时间窗按开始时间重算一遍：报名截止 = 开始前 6 小时，
// 匹配 = 开始前 4 小时，场地解锁 = 开始前 30 分钟。演示期永远可用，且三者顺序不会反。
function refreshedEvents() {
  const now = Date.now()
  const H = 3600e3
  return seedEvents.map((ev) => {
    if (ev.status === 'done') return ev
    const start = new Date(ev.startAt).getTime()
    if (!Number.isFinite(start) || start <= now) return ev
    const deadline = Math.min(Math.max(now + 20 * 60e3, start - 6 * H), start - 5 * 60e3)
    return {
      ...ev,
      applyDeadline: new Date(deadline).toISOString(),
      matchAt: new Date(Math.min(start - 4 * H, start - 30 * 60e3)).toISOString(),
      venueRevealAt: new Date(start - 30 * 60e3).toISOString(),
    }
  })
}

function buildSeed() {
  const seededAt = nowISO()
  const apps = []
  const events = refreshedEvents()

  // 已成的组 → 报名记录由成员反推，保证两边不会打架
  for (const g of seedGroups) {
    const ev = events.find(e => e.id === g.eventId)
    for (const uid of g.memberIds) {
      const isIn = seedCheckins.some(c => c.groupId === g.id && c.userId === uid)
      apps.push(makeApplication({
        id: `a_${g.id}_${uid.replace('u_', '')}`,
        eventId: ev.id, userId: uid, typeId: ev.typeId,
        status: g.status === 'finished' ? 'reviewed' : 'matched',
        groupId: g.id, checkedIn: isIn,
        submittedAt: g.createdAt, matchedAt: g.createdAt,
      }))
    }
  }

  // open 场次的待匹配报名
  for (const [eventId, ids] of Object.entries(applicantIds)) {
    const ev = events.find(e => e.id === eventId)
    ids.forEach((uid, i) => {
      apps.push(makeApplication({
        id: `a_${eventId}_${String(i + 1).padStart(2, '0')}`,
        eventId, userId: uid, typeId: ev.typeId, status: 'submitted',
        submittedAt: ev.applyDeadline,
      }))
    })
  }

  // 候补
  const waitlistSeed = seedWaitlist.map(w => {
    const ev = events.find(e => e.id === w.eventId)
    const appId = `a_${w.id}`
    apps.push(makeApplication({
      id: appId, eventId: w.eventId, userId: w.userId, typeId: ev.typeId,
      status: 'waitlisted', waitlistRank: w.rank, submittedAt: w.joinedAt,
    }))
    return { ...w, applicationId: appId }
  })

  const groupMembers = []
  for (const g of seedGroups) {
    g.memberIds.forEach((uid) => {
      const user = seedUsers.find(u => u.id === uid)
      const app = apps.find(a => a.groupId === g.id && a.userId === uid)
      groupMembers.push({
        id: `gm_${g.id}_${uid.replace('u_', '')}`,
        groupId: g.id, userId: uid,
        applicationId: app ? app.id : null,
        role: uid === g.hostId ? 'host' : 'member',
        seatStatus: 'active',
        reasonForUser: REASONS[hashIndex(`${g.id}${uid}`, REASONS.length)],
        snapshot: snapshotOf(user),
        joinedAt: g.createdAt,
        leftAt: null,
      })
    })
  }

  return {
    version: VERSION,
    meta: { seededAt, updatedAt: seededAt, seq: 500 },
    session: { userId: 'u_001', role: 'student', issuedAt: seededAt, expiresAt: null, fake: true },
    users: clone(seedUsers),
    activityTypes: clone(seedActivityTypes),
    venues: clone(seedVenues),
    events: clone(events),
    groups: clone(seedGroups),
    groupMembers,
    applications: apps,
    // 种子里的物料是手写的 payload，没有 printSheet；不补的话打印页会走 legacy 兜底，
    // 把所有话题卡一次性铺满、溢出 A4（实测 40+ 条）。这里用正式生成器重建一遍。
    materials: seedGroups.map((g) => {
      const ev = events.find(e => e.id === g.eventId)
      const type = seedActivityTypes.find(t => t.id === (g.typeId || ev?.typeId))
      const venue = seedVenues.find(v => v.id === g.venueId) || null
      const seeded = seedMaterials.find(m => m.groupId === g.id)
      try {
        const built = buildMaterial({
          group: g, event: ev, activityType: type, users: seedUsers,
          applications: apps.filter(a => a.groupId === g.id), venue, version: 1,
        })
        return seeded ? { ...built, id: seeded.id } : built
      } catch (err) {
        console.warn('[store] 物料重建失败，沿用种子：', g.id, err?.message || err)
        return seeded
      }
    }).filter(Boolean),
    checkins: clone(seedCheckins),
    reviews: clone(seedReviews),
    quotes: clone(seedQuotes),
    reseatVotes: clone(seedReseatVotes),
    adminTasks: clone(seedAdminTasks),
    waitlist: waitlistSeed,
    reports: clone(seedReports),
  }
}

// ── 状态与订阅 ────────────────────────────────────────
let state = null
const listeners = new Set()

function persist(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch (err) {
    // 隐私模式 / 配额满：内存里照常工作，只是刷新会回种子数据
    console.warn('[store] 写入 localStorage 失败：', err?.message || err)
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === VERSION && Array.isArray(parsed.users) && Array.isArray(parsed.events)) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('[store] 本地数据损坏，按种子重建：', err?.message || err)
  }
  const seed = buildSeed()
  persist(seed)
  return seed
}

function read() {
  if (!state) state = load()
  return state
}

function notify() {
  for (const fn of [...listeners]) fn()
}

function commit(next) {
  next.meta = { ...next.meta, updatedAt: nowISO() }
  state = next
  persist(state)
  notify()
  return state
}

/** mutator 返回 {ok:false} 时放弃提交，保证校验失败不会污染数据 */
function update(mutator) {
  const draft = clone(read())
  const result = mutator(draft) || { ok: true }
  if (result && result.ok === false) return result
  commit(draft)
  return result
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function getState() {
  return read()
}

// 跨标签页同步：演示时开两个窗口改数据，另一个不会看到过期内容
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return
    try {
      const parsed = JSON.parse(e.newValue)
      if (parsed && parsed.version === VERSION) {
        state = parsed
        notify()
      }
    } catch { /* 忽略外部写入的坏数据 */ }
  })
}

// ── 内部查询 ─────────────────────────────────────────
const byId = (list, id) => list.find(x => x.id === id)
const hostScoreOf = (s, userId) => {
  const u = byId(s.users, userId)
  if (!u) return 0
  return u.traits.expression * 0.6 + u.traits.socialEnergy * 0.4
}

function vibeOf(members) {
  const ex = members.map(m => m.traits.expression)
  const avg = mean(ex)
  const max = Math.max(...ex, 0)
  if (max >= 0.75 && avg < 0.5) {
    return { label: '一个带节奏，其余慢慢跟上', note: '有 1 个人会主动开口，其余人接得上但不会抢话。' }
  }
  if (avg >= 0.68) {
    return { label: '话头不会掉在地上', note: '表达欲偏高的人多，最安静的那个也不会被落下。' }
  }
  if (avg <= 0.4) {
    return { label: '安静，但没有人被落下', note: '开口慢的人占多数，前四道题会压得很短。' }
  }
  return { label: '接得住，也不抢话', note: '有人起头，也有人愿意听，节奏不赶。' }
}

function scoreOf(members) {
  const ex = members.map(m => m.traits.expression)
  const se = members.map(m => m.traits.socialEnergy)
  const op = members.map(m => m.traits.openness)
  const balance = 1 - (Math.max(...ex) - Math.min(...ex))
  const energy = 1 - Math.abs(mean(se) - 0.6)
  const score = 0.35 + 0.25 * balance + 0.2 * energy + 0.2 * mean(op)
  return Number(clamp(score, 0, 1).toFixed(4))
}

function eventSeatsUsed(s, eventId) {
  return s.applications.filter(a =>
    a.eventId === eventId && ['submitted', 'matched', 'checked_in', 'reviewed'].includes(a.status)).length
}

function ensureMaterial(draft, group) {
  if (draft.materials.some(m => m.groupId === group.id)) return
  const ev = byId(draft.events, group.eventId)
  draft.materials.push(materialFor(group, ev?.typeId || group.typeId))
}

// ── actions ─────────────────────────────────────────
export const actions = {
  createApplication(payload = {}) {
    return update((draft) => {
      const session = draft.session
      if (session.role === 'admin') return { ok: false, error: '管理员身份不能报名，先切回学生' }
      const user = byId(draft.users, session.userId)
      if (!user) return { ok: false, error: '当前演示身份不是一个学生账号' }
      const ev = byId(draft.events, payload.eventId)
      if (!ev) return { ok: false, error: '这场局不存在，回落地页重选一个' }
      if (ev.status !== 'open') return { ok: false, error: '这场已经截止报名了，看看别的' }
      if (draft.applications.some(a => a.eventId === ev.id && a.userId === user.id && !['canceled', 'expired'].includes(a.status))) {
        return { ok: false, error: '你已经报过这场了，去「我的局」看看' }
      }
      const answers = payload.answers || {}
      if (!answers.agreePrivacy || !answers.agreeNoPromise) {
        return { ok: false, error: '要先勾选隐私说明和「不承诺结果」两条' }
      }
      const deadline = new Date(ev.applyDeadline).getTime()
      if (Number.isFinite(deadline) && Date.now() > deadline) {
        return { ok: false, error: '报名已经截止了，看看下周的局' }
      }

      const capacity = (ev.capacityGroups || 1) * (ev.groupSize || 4)
      const full = eventSeatsUsed(draft, ev.id) >= capacity
      const now = nowISO()
      const id = `a_${draft.meta.seq += 1}`
      const rank = full
        ? Math.max(0, ...draft.waitlist.filter(w => w.eventId === ev.id).map(w => w.rank)) + 1
        : null

      draft.applications.push({
        id, eventId: ev.id, userId: user.id, activityTypeId: ev.typeId, typeId: ev.typeId,
        // 问卷第 2 步允许勾 1–3 类；只存本场那一个会静默丢掉另外两个（site-spec §5.6）
        activityTypeIds: [...new Set([ev.typeId, ...(Array.isArray(payload.activityTypeIds) ? payload.activityTypeIds : [])])],
        status: full ? 'waitlisted' : 'submitted',
        answers: { ...answersFor(user, activityTypeMap[ev.typeId]), ...answers },
        groupId: null,
        waitlistRank: rank,
        shareContact: Boolean(payload.shareContact),
        cancelReason: null,
        submittedAt: now, matchedAt: null, updatedAt: now,
      })

      if (full) {
        draft.waitlist.push({
          id: `w_${draft.meta.seq += 1}`, eventId: ev.id, userId: user.id,
          applicationId: id, rank, status: 'waiting',
          promotedGroupId: null, joinedAt: now, promotedAt: null,
        })
      }
      return { ok: true, id, waitlisted: full, waitlistRank: rank, eventId: ev.id }
    })
  },

  cancelApplication(id, reason) {
    return update((draft) => {
      const app = byId(draft.applications, id)
      if (!app) return { ok: false, error: '找不到这条报名' }
      if (['canceled', 'expired'].includes(app.status)) return { ok: false, error: '这条报名已经取消了' }
      const now = nowISO()

      app.status = 'canceled'
      app.cancelReason = reason || '本人取消'
      app.updatedAt = now

      if (app.waitlistRank != null) {
        draft.waitlist = draft.waitlist.filter(w => w.applicationId !== app.id)
        app.waitlistRank = null
      }
      if (app.groupId) {
        const g = byId(draft.groups, app.groupId)
        if (g) {
          g.memberIds = g.memberIds.filter(uid => uid !== app.userId)
          if (g.hostId === app.userId) g.hostId = g.memberIds[0] || null
          if (g.memberIds.length < 2) g.status = 'disbanded'
        }
        const gm = draft.groupMembers.find(m => m.groupId === app.groupId && m.userId === app.userId)
        if (gm) { gm.seatStatus = 'left'; gm.leftAt = now }
        app.groupId = null
      }
      return { ok: true, id }
    })
  },

  runMatching(eventId) {
    return update((draft) => {
      const ev = byId(draft.events, eventId)
      if (!ev) return { ok: false, error: '找不到这场局' }
      if (!['open', 'matching'].includes(ev.status)) return { ok: false, error: '这场已经锁定了，不用再跑一次' }

      const pool = draft.applications.filter(a => a.eventId === eventId && a.status === 'submitted')
      if (!pool.length) return { ok: false, error: '这场还没有待匹配的报名' }

      const maxGroups = ev.capacityGroups || 1
      const existing = draft.groups.filter(g => g.eventId === eventId && g.status !== 'disbanded').length
      const slots = Math.max(0, maxGroups - existing)
      if (!slots) return { ok: false, error: '这场已经开满桌了' }

      // 走真正的匹配引擎（§6）：硬约束 + 质量线 + 确定性，而不是按顺序蛇形分桌。
      // 引擎的 groupScore / 理由 / 氛围标签 / 签到码都直接落库，后台与打印件才对得上。
      const result = buildGroups({
        event: ev,
        applications: pool,
        users: draft.users,
        activityType: activityTypeMap[ev.typeId],
      })
      const rows = (result.groups || []).slice(0, slots)
      if (!rows.length) {
        return { ok: false, error: (result.notes && result.notes[0]) || '人数还不够凑一桌，等更多人报名' }
      }

      const now = nowISO()
      const LETTERS = 'ABCDEFGH'
      const created = []
      const appByUser = new Map(pool.map(a => [a.userId, a]))

      rows.forEach((row, i) => {
        const index = existing + i + 1
        const id = `g_${draft.meta.seq += 1}`
        const group = {
          id, eventId: ev.id, activityTypeId: ev.typeId, typeId: ev.typeId,
          tableNo: row.tableNo || `${LETTERS[(index - 1) % 8]}${index}`,
          index,
          venueId: (ev.venuePoolIds && ev.venuePoolIds[index - 1]) || ev.venueId || null,
          status: 'forming',
          matchProfile: row.matchProfile || activityTypeMap[ev.typeId]?.category || 'social',
          memberIds: row.memberIds.slice(),
          hostId: row.hostId,
          groupScore: row.matchScore,
          vibeLabel: row.vibeLabel,
          vibeNote: row.vibeNote,
          matchReason: row.reason,
          explanation: row.explanation || null,
          recapLine: null,
          checkinCode: row.checkinCode,
          photos: [],
          createdAt: now, lockedAt: null, finishedAt: null, revealAt: null,
        }
        draft.groups.push(group)
        created.push(id)

        const reasons = new Map((row.memberReasons || []).map(r => [r.userId, r.reasonForUser]))
        row.memberIds.forEach((uid) => {
          const app = appByUser.get(uid)
          if (!app) return
          app.status = 'matched'
          app.groupId = id
          app.matchedAt = now
          app.updatedAt = now
          draft.groupMembers.push({
            id: `gm_${id}_${uid.replace('u_', '')}`,
            groupId: id, userId: uid, applicationId: app.id,
            role: uid === group.hostId ? 'host' : 'member',
            seatStatus: 'active',
            reasonForUser: reasons.get(uid) || '',
            snapshot: snapshotOf(byId(draft.users, uid)),
            joinedAt: now, leftAt: null,
          })
        })
      })

      // 候补：引擎给出的顺序（按报名时间）优先；因桌数上限没排进来的也一并进候补
      const seated = new Set(created.flatMap(id => byId(draft.groups, id).memberIds))
      const queue = [
        ...((result.waitlisted || []).map(w => w.userId)),
        ...((result.groups || []).slice(slots).flatMap(g => g.memberIds)),
      ].filter(uid => !seated.has(uid))
      let rank = Math.max(0, ...draft.waitlist.filter(w => w.eventId === ev.id).map(w => w.rank))
      ;[...new Set(queue)].forEach((uid) => {
        const app = appByUser.get(uid)
        if (!app) return
        rank += 1
        app.status = 'waitlisted'
        app.waitlistRank = rank
        app.updatedAt = now
        draft.waitlist.push({
          id: `w_${draft.meta.seq += 1}`, eventId: ev.id, userId: uid,
          applicationId: app.id, rank, status: 'waiting',
          promotedGroupId: null, joinedAt: now, promotedAt: null,
        })
      })

      ev.status = 'matching'
      return { ok: true, created: created.length, groupIds: created, waitlisted: rank, notes: result.notes || [] }
    })
  },

  lockEvent(eventId) {
    return update((draft) => {
      const ev = byId(draft.events, eventId)
      if (!ev) return { ok: false, error: '找不到这场局' }
      const evGroups = draft.groups.filter(g => g.eventId === eventId && ['forming', 'locked'].includes(g.status))
      if (!evGroups.length) return { ok: false, error: '这场还没开组，先跑一次匹配' }
      const now = nowISO()
      evGroups.forEach((g) => {
        g.status = 'locked'
        g.lockedAt = g.lockedAt || now
        if (!g.venueId) g.venueId = (ev.venuePoolIds && ev.venuePoolIds[0]) || ev.venueId || null
        ensureMaterial(draft, g)
      })
      ev.status = 'locked'
      return { ok: true, groups: evGroups.length }
    })
  },

  publishMeetup(eventId) {
    return update((draft) => {
      const ev = byId(draft.events, eventId)
      if (!ev) return { ok: false, error: '找不到这场局' }
      const now = nowISO()
      const evGroups = draft.groups.filter(g => g.eventId === eventId && g.status !== 'disbanded')
      if (!evGroups.length) return { ok: false, error: '这场还没有组，没法推送集合信息' }
      evGroups.forEach((g) => { g.revealAt = now })
      ev.publishedAt = now
      return { ok: true, groups: evGroups.length }
    })
  },

  checkIn(groupId, userId) {
    return update((draft) => {
      const g = byId(draft.groups, groupId)
      if (!g) return { ok: false, error: '找不到这个组' }
      const uid = userId || draft.session.userId
      if (!g.memberIds.includes(uid)) return { ok: false, error: '你不在这个组里' }
      if (draft.checkins.some(c => c.groupId === groupId && c.userId === uid)) {
        return { ok: false, error: '你已经打过卡了' }
      }
      const now = nowISO()
      draft.checkins.push({
        id: `ck_${draft.meta.seq += 1}`, groupId, userId: uid,
        method: 'code', code: g.checkinCode, at: now, note: null,
      })
      const app = draft.applications.find(a => a.groupId === groupId && a.userId === uid)
      if (app) { app.status = 'checked_in'; app.updatedAt = now }
      const m = draft.materials.find(x => x.groupId === groupId)
      if (m) {
        m.progress.checkedIn = Array.from(new Set([...(m.progress.checkedIn || []), uid]))
        m.progress.updatedAt = now
      }
      const all = g.memberIds.every(id => draft.checkins.some(c => c.groupId === groupId && c.userId === id))
      if (all) g.status = 'ongoing'
      const remaining = g.memberIds.filter(id => !draft.checkins.some(c => c.groupId === groupId && c.userId === id)).length
      return { ok: true, remaining, all }
    })
  },

  saveMaterialProgress(groupId, payload = {}) {
    return update((draft) => {
      const m = draft.materials.find(x => x.groupId === groupId)
      if (!m) return { ok: false, error: '这个组还没有物料' }
      const cards = m.payload?.cards || m.payload?.warmup || m.payload?.openers || []
      const max = Math.max(0, cards.length - 1)
      const next = { ...m.progress, ...payload, updatedAt: nowISO() }
      if (typeof payload.index === 'number') next.index = clamp(payload.index, 0, max)
      if (Array.isArray(payload.skipped)) next.skipped = Array.from(new Set(payload.skipped))
      if (payload.scores) next.scores = { ...m.progress.scores, ...payload.scores }
      m.progress = next
      return { ok: true, progress: next }
    })
  },

  submitReview(payload = {}) {
    return update((draft) => {
      const { groupId, ratingOverall, ratingVibe, wouldMeetAgain, tags, comment } = payload
      const g = byId(draft.groups, groupId)
      if (!g) return { ok: false, error: '找不到这个组' }
      const uid = draft.session.userId
      if (!g.memberIds.includes(uid)) return { ok: false, error: '只有组里的人能评价' }
      if (draft.reviews.some(r => r.groupId === groupId && r.fromUserId === uid)) {
        return { ok: false, error: '你已经评价过这局了' }
      }
      const rate = Number(ratingOverall)
      if (!(rate >= 1 && rate <= 5)) return { ok: false, error: '先给这一局打个分（1–5）' }
      const now = nowISO()
      draft.reviews.push({
        id: `rv_${draft.meta.seq += 1}`, groupId, eventId: g.eventId, fromUserId: uid,
        ratingOverall: rate,
        ratingVibe: Number(ratingVibe) >= 1 ? Number(ratingVibe) : rate,
        wouldMeetAgain: Boolean(wouldMeetAgain),
        tags: Array.isArray(tags) ? tags : [],
        comment: (comment || '').slice(0, 60),
        at: now,
      })
      const all = g.memberIds.every(id => draft.reviews.some(r => r.groupId === groupId && r.fromUserId === id))
      if (all) {
        g.status = 'finished'
        g.finishedAt = now
        const ev = byId(draft.events, g.eventId)
        if (ev) ev.status = 'done'
      }
      return { ok: true, all }
    })
  },

  voteQuote(groupId, quoteId) {
    return update((draft) => {
      const q = draft.quotes.find(x => x.id === quoteId && (!groupId || x.groupId === groupId))
      if (!q) return { ok: false, error: '找不到这句' }
      const uid = draft.session.userId
      if (q.votedBy.includes(uid)) return { ok: false, error: '你已经投过这句了' }
      q.votes += 1
      q.votedBy.push(uid)
      return { ok: true, votes: q.votes }
    })
  },

  toggleReseat(groupId, userId) {
    return update((draft) => {
      const g = byId(draft.groups, groupId)
      if (!g) return { ok: false, error: '找不到这个组' }
      const uid = draft.session.userId
      if (!g.memberIds.includes(uid)) return { ok: false, error: '只有组里的人能投续桌' }
      if (userId === uid) return { ok: false, error: '不能给自己投续桌' }
      if (!g.memberIds.includes(userId)) return { ok: false, error: '这个人不在这一桌' }
      let vote = draft.reseatVotes.find(v => v.groupId === groupId && v.fromUserId === uid)
      if (!vote) {
        vote = {
          id: `rs_${draft.meta.seq += 1}`, groupId, fromUserId: uid,
          targetUserIds: [], wantSameTable: false, createdAt: nowISO(),
        }
        draft.reseatVotes.push(vote)
      }
      const on = !vote.targetUserIds.includes(userId)
      vote.targetUserIds = on
        ? [...vote.targetUserIds, userId]
        : vote.targetUserIds.filter(id => id !== userId)
      return { ok: true, on, targets: vote.targetUserIds }
    })
  },

  fillFromWaitlist(groupId) {
    return update((draft) => {
      const g = byId(draft.groups, groupId)
      if (!g) return { ok: false, error: '找不到这个组' }
      const ev = byId(draft.events, g.eventId)
      const size = ev?.groupSize || 6
      if (g.memberIds.length >= size) return { ok: false, error: '这桌已经满了' }
      const next = draft.waitlist
        .filter(w => w.eventId === g.eventId && w.status === 'waiting')
        .sort((a, b) => a.rank - b.rank)[0]
      if (!next) return { ok: false, error: '这场没有在等的人' }
      if (g.memberIds.includes(next.userId)) return { ok: false, error: '这个人已经在这桌了' }

      const now = nowISO()
      const app = draft.applications.find(a => a.id === next.applicationId)
      const user = byId(draft.users, next.userId)
      g.memberIds.push(next.userId)
      if (!g.hostId) g.hostId = next.userId
      if (app) {
        app.status = 'matched'; app.groupId = g.id; app.matchedAt = now
        app.waitlistRank = null; app.updatedAt = now
      }
      next.status = 'promoted'
      next.promotedGroupId = g.id
      next.promotedAt = now
      draft.groupMembers.push({
        id: `gm_${g.id}_${next.userId.replace('u_', '')}`,
        groupId: g.id, userId: next.userId, applicationId: next.applicationId,
        role: 'member', seatStatus: 'active',
        reasonForUser: '前面有人取消，你补进了这一桌。',
        snapshot: user ? snapshotOf(user) : null,
        joinedAt: now, leftAt: null,
      })
      return { ok: true, userId: next.userId, nickname: user?.nickname || '' }
    })
  },

  assignVenue(groupId, venueId) {
    return update((draft) => {
      const g = byId(draft.groups, groupId)
      if (!g) return { ok: false, error: '找不到这个组' }
      if (venueId && !byId(draft.venues, venueId)) return { ok: false, error: '找不到这个场地' }
      g.venueId = venueId || null
      return { ok: true, venueId: g.venueId }
    })
  },

  upsertVenue(venue = {}) {
    return update((draft) => {
      if (!venue.name) return { ok: false, error: '场地名不能为空' }
      if (venue.id) {
        const idx = draft.venues.findIndex(v => v.id === venue.id)
        if (idx >= 0) {
          draft.venues[idx] = { ...draft.venues[idx], ...venue }
          return { ok: true, id: venue.id, created: false }
        }
      }
      const id = venue.id || `v_${draft.meta.seq += 1}`
      draft.venues.push({
        id, name: venue.name, kind: venue.kind || '校外', campus: venue.campus || '大学城公共',
        blurb: venue.blurb || '', detail: venue.detail || '',
        capacityGroups: Number(venue.capacityGroups) || 1,
        openDays: venue.openDays || [1, 2, 3, 4, 5, 6, 7],
        activityTypes: venue.activityTypes || [],
      })
      return { ok: true, id, created: true }
    })
  },

  upsertActivityType(type = {}) {
    return update((draft) => {
      if (!type.name) return { ok: false, error: '活动名不能为空' }
      if (type.id) {
        const idx = draft.activityTypes.findIndex(t => t.id === type.id)
        if (idx >= 0) {
          draft.activityTypes[idx] = { ...draft.activityTypes[idx], ...type }
          return { ok: true, id: type.id, created: false }
        }
      }
      const id = type.id || `type_${draft.meta.seq += 1}`
      draft.activityTypes.push({
        id, name: type.name, en: type.en || type.id.toUpperCase(), category: type.category || 'social',
        blurb: type.blurb || '', detail: type.detail || '', duration: Number(type.duration) || 120,
        groupSize: type.groupSize || [4, 6], levelRequired: Boolean(type.levelRequired),
        equipmentRequired: Boolean(type.equipmentRequired), priceLabel: type.priceLabel || '不收费',
        venueKinds: type.venueKinds || [], scene: type.scene || 1, active: true,
      })
      return { ok: true, id, created: true }
    })
  },

  upsertEvent(event = {}) {
    return update((draft) => {
      if (!event.title || !event.typeId) return { ok: false, error: '场次名和活动类型都要填' }
      if (event.id) {
        const idx = draft.events.findIndex(e => e.id === event.id)
        if (idx >= 0) {
          draft.events[idx] = { ...draft.events[idx], ...event }
          return { ok: true, id: event.id, created: false }
        }
      }
      const id = event.id || `e_${draft.meta.seq += 1}`
      draft.events.push({
        id, typeId: event.typeId, title: event.title,
        startAt: event.startAt, endAt: event.endAt,
        applyDeadline: event.applyDeadline, matchAt: event.matchAt,
        venueRevealAt: event.venueRevealAt,
        venueId: event.venueId || null, venuePoolIds: event.venuePoolIds || [],
        campus: event.campus || '大学城公共',
        capacityGroups: Number(event.capacityGroups) || 1,
        groupSize: Number(event.groupSize) || 4,
        priceLabel: event.priceLabel || '不收费',
        status: event.status || 'open', coverPattern: event.coverPattern || 1,
        description: event.description || '',
      })
      return { ok: true, id, created: true }
    })
  },

  toggleAdminTask(id) {
    return update((draft) => {
      const t = byId(draft.adminTasks, id)
      if (!t) return { ok: false, error: '找不到这条任务' }
      const done = t.status === 'done'
      t.status = done ? 'todo' : 'done'
      t.doneAt = done ? null : nowISO()
      return { ok: true, status: t.status }
    })
  },

  updateReport(id, patch = {}) {
    return update((draft) => {
      const r = byId(draft.reports, id)
      if (!r) return { ok: false, error: '找不到这条反馈' }
      Object.assign(r, patch)
      if (patch.status === 'closed' && !r.handledAt) r.handledAt = nowISO()
      return { ok: true, id }
    })
  },

  switchSession(userId) {
    return update((draft) => {
      const isAdmin = userId === ADMIN_ID || byId(draft.users, userId)?.role === 'admin'
      if (!isAdmin && !byId(draft.users, userId)) return { ok: false, error: '找不到这个演示身份' }
      draft.session = {
        userId: isAdmin ? ADMIN_ID : userId,
        role: isAdmin ? 'admin' : 'student',
        issuedAt: nowISO(),
        expiresAt: null,
        fake: true,
      }
      return { ok: true, role: draft.session.role, userId: draft.session.userId }
    })
  },

  resetDemo() {
    state = buildSeed()
    persist(state)
    notify()
    return { ok: true }
  },
}

// ── selectors：页面只用这些读数据，不自己遍历 ────────────
export const selectors = {
  currentUser(s) {
    if (s.session.role === 'admin') return ADMIN_USER
    return s.users.find(u => u.id === s.session.userId) || null
  },
  isAdmin: (s) => s.session.role === 'admin',
  user: (s, id) => s.users.find(u => u.id === id) || null,
  activityType: (s, id) => s.activityTypes.find(t => t.id === id) || null,
  venue: (s, id) => s.venues.find(v => v.id === id) || null,
  event: (s, id) => s.events.find(e => e.id === id) || null,
  group: (s, id) => s.groups.find(g => g.id === id) || null,
  application: (s, id) => s.applications.find(a => a.id === id) || null,
  materialOf: (s, groupId) => s.materials.find(m => m.groupId === groupId) || null,

  membersOf(s, groupId) {
    return s.groupMembers
      .filter(m => m.groupId === groupId && m.seatStatus === 'active')
      .map(m => ({ ...m, user: s.users.find(u => u.id === m.userId) || null }))
  },
  groupMembers: (s, groupId) => s.groupMembers.filter(m => m.groupId === groupId),

  checkinsOf: (s, groupId) => s.checkins.filter(c => c.groupId === groupId),
  reviewsOf: (s, groupId) => s.reviews.filter(r => r.groupId === groupId),
  quotesOf: (s, groupId) => [...s.quotes.filter(q => q.groupId === groupId)].sort((a, b) => b.votes - a.votes),
  reseatOf: (s, groupId) => s.reseatVotes.filter(v => v.groupId === groupId),
  waitlistOf: (s, eventId) => s.waitlist.filter(w => w.eventId === eventId).sort((a, b) => a.rank - b.rank),
  groupsOfEvent: (s, eventId) => s.groups.filter(g => g.eventId === eventId && g.status !== 'disbanded'),
  applicationsOfEvent: (s, eventId) => s.applications.filter(a => a.eventId === eventId),

  myApplications(s) {
    return s.applications.filter(a => a.userId === s.session.userId)
  },
  /** 我参加过的组（含已结束），按活动时间倒序 */
  myGroups(s) {
    return s.groups
      .filter(g => g.memberIds.includes(s.session.userId) && g.status !== 'disbanded')
      .map(g => ({ ...g, event: s.events.find(e => e.id === g.eventId) || null }))
      .sort((a, b) => new Date(b.event?.startAt || 0) - new Date(a.event?.startAt || 0))
  },
  upcomingEvents(s) {
    return s.events
      .filter(e => ['open', 'matching', 'locked'].includes(e.status))
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
  },
  openEvents(s) {
    return s.events.filter(e => e.status === 'open').sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
  },
  seatsUsed(s, eventId) { return eventSeatsUsed(s, eventId) },
  seatsTotal(s, eventId) {
    const ev = s.events.find(e => e.id === eventId)
    return ev ? (ev.capacityGroups || 1) * (ev.groupSize || 4) : 0
  },
  seatsLeft(s, eventId) {
    return Math.max(0, selectors.seatsTotal(s, eventId) - eventSeatsUsed(s, eventId))
  },
  schoolShort: (school) => schoolShort[school] || school,
}

// ── hooks ────────────────────────────────────────────
/** useStore() 拿全量；useStore(s => s.session) 拿切片（切片函数在渲染期执行，不影响快照比较） */
export function useStore(selector) {
  const snap = useSyncExternalStore(subscribe, read, read)
  return selector ? selector(snap) : snap
}

/** 常用组合：当前身份 + 是否管理员 */
export function useSession() {
  const snap = useStore()
  return {
    state: snap,
    user: selectors.currentUser(snap),
    role: snap.session.role,
    isAdmin: snap.session.role === 'admin',
    userId: snap.session.userId,
  }
}

/** 演示身份下拉：3 个学生 + 1 个管理员（site-spec §5.17） */
export function demoIdentities() {
  const s = read()
  const students = DEMO_STUDENTS.map((id) => {
    const u = s.users.find(x => x.id === id)
    if (!u) return null
    return { id, label: `${u.nickname} · ${schoolShort[u.school] || u.school}`, role: 'student' }
  }).filter(Boolean)
  return [...students, { id: ADMIN_ID, label: '运营值班 · 管理员', role: 'admin' }]
}

export { KEY as STORAGE_KEY, VERSION as SEED_VERSION, ADMIN_USER }
