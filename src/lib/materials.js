/**
 * 不熟局 BU SHU · 局内物料生成（纯函数，不碰 DOM）
 *
 * 规格来源：
 *  - docs/site-spec.md §7.2 社交型话题卡牌 / §7.3 竞技型赛制 / §7.4 搭子型目标卡 /
 *    §7.5 技能型课程表 / §7.6 A4 单页打印规格
 *  - docs/content-plan.md §4 话题卡种子题库（题库只做选择 / 排序 / 轻改写，不凭空造题）
 *
 * 约定：
 *  - 只产出结构化数据，**不拼 HTML 字符串**。打印页由页面组件按 printSheet 渲染。
 *  - 确定性：题库按 id / sortOrder 排序后按固定步长抽取（seed 来自 group.id），
 *    同一组重复生成结果一致（§7 生成可重放）。不使用 Math.random。
 *  - kind 用产品语义命名（topicCards / checkinSheet / tournament / skillSchedule），
 *    同时给出 specKind（cards / goal / tournament / curriculum）对齐 §7 与 Material.kind。
 */

import { topicBank, sportWarmup, skillOpeners } from '../data/questions.js';
import {
  GRADE_CN,
  LEVEL_CN,
  SCHOOL_SHORT,
  majorFamily,
  topicFamilyOf,
  normalizeGrade,
  hashSeed,
  formatDateText,
  goalMatch,
  complement,
  predictVibe,
  computeTeamBalance,
  pickHost,
  deriveTraits,
} from './match.js';

/* ------------------------------------------------------------------ *
 * 0. 常量
 * ------------------------------------------------------------------ */

export const MATERIAL_KIND = {
  social: 'topicCards',
  buddy: 'checkinSheet',
  competitive: 'tournament',
  skill: 'skillSchedule',
};

/** §7 的 Material.kind（存库字段）：cards / goal / tournament / curriculum */
export const SPEC_MATERIAL_KIND = {
  topicCards: 'cards',
  checkinSheet: 'goal',
  tournament: 'tournament',
  skillSchedule: 'curriculum',
};

const TAGLINE = '不熟的人，一起干件小事。';

const DEPTH_LABEL = { icebreak: '破冰', interest: '兴趣与经历', opinion: '观点' };const DEPTH_NOTE = {
  icebreak: '先别聊太深',
  interest: '讲一件真事',
  opinion: '可以不同意',
};

/** 题库兜底（content-plan §4 各取前几条）：仅在调用方传入的 bank 为空时启用 */
const FALLBACK_BANK = {
  icebreak: [
    { id: 'fb_ib_01', text: '你这学期最早的一节课几点，到过几次。', intensity: 1 },
    { id: 'fb_ib_02', text: '从宿舍走到教学区要多久，走哪条路。', intensity: 1 },
    { id: 'fb_ib_03', text: '早八之前你吃东西吗，吃什么。', intensity: 1 },
    { id: 'fb_ib_04', text: '4 号线你坐过最挤的一次是什么时候。', intensity: 1 },
    { id: 'fb_ib_05', text: '晚上十点以后，你一般还在岛上的哪儿。', intensity: 1 },
    { id: 'fb_ib_06', text: '手机里最新一张照片是什么，现在能给大家看吗。', intensity: 1 },
  ],
  interest: [
    { id: 'fb_in_01', text: '你最近在看什么，看到哪了，值不值得推荐。', intensity: 2 },
    { id: 'fb_in_02', text: '这半年你一直在循环的那首歌是什么。', intensity: 2 },
    { id: 'fb_in_03', text: '你花过最不后悔的一笔钱，多少。', intensity: 2 },
    { id: 'fb_in_04', text: '你坚持最久的一件小事是什么，多久了。', intensity: 2 },
    { id: 'fb_in_05', text: '你会做、但身边的人一般不会的一件事。', intensity: 2 },
    { id: 'fb_in_06', text: '这岛上你发现的一个没什么人知道的地方。', intensity: 2 },
  ],
  opinion: [
    { id: 'fb_op_01', text: '大学城最被低估的东西是什么。', intensity: 3 },
    { id: 'fb_op_02', text: '考研和工作，你现在更怕哪一个，为什么。', intensity: 3 },
    { id: 'fb_op_03', text: '你觉得「合群」重要吗，你为此让过什么步。', intensity: 3 },
    { id: 'fb_op_04', text: '你更怕被误解，还是更怕被看穿。', intensity: 3 },
  ],
  warmup: [
    { id: 'fb_sw_01', text: '你上一次真的跑起来，是什么时候。', intensity: 1 },
    { id: 'fb_sw_02', text: '打球你最擅长和最不擅长分别是什么。', intensity: 1 },
    { id: 'fb_sw_03', text: '输球和坐冷板凳，你更受不了哪个。', intensity: 1 },
  ],
  skill: [
    { id: 'fb_sk_01', text: '你能在十分钟内教会别人什么。', intensity: 1 },
    { id: 'fb_sk_02', text: '你最近想学、但一直没开始的一件事。', intensity: 1 },
    { id: 'fb_sk_03', text: '你学东西靠看视频，还是靠人带。', intensity: 2 },
  ],
};

/** §7.4 groupRules / reviewQuestions 固定文案 */
const BUDDY_RULES = [
  '手机静音放在包里，桌上只留纸笔。',
  '到点开始，迟到不等人。',
  '中途离开说一声，别让位置空着没人知道。',
  '不打听对方的成绩、排名和家底。',
  '散场前 10 分钟一起复盘，各说一句下周怎么调。',
];
const BUDDY_REVIEW = [
  '这周最有进展的一件事？',
  '卡在哪？',
  '下周要不要加量？',
];

const SKILL_RULES = [
  '每节 25 分钟，讲的人先说结论，再演示一遍。',
  '学的人当场做一遍，做不出来就再讲一次。',
  '到中段角色互换，教的人也要坐下来学。',
  '每节结束必须留下产出，没产出的那节算没上。',
];

const FAMILY_BROAD_HINT = [
  [/计算机|软件|人工智能|数据|网络工程/, '计算机类'],
  [/机械|自动化|车辆|机器人/, '机械类'],
  [/电子|通信|电气|光电/, '电子类'],
  [/土木|建筑|环境|城乡规划/, '土木建筑类'],
  [/新闻|传播|编辑|广告/, '新闻传播类'],
  [/汉语言|中文|历史|哲学/, '中文历史类'],
  [/经济|金融|会计|财务|审计|国贸|工商|管理/, '经管类'],
  [/英语|日语|法语|德语|翻译|外语/, '外语类'],
  [/美术|设计|视觉传达|绘画|公共艺术|雕塑|动画/, '设计类'],
  [/音乐|声乐|舞蹈|表演|戏剧|作曲/, '音乐表演类'],
  [/临床|药学|护理|中医|医学|口腔|预防|中药/, '医药类'],
  [/数学|物理|化学|生物|统计|地理/, '理学类'],
  [/教育|师范|学前/, '教育类'],
];

/* ------------------------------------------------------------------ *
 * 1. 小工具
 * ------------------------------------------------------------------ */

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round4 = (x) => Math.round(x * 10000) / 10000;
const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function broadMajor(major) {
  const s = String(major || '');
  for (const [re, label] of FAMILY_BROAD_HINT) if (re.test(s)) return label;
  const family = majorFamily(s);
  return family === '其他' ? (s || '专业未填') : `${family}类`;
}

function spreadChars(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function oneLineImage(m) {
  const tags = (m.interestTags || []).slice(0, 2);
  const base = `${m.schoolShort || SCHOOL_SHORT[m.school] || '大学城'} ${GRADE_CN[m.grade] || '在读'}，${broadMajor(m.major)}`;
  const withTags = tags.length ? `${base}，${tags.join(' / ')}` : base;
  return spreadChars(withLine(withTags), 24);
}

function withLine(s) {
  return String(s || '').replace(/[、，]+$/, '');
}

function memberView(m) {
  return {
    userId: m.userId,
    nickname: m.nickname,
    schoolShort: m.schoolShort || SCHOOL_SHORT[m.school] || m.school || '',
    schoolMajor: `${m.schoolShort || SCHOOL_SHORT[m.school] || ''} · ${GRADE_CN[m.grade] || '在读'} · ${broadMajor(m.major)}`,
    gradeCn: GRADE_CN[m.grade] || '在读',
    majorBroad: broadMajor(m.major),
    tags: (m.interestTags || []).slice(0, 3),
    question: (m.questionsAsked || [])[0] || '',
    goalText: m.goalText || '',
    level: m.level || null,
  };
}

/** 从 users / applications 还原成员（与 match.js 的字段口径一致） */
function resolveMembers(group, users, applications, activityType) {
  const g = group || {};
  if (Array.isArray(g.members) && g.members.length) return g.members;
  const userMap = new Map((users || []).filter(Boolean).map((u) => [u.id, u]));
  const appMap = new Map((applications || []).filter(Boolean).map((a) => [a.userId, a]));
  const ids = Array.isArray(g.memberIds) ? g.memberIds : [];
  return ids.map((id) => {
    const u = userMap.get(id) || { id, nickname: '同组的人' };
    const app = appMap.get(id) || null;
    const answers = (app && app.answers) || {};
    const traits = deriveTraits(answers, u);
    const typeId = (activityType && activityType.id) || null;
    return {
      userId: u.id,
      nickname: u.nickname || '同组的人',
      school: u.school || '',
      schoolShort: SCHOOL_SHORT[u.school] || u.school || '',
      major: u.major || '',
      grade: normalizeGrade(u.grade),
      gender: u.gender === 'f' ? 'female' : (u.gender === 'm' ? 'male' : u.gender || 'other'),
      campus: u.campus || u.school || '',
      interestTags: Array.isArray(u.interestTags) ? u.interestTags.slice() : (Array.isArray(u.tags) ? u.tags.slice() : []),
      topicsWanted: Array.isArray(answers.topicsWanted) ? answers.topicsWanted.slice() : [],
      availableSlots: Array.isArray(answers.availableSlots) ? answers.availableSlots.slice() : [],
      goalText: String(answers.goalText || ''),
      teachSkill: String(answers.teachSkill || ''),
      learnSkill: String(answers.learnSkill || ''),
      questionsAsked: Array.isArray(answers.questionsAsked) && answers.questionsAsked.length
        ? answers.questionsAsked.slice()
        : (u.question ? [String(u.question)] : []),
      selfDesc: String(answers.selfDesc || u.bio || ''),
      wantMeet: String(answers.wantMeet || u.wantMeet || ''),
      privacyLevel: answers.privacyLevel || 'mid',
      level: answers.levelChoice || (u.profile && u.profile.skillLevels && typeId ? u.profile.skillLevels[typeId] : null) || null,
      profile: {
        socialEnergy: traits.socialEnergy,
        expressiveness: traits.expressiveness,
        openness: traits.openness,
        chrono: traits.chrono,
        goalIntensity: traits.goalIntensity,
        privacyBoundary: traits.privacyBoundary,
      },
    };
  });
}

/** 题库归一化：兼容 {topicBank, sportWarmup, skillOpeners} / {icebreak...} / 数组 */
function normalizeBank(bank) {
  const out = { icebreak: [], interest: [], opinion: [], warmup: [], skill: [] };
  const push = (key, arr) => {
    if (!Array.isArray(arr)) return;
    for (const q of arr) {
      if (!q) continue;
      const text = String(q.text || q.question || '').trim();
      if (!text) continue;
      out[key].push({
        id: String(q.id || `${key}_${out[key].length + 1}`),
        text,
        intensity: num(q.intensity ?? q.depth, key === 'opinion' ? 3 : (key === 'interest' ? 2 : 1)),
        sortOrder: num(q.sortOrder, out[key].length + 1),
      });
    }
  };

  if (Array.isArray(bank)) {
    for (const q of bank) {
      if (!q) continue;
      const seg = String(q.segment || q.depth || q.kind || '').toLowerCase();
      const key = /ice|破冰/.test(seg) ? 'icebreak'
        : /opin|观点/.test(seg) ? 'opinion'
          : /warm|暖场/.test(seg) ? 'warmup'
            : /skill|技能/.test(seg) ? 'skill'
              : 'interest';
      push(key, [q]);
    }
  } else if (bank && typeof bank === 'object') {
    const nested = bank.topicBank || {};
    push('icebreak', bank.icebreak || nested.icebreak);
    push('interest', bank.interest || nested.interest);
    push('opinion', bank.opinion || nested.opinion);
    push('warmup', bank.warmup || bank.sportWarmup);
    push('skill', bank.skill || bank.skillOpeners);
  }

  // 默认题库：src/data/questions.js（§7 规定的题库文件）
  if (!out.icebreak.length) push('icebreak', topicBank.icebreak);
  if (!out.interest.length) push('interest', topicBank.interest);
  if (!out.opinion.length) push('opinion', topicBank.opinion);
  if (!out.warmup.length) push('warmup', sportWarmup);
  if (!out.skill.length) push('skill', skillOpeners);

  // 仍然为空 → 用 content-plan 摘录兜底（不允许出空段）
  for (const key of Object.keys(out)) {
    if (!out[key].length) push(key, FALLBACK_BANK[key]);
  }
  return out;
}

/** 确定性抽题：按 sortOrder + id 排序，固定步长 7（与题库长度互质） */
function pickQuestions(bucket, count, seedStr) {
  const list = bucket.slice().sort((a, b) => (a.sortOrder - b.sortOrder) || a.id.localeCompare(b.id));
  const len = list.length;
  if (!len || count <= 0) return [];
  const seed = hashSeed(seedStr);
  const seen = new Set();
  const out = [];
  for (let i = 0; i < count && out.length < len; i += 1) {
    const item = list[(seed + i * 7) % len];
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  for (const item of list) {
    if (out.length >= count || out.length >= len) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out.sort((a, b) => (a.intensity - b.intensity) || (a.sortOrder - b.sortOrder) || a.id.localeCompare(b.id));
}

function commonTopicsOf(members, min = 2) {
  const counts = new Map();
  for (const m of members) {
    const set = new Set([...(m.topicsWanted || []), ...(m.interestTags || [])]);
    for (const t of set) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= min)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([topic, count]) => ({ topic, count }));
}

/** sharedTopics 用：字面没有重合时退到话题域（与 match.js 的 commonTopics 同口径） */
function sharedTopicsOf(members) {
  const exact = commonTopicsOf(members, 2);
  if (exact.length) return exact;
  const fams = new Map();
  for (const m of members) {
    const set = new Set([...(m.topicsWanted || []), ...(m.interestTags || [])]
      .map(topicFamilyOf)
      .filter(Boolean));
    for (const f of set) fams.set(f, (fams.get(f) || 0) + 1);
  }
  return [...fams.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([topic, count]) => ({ topic, count }));
}

function deterministicCode(seedStr) {
  return String((hashSeed(seedStr) % 900000) + 100000);
}

/* ------------------------------------------------------------------ *
 * 2. 社交型：话题卡牌（§7.2）
 * ------------------------------------------------------------------ */

function buildTopicCards({ group, event, type, members, bank }) {
  const n = members.length;
  const meanE = mean(members.map((m) => num(m.profile && m.profile.socialEnergy, 0.5)));
  const meanX = mean(members.map((m) => num(m.profile && m.profile.expressiveness, 0.45)));
  const seed = String(group.id || group.tableNo || 'g');

  // §7.2 题量公式
  let icebreakCount = clamp(6 + Math.round(2 * (1 - meanE)), 6, 10);
  const interestTotal = clamp(8 + n, 8, 16);
  let opinionCount = clamp(6 + Math.round(3 * meanX), 4, 10);

  let depthNote = '这桌节奏常规，第 2 段结束前不用急着聊观点题。';
  const notes = [];
  if (meanE < 0.4) {
    icebreakCount = clamp(icebreakCount + 2, 6, 10); // 改规则 1：破冰 +2
    opinionCount = clamp(opinionCount - 2, 4, 10);   // 观点 −2
    depthNote = '这桌整体偏慢热，第 2 段结束前不用急着聊观点题。';
    notes.push('整组平均表达欲偏低，破冰段加了两道最短的题。');
  }
  if (meanX >= 0.65) {
    opinionCount = clamp(opinionCount + 1, 4, 10);
    depthNote = '这桌话多，可以直接上硬题：破冰段走过场就行。';
    notes.push('整组表达欲高，观点段提前放了一道硬题。');
  }

  const bankPickInterest = Math.max(0, interestTotal - n);
  const icebreakQs = pickQuestions(bank.icebreak, icebreakCount, `${seed}:ice`);
  const interestQs = pickQuestions(bank.interest, bankPickInterest, `${seed}:in`);
  let opinionQs = pickQuestions(bank.opinion, opinionCount, `${seed}:op`);

  // 规则 2：meanX ≥ 0.65 → 观点段前置 1 道 intensity 3 的题
  if (meanX >= 0.65 && opinionQs.length > 1) {
    const hardest = opinionQs.slice().sort((a, b) => (b.intensity - a.intensity) || a.id.localeCompare(b.id))[0];
    opinionQs = [hardest, ...opinionQs.filter((q) => q.id !== hardest.id)];
  }

  const deck = [];
  icebreakQs.forEach((q, i) => {
    deck.push({ id: q.id, depth: 'icebreak', intensity: q.intensity, text: q.text, order: i + 1 });
  });

  // 规则 3：每人一张自提问题卡，前面插一张「{昵称} 想问：」提示卡，排在兴趣段末尾
  const selfCards = [];
  members.forEach((m) => {
    const q = (m.questionsAsked || [])[0];
    if (!q) return;
    selfCards.push({
      id: `self_prompt_${m.userId}`,
      depth: 'interest',
      kind: 'prompt',
      intensity: 2,
      text: `${m.nickname} 想问：`,
      ownerId: m.userId,
    });
    selfCards.push({
      id: `self_${m.userId}`,
      depth: 'interest',
      kind: 'question',
      intensity: 2,
      text: String(q),
      ownerId: m.userId,
    });
  });

  interestQs.forEach((q, i) => {
    deck.push({ id: q.id, depth: 'interest', intensity: q.intensity, text: q.text, order: icebreakQs.length + i + 1 });
  });
  selfCards.forEach((c) => deck.push(c));
  opinionQs.forEach((q, i) => {
    deck.push({
      id: q.id,
      depth: 'opinion',
      intensity: q.intensity,
      text: q.text,
      order: icebreakQs.length + interestQs.length + selfCards.length + i + 1,
    });
  });

  // 同一 id 不出现两次（§7.2 排序规则；自提题与题库撞题时保留自提题）
  const seenIds = new Set();
  const deduped = [];
  for (const card of deck) {
    if (seenIds.has(card.id)) continue;
    seenIds.add(card.id);
    deduped.push(card);
  }
  // 自提题若与题库文本相同，删掉种子题
  const selfTexts = new Set(deduped.filter((c) => c.kind === 'question').map((c) => c.text));
  const finalDeck = deduped.filter((c) => !((c.kind !== 'prompt' && !c.ownerId) && selfTexts.has(c.text)));

  const countOf = (depth) => finalDeck.filter((c) => c.depth === depth && c.kind !== 'prompt').length;
  const identityCards = members.map((m) => {
    const v = memberView(m);
    return {
      userId: v.userId,
      nickname: v.nickname,
      schoolMajor: v.schoolMajor,
      bio: oneLineImage(m),
      question: v.question,
      tags: v.tags,
    };
  });

  return {
    deck: finalDeck,
    identityCards,
    flow: [
      { phase: '破冰', count: countOf('icebreak'), note: DEPTH_NOTE.icebreak },
      { phase: '兴趣与经历', count: countOf('interest'), note: DEPTH_NOTE.interest },
      { phase: '观点', count: countOf('opinion'), note: DEPTH_NOTE.opinion },
    ],
    sharedTopics: sharedTopicsOf(members),
    depthNote,
    notes,
    metrics: { meanSocialEnergy: round4(meanE), meanExpressiveness: round4(meanX), memberCount: n },
  };
}

/* ------------------------------------------------------------------ *
 * 3. 搭子型：目标卡 + 打卡表（§7.4）
 * ------------------------------------------------------------------ */

function weeklyCommitOf(goalIntensity) {
  if (goalIntensity < 0.4) return { text: '每周至少 2 次', times: 2 };
  if (goalIntensity <= 0.65) return { text: '每周 4 次', times: 4 };
  return { text: '每周 5 次，每次 ≥2 小时', times: 5 };
}

function deadlineOf(goalText, event) {
  const text = String(goalText || '');
  const m1 = text.match(/(\d{4})\s*[-/年]\s*(\d{1,2})\s*[-/月]\s*(\d{1,2})/);
  if (m1) return `${m1[1]} 年 ${Number(m1[2])} 月 ${Number(m1[3])} 日`;
  const m2 = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
  if (m2) return `${Number(m2[1])} 月 ${Number(m2[2])} 日`;
  const base = event && event.startAt ? new Date(event.startAt).getTime() : Date.now();
  const t = Number.isFinite(base) ? base + 90 * 24 * 3600 * 1000 : Date.now() + 90 * 24 * 3600 * 1000;
  return formatDateText(new Date(t).toISOString(), false);
}

function buildCheckinSheet({ group, event, type, members }) {
  const n = members.length;
  const host = pickHost(members, 'buddy');
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // 配对：按 goalMatch 降序贪心，奇数人时最后一人与 host 互督（§7.4）
  const cands = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      cands.push({ i, j, s: goalMatch(members[i].goalText, members[j].goalText) });
    }
  }
  cands.sort((a, b) => (b.s - a.s)
    || String(members[a.i].userId).localeCompare(String(members[b.i].userId))
    || String(members[a.j].userId).localeCompare(String(members[b.j].userId)));
  const partnerOf = new Map();
  const partnerPairs = [];
  const used = new Set();
  for (const c of cands) {
    if (used.has(c.i) || used.has(c.j)) continue;
    used.add(c.i);
    used.add(c.j);
    partnerOf.set(members[c.i].userId, members[c.j].userId);
    partnerOf.set(members[c.j].userId, members[c.i].userId);
    partnerPairs.push({ a: members[c.i].userId, b: members[c.j].userId, goalMatch: round4(c.s) });
  }
  if (n % 2 === 1) {
    // 奇数人：落单的那位与「主持」互督；如果落单的正是主持，就跟配对里目标最接近的人互督（§7.4）
    const lonely = members.find((m) => !used.has(members.indexOf(m)));
    if (lonely) {
      let partnerId = host.hostId;
      if (!partnerId || partnerId === lonely.userId) {
        const others = members.filter((m) => m.userId !== lonely.userId);
        const best = others
          .map((m) => ({ m, s: goalMatch(lonely.goalText, m.goalText) }))
          .sort((x, y) => (y.s - x.s) || String(x.m.userId).localeCompare(String(y.m.userId)))[0];
        partnerId = best ? best.m.userId : null;
      }
      if (partnerId) {
        const partnerMember = members.find((m) => m.userId === partnerId);
        partnerOf.set(lonely.userId, partnerId);
        // 只在对方还没搭档时回写，避免把已经配好的一对拆散（三人时允许一人被两人盯）
        if (!partnerOf.has(partnerId)) partnerOf.set(partnerId, lonely.userId);
        partnerPairs.push({
          a: lonely.userId,
          b: partnerId,
          goalMatch: round4(goalMatch(lonely.goalText, (partnerMember || {}).goalText || '')),
        });
      }
    }
  }

  const goalCards = members.map((m) => {
    const gi = num(m.profile && m.profile.goalIntensity, 0.4);
    const commit = weeklyCommitOf(gi);
    return {
      userId: m.userId,
      nickname: m.nickname,
      goalText: m.goalText || '（还没写具体目标，现场补一句）',
      deadline: deadlineOf(m.goalText, event),
      weeklyCommit: commit.text,
      weeklyTimes: commit.times,
      blockers: blockersOf(m),
      partnerId: partnerOf.get(m.userId) || null,
    };
  });

  // 打卡表：按 weeklyTimes 从固定起点铺开，起点由 userId 决定（确定性，但每人不同）
  const checkins = members.map((m) => {
    const card = goalCards.find((c) => c.userId === m.userId);
    const times = card ? card.weeklyTimes : 3;
    const start = hashSeed(m.userId) % 7;
    const order = [0, 2, 4, 6, 1, 3, 5];
    const markSet = new Set(order.slice(0, times).map((k) => (k + start) % 7));
    const days = Array.from({ length: 7 }, (_, i) => (markSet.has(i) ? 1 : 0));
    return { userId: m.userId, nickname: m.nickname, days };
  });

  const hostMember = members.find((m) => m.userId === host.hostId) || members[0];
  const stakes = [
    '掉队的人请下一轮奶茶。',
    '谁没打卡，下次开局先讲十分钟为什么。',
    '连续两次不打卡，换一个搭档，不追责。',
  ];
  const stake = stakes[hashSeed(String(group.id || 'g')) % stakes.length];

  return {
    goalCard: {
      userId: hostMember.userId,
      goal: hostMember.goalText || '（组内共同目标还没写，现场补一句）',
      deadline: deadlineOf(hostMember.goalText, event),
      stake,
    },
    goalCards,
    checkins,
    checkinSheet: { days: dayNames, rows: checkins },
    rules: BUDDY_RULES.slice(),
    reviewQuestions: BUDDY_REVIEW.slice(),
    partnerPairs,
    metrics: { memberCount: n, hostId: host.hostId },
  };
}

function blockersOf(m) {
  const text = String(m.goalText || '');
  const words = ['实习', '课程', '期末', '通勤', '手机', '起不来', '加班', '论文'];
  const hit = words.filter((w) => text.includes(w));
  return hit.length ? hit : ['还没写，现场补一句'];
}

/* ------------------------------------------------------------------ *
 * 4. 竞技型：热身 + 赛制（§7.3）
 * ------------------------------------------------------------------ */

/** §7.3 赛制与氛围标签联动表 */
const FORMAT_CN = { king_of_court: '守擂轮换', round_robin: '循环赛', knockout: '单败淘汰' };
const FORMAT_BY_VIBE = [
  { tag: '新手友好局', format: 'king_of_court', rounds: 6, min: 7 },
  { tag: '水平差不多，气氛比输赢重要', format: 'round_robin', rounds: 6, min: 8 },
  { tag: '势均力敌，会打到最后一分', format: 'knockout', rounds: 3, min: 12 },
  { tag: '有人会教，有人会被带', format: 'king_of_court', rounds: 5, min: 10 },
  { tag: '强度偏高，做好出汗准备', format: 'round_robin', rounds: 7, min: 10 },
  { tag: '打完去吃饭', format: 'king_of_court', rounds: 5, min: 8 },
];

function warmupSteps(typeId, hostId) {
  const racket = [
    { step: 1, name: '慢跑绕场', minutes: 2, cue: '别站着聊天，先让身体热起来。' },
    { step: 2, name: '手腕脚踝绕环', minutes: 1, cue: '手腕画圈，脚踝各 20 次。' },
    { step: 3, name: '动态拉伸', minutes: 2, cue: '高抬腿、侧滑步，各两组。' },
    { step: 4, name: '对拉', minutes: 3, cue: '两人一组，先轻后重。' },
    { step: 5, name: '规则宣讲', minutes: 1, cue: '先讲清出界怎么算，避免打起来。' },
  ];
  if (typeId === 'billiards') {
    return [
      { step: 1, name: '空挥 20 板', minutes: 2, cue: '先找手感，别急着进球。' },
      { step: 2, name: '推挡 1 分钟', minutes: 1, cue: '乒乓球先对推，找回节奏。' },
      { step: 3, name: '手腕脚踝绕环', minutes: 1, cue: '手腕画圈，脚踝各 20 次。' },
      { step: 4, name: '试打一局', minutes: 3, cue: '不记分，只找力度。' },
      { step: 5, name: '规则宣讲', minutes: 1, cue: '先讲清黑八和犯规怎么算。' },
    ];
  }
  if (typeId === 'hiking') {
    return [
      { step: 1, name: '原地高抬腿 + 踝关节', minutes: 3, cue: '山路不比操场，脚踝先活动开。' },
      { step: 2, name: '背包检查', minutes: 2, cue: '水、外套、充电宝，缺的现在说。' },
      { step: 3, name: '慢速起步', minutes: 5, cue: '前十分钟按最慢的人的速度走。' },
      { step: 4, name: '队形约定', minutes: 1, cue: '谁走最后，谁负责数人。' },
      { step: 5, name: '下撤点确认', minutes: 1, cue: '说清哪个路口可以中途撤。' },
    ];
  }
  if (typeId === 'gaming') {
    return [
      { step: 1, name: '设备检查', minutes: 2, cue: '耳机、电量、外设，逐个过。' },
      { step: 2, name: '网络确认', minutes: 1, cue: '谁卡先说，别开局才发现。' },
      { step: 3, name: '键位互告', minutes: 2, cue: '报一下各自常玩的位置。' },
      { step: 4, name: '一局热身', minutes: 5, cue: '不计输赢，先跑一遍沟通。' },
      { step: 5, name: '规则宣讲', minutes: 1, cue: '说清这局怎么算赢，别中途改。' },
    ];
  }
  return racket.map((s) => ({ ...s, lead: hostId || null }));
}

/** 圆桌轮转：返回每轮的配对（人数为奇数时有人轮空） */
function circleRounds(ids, roundCount) {
  const arr = ids.slice();
  if (arr.length % 2 === 1) arr.push(null);
  const m = arr.length;
  let seq = arr.slice();
  const out = [];
  for (let r = 0; r < roundCount; r += 1) {
    const matches = [];
    for (let i = 0; i < m / 2; i += 1) {
      const a = seq[i];
      const b = seq[m - 1 - i];
      if (a && b) matches.push({ a, b, court: matches.length + 1 });
    }
    out.push(matches);
    const fixed = seq[0];
    const rest = seq.slice(1);
    rest.unshift(rest.pop());
    seq = [fixed, ...rest];
  }
  return out;
}

function buildTournament({ group, event, type, members }) {
  const n = members.length;
  const vibe = (group.vibe && group.vibe.tag) || group.vibeLabel || predictVibe({ members }, 'competitive').tag;
  const matched = FORMAT_BY_VIBE.find((f) => f.tag === vibe) || FORMAT_BY_VIBE[5];
  // 单败淘汰只适合 4–5 人的短局（§7.3 的例子是 4 人 3 场）；6–8 人的两队局改成按轮次循环
  const format = (matched.format === 'knockout' && n > 5) ? 'round_robin' : matched.format;
  const roundCount = matched.rounds;
  const minutesPerRound = matched.min;
  const teamInfo = computeTeamBalance(members);
  const host = pickHost(members, 'competitive');

  const teams = (teamInfo.teams || []).map((t) => ({
    key: t.key,
    name: t.key === 'A' ? 'A 队' : 'B 队',
    memberIds: t.memberIds,
    avgLevel: t.avgLevel,
  }));

  const rounds = [];
  const ids = members.map((m) => m.userId);
  if (format === 'knockout' && n >= 3) {
    // §7.3：半决赛 + 决赛 = 3 场（4 人）。决赛对手要打完才知道，用 label 占位而不是编造 id。
    const semis = (circleRounds(ids, 1)[0] || []).slice(0, 2);
    rounds.push({
      round: 1, matches: semis, rule: '半决赛，先到 11 分，净胜 2 分', min: minutesPerRound, scoreTo: 11,
    });
    if (semis.length >= 2) {
      rounds.push({
        round: 2,
        matches: [{ a: null, b: null, court: 1, label: '两场半决赛的胜者' }],
        rule: '决赛，先到 11 分，净胜 2 分',
        min: minutesPerRound,
        scoreTo: 11,
      });
    }
  } else if (n <= 5) {
    let rc = roundCount;
    if (format === 'round_robin') {
      // 循环赛按「总场次」定轮数：4 人 6 场 → 3 轮（每轮 2 场），而不是拍脑袋给 6 轮
      const perRound = Math.max(1, Math.floor(n / 2));
      rc = clamp(Math.ceil((n * (n - 1)) / 2 / perRound), 2, 7);
    }
    const pairings = circleRounds(ids, rc);
    pairings.forEach((matches, i) => {
      rounds.push({
        round: i + 1,
        matches,
        rule: format === 'king_of_court'
          ? '输的一方下场，场边队补上'
          : '按轮次计分，先到 11 分',
        min: minutesPerRound,
        scoreTo: 11,
      });
    });
  } else {
    // 6–8 人：分队后每轮各出 3 人（篮球/排球/足球通用），按序号轮换
    const A = teams[0] ? teams[0].memberIds : [];
    const B = teams[1] ? teams[1].memberIds : [];
    for (let r = 0; r < roundCount; r += 1) {
      const picksA = A.filter((_, i) => (i + r) % Math.max(1, A.length) < Math.min(4, A.length)).slice(0, 3);
      const picksB = B.filter((_, i) => (i + r) % Math.max(1, B.length) < Math.min(4, B.length)).slice(0, 3);
      const size = Math.min(picksA.length, picksB.length, 3);
      const matches = [];
      for (let k = 0; k < Math.max(1, size); k += 1) {
        matches.push({ a: picksA[k], b: picksB[k], court: k + 1 });
      }
      rounds.push({
        round: r + 1,
        matches,
        rule: '两队各出 3 人，输的队换人',
        min: minutesPerRound,
        scoreTo: 11,
      });
    }
  }

  // 有人会教、有人会被带 → 第 1 轮设「老手示范局」
  if (matched.tag === '有人会教，有人会被带' && rounds.length) {
    rounds[0].rule = '第 1 轮为老手示范局：进阶的先打一局，其余人看站位';
    rounds[0].min = minutesPerRound + 3;
  }

  const scoring = type.id === 'billiards'
    ? { mode: 'side_out', scoreTo: 5, winBy: 2, cap: 9, note: '一盘定胜负，输的人摆球' }
    : { mode: 'rally', scoreTo: 11, winBy: 2, cap: 15, note: '每球得分，先到 11 分且领先 2 分' };

  const tips = [
    '热身不到位别开打，尤其脚踝和手腕。',
    '有膝踝旧伤提前说，不硬撑。',
    '场上喊人名字，别喊「哎」。',
  ];

  const warmup = warmupSteps(type.id, host.hostId);
  const totalMin = warmup.reduce((s, x) => s + x.minutes, 0);

  return {
    warmup,
    warmupTotalMin: totalMin,
    format,
    formatNote: (format !== matched.format)
      ? `${n} 人两队的局不适合单败淘汰，改成按轮次循环，人人都有上场时间。`
      : (matched.tag === '新手友好局'
        ? '守擂轮换：输了下场，人人有球打，不等场。'
        : '按氛围标签选的赛制，见 rounds 里的 rule。'),
    teams,
    rounds,
    scoring,
    rotationRule: '输的一方下场，场边队补上',
    safetyNote: '热身不到位别开打；有膝踝旧伤提前说。',
    tips,
    levels: members.map((m) => ({ userId: m.userId, level: m.level, levelCn: LEVEL_CN[m.level] || '未填' })),
    teamBalance: teamInfo.value,
    metrics: { memberCount: n, hostId: host.hostId, rounds: rounds.length },
  };
}

/* ------------------------------------------------------------------ *
 * 5. 技能型：互教课程表（§7.5）
 * ------------------------------------------------------------------ */

const OUTPUT_BY_SKILL = [
  [/摄影|拍照|构图|修图|后期/, '每人 3 张对方满意的照片'],
  [/剪辑|视频|成片|vlog/, '一条 15 秒成片'],
  [/吉他|钢琴|尤克里里|和弦|弹唱/, '能弹完 4 个和弦的副歌'],
  [/英语|口语|日语|发音/, '一段 1 分钟自我介绍'],
  [/编程|代码|网页|小程序/, '一个能跑起来的最小页面'],
  [/做饭|下厨|烘焙|咖啡/, '一道能复刻的菜'],
  [/画|素描|水彩|插画/, '一张 20 分钟速写'],
  [/健身|深蹲|训练/, '一套能自己做的热身动作'],
];

function outputOf(skill) {
  const s = String(skill || '');
  for (const [re, out] of OUTPUT_BY_SKILL) if (re.test(s)) return out;
  return '一份 10 条要点的手写笔记';
}

function buildSkillSchedule({ group, event, type, members }) {
  const n = members.length;
  const totalMin = num(type.durationMin ?? type.duration, 120);
  const slotCount = totalMin >= 150 ? 5 : 4;
  const slotMin = slotCount === 5 ? 25 : 25;
  const swapAt = 60;

  // 教↔学配对：按互补度降序贪心，确定性（§6.3.4 / §7.5）
  const cands = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const c = complement(members[i], members[j]);
      if (c <= 0) continue;
      cands.push({ i, j, c });
    }
  }
  cands.sort((a, b) => (b.c - a.c)
    || String(members[a.i].userId).localeCompare(String(members[b.i].userId))
    || String(members[a.j].userId).localeCompare(String(members[b.j].userId)));

  const pairs = [];
  const covered = new Set();
  for (const cand of cands) {
    const a = members[cand.i];
    const b = members[cand.j];
    const aTeachesB = String(a.teachSkill || '') && String(b.learnSkill || '')
      && (a.teachSkill.includes(b.learnSkill.slice(0, 2)) || b.learnSkill.includes(a.teachSkill.slice(0, 2)));
    const teacher = aTeachesB ? a : b;
    const learner = aTeachesB ? b : a;
    const skill = teacher.teachSkill || learner.learnSkill || '各自的拿手事';
    // 一人可同时是某节的 teacher 与另一节的 learner（§7.5）
    if (pairs.some((p) => p.teacherId === teacher.userId && p.skill === skill)) continue;
    pairs.push({
      teacherId: teacher.userId,
      teacherName: teacher.nickname,
      learnerId: learner.userId,
      learnerName: learner.nickname,
      skill,
      minutes: slotMin,
      output: outputOf(skill),
      complement: round4(cand.c),
      // 双向交换 / 单向授课：complement 只有 0.7 时说明只有一边对得上，
      // 页面上的文案要老实说「单向」，不能假装是交换（§6.3.4 语义）
      direction: cand.c >= 0.9 ? 'swap' : 'single',
    });
    covered.add(teacher.userId);
    covered.add(learner.userId);
  }

  // 没被覆盖到的人：安排成「讲十分钟自己的拿手事」，不让谁整场只坐着
  members.forEach((m) => {
    if (covered.has(m.userId)) return;
    const partner = members.find((o) => o.userId !== m.userId && pairs.every((p) => p.learnerId !== o.userId && p.teacherId !== o.userId)) || members.find((o) => o.userId !== m.userId);
    if (!partner) return;
    const skill = m.teachSkill || '自己的拿手事';
    pairs.push({
      teacherId: m.userId,
      teacherName: m.nickname,
      learnerId: partner.userId,
      learnerName: partner.nickname,
      skill,
      minutes: 10,
      output: outputOf(skill),
      complement: round4(complement(m, partner)),
      direction: 'single', // 兜底配对本来就是单向：讲一段自己的拿手事
    });
  });

  const timetable = [];
  for (let i = 0; i < slotCount; i += 1) {
    const p = pairs[i % Math.max(1, pairs.length)];
    const swap = i >= Math.ceil(slotCount / 2);
    const teacher = swap ? p.learnerId : p.teacherId;
    const learner = swap ? p.teacherId : p.learnerId;
    const teacherMember = members.find((m) => m.userId === teacher) || members[0];
    // 互换后由原来的学的人讲「他自己会的那件事」，不是让他讲刚学的（§7.5 角色互换）
    const topic = swap
      ? (teacherMember.teachSkill || p.skill || '拿手事')
      : (p.skill || '拿手事');
    timetable.push({
      slot: i + 1,
      room: `${group.tableNo || 'A1'} 桌`,
      startMin: i * (slotMin + 5),
      durationMin: slotMin,
      teacherId: teacher,
      teacherName: (members.find((m) => m.userId === teacher) || {}).nickname || '',
      learnerId: learner,
      learnerName: (members.find((m) => m.userId === learner) || {}).nickname || '',
      topic,
      output: outputOf(topic),
      phase: swap ? '互换' : '正讲',
    });
  }

  const gear = members.flatMap((m) => (m.gearHave || []));
  const gearNote = gear.length
    ? `自带：${[...new Set(gear)].join('、')}`
    : `自带：${type.needsGear ? '相机 / 电脑，报名时勾过什么就带什么' : '纸笔与手机就够，作品现场拍'}`;

  return {
    pairs,
    timetable,
    swapRound: { enabled: true, atMin: swapAt, note: '到中段角色互换：教的人坐下来学。' },
    rules: SKILL_RULES.slice(),
    materialsNote: gearNote,
    metrics: { memberCount: n, slotCount, slotMin, totalMin },
  };
}

/* ------------------------------------------------------------------ *
 * 6. A4 打印结构（§7.6）——结构化数据，不拼 HTML
 * ------------------------------------------------------------------ */

function buildPrintSheet({ kind, meta, type, event, members, payload }) {
  const toItem = (card, i) => ({
    no: i + 1,
    text: card.text,
    meta: card.kind === 'prompt' ? '提示卡' : (card.intensity ? `强度 ${card.intensity}` : ''),
    ownerId: card.ownerId || null,
  });

  const left = { title: '', blocks: [] };
  const right = { title: '', blocks: [] };

  if (kind === 'topicCards') {
    left.title = '今天的牌';
    // 一副牌 30+ 张，全印出来会撑成 2 页 A4（实测）。纸上只印这一桌当场要用的 12 张：
    // 破冰 4 / 兴趣 5 / 观点 3，其余留在后台题库按需加印。印的是「今晚这桌的牌」，不是题库。
    const CAP = { icebreak: 4, interest: 5, opinion: 3 };
    let printed = 0;
    for (const depth of ['icebreak', 'interest', 'opinion']) {
      const all = payload.deck.filter((c) => c.depth === depth);
      if (!all.length) continue;
      const cards = all.slice(0, CAP[depth]);
      printed += cards.length;
      left.blocks.push({
        type: 'list',
        title: `${DEPTH_LABEL[depth]} · ${DEPTH_NOTE[depth]}（${cards.length} 张）`,
        items: cards.map(toItem),
      });
    }
    left.blocks.push({
      type: 'note',
      text: printed < payload.deck.length
        ? `本页 ${printed} 张，全副 ${payload.deck.length} 张；剩下的在后台题库，按这桌情况加印。${payload.depthNote || ''}`
        : (payload.depthNote || ''),
    });
    right.title = '同桌的人';
    right.blocks.push({
      type: 'cards',
      title: `${members.length} 张身份卡`,
      items: payload.identityCards.map((c) => ({ name: c.nickname, line: c.schoolMajor, bio: c.bio, question: c.question })),
    });
  }

  if (kind === 'checkinSheet') {
    left.title = '这周的安排';
    left.blocks.push({
      type: 'kv',
      title: '本周目标',
      pairs: payload.goalCards.map((c) => ({ k: c.nickname, v: `${c.goalText}｜${c.weeklyCommit}｜截止 ${c.deadline}` })),
    });
    left.blocks.push({
      type: 'table',
      title: '打卡表（自己打勾，没人催）',
      head: ['', ...payload.checkinSheet.days],
      rows: payload.checkinSheet.rows.map((r) => [r.nickname, ...r.days.map((d) => (d ? '○' : ''))]),
    });
    left.blocks.push({ type: 'list', title: '组内 5 条规则', items: payload.rules.map((t, i) => ({ no: i + 1, text: t })) });
    right.title = '互相盯的人';
    right.blocks.push({
      type: 'kv',
      title: '搭档',
      pairs: payload.partnerPairs.map((p) => ({
        k: (members.find((m) => m.userId === p.a) || {}).nickname || p.a,
        v: (members.find((m) => m.userId === p.b) || {}).nickname || p.b,
      })),
    });
    right.blocks.push({
      type: 'list',
      title: '散场前 10 分钟互相问',
      items: payload.reviewQuestions.map((t, i) => ({ no: i + 1, text: t })),
    });
  }

  if (kind === 'tournament') {
    left.title = '今天怎么打';
    left.blocks.push({
      type: 'list',
      title: `热身 ${payload.warmupTotalMin} 分钟（${(members.find((m) => m.userId === payload.metrics.hostId) || {}).nickname || '主持人'} 带）`,
      items: payload.warmup.map((s) => ({ no: s.step, text: `${s.name} · ${s.minutes} 分钟`, meta: s.cue })),
    });
    left.blocks.push({
      type: 'table',
      title: `赛制：${FORMAT_CN[payload.format] || payload.format}（${payload.formatNote}）`,
      head: ['轮', '对阵', '时长'],
      rows: payload.rounds.map((r) => [
        String(r.round),
        r.matches.map((m) => (m.label
          ? m.label
          : `${(members.find((x) => x.userId === m.a) || {}).nickname || m.a} vs ${(members.find((x) => x.userId === m.b) || {}).nickname || m.b}`)).join('　'),
        `${r.min} 分钟`,
      ]),
    });
    right.title = '分队与计分';
    right.blocks.push({
      type: 'kv',
      title: '分队（蛇形，实力均衡）',
      pairs: payload.teams.map((t) => ({
        k: t.name,
        v: t.memberIds.map((id) => (members.find((m) => m.userId === id) || {}).nickname || id).join('、'),
      })),
    });
    right.blocks.push({ type: 'kv', title: '计分', pairs: [{ k: '赛制', v: `${payload.scoring.mode}，先到 ${payload.scoring.scoreTo} 分，净胜 ${payload.scoring.winBy} 分，封顶 ${payload.scoring.cap}` }] });
    right.blocks.push({ type: 'list', title: '注意', items: payload.tips.map((t, i) => ({ no: i + 1, text: t })) });
  }

  if (kind === 'skillSchedule') {
    left.title = '今天的课表';
    left.blocks.push({
      type: 'table',
      title: `每人一节，${payload.metrics.slotMin} 分钟`,
      head: ['节', '谁教', '谁学', '内容'],
      rows: payload.timetable.map((s) => [String(s.slot), s.teacherName, s.learnerName, `${s.topic}｜产出：${s.output}`]),
    });
    left.blocks.push({ type: 'note', text: payload.swapRound.note });
    right.title = '能配上的人';
    right.blocks.push({
      type: 'list',
      title: `${payload.pairs.length} 对`,
      items: payload.pairs.map((p, i) => ({ no: i + 1, text: `${p.teacherName} → ${p.learnerName}：${p.skill}`, meta: `产出：${p.output}` })),
    });
    right.blocks.push({ type: 'list', title: '规则', items: payload.rules.map((t, i) => ({ no: i + 1, text: t })) });
  }

  return {
    page: { size: 'A4', orientation: 'portrait', margin: '12mm 10mm', columns: '58/42' },
    header: {
      brand: '不熟局 BU SHU',
      activityLine: `${type.name || '不熟局'} · ${meta.dateText}`,
      groupNo: meta.groupNo,
      campusLine: `${meta.campus} · ${meta.venue}`,
      code: `CODE: ${meta.groupNo}-${meta.codeText}`,
      qr: { w: 80, h: 80, text: `${meta.groupNo}-${meta.codeText}` },
    },
    left,
    right,
    footer: {
      lines: [
        '紧急反馈：扫码或找现场负责人',
        '规则摘要：手机静音 / 到点开始 / 中途离开说一声 / 不问成绩 / 散场前 10 分钟复盘',
      ],
      tagline: TAGLINE,
      note: '本页由后台导出',
      codeText: `CODE: ${meta.groupNo}-${meta.codeText}`,
      page: '第 1 页 / 共 1 页',
    },
  };
}

/* ------------------------------------------------------------------ *
 * 7. 入口
 * ------------------------------------------------------------------ */

/**
 * 生成一组物料。
 * @param {object} input { group, event, activityType, users, applications, bank?, venue? }
 * @returns {{kind:string, specKind:string, title:string, subtitle:string,
 *            meta:object, payload:object, printSheet:object}}
 */
export function buildMaterial(input = {}) {
  const group = input.group || {};
  const event = input.event || {};
  const type = input.activityType || {};
  const users = Array.isArray(input.users) ? input.users : [];
  const applications = Array.isArray(input.applications) ? input.applications : [];
  const venue = input.venue || null;

  const category = type.category || type.matchProfile || group.category || 'social';
  const kind = MATERIAL_KIND[category] || 'topicCards';
  const members = resolveMembers(group, users, applications, type);
  const bank = normalizeBank(input.bank);

  const groupNo = group.tableNo || String(group.name || 'A1').replace(/\s/g, '') || 'A1';
  const dateText = formatDateText(event.startAt);
  const campus = event.campus || group.campus || (members[0] && members[0].campus) || '大学城';
  const venueName = (venue && venue.name) || group.venueName || event.venueName || '地点待定';
  const codeText = String(group.checkinCode || deterministicCode(`${group.id || 'g'}:${groupNo}`));

  const meta = {
    campus,
    venue: venueName,
    groupNo,
    dateText,
    codeText,
    // 下面几项是 §7.1 payload.meta 的补充，方便页面复用
    groupId: group.id || null,
    eventTitle: event.title || '',
    activityName: type.name || '',
    durationMin: num(type.durationMin ?? type.duration, 120),
    memberCount: members.length,
    version: num(input.version, 1),
  };

  let payload;
  if (kind === 'topicCards') payload = buildTopicCards({ group, event, type, members, bank });
  else if (kind === 'checkinSheet') payload = buildCheckinSheet({ group, event, type, members });
  else if (kind === 'tournament') payload = buildTournament({ group, event, type, members });
  else payload = buildSkillSchedule({ group, event, type, members });

  const titleMap = {
    topicCards: `${members.length} 个人，一副牌`,
    checkinSheet: '目标卡与打卡表',
    tournament: '今天的赛制',
    skillSchedule: '互教课程表',
  };
  const subtitleMap = {
    topicCards: '由浅到深，想跳就跳，没人会问为什么。',
    checkinSheet: '每 45 分钟打一次卡，打不上也没人说你。',
    tournament: `热身 ${payload.warmupTotalMin || 0} 分钟，${(payload.rounds || []).length} 轮，${FORMAT_CN[payload.format] || payload.format || ''}。`,
    skillSchedule: `每人一节，${(payload.timetable || []).length} 节，节间互换。`,
  };

  return {
    kind,
    specKind: SPEC_MATERIAL_KIND[kind],
    title: titleMap[kind],
    subtitle: subtitleMap[kind],
    meta,
    payload,
    printSheet: buildPrintSheet({ kind, meta, type, event, members, payload }),
  };
}

/** 便利导出：页面预判物料类型用 */
export function materialKindOf(activityType) {
  const category = (activityType && (activityType.category || activityType.matchProfile)) || 'social';
  return MATERIAL_KIND[category] || 'topicCards';
}
