/**
 * api.js —— 页面唯一数据入口（site-spec §9 接口契约的本地实现）
 *
 * 分层：页面 → api.js → store.js → localStorage
 * 约束：
 *  1. 页面里不允许出现 localStorage / 原始 seed 数据。
 *  2. 所有返回给页面的成员信息都经过脱敏：只给 majorBroad（宽专业门类），
 *     不给 traits 七维数值、不给 answers 原文、不给手机号。
 *  3. 场地与集合信息在 venueRevealAt 之前不返回任何字符串（不是 CSS 隐藏），
 *     页面拿不到就是拿不到。
 */

import { buildMaterial } from './materials.js'
import {
  actions,
  selectors,
  useStore,
  useSession,
  demoIdentities,
  getState,
} from './store.js'

export { actions, selectors, useStore, useSession, demoIdentities, getState }

/* ── 脱敏：专业 → 宽门类（12 类，同组速览只用它） ───────────── */
const MAJOR_RULES = [
  [/计算机|软件|人工智能|网络工程|数据|信息安全|智能科学|电子|通信|自动化/, '工科 · 信息'],
  [/土木|建筑|城乡规划|交通|水利|测绘|环境工程/, '工科 · 建造'],
  [/机械|材料|能源|电气|车辆|工业设计|船舶|航空/, '工科 · 制造'],
  [/数学|物理|化学|生物|地理|统计|大气|海洋|天文/, '理科'],
  [/中文|汉语言|新闻|传播|外语|英语|翻译|历史|哲学|人类学|考古/, '人文'],
  [/法学|社会学|心理|政治|社会|公共管理|国际关系/, '社科'],
  [/经济|金融|会计|工商|管理|市场|物流|电商|国际贸易|旅游/, '商科'],
  [/医学|中医|药学|护理|临床|口腔|康复|公共卫生|中药/, '医科'],
  [/音乐|美术|设计|舞蹈|戏剧|影视|摄影|动画|雕塑|油画|壁画|艺术/, '艺术'],
  [/教育|师范|学前|特殊教育/, '教育'],
  [/体育|运动训练|社会体育/, '体育'],
  [/农学|林学|园艺|动物|植物|食品科学/, '农林'],
]

/** 精确专业 → 12 类宽称之一，同组速览只用它 */
export function broadMajor(major = '') {
  for (const [re, label] of MAJOR_RULES) if (re.test(major)) return label
  return '其他'
}

export function schoolShortOf(school = '') {
  return (selectors.schoolShort && selectors.schoolShort(school)) || school
}

/* ── 场地解锁 ───────────────────────────────────── */
/** 'revealed' | 'locked' */
export function venueState(event, now = Date.now()) {
  if (!event) return 'locked'
  const at = event.venueRevealAt ? new Date(event.venueRevealAt).getTime() : NaN
  if (Number.isNaN(at)) {
    return ['locked', 'live', 'done'].includes(event.status) ? 'revealed' : 'locked'
  }
  return now >= at ? 'revealed' : 'locked'
}

/** 距解锁还剩多少毫秒（已解锁返回 0） */
export function revealIn(event, now = Date.now()) {
  if (!event || !event.venueRevealAt) return 0
  const at = new Date(event.venueRevealAt).getTime()
  return Number.isNaN(at) ? 0 : Math.max(0, at - now)
}

/* ── 物料：结构一律 canonical，进度沿用已存的 ───────────── */
/**
 * 种子里存的是 legacy 形状（kind: cards/goal，payload.cards），
 * buildMaterial 产出的是 canonical 形状（kind: topicCards/…，payload.deck、printSheet）。
 * 页面只应该看到一种形状，所以这里统一走 buildMaterial，再把已存的 progress / 打印痕迹盖回去。
 */
function canonicalMaterial({ s, group, event, type, venueRow, revealed }) {
  const stored = selectors.materialOf(s, group.id)
  if (!type) return stored
  const built = buildMaterial({
    group,
    event,
    activityType: type,
    users: s.users,
    applications: s.applications,
    venue: revealed ? venueRow : null,
  })
  if (!built) return stored
  if (!stored) {
    return {
      ...built,
      id: `m_${group.id}`,
      progress: built.progress || { index: 0, skipped: [], checkedIn: [], scores: {}, updatedAt: null },
      version: 1,
      generatedAt: null,
      generatedBy: 'rule',
      printedAt: null,
      printCount: 0,
    }
  }
  return {
    ...built,
    id: stored.id || `m_${group.id}`,
    // 进度是现场产生的真实数据，必须保留；其余结构用 canonical
    progress: {
      index: 0, skipped: [], checkedIn: [], scores: {},
      ...(stored.progress || {}),
    },
    version: stored.version || 1,
    generatedAt: stored.generatedAt || null,
    generatedBy: stored.generatedBy || 'rule',
    printedAt: stored.printedAt ?? null,
    printCount: stored.printCount ?? 0,
  }
}

/* ── 组视图（同组速览 / 现场 / 回顾共用） ───────────── */
/**
 * @returns {null | {
 *   group, event, type, venue, members, material,
 *   isRevealed, revealAt, remainingMs, isMe, myRole, host
 * }}
 */
export function groupView(state, groupId) {
  const s = state || getState()
  const group = selectors.group(s, groupId)
  if (!group) return null

  const event = selectors.event(s, group.eventId) || null
  const type = selectors.activityType(s, group.activityTypeId || event?.typeId) || null
  const venueRow = selectors.venue(s, group.venueId || event?.venueId) || null
  const revealed = venueState(event) === 'revealed'

  const members = selectors.membersOf(s, groupId).map((m) => {
    const u = m.user || {}
    const snap = m.snapshot || {}
    const boundary = typeof snap.privacyBoundary === 'number' ? snap.privacyBoundary : 0.5
    const open = boundary < 0.75
    return {
      id: u.id,
      nickname: u.nickname || snap.nickname || '一位同学',
      school: u.school || snap.school || '',
      schoolShort: schoolShortOf(u.school || snap.school || ''),
      majorBroad: broadMajor(u.major || snap.major || ''),
      grade: u.grade || snap.grade || '',
      avatarSeed: u.avatarSeed ?? 0,
      verified: !!u.verified,
      bio: u.bio || '',
      tags: Array.isArray(u.tags) ? u.tags.slice(0, 4) : [],
      // 隐私边界高的同学，不在同组速览里公开「想问的问题」
      question: open ? u.question || '' : '',
      isHost: group.hostId === u.id,
      isMe: u.id === s.session.userId,
      role: m.role,
      reasonForUser: s.session.userId === u.id ? m.reasonForUser || '' : '',
    }
  })

  // 未解锁：场地字段整体抹掉，页面拿不到任何可渲染的字符串（不是 CSS 隐藏）。
  // 活动类型的 detail 里写着「哪家馆、哪个路口」，同样属于场地信息，锁着的时候一起摘掉。
  const safeGroup = revealed ? group : { ...group, venueId: null, venueName: null }
  const safeEvent = revealed ? event : { ...event, venueId: null, venuePoolIds: [] }
  const safeType = revealed || !type ? type : { ...type, detail: '' }

  const material = canonicalMaterial({
    s, group: safeGroup, event: safeEvent, type: safeType, venueRow, revealed,
  })

  return {
    group: safeGroup,
    event: safeEvent,
    type: safeType,
    venue: revealed && venueRow ? { ...venueRow } : null,
    members,
    material,
    isRevealed: revealed,
    revealAt: event?.venueRevealAt || null,
    remainingMs: revealIn(event),
    isMe: group.memberIds.includes(s.session.userId),
    myRole: s.session.userId === group.hostId ? 'host' : 'member',
    host: members.find((m) => m.isHost) || null,
  }
}

export function materialView(state, group) {
  if (!group) return null
  const s = state || getState()
  const event = selectors.event(s, group.eventId)
  const type = selectors.activityType(s, group.activityTypeId || event?.typeId)
  const revealed = venueState(event) === 'revealed'
  return canonicalMaterial({
    s,
    group,
    event,
    type,
    venueRow: selectors.venue(s, group.venueId || event?.venueId) || null,
    revealed,
  })
}

/* ── 列表视图 ───────────────────────────────────── */
export function eventSummary(state, event) {
  if (!event) return null
  const s = state || getState()
  const type = selectors.activityType(s, event.typeId)
  return {
    ...event,
    type,
    seatsTotal: selectors.seatsTotal(s, event.id),
    seatsLeft: selectors.seatsLeft(s, event.id),
    venueState: venueState(event),
  }
}

/** 落地页：按开赛日期分组，带类型与余位 */
export function eventBoard(state) {
  const s = state || getState()
  return selectors
    .upcomingEvents(s)
    .map((e) => eventSummary(s, e))
    .filter(Boolean)
}

/** 我的局：卡片列表，含组、活动、类型、是否揭晓 */
export function myGroupCards(state) {
  const s = state || getState()
  return selectors.myGroups(s).map((g) => {
    const view = groupView(s, g.id)
    return {
      group: g,
      event: view?.event || g.event || null,
      type: view?.type || null,
      tableNo: g.tableNo,
      isRevealed: view?.isRevealed ?? false,
      remainingMs: view?.remainingMs ?? 0,
      memberCount: view?.members.length ?? 0,
      host: view?.host || null,
      materials: view?.material ? view.material.kind : null,
    }
  })
}

/** 我报过但还没成组的报名 */
export function myApplications(state) {
  const s = state || getState()
  return selectors.myApplications(s).map((a) => ({
    ...a,
    event: selectors.event(s, a.eventId),
    type: selectors.activityType(s, selectors.event(s, a.eventId)?.typeId),
  }))
}

/** 后台概览用的几个数 */
export function adminStats(state) {
  const s = state || getState()
  const openEvents = s.events.filter((e) => e.status === 'open')
  const lockedGroups = s.groups.filter((g) => ['locked', 'ongoing', 'finished'].includes(g.status))
  const avg =
    lockedGroups.length > 0
      ? lockedGroups.reduce((sum, g) => sum + (g.groupScore || 0), 0) / lockedGroups.length
      : 0
  return {
    events: s.events.length,
    openEvents: openEvents.length,
    applications: s.applications.length,
    groups: s.groups.length,
    lockedGroups: lockedGroups.length,
    avgScore: avg,
    waitlist: s.waitlist.length,
    pendingTasks: s.adminTasks.filter((t) => t.status !== 'done').length,
    venues: s.venues.length,
    users: s.users.length,
  }
}

/* 默认导出成一个对象，页面可以 `import api from '../lib/api.js'` */
const api = {
  actions,
  selectors,
  useStore,
  useSession,
  demoIdentities,
  getState,
  broadMajor,
  schoolShortOf,
  venueState,
  revealIn,
  groupView,
  materialView,
  eventSummary,
  eventBoard,
  myGroupCards,
  myApplications,
  adminStats,
}

export default api
