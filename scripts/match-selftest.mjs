/**
 * 匹配引擎 + 物料生成 自测脚本（无依赖，直接 node 跑）
 *
 *   node scripts/match-selftest.mjs
 *
 * 覆盖：4 种局型（social / buddy / competitive / skill），12 个假用户，
 * 打印分组结果、硬约束、加权拆解、四种物料的前 3 条，并验证「同输入同输出」。
 * 退出码 0 = 全部通过。
 */

import {
  buildGroups,
  validateGroup,
  explainScore,
  deriveTraits,
  resolvePairFloor,
  BANNED_REASON_PHRASES,
  BANNED_DISTANCE_WORDS,
  WEIGHTS,
  QUALITY_FLOOR,
  PAIR_FLOOR,
} from '../src/lib/match.js';
import { buildMaterial } from '../src/lib/materials.js';
import { activityTypeMap } from '../src/data/activityTypes.js';
import { users as seedUsers, userMap as seedUserMap } from '../src/data/users.js';
import { applicantIds } from '../src/data/events.js';

/* ------------------------------------------------------------------ *
 * 1. 12 个假用户（覆盖 10 校、4 门类、两种段位）
 * ------------------------------------------------------------------ */

const P = (socialEnergy, expressiveness, openness, chrono, goalIntensity, privacyBoundary) => ({
  socialEnergy, expressiveness, openness, chrono, goalIntensity, privacyBoundary, skillLevels: {}, source: 'rule',
});

const U = (id, nickname, school, grade, major, gender, age, interestTags, profile) => ({
  id,
  nickname,
  school,
  grade,
  major,
  gender,
  age,
  campus: school,
  interestTags,
  verifyStatus: 'verified',
  blacklisted: false,
  role: 'student',
  profile,
});

const users = [
  U('u_001', '林一', '中山大学', 'freshman', '新闻传播', 'f', 19, ['电影', '探店', '城市观察', '吃喝'],
    P(0.72, 0.80, 0.70, 0.5, 0.30, 0.2)),
  U('u_002', '陈默', '华南理工大学', 'junior', '计算机', 'm', 21, ['游戏', '运动', '考研', '探店'],
    P(0.35, 0.30, 0.55, 0.8, 0.70, 0.5)),
  U('u_003', '苏晴', '广州美术学院', 'sophomore', '视觉传达', 'f', 20, ['展览', '摄影', '探店', '电影'],
    P(0.55, 0.60, 0.85, 0.5, 0.40, 0.2)),
  U('u_004', '何岸', '广东工业大学', 'postgrad', '材料', 'm', 24, ['考研', '科研', '羽毛球'],
    P(0.30, 0.25, 0.45, 0.5, 0.90, 0.85)),
  U('u_005', '周野', '广东外语外贸大学', 'sophomore', '商务英语', 'm', 20, ['旅行', '探店', '电影', '吃喝'],
    P(0.65, 0.62, 0.60, 0.8, 0.35, 0.2)),
  U('u_006', '张可', '华南师范大学', 'freshman', '心理学', 'f', 19, ['电影', '建筑', '探店', '吃喝'],
    P(0.50, 0.60, 0.65, 0.5, 0.45, 0.5)),
  U('u_007', '郑一', '广州大学', 'junior', '机械', 'm', 21, ['羽毛球', '探店', '运动', '动漫'],
    P(0.45, 0.50, 0.40, 0.5, 0.65, 0.5)),
  U('u_008', '吴岚', '广州中医药大学', 'sophomore', '护理', 'f', 20, ['羽毛球', '健身', '运动'],
    P(0.40, 0.35, 0.50, 0.8, 0.55, 0.5)),
  U('u_009', '李默', '星海音乐学院', 'senior', '音乐教育', 'm', 22, ['运动', '电影', '探店', '音乐'],
    P(0.60, 0.65, 0.75, 0.5, 0.60, 0.2)),
  U('u_010', '孙宇', '广东药科大学', 'freshman', '药学', 'm', 19, ['羽毛球', '游戏', '运动', '探店'],
    P(0.30, 0.30, 0.55, 0.5, 0.35, 0.5)),
  U('u_011', '沈舟', '中山大学', 'junior', '数学', 'f', 21, ['羽毛球', '摄影', '运动', '探店'],
    P(0.50, 0.62, 0.60, 0.5, 0.60, 0.5)),
  U('u_012', '罗鱼', '广州美术学院', 'junior', '摄影', 'f', 21, ['摄影', '展览', '探店', '电影'],
    P(0.55, 0.48, 0.80, 0.8, 0.50, 0.2)),
];

/* ------------------------------------------------------------------ *
 * 2. 四场局 + 报名答卷
 * ------------------------------------------------------------------ */

const A = (eventId, userId, extra) => ({
  id: `a_${eventId}_${userId}`,
  eventId,
  userId,
  activityTypeId: extra.activityTypeId,
  status: 'submitted',
  groupId: null,
  waitlistRank: null,
  shareContact: true,
  submittedAt: extra.submittedAt,
  answers: {
    selfDesc: extra.selfDesc || '话不算多，聊到具体的事能说一会儿。',
    wantMeet: extra.wantMeet || '想认识不用很熟也能一起出门的人。',
    recentState: extra.recentState || '这周作业刚交完，想出去走走。',
    topicsWanted: extra.topicsWanted || [],
    privacyLevel: extra.privacyLevel || 'mid',
    levelChoice: extra.levelChoice ?? null,
    gearHave: extra.gearHave || [],
    goalText: extra.goalText || '',
    availableSlots: extra.availableSlots || [],
    teachSkill: extra.teachSkill || '',
    learnSkill: extra.learnSkill || '',
    questionsAsked: extra.questionsAsked || ['你最近一次觉得「活着真好」是什么时候？'],
    contactChannel: 'none',
    agreePrivacy: true,
    agreeNoPromise: true,
  },
});

const dinnerApps = [
  A('e_2601', 'u_001', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T02:00:00.000Z',
    selfDesc: '话不算多，但聊到喜欢的乐队会突然说很多，一晚上能安利三首歌。',
    wantMeet: '想认识会去看展的人，不用很熟也能一起出门。',
    recentState: '刚考完一门，周末想出去走走，憋坏了。',
    topicsWanted: ['电影', '吃喝'], privacyLevel: 'low',
    questionsAsked: ['你最近一次觉得「活着真好」是什么时候？'],
  }),
  A('e_2601', 'u_002', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T03:10:00.000Z',
    selfDesc: '我比较慢热，人多的时候基本不说话，但一对一能聊。',
    wantMeet: '想找能一起打游戏的人，不用天天约。',
    recentState: '在准备考研，想认识人但又怕耽误时间。',
    topicsWanted: ['游戏', '运动'],
    questionsAsked: ['你上一次通宵是为了什么？'],
  }),
  A('e_2601', 'u_003', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T04:20:00.000Z',
    selfDesc: '喜欢看展和拍照，话不算多，但讲到画面会停不下来，能讲五分钟。',
    wantMeet: '想认识会一起看展的人，最好也不爱说话。',
    recentState: '毕业展快到了，想找人一起去看。',
    topicsWanted: ['展览', '摄影'], privacyLevel: 'low',
    questionsAsked: ['你手机相册里最多的是哪一类照片？'],
  }),
  A('e_2601', 'u_005', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T05:30:00.000Z',
    selfDesc: '爱说话，能连着讲，也爱听别人讲，组局基本都是我张罗。',
    wantMeet: '想认识吃饭不拍照、专心说话的人。',
    recentState: '刚结束一段实习，想认识点新朋友。',
    topicsWanted: ['旅行', '吃喝'], privacyLevel: 'low',
    questionsAsked: ['你带外地朋友去的第一家店是哪家？'],
  }),
  A('e_2601', 'u_006', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T06:40:00.000Z',
    selfDesc: '正常聊天没问题，喜欢听人讲自己的事，偶尔补一句。',
    wantMeet: '想认识愿意聊具体生活的人。',
    recentState: '最近在读建筑史，想找人说这个。',
    topicsWanted: ['电影', '吃喝'],
    questionsAsked: ['你最近一次笑出声是在哪？'],
  }),
  A('e_2601', 'u_007', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T07:50:00.000Z',
    selfDesc: '打球的时候话多，吃饭的时候话少，习惯先听。',
    wantMeet: '想认识能一起运动的人。',
    recentState: '每周打两次球，想找固定的球搭子。',
    topicsWanted: ['运动', '游戏'],
    questionsAsked: ['你上一次真的跑起来是什么时候？'],
  }),
  A('e_2601', 'u_009', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T08:00:00.000Z',
    selfDesc: '学音乐的，话不少，爱讲和爱唱，能连讲五分钟。',
    wantMeet: '想认识会听现场的人，不用懂乐理。',
    recentState: '刚演完一场，想放松一下。',
    topicsWanted: ['音乐', '电影'], privacyLevel: 'low',
    questionsAsked: ['你最近循环的那首歌是什么？'],
  }),
  A('e_2601', 'u_010', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T09:10:00.000Z',
    selfDesc: '社恐，人一多就不太会说话，安静坐着那种。',
    wantMeet: '想认识不逼我说话的人。',
    recentState: '刚开学，还没认识几个人。',
    topicsWanted: ['运动', '游戏'],
    questionsAsked: ['你的宿舍几点断电？'],
  }),
  A('e_2601', 'u_011', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T10:20:00.000Z',
    selfDesc: '学数学的，喜欢拍照，话正常多，遇到感兴趣的话题会讲很久。',
    wantMeet: '想认识能一起扫街拍照的人。',
    recentState: '想出去走走，换个环境。',
    topicsWanted: ['运动', '摄影'],
    questionsAsked: ['你最近拍的一张照片是什么？'],
  }),
  A('e_2601', 'u_012', {
    activityTypeId: 'dinner', submittedAt: '2025-04-01T11:30:00.000Z',
    selfDesc: '拍照的人，习惯先看再说话，熟了之后话会变多。',
    wantMeet: '想认识不急着说话的人。',
    recentState: '在拍一组校园的照片，想找人一起走。',
    topicsWanted: ['摄影', '展览'], privacyLevel: 'low',
    questionsAsked: ['你想在这座岛上留下点什么？'],
  }),
];

const examApps = [
  A('e_2602', 'u_002', {
    activityTypeId: 'exam', submittedAt: '2025-04-02T02:00:00.000Z',
    selfDesc: '一个人自习容易走神，想找人互相盯着。',
    wantMeet: '想找考同一场的人，能对进度。',
    recentState: '每天在图书馆坐到闭馆。',
    goalText: '考研数学，每天三小时刷题，目标 12 月上岸',
    availableSlots: ['mon-pm', 'tue-pm', 'wed-pm', 'thu-pm'],
    questionsAsked: ['你一天里效率最高的是哪两个小时？'],
  }),
  A('e_2602', 'u_004', {
    activityTypeId: 'exam', submittedAt: '2025-04-02T03:00:00.000Z',
    selfDesc: '话少，坐下来就能看进去，不太会主动开口。',
    wantMeet: '想找不聊天、各看各的人。',
    recentState: '二战，时间比什么都紧。',
    goalText: '考研材料，每天固定两小时，周末四小时，一定要上岸',
    availableSlots: ['mon-pm', 'tue-pm', 'wed-pm'],
    privacyLevel: 'high',
    questionsAsked: ['你卡在一道题上多久会放弃？'],
  }),
  A('e_2602', 'u_011', {
    activityTypeId: 'exam', submittedAt: '2025-04-02T04:00:00.000Z',
    selfDesc: '学数学的，喜欢把进度写在便签上，话不算多但愿意问。',
    wantMeet: '想找进度差不多的人，互相问不会尴尬。',
    recentState: '刚开始第二轮，需要有人对答案。',
    goalText: '考研数学，每周四次要刷完一章，坚持到 12 月',
    availableSlots: ['mon-pm', 'wed-pm', 'thu-pm', 'sat-am'],
    questionsAsked: ['你复习的时候手机放哪？'],
  }),
];

const badmintonApps = [
  A('e_2603', 'u_007', {
    activityTypeId: 'badminton', submittedAt: '2025-04-03T02:00:00.000Z', levelChoice: 'beginner',
    selfDesc: '能连续接三个，发球基本不失误，打球的时候会喊人。',
    wantMeet: '想找水平差不多、不嫌我菜的人。',
    recentState: '一周打两次，想加一场。',
    topicsWanted: ['运动', '游戏'],
    questionsAsked: ['输球和坐冷板凳，你更受不了哪个？'],
  }),
  A('e_2603', 'u_008', {
    activityTypeId: 'badminton', submittedAt: '2025-04-03T03:00:00.000Z', levelChoice: 'beginner',
    selfDesc: '打球一般，但愿意跑，不太会抱怨搭档。',
    wantMeet: '想找不吼人的搭档。',
    recentState: '想动一动，最近坐太久了。',
    topicsWanted: ['运动'],
    questionsAsked: ['你上一次出汗是什么时候？'],
  }),
  A('e_2603', 'u_010', {
    activityTypeId: 'badminton', submittedAt: '2025-04-03T04:00:00.000Z', levelChoice: 'rookie',
    selfDesc: '刚学会发球，接不住会笑，不太会主动说话。',
    wantMeet: '想找不嫌我菜的人，最好愿意教两下。',
    recentState: '体育课选了羽毛球，想补练。',
    topicsWanted: ['运动', '游戏'],
    questionsAsked: ['你第一次打球是什么时候？'],
  }),
  A('e_2603', 'u_011', {
    activityTypeId: 'badminton', submittedAt: '2025-04-03T05:00:00.000Z', levelChoice: 'beginner',
    selfDesc: '会发球能接三个，喜欢打完去吃饭，场上会主动报比分。',
    wantMeet: '想找打完愿意一起吃个饭的人。',
    recentState: '每周三晚上有空，想固定下来。',
    topicsWanted: ['运动', '摄影'],
    questionsAsked: ['你打球最讨厌队友做什么？'],
  }),
];

const skillApps = [
  A('e_2604', 'u_003', {
    activityTypeId: 'skillswap', submittedAt: '2025-04-04T02:00:00.000Z',
    selfDesc: '会修图会调色，想学吉他，能讲清楚为什么这么裁。',
    wantMeet: '想认识愿意交换、不白拿教程的人。',
    recentState: '想把手上的照片整理成一组。',
    topicsWanted: ['摄影', '展览'],
    teachSkill: '摄影后期', learnSkill: '吉他', gearHave: ['相机', '电脑'],
    questionsAsked: ['你能在十分钟内教会别人什么？'],
  }),
  A('e_2604', 'u_009', {
    activityTypeId: 'skillswap', submittedAt: '2025-04-04T03:00:00.000Z',
    selfDesc: '弹了六年吉他，能带人弹完一首副歌，表达没问题。',
    wantMeet: '想认识能教我剪视频的人。',
    recentState: '想把演出片段剪成一条片子。',
    topicsWanted: ['音乐', '电影'],
    teachSkill: '吉他弹唱', learnSkill: '视频剪辑', gearHave: ['吉他'],
    questionsAsked: ['你学东西靠看视频还是靠人带？'],
  }),
  A('e_2604', 'u_012', {
    activityTypeId: 'skillswap', submittedAt: '2025-04-04T04:00:00.000Z',
    selfDesc: '剪过几条 vlog，构图还在学，话不多但愿意动手做。',
    wantMeet: '想认识能讲清构图的人。',
    recentState: '手上有一条素材放了两个月。',
    topicsWanted: ['摄影', '展览'],
    teachSkill: '视频剪辑', learnSkill: '摄影构图', gearHave: ['电脑'],
    questionsAsked: ['你剪片最先删掉的是什么？'],
  }),
  A('e_2604', 'u_005', {
    activityTypeId: 'skillswap', submittedAt: '2025-04-04T05:00:00.000Z',
    selfDesc: '英语口语还行，敢开口，愿意一句一句带人练。',
    wantMeet: '想认识会拍照的人，帮我拍一组头像。',
    recentState: '在准备一个英文面试。',
    topicsWanted: ['旅行', '吃喝'],
    teachSkill: '英语口语', learnSkill: '摄影构图',
    questionsAsked: ['你愿意用多久换一门技能？'],
  }),
];

const genderRule = { enabled: true, minFemaleRatio: 0.25, maxSameGenderRatio: 0.75, highPrivacyCap: 1 };

const scenarios = [
  {
    key: 'social',
    event: {
      id: 'e_2601', activityTypeId: 'dinner', title: '周三晚饭局 · 大学城', campus: '大学城公共',
      startAt: '2025-04-09T11:30:00.000Z', endAt: '2025-04-09T13:30:00.000Z',
      status: 'matching', capacityGroups: 2, capacityPerGroup: 6, minGroupSize: 5,
      schoolCap: 2, genderRule, price: 45, priceMode: 'aa', venuePoolIds: ['v_006'],
    },
    applications: dinnerApps,
    venue: { id: 'v_006', name: '贝岗美食街', campus: '大学城公共' },
  },
  {
    key: 'buddy',
    event: {
      id: 'e_2602', activityTypeId: 'exam', title: '考研搭子 · 周三下午', campus: '大学城公共',
      startAt: '2025-04-09T06:00:00.000Z', endAt: '2025-04-09T08:00:00.000Z',
      status: 'matching', capacityGroups: 1, capacityPerGroup: 4, minGroupSize: 3,
      schoolCap: 2, genderRule, price: 0, priceMode: 'fixed', venuePoolIds: ['v_011'],
    },
    applications: examApps,
    venue: { id: 'v_011', name: '广工图书馆研讨室', campus: '广东工业大学' },
  },
  {
    key: 'competitive',
    event: {
      id: 'e_2603', activityTypeId: 'badminton', title: '羽毛球 · 周日下午', campus: '大学城公共',
      startAt: '2025-04-13T08:00:00.000Z', endAt: '2025-04-13T09:30:00.000Z',
      status: 'matching', capacityGroups: 1, capacityPerGroup: 4, minGroupSize: 4,
      schoolCap: 2, genderRule, price: 35, priceMode: 'aa', venuePoolIds: ['v_003'],
    },
    applications: badmintonApps,
    venue: { id: 'v_003', name: '大学城体育中心', campus: '大学城公共' },
  },
  {
    key: 'skill',
    event: {
      id: 'e_2604', activityTypeId: 'skillswap', title: '技能交换 · 周五晚', campus: '大学城公共',
      startAt: '2025-04-11T11:00:00.000Z', endAt: '2025-04-11T13:00:00.000Z',
      status: 'matching', capacityGroups: 1, capacityPerGroup: 6, minGroupSize: 4,
      schoolCap: 2, genderRule, price: 0, priceMode: 'fixed', venuePoolIds: ['v_010'],
    },
    applications: skillApps,
    venue: { id: 'v_010', name: '华工西湖苑', campus: '华南理工大学' },
  },
];

/* ------------------------------------------------------------------ *
 * 3. 打印工具
 * ------------------------------------------------------------------ */

const line = (ch = '─', n = 72) => ch.repeat(n);
const h1 = (t) => { console.log(`\n${line('═')}\n${t}\n${line('═')}`); };
const h2 = (t) => { console.log(`\n${line()}\n${t}\n${line()}`); };
const n4 = (x) => Number(x).toFixed(4);

let failures = 0;
function check(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { console.log(`  ✗ ${msg}`); failures += 1; }
}

/* ------------------------------------------------------------------ *
 * 4. 开跑
 * ------------------------------------------------------------------ */

console.log('不熟局 · 匹配引擎自测');
console.log(`QUALITY_FLOOR=${QUALITY_FLOOR}  PAIR_FLOOR=${PAIR_FLOOR}`);

h1('0. 权重自检（site-spec §6.3，加总必须为 1）');
for (const [cat, w] of Object.entries(WEIGHTS)) {
  const sum = Object.values(w).reduce((s, v) => s + v, 0);
  console.log(`  ${cat.padEnd(12)} ${Object.entries(w).map(([k, v]) => `${k}:${v.toFixed(2)}`).join('  ')}`);
  console.log(`  ${''.padEnd(12)} 合计 ${sum.toFixed(4)}${cat === 'competitive' ? '（单对项 0.84 + 组级 teamBalance 0.16 = 1.00）' : ''}`);
  check(Math.abs(sum - (cat === 'competitive' ? 0.84 : 1)) < 1e-9, `${cat} 权重合计正确`);
}

h1('0b. deriveTraits 规则推导（只给 answers，不给 profile）');
const passiveAnswers = {
  selfDesc: '我比较慢热，人一多就不太会说话，但聊到喜欢的乐队会讲很久，能安利一整晚。',
  wantMeet: '想认识什么都想试的人。',
  recentState: '刚考完试，憋坏了，想出去走走。',
  topicsWanted: ['电影', '运动'],
  goalText: '考研，每天三套题，坚持到 12 月一定要上岸',
  availableSlots: ['mon-pm', 'tue-pm', 'wed-pm', 'thu-pm'],
  questionsAsked: ['你最近一次觉得「活着真好」是什么时候？'],
  privacyLevel: 'mid',
};
const activeAnswers = {
  ...passiveAnswers,
  selfDesc: '我比较主动，喜欢组局张罗，会主动搭话，话多也能聊，能连着讲。',
};
const derived = deriveTraits(passiveAnswers);
const derivedActive = deriveTraits(activeAnswers);
console.log('  慢热版：', JSON.stringify(derived));
console.log('  主动版：', JSON.stringify(derivedActive));
check(derived.socialEnergy < derivedActive.socialEnergy,
  `主动词把社交能量从 ${derived.socialEnergy} 抬到 ${derivedActive.socialEnergy}`);
check(derived.socialEnergy < 0.6, `慢热 + 高隐私压低了社交能量（${derived.socialEnergy} < 0.60）`);
check(derived.goalIntensity >= 0.65, `「每天/坚持/上岸」把 goalIntensity 顶到 ${derived.goalIntensity}`);
check(derived.derivedTags.length >= 2, `派生标签给了 ${derived.derivedTags.join('/')}`);

const allResults = [];

for (const sc of scenarios) {
  const type = activityTypeMap[sc.event.activityTypeId];
  const result = buildGroups({
    event: sc.event,
    applications: sc.applications,
    users,
    activityType: type,
    config: {},
  });
  allResults.push({ sc, type, result });

  h1(`${sc.key} 局 · ${type.name}（${sc.applications.length} 人报名 / 最多 ${sc.event.capacityGroups} 桌）`);
  console.log(result.notes.map((x) => `  · ${x}`).join('\n'));

  if (!result.groups.length) {
    console.log('  ⚠ 没有成组');
    failures += 1;
    continue;
  }

  result.groups.forEach((g) => {
    const names = g.memberIds.map((id) => (users.find((u) => u.id === id) || {}).nickname).join(' / ');
    console.log(`\n  【${g.name}】${g.tableNo} · ${g.memberIds.length} 人 · 组分数 ${n4(g.matchScore)}`);
    console.log(`    成员　${names}`);
    console.log(`    理由　${g.reason}`);
    console.log(`    氛围　「${g.vibe.tag}」——${g.vibe.note}`);
    console.log(`    主持　${(users.find((u) => u.id === g.hostId) || {}).nickname}　签到码 ${g.checkinCode}`);

    const pairDetail = explainScore({ members: g.members }, g.category);
    const pairScores = pairDetail.pairs.map((p) => p.score);
    console.log(`    组内单对分　最低 ${n4(Math.min(...pairScores))} / 最高 ${n4(Math.max(...pairScores))} / 均值 ${n4(pairDetail.meanPair)}`);

    // 硬约束
    const v = validateGroup({ members: g.members, category: g.category }, {
      event: sc.event, activityType: type, users, applications: sc.applications,
    });
    if (v.ok) {
      console.log(`    硬约束　通过（C1–C11 全过，复核分 ${n4(v.score)}）`);
    } else {
      console.log(`    硬约束　违反 ${v.violated.map((x) => `${x.code}${x.label}(${x.detail})`).join('；')}`);
      failures += 1;
    }
    // 单独复核两条最关键的
    const gender = g.members.map((m) => m.gender);
    const female = gender.filter((x) => x === 'female').length;
    console.log(`    性别复核　女 ${female} / 男 ${gender.filter((x) => x === 'male').length}（单一性别占 ${Math.round((Math.max(female, gender.length - female) / gender.length) * 100)}%）`);
    const xs = g.members.map((m) => m.profile.expressiveness);
    console.log(`    内外向　表达欲 ${xs.map((x) => n4(x)).join(' / ')}（max-min=${n4(Math.max(...xs) - Math.min(...xs))}）`);
  });

  // 加权拆解（只打第一组，便于看结构）
  const first = result.groups[0];
  const exp = explainScore({ members: first.members }, first.category);
  h2(`${sc.key} · ${first.name} 的加权拆解`);
  exp.terms.forEach((t) => {
    console.log(`    ${t.label.padEnd(6, '　')} 权重 ${t.weight.toFixed(2)} × 均值 ${n4(t.meanRaw)} = ${n4(t.contribution)}`);
  });
  if (exp.teamBalance) console.log(`    分队均衡(组级) 权重 0.16 × ${n4(exp.teamBalance.value)} = ${n4(exp.teamBalance.value * 0.16)}`);
  console.log(`    base ${n4(exp.base)} + bonus ${n4(exp.bonus)} - penalty ${n4(exp.penalty)} = ${n4(exp.total)}`);
  if (exp.penalties.length) {
    exp.penalties.forEach((p) => console.log(`    惩罚　${p.label} −${n4(p.amount)}（${p.detail}）`));
  } else {
    console.log('    惩罚　无');
  }

  // 物料
  const g0 = result.groups[0];
  const mat = buildMaterial({
    group: g0,
    event: sc.event,
    activityType: type,
    users,
    applications: sc.applications,
    venue: sc.venue,
  });

  h2(`${sc.key} · 物料（${mat.kind} / specKind=${mat.specKind}）—— ${mat.title}`);
  console.log(`    meta　${mat.meta.campus} · ${mat.meta.venue} · ${mat.meta.groupNo} · ${mat.meta.dateText} · CODE ${mat.meta.codeText}`);
  console.log(`    副句　${mat.subtitle}`);

  if (mat.kind === 'topicCards') {
    mat.payload.flow.forEach((f) => console.log(`    段　${f.phase} ${f.count} 题（${f.note}）`));
    console.log(`    共 ${mat.payload.deck.length} 张牌，前 3 张：`);
    mat.payload.deck.slice(0, 3).forEach((c) => console.log(`      [${c.depth}${c.kind === 'prompt' ? '/提示' : ''}] ${c.text}`));
    const idc = mat.payload.identityCards[0];
    console.log(`    身份卡示例：${idc.nickname}｜${idc.schoolMajor}｜${idc.bio}`);
    console.log(`    depthNote：${mat.payload.depthNote}`);
    check(mat.payload.deck.length >= 20, `题量 ${mat.payload.deck.length} ≥ 20（后台预警线）`);
    check(mat.payload.identityCards.length === g0.members.length, '身份卡数量与组员一致');
  }

  if (mat.kind === 'checkinSheet') {
    console.log(`    目标卡（host）：${mat.payload.goalCard.goal}｜截止 ${mat.payload.goalCard.deadline}｜${mat.payload.goalCard.stake}`);
    mat.payload.goalCards.slice(0, 3).forEach((c) => console.log(`      ${c.nickname}：${c.goalText}｜${c.weeklyCommit}｜搭档 ${c.partnerId}`));
    console.log(`    打卡行：${mat.payload.checkins.map((c) => `${c.nickname}[${c.days.join('')}]`).join(' ')}`);
    console.log(`    规则：${mat.payload.rules[0]}`);
    check(mat.payload.checkins.every((c) => c.days.length === 7), '每人 7 天打卡位');
    check(mat.payload.partnerPairs.length >= Math.floor(g0.members.length / 2), '搭档配对数量正确');
  }

  if (mat.kind === 'tournament') {
    console.log(`    赛制：${mat.payload.format}（${mat.payload.formatNote}）热身 ${mat.payload.warmupTotalMin} 分钟`);
    mat.payload.warmup.slice(0, 3).forEach((s) => console.log(`      ${s.step}. ${s.name} ${s.minutes} 分钟 — ${s.cue}`));
    const r0 = mat.payload.rounds[0];
    console.log(`    第 1 轮：${r0.matches.map((m) => (m.label ? m.label : `${(users.find((u) => u.id === m.a) || {}).nickname} vs ${(users.find((u) => u.id === m.b) || {}).nickname}（${m.court} 号场）`)).join('；')}`);
    console.log(`    分队：${mat.payload.teams.map((t) => `${t.name}[${t.memberIds.join(',')}]`).join('  ')}　均衡 ${mat.payload.teamBalance}`);
    check(mat.payload.rounds.length > 0, `赛制轮次 ${mat.payload.rounds.length} 轮`);
    check(mat.payload.scoring.scoreTo === 11 || mat.payload.scoring.scoreTo === 5, '计分规则有明确分制');
  }

  if (mat.kind === 'skillSchedule') {
    mat.payload.pairs.slice(0, 3).forEach((p) => console.log(`      配对：${p.teacherName} 教 ${p.learnerName}「${p.skill}」→ ${p.output}`));
    mat.payload.timetable.slice(0, 3).forEach((s) => console.log(`      第 ${s.slot} 节 ${s.startMin} 分起 ${s.durationMin} 分钟｜${s.teacherName} → ${s.learnerName}｜${s.topic}｜产出 ${s.output}`));
    console.log(`    ${mat.payload.materialsNote}`);
    check(mat.payload.timetable.every((s) => s.output), '每节课都有产出物');
    check(mat.payload.pairs.some((p) => p.teacherId !== p.learnerId), '教/学不是同一人');
  }

  // 打印结构（页眉 5 项 / 页脚 3 项）
  const ph = mat.printSheet.header;
  console.log(`    A4 页眉：${ph.brand}｜${ph.activityLine}｜桌号 ${ph.groupNo}｜${ph.campusLine}｜${ph.code}（二维码位 ${ph.qr.w}×${ph.qr.h}）`);
  console.log(`    A4 页脚：${mat.printSheet.footer.lines[0]} / ${mat.printSheet.footer.note} / ${mat.printSheet.footer.page}`);
}

/* ------------------------------------------------------------------ *
 * 5. 区分度 & 确定性 & 候补
 * ------------------------------------------------------------------ */

h1('5. 区分度检查');
const allGroups = allResults.flatMap((r) => r.result.groups);
allGroups.forEach((g) => {
  const names = g.memberIds.map((id) => (users.find((u) => u.id === id) || {}).nickname).join('/');
  const e = explainScore({ members: g.members }, g.category);
  const get = (k) => e.terms.find((t) => t.key === k);
  const topic = get('topicOverlap');
  const energy = get('energyBalance') || get('goalMatch') || get('levelCloseness') || get('complement');
  console.log(`  ${g.category.padEnd(12)} ${g.tableNo} ${n4(g.matchScore)}　${names}`);
  console.log(`  ${''.padEnd(12)} 首项「${energy ? energy.label : '-'}」均值 ${energy ? n4(energy.meanRaw) : '-'}　话题重合均值 ${topic ? n4(topic.meanRaw) : '-'}　惩罚 ${n4(e.penalty)}`);
});
const scores = allGroups.map((g) => g.matchScore);
const spread = Math.max(...scores) - Math.min(...scores);
console.log(`  最高 ${n4(Math.max(...scores))} / 最低 ${n4(Math.min(...scores))} / 极差 ${n4(spread)}`);
check(new Set(scores.map((s) => n4(s))).size > 1, '各组组分数不完全相同（有区分度）');
check(Math.min(...scores) >= QUALITY_FLOOR, `所有成组分数 ≥ QUALITY_FLOOR ${QUALITY_FLOOR}`);
check(allResults.every((r) => r.result.groups.length > 0), '四种局型都成功成组');

h1('6. 确定性检查（同输入必须同输出，§6.5）');
for (const { sc, type, result } of allResults) {
  const again = buildGroups({
    event: sc.event, applications: sc.applications, users, activityType: type, config: {},
  });
  const same = JSON.stringify(result) === JSON.stringify(again);
  check(same, `${sc.key} 两次运行结果完全一致（JSON 逐字相同）`);
  const g = result.groups[0];
  const m1 = buildMaterial({ group: g, event: sc.event, activityType: type, users, applications: sc.applications, venue: sc.venue });
  const m2 = buildMaterial({ group: g, event: sc.event, activityType: type, users, applications: sc.applications, venue: sc.venue });
  check(JSON.stringify(m1) === JSON.stringify(m2), `${sc.key} 物料两次生成一致`);
}

h1('7. 候补与不成局面');
const tinyEvent = { ...scenarios[2].event, id: 'e_2699', capacityGroups: 1, minGroupSize: 4 };
const tiny = buildGroups({
  event: tinyEvent,
  applications: badmintonApps.slice(0, 2),
  users,
  activityType: activityTypeMap.badminton,
  config: {},
});
console.log(`  ${tiny.notes.join(' / ')}`);
console.log(`  候补 ${tiny.waitlisted.length} 人：${tiny.waitlisted.map((w) => `${w.rank}.${(users.find((u) => u.id === w.userId) || {}).nickname}(${w.reason})`).join('；')}`);
check(tiny.groups.length === 0 && tiny.waitlisted.length === 2, '人数不足 → 全进候补且给原因');

h2('7b. 段位跨 2 档的竞技局（C8 硬拒）');
const veteranApp = A('e_2605', 'u_004', {
  activityTypeId: 'badminton', submittedAt: '2025-04-03T06:00:00.000Z', levelChoice: 'veteran',
  selfDesc: '打了六年的老手，愿意带人。',
  wantMeet: '想找能打起来的人。',
  topicalWanted: ['运动'],
  questionsAsked: ['你打球最讨厌队友做什么？'],
});
const c8 = buildGroups({
  event: { ...scenarios[2].event, id: 'e_2605' },
  applications: [...badmintonApps.slice(0, 3), veteranApp],
  users,
  activityType: activityTypeMap.badminton,
  config: {},
});
console.log(`  ${c8.notes.join(' / ')}`);
console.log(`  成组 ${c8.groups.length} 桌，候补 ${c8.waitlisted.map((w) => (users.find((u) => u.id === w.userId) || {}).nickname).join('/')}`);
const veteran = veteranApp.userId;
check(c8.groups.length === 0, 'veteran 与 rookie 同场 → 一桌都开不出来（C8 段位跨度 ≤1 档）');
check(c8.waitlisted.some((w) => w.userId === veteran), `老手 ${veteran} 没有被硬塞进新手的桌`);

h1('8. 赛制 ↔ 氛围标签联动（§7.3）');
const bm = allResults.find((r) => r.sc.key === 'competitive');
const bg = bm.result.groups[0];
const formatCases = [
  ['新手友好局', 'king_of_court'],
  ['水平差不多，气氛比输赢重要', 'round_robin'],
  ['势均力敌，会打到最后一分', 'knockout'],
  ['有人会教，有人会被带', 'king_of_court'],
  ['打完去吃饭', 'king_of_court'],
];
for (const [tag, expect] of formatCases) {
  const withVibe = { ...bg, vibe: { tag, note: '' }, vibeLabel: tag };
  const m = buildMaterial({
    group: withVibe, event: bm.sc.event, activityType: bm.type,
    users, applications: bm.sc.applications, venue: bm.sc.venue,
  });
  const totalMatches = m.payload.rounds.reduce((s, r) => s + r.matches.length, 0);
  check(m.payload.format === expect, `「${tag}」→ ${m.payload.format}（${m.payload.rounds.length} 轮 / ${totalMatches} 场）`);
  if (expect === 'knockout') {
    check(m.payload.rounds.length === 2 && totalMatches === 3,
      `4 人淘汰赛 = 半决赛 2 场 + 决赛 1 场（实际 ${m.payload.rounds.length} 轮 / ${totalMatches} 场）`);
  }
}

h1('9. 理由句的禁语与距离表述检查（不写正则拦「会」）');
const reasonTexts = [];
for (const r of allResults) {
  for (const g of r.result.groups) {
    reasonTexts.push({ where: `${r.sc.key}/${g.tableNo}/整组句`, text: g.reason });
    reasonTexts.push({ where: `${r.sc.key}/${g.tableNo}/氛围解释`, text: g.vibe.note });
    for (const m of g.memberReasons) reasonTexts.push({ where: `${r.sc.key}/${g.tableNo}/每人一句/${m.nickname}`, text: m.reasonForUser });
  }
}
const hitBanned = reasonTexts.filter((x) => BANNED_REASON_PHRASES.some((w) => x.text.includes(w)));
const hitDistance = reasonTexts.filter((x) => BANNED_DISTANCE_WORDS.some((w) => x.text.includes(w)));
hitBanned.forEach((x) => console.log('  ✗ 禁语命中', x.where, x.text));
hitDistance.forEach((x) => console.log('  ✗ 距离/时长表述', x.where, x.text));
check(hitBanned.length === 0, `${reasonTexts.length} 条文案里没有「一定会 / 保证 / 注定 / 不会冷场 / 缘分」这类承诺句`);
check(hitDistance.length === 0, '理由与氛围解释里没有距离或时长表述（campus 只做归属，不当距离承诺）');

h2('9b. 竞技型拆细：按活动查单对分下限');
for (const [id, expect] of [['badminton', 0.4], ['billiards', 0.4], ['sport', 0.25], ['hiking', 0.25], ['dinner', PAIR_FLOOR]]) {
  const got = resolvePairFloor(activityTypeMap[id]);
  check(got === expect, `${id} 的 minPair 下限 = ${got}${got === expect ? '' : `（应为 ${expect}）`}`);
}

h1('10. 真实种子 e_03（12 人 / 2 桌）回归');
const e03Ids = applicantIds.e_03;
const e03Apps = e03Ids.map((id, i) => {
  const u = seedUserMap[id];
  return {
    id: `a_e03_${id}`, eventId: 'e_03', userId: id, activityTypeId: 'boardgame', status: 'submitted',
    submittedAt: new Date(1743000000000 + i * 60000).toISOString(),
    answers: {
      selfDesc: u.bio, wantMeet: u.wantMeet, recentState: u.bio,
      topicsWanted: (u.tags || []).slice(0, 2), privacyLevel: 'low', questionsAsked: [u.question],
      availableSlots: ['d3_night'], goalText: '', teachSkill: '', learnSkill: '', levelChoice: null, gearHave: [],
    },
  };
});
const e03Event = {
  id: 'e_03', activityTypeId: 'boardgame', title: '周三桌游 · 玩到一个本结束', campus: '大学城公共',
  startAt: '2025-10-21T11:00:00.000Z', capacityGroups: 2, capacityPerGroup: 6, minGroupSize: 5, schoolCap: 2,
  genderRule: { enabled: true, minFemaleRatio: 0.25, maxSameGenderRatio: 0.75, highPrivacyCap: 1 },
};
const e03 = buildGroups({ event: e03Event, applications: e03Apps, users: seedUsers, activityType: activityTypeMap.boardgame });
console.log(`  组数 ${e03.groups.length} / 候补 ${e03.waitlisted.length}`);
e03.groups.forEach((g) => {
  const v = validateGroup(g, { event: e03Event, activityType: activityTypeMap.boardgame, users: seedUsers, applications: e03Apps });
  console.log(`  ${g.tableNo} ${n4(g.matchScore)} ${g.memberIds.length} 人 ${v.ok ? 'OK' : v.violated.map((x) => x.code).join(',')} | ${g.memberIds.map((id) => seedUserMap[id].nickname).join(' / ')}`);
});
console.log(`  notes: ${e03.notes.join(' | ')}`);
check(e03.groups.length === 2, `12 人能开 2 桌（实际 ${e03.groups.length} 桌）`);
check(e03.groups.every((g) => g.memberIds.length === 6), '两桌各 6 人');
check(e03.waitlisted.length <= 2, `候补 ${e03.waitlisted.length} 人（要求 ≤2）`);
const e03Again = buildGroups({ event: e03Event, applications: e03Apps, users: seedUsers, activityType: activityTypeMap.boardgame });
check(JSON.stringify(e03) === JSON.stringify(e03Again), 'e_03 两次运行结果一致');

h2('10b. 池级性别预检（10 女 2 男 / 2 桌）');
const skew = [...seedUsers.filter((u) => u.gender === 'f').slice(0, 10), ...seedUsers.filter((u) => u.gender === 'm').slice(0, 2)];
const skewApps = skew.map((u, i) => ({
  id: `a_skew_${i}`, eventId: 'e_skew', userId: u.id, activityTypeId: 'dinner', status: 'submitted',
  submittedAt: new Date(1743000000000 + i * 60000).toISOString(),
  answers: {
    selfDesc: u.bio, wantMeet: u.wantMeet, recentState: u.bio, topicsWanted: (u.interestTags || []).slice(0, 2),
    privacyLevel: 'low', questionsAsked: [u.question], availableSlots: ['d3_night'], goalText: '',
    teachSkill: '', learnSkill: '', levelChoice: null, gearHave: [],
  },
}));
const skewEvent = {
  id: 'e_skew', activityTypeId: 'dinner', campus: '大学城公共', startAt: '2025-10-21T11:00:00.000Z',
  capacityGroups: 2, capacityPerGroup: 6, minGroupSize: 5, schoolCap: 2,
  genderRule: { enabled: true, minFemaleRatio: 0.25, maxSameGenderRatio: 0.75, highPrivacyCap: 1 },
};
const skewRes = buildGroups({ event: skewEvent, applications: skewApps, users: skew, activityType: activityTypeMap.dinner });
console.log(`  ${skewRes.notes.join(' | ')}`);
check(skewRes.notes.some((x) => x.includes('降级为「不得全同性别」')), '10 女 2 男的池子自动把性别约束降级，并在 notes 写明原因');
check(skewRes.groups.length >= 1, `降级后仍能开出 ${skewRes.groups.length} 桌`);

h2('10c. 开黑局门槛的自适应降级');
const gamingEventBase = {
  id: 'e_gm', activityTypeId: 'gaming', campus: '大学城公共', startAt: '2025-10-21T11:00:00.000Z',
  capacityGroups: 1, capacityPerGroup: 5, minGroupSize: 5, schoolCap: 2,
  genderRule: { enabled: true, minFemaleRatio: 0.25, maxSameGenderRatio: 0.75, highPrivacyCap: 1 },
};
const mkGamingApps = (picked, goals) => picked.map((u, i) => ({
  id: `a_gm_${i}`, eventId: 'e_gm', userId: u.id, activityTypeId: 'gaming', status: 'submitted',
  submittedAt: new Date(1743000000000 + i * 60000).toISOString(),
  answers: {
    selfDesc: u.bio, wantMeet: u.wantMeet, recentState: u.bio, topicsWanted: (u.tags || []).slice(0, 2),
    privacyLevel: 'low', questionsAsked: [u.question], availableSlots: ['d3_night'], goalText: goals[i],
    teachSkill: '', learnSkill: '', levelChoice: 'beginner', gearHave: [],
  },
}));

// (1) 小池：5 人报名，够门槛的只有 1 人 → 门槛放开，不给「目标强度低」的候补原因
const smallPool = seedUsers.slice(0, 5);
const smallGoals = ['想认真打，每天练两小时上分', '随便玩玩', '轻松玩一下', '随便玩玩', '轻松玩一下'];
const smallRes = buildGroups({
  event: gamingEventBase,
  applications: mkGamingApps(smallPool, smallGoals),
  users: smallPool,
  activityType: activityTypeMap.gaming,
});
console.log('  小池 notes：', smallRes.notes.join(' | '));
const gateWordsInWait = smallRes.waitlisted.filter((w) => w.reason.includes('目标强度'));
console.log(`  小池 ${smallRes.groups.length} 桌 / 候补 ${smallRes.waitlisted.length}（含门槛原因 ${gateWordsInWait.length} 条）`);
check(smallRes.notes.some((x) => x.includes('已按宽松口径编排')), '够门槛的人不够一桌 → notes 写明「已按宽松口径编排，本局强度偏休闲」');
check(gateWordsInWait.length === 0, '降级后候补里不再出现「目标强度低于门槛」这种自相矛盾的原因');

// (2) 门槛真生效：6 人报名，5 人达标（≥ 一桌）→ 低目标强度的 1 人进候补并写明数值
const strong = seedUsers.filter((u) => u.profile.goalIntensity >= 0.65).slice(0, 5);
const weak = seedUsers.filter((u) => u.profile.goalIntensity < 0.65).slice(0, 1);
const strictPool = [...strong, ...weak];
const strictGoals = strictPool.map((u, i) => (i < strong.length
  ? '想认真打，每天练两小时上分，目标上钻'
  : '随便玩玩，不较真'));
const strictRes = buildGroups({
  event: { ...gamingEventBase, id: 'e_gm_strict' },
  applications: mkGamingApps(strictPool, strictGoals),
  users: strictPool,
  activityType: activityTypeMap.gaming,
});
console.log('  达标池 notes：', strictRes.notes.join(' | '));
const gateHit = strictRes.waitlisted.filter((w) => w.reason.includes('目标强度'));
console.log(`  达标池 ${strictRes.groups.length} 桌 / 候补 ${strictRes.waitlisted.length}：${gateHit.map((w) => `${seedUserMap[w.userId].nickname}(${w.reason})`).join('；')}`);
check(strictRes.notes.some((x) => x.includes('门槛未放开')), '过关人数够一桌时门槛照常执行，notes 说明「门槛未放开」');
check(gateHit.length === 1, '低目标强度的 1 人进候补，原因带自己的数值与门槛');

// (3) 空池 / 不足一桌：门槛不生效，也不给门槛原因
const emptyRes = buildGroups({ event: { ...gamingEventBase, id: 'e_gm_empty' }, applications: [], users: seedUsers, activityType: activityTypeMap.gaming });
console.log('  空池 notes：', emptyRes.notes.join(' | '));
const tinyPool = seedUsers.slice(0, 3);
const tinyRes = buildGroups({
  event: { ...gamingEventBase, id: 'e_gm_tiny' },
  applications: mkGamingApps(tinyPool, ['随便玩玩', '轻松玩一下', '不较真']),
  users: tinyPool,
  activityType: activityTypeMap.gaming,
});
console.log('  小池（3 人）notes：', tinyRes.notes.join(' | '));
check(emptyRes.groups.length === 0 && emptyRes.notes.some((x) => x.includes('不成局')), '空池：直接说人数不足，不提门槛');
check(tinyRes.waitlisted.every((w) => !w.reason.includes('目标强度')), '不足一桌时门槛不生效，候补原因不提目标强度');

h2('10d. sport 允许混合段位 / badminton 仍然严格');
const mixIds = applicantIds.e_03.slice(0, 4);
const mixLevels = ['rookie', 'beginner', 'advanced', 'veteran'];
const mixApps = mixIds.map((id, i) => {
  const u = seedUserMap[id];
  return {
    id: `a_mix_${i}`, eventId: 'e_mix', userId: id, activityTypeId: 'badminton', status: 'submitted',
    submittedAt: new Date(1743000000000 + i * 60000).toISOString(),
    answers: {
      selfDesc: u.bio, wantMeet: u.wantMeet, recentState: u.bio, topicsWanted: (u.tags || []).slice(0, 2),
      privacyLevel: 'low', questionsAsked: [u.question], availableSlots: ['d3_night'], goalText: '',
      teachSkill: '', learnSkill: '', levelChoice: mixLevels[i], gearHave: [],
    },
  };
});
const mixMembers = mixIds.map((id, i) => ({
  userId: id, nickname: seedUserMap[id].nickname, school: seedUserMap[id].school, major: seedUserMap[id].major,
  grade: seedUserMap[id].grade, gender: seedUserMap[id].gender, interestTags: seedUserMap[id].tags,
  level: mixLevels[i], profile: seedUserMap[id].profile, topicsWanted: [], availableSlots: [],
}));
const badmintonCodes = validateGroup({ members: mixMembers }, {
  event: { id: 'e_mix', capacityGroups: 1, capacityPerGroup: 4, minGroupSize: 4 },
  activityType: activityTypeMap.badminton, skipQuality: true,
}).violated.map((x) => x.code);
const sportCodes = validateGroup({ members: mixMembers }, {
  event: { id: 'e_mix', capacityGroups: 1, capacityPerGroup: 8, minGroupSize: 6 },
  activityType: activityTypeMap.sport, skipQuality: true,
}).violated.map((x) => x.code);
console.log(`  badminton 违规 ${badmintonCodes.join(',') || '无'} | sport 违规 ${sportCodes.join(',') || '无'}`);
check(badmintonCodes.includes('C8'), 'badminton 段位跨 2 档被 C8 拦下');
check(!sportCodes.includes('C8'), 'sport 允许混合段位（不再因 C8 拒组）');

h1(failures === 0 ? '结果：全部通过' : `结果：${failures} 项未通过`);
process.exit(failures === 0 ? 0 : 1);
