// 场次 + 演示用组/物料/任务等种子。
// 「今天」按 2026-10-18 周日设定：e_01/e_02 是已锁定的两场（我的局 + 现场页演示），
// e_00 是 10-17 已结束的一场，为「回顾页 / 评价 / 金句投票」提供可渲染的真实数据——
// 没有已结束的组，回顾页会永远是空态。其余 8 场 open，供匹配工作台跑 runMatching。
// 时间统一写成 +08:00 偏移，展示层再按 Asia/Shanghai 格式化。

import { topicBank, sportWarmup, skillOpeners } from './questions.js'

const T = (s) => `2026-${s}+08:00`

// ── 场次 ─────────────────────────────────────────────
export const events = [
  {
    id: 'e_00', typeId: 'dinner', title: '周六晚饭 · 六个人六个菜',
    startAt: T('10-17T18:30:00'), endAt: T('10-17T20:30:00'),
    applyDeadline: T('10-16T18:30:00'), matchAt: T('10-16T22:00:00'),
    venueRevealAt: T('10-17T18:00:00'),
    venueId: 'v_006', venuePoolIds: ['v_006', 'v_008'],
    campus: '大学城公共', capacityGroups: 1, groupSize: 6,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: 'AA · 人均 45 上下', status: 'done', coverPattern: 3,
    description: '六个人，一家小馆，点六个菜。贝岗巷子深处那家，人均 30 上下。',
  },
  {
    id: 'e_01', typeId: 'dinner', title: '周日晚饭 · 一家小馆',
    startAt: T('10-19T18:30:00'), endAt: T('10-19T20:30:00'),
    applyDeadline: T('10-18T18:30:00'), matchAt: T('10-18T21:00:00'),
    venueRevealAt: T('10-19T18:00:00'),
    venueId: 'v_008', venuePoolIds: ['v_008', 'v_006'],
    campus: '大学城公共', capacityGroups: 2, groupSize: 6,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: 'AA · 人均 45 上下', status: 'locked', coverPattern: 3,
    description: '岛南边的村子，吃得比贝岗实在。吃完可以沿内环走一段再散。',
  },
  {
    id: 'e_02', typeId: 'study', title: '周一自习 · 四个人一桌',
    startAt: T('10-20T19:00:00'), endAt: T('10-20T22:00:00'),
    applyDeadline: T('10-19T19:00:00'), matchAt: T('10-19T22:00:00'),
    venueRevealAt: T('10-20T18:30:00'),
    venueId: 'v_011', venuePoolIds: ['v_011', 'v_010'],
    campus: '广东工业大学', capacityGroups: 2, groupSize: 4,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: '不收费', status: 'locked', coverPattern: 2,
    description: '四个人一桌，各看各的，中间不聊天。手机放包里，三小时。',
  },
  {
    id: 'e_03', typeId: 'boardgame', title: '周三桌游 · 玩到一个本结束',
    startAt: T('10-21T19:00:00'), endAt: T('10-21T22:00:00'),
    applyDeadline: T('10-20T19:00:00'), matchAt: T('10-20T23:00:00'),
    venueRevealAt: T('10-21T18:30:00'),
    venueId: 'v_005', venuePoolIds: ['v_005'],
    campus: '大学城公共', capacityGroups: 2, groupSize: 6,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: 'AA · 人均 40 上下', status: 'open', coverPattern: 2,
    description: '狼人杀或一个本，玩到有人笑岔气。三楼小包隔音一般，隔壁能听见你们喊。',
  },
  {
    id: 'e_04', typeId: 'nightrun', title: '周四夜跑 · 按最慢的配速',
    startAt: T('10-22T21:30:00'), endAt: T('10-22T22:30:00'),
    applyDeadline: T('10-21T21:30:00'), matchAt: T('10-22T09:00:00'),
    venueRevealAt: T('10-22T21:00:00'),
    venueId: 'v_002', venuePoolIds: ['v_002'],
    campus: '大学城公共', capacityGroups: 3, groupSize: 4,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: '不收费', status: 'open', coverPattern: 6,
    description: '4.3 公里，按最慢的配速。南亭那个路口没有红绿灯，要停一下。',
  },
  {
    id: 'e_05', typeId: 'badminton', title: '周五羽毛球 · 两小时场地',
    startAt: T('10-23T19:00:00'), endAt: T('10-23T20:30:00'),
    applyDeadline: T('10-22T19:00:00'), matchAt: T('10-22T22:00:00'),
    venueRevealAt: T('10-23T18:30:00'),
    venueId: 'v_003', venuePoolIds: ['v_003'],
    campus: '大学城公共', capacityGroups: 2, groupSize: 4,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: 'AA · 人均 35 上下', status: 'open', coverPattern: 4,
    description: '两小时场地，四个人轮着上场。会发球、能连续接三个就来。',
  },
  {
    id: 'e_06', typeId: 'citywalk', title: '周六扫街 · 走一条不折返的线',
    startAt: T('10-24T15:00:00'), endAt: T('10-24T17:30:00'),
    applyDeadline: T('10-23T15:00:00'), matchAt: T('10-23T20:00:00'),
    venueRevealAt: T('10-24T14:30:00'),
    venueId: 'v_004', venuePoolIds: ['v_004', 'v_009'],
    campus: '大学城公共', capacityGroups: 1, groupSize: 6,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: '不收费 · 自带补给', status: 'open', coverPattern: 6,
    description: '仿旧骑楼一条街，学生票 30，下午人少。走完拐去穗石村看那几面墙。',
  },
  {
    id: 'e_07', typeId: 'gallery', title: '周日看展 · 一场谁都没看过的展',
    startAt: T('10-25T14:00:00'), endAt: T('10-25T16:00:00'),
    applyDeadline: T('10-24T14:00:00'), matchAt: T('10-24T20:00:00'),
    venueRevealAt: T('10-25T13:30:00'),
    venueId: 'v_013', venuePoolIds: ['v_013', 'v_012'],
    campus: '广州美术学院', capacityGroups: 1, groupSize: 5,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: 'AA · 门票 60 上下', status: 'open', coverPattern: 4,
    description: '毕业展期间免费，六层楼能逛两小时。看完在门口聊四十分钟。',
  },
  {
    id: 'e_08', typeId: 'skillswap', title: '周一技能交换 · 你教我我教你',
    startAt: T('10-26T19:30:00'), endAt: T('10-26T21:30:00'),
    applyDeadline: T('10-25T19:30:00'), matchAt: T('10-25T22:00:00'),
    venueRevealAt: T('10-26T19:00:00'),
    venueId: 'v_010', venuePoolIds: ['v_010', 'v_014'],
    campus: '华南理工大学', capacityGroups: 1, groupSize: 6,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: '不收费 · 各带各的', status: 'open', coverPattern: 4,
    description: '你教我剪视频，我教你弹第一首歌。两节课各 40 分钟。',
  },
  {
    id: 'e_09', typeId: 'exam', title: '周三考研搭子 · 对进度对错题',
    startAt: T('10-28T19:00:00'), endAt: T('10-28T21:00:00'),
    applyDeadline: T('10-27T19:00:00'), matchAt: T('10-27T22:00:00'),
    venueRevealAt: T('10-28T18:30:00'),
    venueId: 'v_011', venuePoolIds: ['v_011'],
    campus: '广东工业大学', capacityGroups: 2, groupSize: 4,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: '不收费', status: 'open', coverPattern: 1,
    description: '考同一场的人，对进度，对错题。不聊「考不考」，只聊具体章节。',
  },
  {
    id: 'e_10', typeId: 'photo', title: '周六互拍 · 走之前每人五张',
    startAt: T('10-31T16:00:00'), endAt: T('10-31T18:30:00'),
    applyDeadline: T('10-30T16:00:00'), matchAt: T('10-30T20:00:00'),
    venueRevealAt: T('10-31T15:30:00'),
    venueId: 'v_001', venuePoolIds: ['v_001', 'v_009'],
    campus: '大学城公共', capacityGroups: 1, groupSize: 6,
    genderRule: { femaleMin: 0.25, singleMax: 0.75 },
    priceLabel: '不收费 · 自带设备', status: 'open', coverPattern: 5,
    description: '互相拍，走之前每人拿到 5 张。下午四点的光最好，迟十分钟就差一档。',
  },
]

// ── 已成的组（演示：我的局 / 现场页 / 回顾页） ─────────────
export const groups = [
  {
    id: 'g_00', eventId: 'e_00', typeId: 'dinner', tableNo: 'A1', index: 1,
    venueId: 'v_006', status: 'finished',
    memberIds: ['u_001', 'u_003', 'u_010', 'u_013', 'u_019', 'u_029'],
    hostId: 'u_010',
    groupScore: 0.7421,
    vibeLabel: '一个带节奏，其余慢慢跟上',
    vibeNote: '有 1 个人会主动开口，其余人接得上但不会抢话。',
    matchReason: '你们 6 个人里，3 个都写了「想出门走走」，2 个把「吃饭」放进了最近想做的事。所以先把前四道题压短，不用谁带头。',
    recapLine: '六个人从砂锅粥聊到高考志愿，走的时候没人先掏手机。',
    checkinCode: '482913',
    photos: [],
    createdAt: T('10-16T22:00:00'), lockedAt: T('10-17T10:00:00'),
    finishedAt: T('10-17T21:10:00'), revealAt: T('10-17T18:00:00'),
  },
  {
    id: 'g_01', eventId: 'e_01', typeId: 'dinner', tableNo: 'A1', index: 1,
    venueId: 'v_008', status: 'locked',
    memberIds: ['u_001', 'u_002', 'u_005', 'u_009', 'u_021', 'u_029'],
    hostId: 'u_029',
    groupScore: 0.6880,
    vibeLabel: '话头不会掉在地上',
    vibeNote: '三个人表达欲偏高，剩下三个愿意接，最慢的人也不会被落下。',
    matchReason: '你们 6 个人里有 4 个选了「有人先问我我就说」，还有 2 个写了自己会主动开口。这一桌先有这两个人，话就断不了。',
    recapLine: null,
    checkinCode: '319745',
    photos: [],
    createdAt: T('10-18T21:00:00'), lockedAt: T('10-18T21:20:00'),
    finishedAt: null, revealAt: T('10-19T18:00:00'),
  },
  {
    id: 'g_02', eventId: 'e_02', typeId: 'study', tableNo: 'A1', index: 1,
    venueId: 'v_011', status: 'locked',
    memberIds: ['u_001', 'u_012', 'u_032', 'u_036'],
    hostId: 'u_001',
    groupScore: 0.7104,
    vibeLabel: '安静，但没有人被落下',
    vibeNote: '四个人的目标强度都在 0.8 以上，作息相近，前两项任务直接进正题。',
    matchReason: '你们四个人写的都是同一类目标：把手上的事推进一步。作息三个早起型、一个夜猫，所以把开始时间放在晚上七点。',
    recapLine: null,
    checkinCode: '607218',
    photos: [],
    createdAt: T('10-19T22:00:00'), lockedAt: T('10-19T22:15:00'),
    finishedAt: null, revealAt: T('10-20T18:30:00'),
  },
]

// ── 待匹配的报名（open 场次）── [eventId]: userId[] ─────────
// store 会把它们展开成完整的 Application（含问卷答案），避免种子数据手写 40 份答案。
export const applicantIds = {
  // e_03 共 13 人：12 个正选 + 1 个候补（候补那条在 waitlist 里，这里不重复）
  e_03: ['u_004', 'u_007', 'u_010', 'u_013', 'u_016', 'u_019', 'u_025',
    'u_029', 'u_030', 'u_033', 'u_037', 'u_040'],
  e_04: ['u_004', 'u_018', 'u_024', 'u_033', 'u_035'],
  e_05: ['u_002', 'u_007', 'u_015', 'u_026', 'u_030', 'u_034'],
  e_06: ['u_003', 'u_008', 'u_028', 'u_042'],
  e_07: ['u_008', 'u_020', 'u_028'],
  e_08: ['u_008', 'u_019', 'u_031'],
  e_09: ['u_012', 'u_023', 'u_032', 'u_036'],
  e_10: ['u_008', 'u_011', 'u_028', 'u_038', 'u_042'],
}

// ── 物料 ─────────────────────────────────────────────
const pick = (list, ids) => ids.map(id => list.find(q => q.id === id)).filter(Boolean)

export const materials = [
  {
    id: 'm_00', groupId: 'g_00', kind: 'cards',
    payload: {
      note: '整组表达欲中等，前四张压短，第五张开始进兴趣。',
      cards: pick(topicBank.icebreak, ['ib_03', 'ib_08', 'ib_10', 'ib_11'])
        .concat(pick(topicBank.interest, ['in_01', 'in_03', 'in_06', 'in_09'])),
      identityCard: { nickname: '南亭路口等红灯', question: '你最近一次觉得「活着真好」是什么时候？' },
    },
    progress: {
      index: 8,
      skipped: ['ib_09', 'ib_13'],
      checkedIn: ['u_001', 'u_003', 'u_010', 'u_013', 'u_019', 'u_029'],
      scores: {}, updatedAt: T('10-17T21:00:00'),
    },
    version: 1, generatedAt: T('10-17T10:00:00'), generatedBy: 'rule',
    printedAt: T('10-17T10:05:00'), printCount: 1,
  },
  {
    id: 'm_01', groupId: 'g_01', kind: 'cards',
    payload: {
      note: '两个表达欲偏高的人分开放，第一张给最安静的人。',
      cards: pick(topicBank.icebreak, ['ib_01', 'ib_05', 'ib_07', 'ib_12'])
        .concat(pick(topicBank.interest, ['in_02', 'in_07', 'in_10', 'in_15'])),
      identityCard: { nickname: '南亭路口等红灯', question: '你最近一次觉得「活着真好」是什么时候？' },
    },
    progress: { index: 0, skipped: [], checkedIn: [], scores: {}, updatedAt: T('10-18T21:20:00') },
    version: 1, generatedAt: T('10-18T21:20:00'), generatedBy: 'rule',
    printedAt: null, printCount: 0,
  },
  {
    id: 'm_02', groupId: 'g_02', kind: 'goal',
    payload: {
      note: '目标强度接近，第一轮直接写具体章节，不做自我介绍。',
      goalCard: { title: '这三小时要推进的一件事', fields: ['具体到哪一章 / 哪一节', '卡在哪一步', '结束后做到什么算完成'] },
      checkTable: [
        { id: 'ck1', label: '19:10 各写一句今天的目标' },
        { id: 'ck2', label: '20:00 第一次互看进度（不说话，只看纸）' },
        { id: 'ck3', label: '21:00 站起来走两分钟' },
        { id: 'ck4', label: '21:50 写下没做完的部分' },
      ],
    },
    progress: { index: 0, skipped: [], checkedIn: [], scores: {}, updatedAt: T('10-19T22:15:00') },
    version: 1, generatedAt: T('10-19T22:15:00'), generatedBy: 'rule',
    printedAt: null, printCount: 0,
  },
]

// ── 签到 ─────────────────────────────────────────────
export const checkins = [
  { id: 'ck_01', groupId: 'g_00', userId: 'u_010', method: 'code', code: '482913', at: T('10-17T18:26:00'), note: null },
  { id: 'ck_02', groupId: 'g_00', userId: 'u_001', method: 'code', code: '482913', at: T('10-17T18:29:00'), note: null },
  { id: 'ck_03', groupId: 'g_00', userId: 'u_003', method: 'code', code: '482913', at: T('10-17T18:31:00'), note: null },
  { id: 'ck_04', groupId: 'g_00', userId: 'u_013', method: 'code', code: '482913', at: T('10-17T18:38:00'), note: '迟到 8 分钟' },
  { id: 'ck_05', groupId: 'g_00', userId: 'u_019', method: 'code', code: '482913', at: T('10-17T18:30:00'), note: null },
  { id: 'ck_06', groupId: 'g_00', userId: 'u_029', method: 'admin', code: null, at: T('10-17T18:30:00'), note: null },
]

// ── 评价（g_00 已结束，3 人给了评价） ────────────────────
export const reviews = [
  {
    id: 'rv_01', groupId: 'g_00', eventId: 'e_00', fromUserId: 'u_003',
    ratingOverall: 5, ratingVibe: 4, wouldMeetAgain: true,
    tags: ['聊得开', '想再约'], comment: '没想到能聊这么久，砂锅粥都凉了。',
    at: T('10-17T22:10:00'),
  },
  {
    id: 'rv_02', groupId: 'g_00', eventId: 'e_00', fromUserId: 'u_013',
    ratingOverall: 4, ratingVibe: 4, wouldMeetAgain: true,
    tags: ['节奏刚好'], comment: '没有人一直在讲自己，这点很好。',
    at: T('10-18T09:12:00'),
  },
  {
    id: 'rv_03', groupId: 'g_00', eventId: 'e_00', fromUserId: 'u_019',
    ratingOverall: 4, ratingVibe: 5, wouldMeetAgain: true,
    tags: ['聊得开'], comment: '前半段有点冷，第四道题之后就好了。',
    at: T('10-18T11:40:00'),
  },
]

// ── 金句 ─────────────────────────────────────────────
export const quotes = [
  {
    id: 'q_01', groupId: 'g_00', text: '我家猫比我先脱单',
    saidByUserId: 'u_013', submittedByUserId: 'u_003',
    votes: 4, votedBy: ['u_001', 'u_019', 'u_029', 'u_010'], at: T('10-17T20:40:00'),
  },
  {
    id: 'q_02', groupId: 'g_00', text: '我考研是因为不想那么快做选择',
    saidByUserId: 'u_019', submittedByUserId: 'u_013',
    votes: 2, votedBy: ['u_003', 'u_029'], at: T('10-17T20:52:00'),
  },
  {
    id: 'q_03', groupId: 'g_00', text: '大一的我想必想不到，大四的我还在问同样的问题',
    saidByUserId: 'u_010', submittedByUserId: 'u_001',
    votes: 3, votedBy: ['u_003', 'u_013', 'u_019'], at: T('10-17T21:00:00'),
  },
]

// ── 候补（e_03 已满 12 位，第 13 人候补） ─────────────────
export const waitlist = [
  {
    id: 'w_001', eventId: 'e_03', userId: 'u_041', rank: 1,
    status: 'waiting', promotedGroupId: null,
    joinedAt: T('10-18T20:10:00'), promotedAt: null,
  },
]

// ── 后台任务清单 ──────────────────────────────────────
export const adminTasks = [
  {
    id: 't_001', type: 'venue_assign', refKind: 'group', refId: 'g_01',
    title: 'A1 桌需要确认场地',
    detail: '场次 e_01，6 人，场地池有 2 个可选，南亭村今晚只剩 1 组位置。',
    status: 'doing', assignee: null,
    dueAt: T('10-19T12:00:00'), createdAt: T('10-18T21:25:00'), doneAt: null,
  },
  {
    id: 't_002', type: 'material_export', refKind: 'material', refId: 'm_01',
    title: '导出 10-19 饭局卡牌',
    detail: '8 张题卡 + 1 张身份卡，需含组号与场地标记，活动前一晚导出。',
    status: 'todo', assignee: null,
    dueAt: T('10-19T12:00:00'), createdAt: T('10-18T21:26:00'), doneAt: null,
  },
  {
    id: 't_003', type: 'waitlist_fill', refKind: 'event', refId: 'e_03',
    title: 'e_03 有 1 人候补，开组后补齐',
    detail: '13 人报名，2 桌 12 位，候补 1 人排第 1。有人取消时自动补进。',
    status: 'todo', assignee: null,
    dueAt: T('10-20T19:00:00'), createdAt: T('10-18T20:12:00'), doneAt: null,
  },
  {
    id: 't_004', type: 'checkin_audit', refKind: 'group', refId: 'g_01',
    title: '活动结束后核对签到',
    detail: '6 人局，签到码 319745。缺签到的人当天要电话确认一次。',
    status: 'todo', assignee: null,
    dueAt: T('10-19T23:00:00'), createdAt: T('10-18T21:30:00'), doneAt: null,
  },
  {
    id: 't_005', type: 'report_handle', refKind: 'report', refId: 'r_001',
    title: '有人反馈被追问隐私',
    detail: '来自 e_00 匿名反馈，等级 urgent，需要 24 小时内回访并记录处理结果。',
    status: 'doing', assignee: null,
    dueAt: T('10-18T23:59:00'), createdAt: T('10-18T08:20:00'), doneAt: null,
  },
  {
    id: 't_006', type: 'reminder_push', refKind: 'event', refId: 'e_02',
    title: '活动前 2 小时提醒',
    detail: '4 人局，集合信息已解禁，提醒带校园卡（研讨室要刷）。',
    status: 'done', assignee: null,
    dueAt: T('10-20T17:00:00'), createdAt: T('10-18T21:31:00'), doneAt: T('10-19T10:00:00'),
  },
]

// ── 安全反馈 ──────────────────────────────────────────
export const reports = [
  {
    id: 'r_001', groupId: 'g_00', eventId: 'e_00', fromUserId: null,
    category: 'discomfort', level: 'urgent',
    text: '有人一直在追问隐私问题，被问到不太想回答的程度。',
    contactPhone: null, status: 'open', handledBy: null, handledAt: null,
    resolution: null, createdAt: T('10-18T08:15:00'),
  },
]

export const reseatVotes = []

// 现场页「运动/技能」类物料要用到的题库，一并导出，方便页面按 kind 取题
export const extraBanks = { sportWarmup, skillOpeners }
