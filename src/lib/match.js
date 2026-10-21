/**
 * 不熟局 BU SHU · 匹配引擎（纯函数，不碰 DOM / localStorage / 网络）
 *
 * 规格来源（只读引用，不复制结论）：
 *  - docs/site-spec.md §6.1 七维画像 / §6.2 基础距离函数 / §6.3 四套打分函数（权重冻结）
 *  - docs/site-spec.md §6.4 整组硬约束 C1–C11 / §6.5 组队算法 / §6.6 理由 / §6.7 氛围
 *  - docs/site-spec.md §5.2 §5.4 §5.5 §5.6 §5.7（字段命名以此为准）
 *  - docs/content-plan.md §6.1–§6.4（理由句与氛围词库）
 *
 * 三条铁律：
 *  1. **不使用 Math.random**（§6.5 末段）：同样的输入必须得到同样的输出。局部搜索用
 *     「确定性全遍历」代替随机采样；mulberry32 只在固定 seed 下做遍历顺序扰动，
 *     不参与任何 accept/reject 判断。
 *  2. 纯函数：输入是普通对象，输出可 JSON 序列化（内部标记用不可枚举属性）。
 *  3. 权重冻结：WEIGHTS 四套加总必须为 1（competitive = 单对 0.84 + 组级 0.16）。
 *     改权重必须同时改 site-spec §6.3，这里在模块加载时自检，不一致直接抛错。
 */

/* ------------------------------------------------------------------ *
 * 0. 常量与词表
 * ------------------------------------------------------------------ */

export const GRADE_ORDER = { freshman: 1, sophomore: 2, junior: 3, senior: 4, postgrad: 5 };
export const GRADE_CN = { freshman: '大一', sophomore: '大二', junior: '大三', senior: '大四', postgrad: '研究生' };
// 种子/后台导入里可能是中文年级（「大三」「研一」），统一归一到 §5.5 的枚举
const GRADE_ALIAS = {
  大一: 'freshman', 大二: 'sophomore', 大三: 'junior', 大四: 'senior', 大五: 'senior',
  研一: 'postgrad', 研二: 'postgrad', 研三: 'postgrad', 研究生: 'postgrad', 硕士: 'postgrad',
  博士: 'postgrad', 博一: 'postgrad', 博二: 'postgrad', 博三: 'postgrad',
};
/** 年级归一（§5.5 枚举）；认不出来按大二处理，不抛错 */
export function normalizeGrade(grade) {
  const s = String(grade || '').trim();
  if (GRADE_ORDER[s]) return s;
  if (GRADE_ALIAS[s]) return GRADE_ALIAS[s];
  return 'sophomore';
}

// §6.2：段位映射为 0 / 0.3333 / 0.6667 / 1
export const LEVEL_VALUE = { rookie: 0, beginner: 1 / 3, advanced: 2 / 3, veteran: 1 };
export const LEVEL_CN = { rookie: '新手', beginner: '入门', advanced: '进阶', veteran: '老手' };

// §5.5 十校简称
export const SCHOOL_SHORT = {
  中山大学: '中大', 华南理工大学: '华工', 华南师范大学: '华师', 广东工业大学: '广工',
  广州大学: '广大', 广州中医药大学: '广中医', 广东外语外贸大学: '广外',
  星海音乐学院: '星海', 广州美术学院: '广美', 广东药科大学: '广药',
  大学城公共: '大学城',
};

/** §6.3 冻结权重。competitive 的单对项合计 0.84，余下 0.16 是组级 teamBalance。 */
export const WEIGHTS = {
  // §6.3.1 社交型（饭局 / 桌游 / 观影 / KTV / City Walk / 看展）
  social: {
    energyBalance: 0.30,   // 性格互补
    topicOverlap: 0.22,    // 话题重合
    expressionFit: 0.18,   // 表达节奏
    opennessFit: 0.12,     // 开放性相近
    chronoFit: 0.10,       // 作息容忍
    gradeFit: 0.08,        // 年级跨度
  },
  // §6.3.2 搭子型（自习 / 考研考证 / 夜跑）
  buddy: {
    goalMatch: 0.32,       // 目标一致
    chronoFit: 0.24,       // 作息重合
    intensityFit: 0.16,    // 强度相当
    majorDiversity: 0.10,  // 专业互补（本类型刻意求异）
    quietFit: 0.10,        // 安静容忍
    slotFit: 0.08,         // 时段重合
  },
  // §6.3.3 竞技型（运动 / 台球乒乓 / 羽毛球 / 爬山 / 开黑）
  competitive: {
    levelCloseness: 0.38,  // 段位接近
    goalFit: 0.20,         // 争胜心接近
    expressionFit: 0.10,   // 性格搭配
    chronoFit: 0.10,       // 体力/作息
    topicOverlap: 0.06,    // 话题兼容
  },
  // §6.3.4 技能型（摄影互拍 / 技能交换）
  skill: {
    complement: 0.34,      // 技能互补
    teachWilling: 0.20,    // 教愿意愿
    articulate: 0.16,      // 能讲清楚
    learnWilling: 0.14,    // 学习意愿
    slotFit: 0.08,         // 时段重合
    topicOverlap: 0.08,    // 话题兼容
  },
};

/** §6.3.3 的 16% 组级项 */
export const COMPETITIVE_PAIR_WEIGHT = 0.84;
export const COMPETITIVE_TEAM_WEIGHT = 0.16;

/** §6.4 C11 / §6.5 */
export const QUALITY_FLOOR = 0.62;
export const PAIR_FLOOR = 0.35;

/**
 * 竞技型按活动拆细（主理人裁定，覆盖 §6.3.3 的一刀切）：
 *  - badminton / billiards：水平接近优先，minPair 提到 0.40，「新手别被老手打到自闭」
 *  - sport / hiking：允许混合段位（不对段位跨度做硬拒），minPair 只保留 0.25 下限，
 *    靠 snake 分队 + teamBalance 保证「老手别陪练一晚上」
 *  - gaming：没有段位可用，改用 goalIntensity ≥ 0.65 当实质准入门槛（低于此进候补）
 * 不在表里的类型沿用 PAIR_FLOOR。
 */
export const COMPETITIVE_TUNING = {
  billiards: { pairFloor: 0.4, mixedLevel: false },
  badminton: { pairFloor: 0.4, mixedLevel: false },
  sport: { pairFloor: 0.25, mixedLevel: true },
  hiking: { pairFloor: 0.25, mixedLevel: true },
  gaming: { pairFloor: 0.35, mixedLevel: false, minGoalIntensity: 0.65 },
};

/** 本场的最低单对分下限（竞技型按活动查表，其余 0.35） */
export function resolvePairFloor(activityType) {
  const id = (activityType && activityType.id) || '';
  const tune = COMPETITIVE_TUNING[id];
  return tune && Number.isFinite(tune.pairFloor) ? tune.pairFloor : PAIR_FLOOR;
}

/** 是否允许混合段位（只有 sport / hiking 打开） */
export function resolveMixedLevel(activityType) {
  const id = (activityType && activityType.id) || '';
  const tune = COMPETITIVE_TUNING[id];
  return Boolean(tune && tune.mixedLevel);
}

/**
 * 匹配理由的禁语短表（按词判，不用 /会|一定/ 这种正则拦字——
 * 「会主动开口」「会不会」都是正常中文，拦字会把句子写残）。
 * 后台文案检查与 selftest 共用这一份。
 */
export const BANNED_REASON_PHRASES = [
  '你们一定会', '一定会', '一定能', '保证', '注定', '不会冷场', '冷不了', '缘分',
  '聊得来', '合得来', '处得来', '聊得开', '断不了', '大概会', '想必', '应该会',
];

/** 理由里不许出现的距离/时长表述（campus 只做归属与聚集惩罚，不当距离承诺） */
export const BANNED_DISTANCE_WORDS = ['公里', '米', '骑车', '步行', '走路', '分钟', '距离', '很近', '顺路'];

/** §6.5 局部搜索：确定性全遍历的轮数上限与最小改进量 */
const SWAP_ROUNDS = 12;
const SWAP_EPSILON = 0.005;
/** 组内修复（C2/C4/C9 换人）的最大轮数 */
const REPAIR_ROUNDS = 24;

/** §5.4 genderRule 默认值（站点默认 0.7，事件可覆盖；site-spec 示例用 0.75） */
export const DEFAULT_GENDER_RULE = {
  enabled: true,
  minFemaleRatio: 0.25,
  maxSameGenderRatio: 0.7,
  highPrivacyCap: 1,
};

/**
 * 话题域词表（§6.1 的 12 话题域 + 种子数据里出现过的自由词）。
 * 归一化时只看这张表：命中了就归到域，没命中就当独立话题。
 * 漏词会让「台球 / 排球 / 精酿 / 播客」这类词谁都不认识，C9 直接把整桌判死，
 * 所以这张表按「真实报名用词」维护，不是按字典收。
 */
const TOPIC_FAMILY = [
  ['吃喝', ['吃喝', '探店', '美食', '夜宵', '咖啡', '下厨', '烧烤', '火锅', '奶茶', '精酿',
    '甜品', '烘焙', '番茄炒蛋', '砂锅粥', '肠粉', '小馆', '酒']],
  ['影音', ['电影', '剧', '观影', '综艺', '动漫', '二次元', '纪录片', '短片', '播客', '看片']],
  ['音乐', ['音乐', '乐队', 'livehouse', '歌', '说唱', '古典', '和声', '演出', '现场', '演唱会', '乐器']],
  ['展览', ['展览', '美术馆', '摄影', '艺术', '设计', '手作', '看展', '绘画', '修图', '出片', '画']],
  ['运动', ['运动', '健身', '羽毛球', '篮球', '足球', '排球', '网球', '乒乓', '台球', '桌球',
    '跑步', '夜跑', '爬山', '滑板', '游泳', '骑行', '飞盘', '滑雪', '跑']],
  ['游戏', ['游戏', '电竞', '桌游', '剧本杀', '开黑', '推理', '本格', '狼人杀', '外设']],
  ['学习', ['学习', '考研', '考公', '四六级', '雅思', '读书', '自习', '科研', '刷题',
    '数学', '英语', '论文', '辩论', '语言', '写作', '背书']],
  ['旅行', ['旅行', '城市观察', 'City Walk', '扫街', '出岛', '地铁', '地图', '城市规划',
    '散步', '露营', '老街', '逛']],
  ['技术', ['技术', '编程', '剪辑', '视频', '短视频', 'AI', '数码', '代码', 'vlog', '相机', '修片']],
];

/** 目标关键词（§6.2 goalMatch「同关键词保底 0.6」） */
const GOAL_KEYWORDS = [
  '考研', '保研', '考公', '考编', '雅思', '托福', '四六级', '六级', '四级', '期末', '绩点',
  '减脂', '健身', '跑步', '夜跑', '吉他', '钢琴', '剪辑', '摄影', '英语', '口语', '数学',
  '编程', '刷题', '作品集', '驾照', '论文', '实习', 'offer', '上岸', '打卡',
];

/** 技能同义词 / 类别表（§6.3.4 complement） */
const SKILL_CATEGORIES = [
  { key: '摄影', words: ['摄影', '拍照', '构图', '修图', '后期', '调色', '相机', '人像'] },
  { key: '剪辑', words: ['剪辑', '视频', '成片', '运镜', 'vlog', '卡点', '剪映', 'pr'] },
  { key: '乐器', words: ['吉他', '钢琴', '尤克里里', '和弦', '弹唱', '鼓', '贝斯', '编曲'] },
  { key: '语言', words: ['英语', '口语', '日语', '韩语', '法语', '德语', '翻译', '发音'] },
  { key: '编程', words: ['编程', '代码', 'python', 'java', '前端', '网页', '小程序', '算法'] },
  { key: '烹饪', words: ['做饭', '下厨', '菜', '烘焙', '咖啡', '调酒'] },
  { key: '绘画', words: ['画', '素描', '水彩', '板绘', '插画', '手绘', '书法'] },
  { key: '健身', words: ['健身', '增肌', '深蹲', '训练', '瑜伽', '拉伸', '减脂'] },
];

/** 专业 → 学科门类（§6.2 majorDiversity） */
const MAJOR_FAMILIES = [
  ['理工', ['计算机', '软件', '电子', '通信', '机械', '自动化', '土木', '材料', '能源', '电气', '建筑', '环境', '车辆', '人工智能', '数据']],
  ['理学', ['数学', '物理', '化学', '生物', '地理', '统计', '天文', '心理']],
  ['经管', ['经济', '金融', '会计', '工商', '管理', '市场', '物流', '电商', '财务', '审计', '国贸']],
  ['文法', ['法', '新闻', '传播', '中文', '汉语言', '哲学', '历史', '社会', '政治', '公共', '行政管理', '编辑']],
  ['外语', ['英语', '日语', '法语', '德语', '翻译', '外语', '商务英语', '小语种']],
  ['艺术', ['美术', '设计', '音乐', '舞蹈', '戏剧', '摄影', '绘画', '动画', '视觉传达', '公共艺术', '雕塑', '声乐', '表演']],
  ['医药', ['临床', '药学', '护理', '中医', '医学', '口腔', '预防', '中药', '康复']],
  ['教育', ['教育', '师范', '学前', '小学教育']],
  ['农学', ['农', '林', '园艺', '动物', '食品']],
];

/* ------------------------------------------------------------------ *
 * 1. 小工具
 * ------------------------------------------------------------------ */

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const clamp01 = (x) => clamp(x, 0, 1);
const round4 = (x) => Math.round(x * 10000) / 10000;
const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = mean(arr.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function countBy(list, pick) {
  const map = new Map();
  for (const item of list) {
    const k = pick(item);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}
function maxCount(map) {
  let best = { key: null, count: 0 };
  for (const [k, c] of map) if (c > best.count) best = { key: k, count: c };
  return best;
}

/** FNV-1a：给固定 seed 用（§6.5 seed = hash(eventId)） */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32：只在固定 seed 下扰动遍历顺序，结果依然可重放（§6.5） */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function majorFamily(major) {
  const s = String(major || '');
  if (!s) return '其他';
  for (const [family, words] of MAJOR_FAMILIES) {
    if (words.some((w) => s.includes(w))) return family;
  }
  return '其他';
}

/**
 * ISO 时间 → 中文展示串（按 Asia/Shanghai 固定 +08:00，不依赖运行环境时区）。
 * 例：「4 月 9 日（周三）19:30」。物料页眉、场次卡都用它，避免同一时刻两处显示不一致。
 */
export function formatDateText(iso, withTime = true) {
  if (!iso) return '时间待定';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '时间待定';
  const d = new Date(t + 8 * 3600 * 1000);
  const M = d.getUTCMonth() + 1;
  const D = d.getUTCDate();
  const W = '日一二三四五六'[d.getUTCDay()];
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return withTime ? `${M} 月 ${D} 日（周${W}）${hh}:${mm}` : `${M} 月 ${D} 日（周${W}）`;
}

/** 性别归一：种子数据用 f/m，契约用 female/male */
function normGender(g) {
  const s = String(g || '').toLowerCase();
  if (s === 'f' || s === 'female' || s === '女') return 'female';
  if (s === 'm' || s === 'male' || s === '男') return 'male';
  return 'other';
}

/** 中文 2-gram（§6.2 goalMatch 词袋余弦） */
function bigrams(text) {
  const s = String(text || '').toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]+/g, '');
  const out = [];
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
  return out;
}

function cosine2gram(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.length || !B.length) return 0;
  const df = new Map();
  for (const g of A) df.set(g, (df.get(g) || 0) + 1);
  let dot = 0;
  for (const g of B) {
    const c = df.get(g);
    if (c) { dot += c * 1; df.set(g, c - 1); }
  }
  const na = Math.sqrt(A.length);
  const nb = Math.sqrt(B.length);
  return clamp01(dot / (na * nb));
}

function skillCategoryOf(skill) {
  const s = String(skill || '').toLowerCase();
  if (!s) return null;
  for (const c of SKILL_CATEGORIES) if (c.words.some((w) => s.includes(w.toLowerCase()))) return c.key;
  return s;
}

function sameSkill(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  if (x === y) return true;
  return skillCategoryOf(x) === skillCategoryOf(y);
}

/** 两个技能是否「对得上」（2-gram 余弦 ≥0.5 或同类） */
function skillMatch(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  if (cosine2gram(x, y) >= 0.5) return true;
  const ca = skillCategoryOf(x);
  const cb = skillCategoryOf(y);
  return Boolean(ca && cb && ca === cb);
}

/** 中文字数（用于 6.1 的 selfDesc 字数规则） */
function charLen(text) {
  return String(text || '').replace(/\s/g, '').length;
}

/* ------------------------------------------------------------------ *
 * 2. §6.1 画像推导
 * ------------------------------------------------------------------ */

const ACTIVE_WORDS = ['我来', '叫我', '组织', '组局', '张罗', '发起', '搭话'];
const PASSIVE_WORDS = ['慢热', '社恐', 'i人', 'I人', '不太会', '安静', '一个人', '闷'];
const WANT_OUT_WORDS = ['想认识人', '想出去', '憋坏了'];
const EXPR_UP_WORDS = ['聊', '讲', '分享', '表达', '安利', '话多'];
const EXPR_DOWN_WORDS = ['听', '不太说', '不会表达', '话少', '嘴笨'];
const OPEN_UP_WORDS = ['想试', '新鲜', '没试过', '都可以', '随便', '想去看看'];
const OPEN_DOWN_WORDS = ['只想', '固定', '习惯', '不喜欢变', '最好别'];
const CHRONO_EARLY = ['早起', '早睡', '晨跑', '六点'];
const CHRONO_NIGHT = ['夜猫', '熬夜', '凌晨', '夜跑'];
const GOAL_UP_WORDS = ['必', '一定', '每天', '坚持', '上岸', '拿证', '打卡', '刷题', '周更'];
const GOAL_DOWN_WORDS = ['随便', '轻松', '不勉强', '玩着'];

function lastIndexOfAny(text, words) {
  let best = -1;
  for (const w of words) {
    const i = text.lastIndexOf(w);
    if (i > best) best = i;
  }
  return best;
}

/**
 * §6.1 deriveProfile 的纯规则实现。
 * 契约要求 answers 是 Application.answers；user.profile 若已落库（§5.5「profile 由问卷推导」）
 * 则以 profile 为权威，answers 只在缺失维度上补——避免用户改答后历史分数漂移（§5.8 snapshot）。
 */
export function deriveTraits(answers = {}, user = null) {
  const a = answers || {};
  const selfDesc = String(a.selfDesc || '');
  const wantMeet = String(a.wantMeet || '');
  const recentState = String(a.recentState || '');
  const goalText = String(a.goalText || '');
  const questions = Array.isArray(a.questionsAsked) ? a.questionsAsked.filter(Boolean) : [];
  const qLen = questions.join('').length;
  const topics = Array.isArray(a.topicsWanted) ? a.topicsWanted : [];
  const slots = Array.isArray(a.availableSlots) ? a.availableSlots : [];
  const privacyLevel = a.privacyLevel || 'mid';
  const has = (s, words) => words.some((w) => s.includes(w));
  const conf = {}; // 派生标签的置信度：加分幅度大者优先（§6.1 派生标签）

  // 社交能量 基线 0.50
  let socialEnergy = 0.5;
  if (has(selfDesc, ACTIVE_WORDS)) { socialEnergy += 0.15; conf['会主动开口'] = 0.15; }
  if (has(recentState, WANT_OUT_WORDS)) { socialEnergy += 0.1; conf['想出门'] = 0.1; }
  if (qLen >= 12) { socialEnergy += 0.08; conf['有问题想问'] = 0.08; }
  if (has(selfDesc, PASSIVE_WORDS)) { socialEnergy -= 0.15; conf['偏内向'] = 0.15; }
  if (privacyLevel === 'high') socialEnergy -= 0.1;
  socialEnergy = clamp(socialEnergy, 0.05, 0.95);

  // 表达欲 基线 0.45
  let expressiveness = 0.45;
  if (charLen(selfDesc) >= 80) { expressiveness += 0.15; conf['话不少'] = 0.15; }
  if (has(selfDesc, EXPR_UP_WORDS)) { expressiveness += 0.12; conf['话不少'] = Math.max(conf['话不少'] || 0, 0.12); }
  if (qLen >= 20) expressiveness += 0.08;
  if (has(selfDesc, EXPR_DOWN_WORDS)) expressiveness -= 0.15;
  if (charLen(selfDesc) < 30) expressiveness -= 0.1;
  expressiveness = clamp(expressiveness, 0.05, 0.95);

  // 开放性 基线 0.50
  let openness = 0.5;
  if (has(selfDesc, OPEN_UP_WORDS) || has(wantMeet, OPEN_UP_WORDS)) { openness += 0.18; conf['什么都想试'] = 0.18; }
  const families = new Set(topics.map((t) => {
    const hit = TOPIC_FAMILY.find(([, words]) => words.some((w) => String(t).includes(w)));
    return hit ? hit[0] : String(t);
  }));
  if (families.size >= 2) openness += 0.1;
  if (privacyLevel === 'low') openness += 0.1;
  if (has(selfDesc, OPEN_DOWN_WORDS)) openness -= 0.18;
  if (privacyLevel === 'high') openness -= 0.1;
  openness = clamp(openness, 0.05, 0.95);

  // 作息：命中早起词 → 0；命中夜猫词 → 1；同时命中取最后一次出现（§6.1 减分栏说明）
  let chrono = 0.5;
  const earlyAt = lastIndexOfAny(selfDesc + recentState, CHRONO_EARLY);
  const nightAt = lastIndexOfAny(selfDesc + recentState, CHRONO_NIGHT);
  if (earlyAt >= 0 && nightAt >= 0) chrono = nightAt > earlyAt ? 1 : 0;
  else if (earlyAt >= 0) chrono = 0;
  else if (nightAt >= 0) chrono = 1;
  if (chrono === 0) conf['作息偏早'] = 0.5;
  if (chrono === 1) conf['作息偏夜'] = 0.5;

  // 目标强度 基线 0.40
  let goalIntensity = 0.4;
  if (has(goalText, GOAL_UP_WORDS)) { goalIntensity += 0.15; conf['目标很明确'] = 0.15; }
  if (/[0-9０-９]|每天|每周|次|个月/.test(goalText)) { goalIntensity += 0.15; conf['目标很明确'] = Math.max(conf['目标很明确'] || 0, 0.15); }
  if (slots.length >= 4) goalIntensity += 0.1;
  if (has(goalText, GOAL_DOWN_WORDS)) goalIntensity -= 0.15;
  if (slots.length <= 1) goalIntensity -= 0.1;
  goalIntensity = clamp(goalIntensity, 0.05, 0.95);

  // 隐私边界：low 0.2 / mid 0.5 / high 0.85（直接映射）
  const privacyMap = { low: 0.2, mid: 0.5, high: 0.85 };
  let privacyBoundary = privacyMap[privacyLevel] ?? 0.5;

  const skillLevels = {};
  if (a.levelChoice) skillLevels[a.activityTypeId || 'current'] = a.levelChoice;

  // user.profile 权威覆盖（§5.5：profile 是落库的推导结果）
  const p = (user && user.profile) || null;
  if (p) {
    if (Number.isFinite(num(p.socialEnergy, NaN))) socialEnergy = clamp(num(p.socialEnergy), 0.05, 0.95);
    if (Number.isFinite(num(p.expressiveness, NaN))) expressiveness = clamp(num(p.expressiveness), 0.05, 0.95);
    if (Number.isFinite(num(p.openness, NaN))) openness = clamp(num(p.openness), 0.05, 0.95);
    if (Number.isFinite(num(p.chrono, NaN))) chrono = num(p.chrono);
    if (Number.isFinite(num(p.goalIntensity, NaN))) goalIntensity = clamp(num(p.goalIntensity), 0.05, 0.95);
    if (Number.isFinite(num(p.privacyBoundary, NaN))) privacyBoundary = num(p.privacyBoundary);
    if (p.skillLevels && typeof p.skillLevels === 'object') Object.assign(skillLevels, p.skillLevels);
  }

  // 派生标签：阈值命中 + 置信度排序，取前 3（§6.1）
  const candidates = [];
  const push = (tag, w) => { if (w > 0) candidates.push({ tag, w: Number.isFinite(w) ? w : 0 }); };
  if (socialEnergy < 0.4) push('偏内向', conf['偏内向'] || (0.4 - socialEnergy));
  if (socialEnergy >= 0.65) push('会主动开口', conf['会主动开口'] || (socialEnergy - 0.65) * 2);
  if (expressiveness >= 0.7) push('话不少', conf['话不少'] || (expressiveness - 0.7) * 2);
  if (openness >= 0.7) push('什么都想试', conf['什么都想试'] || (openness - 0.7) * 2);
  if (chrono === 0) push('作息偏早', 0.5);
  if (chrono === 1) push('作息偏夜', 0.5);
  if (goalIntensity >= 0.65) push('目标很明确', conf['目标很明确'] || (goalIntensity - 0.65) * 2);
  if (privacyLevel === 'high') push('话不多说私事', 0.85);
  const derivedTags = candidates
    .map((c, i) => ({ ...c, i }))
    .sort((x, y) => (y.w - x.w) || (x.i - y.i))
    .slice(0, 3)
    .map((c) => c.tag);

  return {
    socialEnergy: round4(socialEnergy),
    expressiveness: round4(expressiveness),
    openness: round4(openness),
    chrono,
    goalIntensity: round4(goalIntensity),
    privacyBoundary,
    skillLevels,
    derivedTags,
  };
}

/* ------------------------------------------------------------------ *
 * 3. 成员归一化
 * ------------------------------------------------------------------ */

/** User + Application → 匹配引擎内部成员对象（字段名严格对齐 §5.5 / §5.6） */
export function toMember(user, application, activityType) {
  const u = user || {};
  const app = application || {};
  const answers = app.answers || {};
  const traits = deriveTraits(answers, u);
  const typeId = (activityType && activityType.id) || answers.activityTypeId || null;
  const profileLevels = (u.profile && u.profile.skillLevels) || {};
  const level = answers.levelChoice || (typeId ? profileLevels[typeId] : null) || null;

  const member = {
    userId: u.id,
    applicationId: app.id || null,
    nickname: u.nickname || '同组的人',
    school: u.school || '',
    schoolShort: SCHOOL_SHORT[u.school] || u.school || '',
    major: u.major || '',
    majorFamily: majorFamily(u.major),
    grade: normalizeGrade(u.grade),
    gender: normGender(u.gender),
    age: num(u.age, 20),
    campus: u.campus || u.school || '',
    // §5.6 answers
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
    recentState: String(answers.recentState || ''),
    privacyLevel: answers.privacyLevel || 'mid',
    gearHave: Array.isArray(answers.gearHave) ? answers.gearHave.slice() : [],
    submittedAt: app.submittedAt || '',
    level,
    // §5.5 profile
    profile: {
      socialEnergy: traits.socialEnergy,
      expressiveness: traits.expressiveness,
      openness: traits.openness,
      chrono: traits.chrono,
      goalIntensity: traits.goalIntensity,
      privacyBoundary: traits.privacyBoundary,
      skillLevels: traits.skillLevels,
    },
    tags: traits.derivedTags,
  };
  Object.defineProperty(member, '__member', { value: true, enumerable: false });
  return member;
}

function isMember(x) {
  return Boolean(x && x.__member === true);
}

function ensureMember(x) {
  if (!x) return null;
  if (isMember(x)) return x;
  if (x.userId && x.profile && Number.isFinite(num(x.profile.socialEnergy, NaN))) {
    // 外部传入的近似 member：补齐可能缺的字段
    const m = { ...x };
    m.majorFamily = m.majorFamily || majorFamily(m.major);
    m.schoolShort = m.schoolShort || SCHOOL_SHORT[m.school] || m.school || '';
    m.gender = normGender(m.gender);
    m.interestTags = Array.isArray(m.interestTags) ? m.interestTags : [];
    m.topicsWanted = Array.isArray(m.topicsWanted) ? m.topicsWanted : [];
    m.availableSlots = Array.isArray(m.availableSlots) ? m.availableSlots : [];
    m.questionsAsked = Array.isArray(m.questionsAsked) ? m.questionsAsked : [];
    Object.defineProperty(m, '__member', { value: true, enumerable: false });
    return m;
  }
  if (x.id) return toMember(x, null, null);
  return x;
}

/** 组 → 成员列表。支持 group.members / memberIds+memberIndex / snapshots（§5.8） */
function resolveMembers(group, ctx = {}) {
  if (!group) return [];
  if (Array.isArray(group.members) && group.members.length) return group.members.map(ensureMember).filter(Boolean);
  const index = ctx.memberIndex || ctx.membersById || null;
  const ids = Array.isArray(group.memberIds) ? group.memberIds : [];
  if (index && ids.length) {
    return ids.map((id) => ensureMember(index[id] || index.get?.(id))).filter(Boolean);
  }
  if (Array.isArray(group.snapshots) && group.snapshots.length) {
    return group.snapshots.map((s) => ensureMember({
      userId: s.userId,
      nickname: s.nickname,
      school: s.school,
      major: s.major,
      grade: s.grade,
      interestTags: s.interestTags || [],
      level: s.level || null,
      profile: {
        socialEnergy: s.socialEnergy,
        expressiveness: s.expressiveness,
        openness: s.openness,
        chrono: s.chrono,
        goalIntensity: s.goalIntensity,
        privacyBoundary: s.privacyBoundary,
        skillLevels: {},
      },
    })).filter(Boolean);
  }
  return [];
}

function buildMemberIndex(config = {}) {
  const index = {};
  const users = Array.isArray(config.users) ? config.users : [];
  const apps = Array.isArray(config.applications) ? config.applications : [];
  const type = config.activityType || null;
  if (!users.length) return config.memberIndex || index;
  const appByUser = new Map(apps.map((a) => [a.userId, a]));
  for (const u of users) {
    if (!u || !u.id) continue;
    index[u.id] = toMember(u, appByUser.get(u.id) || null, type);
  }
  return { ...index, ...(config.memberIndex || {}) };
}

/* ------------------------------------------------------------------ *
 * 4. §6.2 基础距离函数（全部 0–1，越大越好）
 * ------------------------------------------------------------------ */

export function energyBalance(a, b) {
  return clamp01(1 - Math.abs(Math.abs(a - b) - 0.3) / 0.7);
}
export function similarFit(a, b) {
  return clamp01(1 - Math.abs(a - b));
}
export function jaccard(A, B) {
  const sa = A instanceof Set ? A : new Set(A || []);
  const sb = B instanceof Set ? B : new Set(B || []);
  if (!sa.size && !sb.size) return 0; // §6.2：两者皆空记 0
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union ? inter / union : 0;
}
export function gradeFit(ga, gb) {
  const d = Math.abs(ga - gb);
  if (d === 0) return 1;
  if (d === 1) return 0.85;
  if (d === 2) return 0.65;
  return 0.45;
}
export function levelCloseness(a, b) {
  return clamp01(1 - Math.abs(a - b) / 0.6667);
}
export function slotOverlap(Sa, Sb) {
  const a = Sa instanceof Set ? Sa : new Set(Sa || []);
  const b = Sb instanceof Set ? Sb : new Set(Sb || []);
  if (!a.size || !b.size) return 0.5; // §6.2：任一为空视为「都行」
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / Math.min(a.size, b.size);
}
export function goalMatch(goalA, goalB) {
  let cos = cosine2gram(goalA, goalB);
  const shared = GOAL_KEYWORDS.filter((k) => String(goalA || '').includes(k) && String(goalB || '').includes(k));
  if (shared.length) cos = Math.max(cos, 0.6); // §6.2：同类关键词保底 0.6
  return clamp01(cos);
}
export function majorDiversity(fa, fb) {
  if (!fa || !fb) return 0.6;
  if (fa !== fb) return 1;
  return 0.6; // 同学科门类不同专业（§6.2 的中间档）
}

/** §6.3.4 complement：教 ↔ 学 的互补度 */
export function complement(a, b) {
  const aTeach = String(a.teachSkill || '');
  const aLearn = String(a.learnSkill || '');
  const bTeach = String(b.teachSkill || '');
  const bLearn = String(b.learnSkill || '');
  let hits = 0;
  if (skillMatch(aTeach, bLearn)) hits += 1;
  if (skillMatch(bTeach, aLearn)) hits += 1;
  if (hits >= 2) return 1;
  if (hits === 1) return 0.7;
  const sameDirection = sameSkill(aTeach, bTeach) && sameSkill(aLearn, bLearn);
  if (sameDirection) return 0; // 技能完全相同，没有交换空间
  const ca1 = skillCategoryOf(aTeach);
  const cb1 = skillCategoryOf(bTeach);
  const ca2 = skillCategoryOf(aLearn);
  const cb2 = skillCategoryOf(bLearn);
  const teachSame = ca1 && cb1 && ca1 === cb1;
  const learnSame = ca2 && cb2 && ca2 === cb2;
  if (teachSame || learnSame) return 0.15;
  return 0.4; // 都不命中但技能类别不同
}

/** 话题域 → 大类（§6.1 的 12 话题域归一）。自由词（如「螺丝刀」「早八」）返回 null。 */
export function topicFamilyOf(topic) {
  const s = String(topic || '');
  if (!s) return null;
  for (const [family, words] of TOPIC_FAMILY) {
    if (words.some((w) => s.includes(w))) return family;
  }
  return null;
}

/**
 * 话题词归一：§6.1 规定 interestTags / topicsWanted 取自 12 个话题域，
 * 但报名与种子数据里是自由词（「咖啡」「早八」「螺丝刀」）。先归到话题域再算重合，
 * 归不进去的保留原词（当作一个独立话题）——否则两个人都在「吃喝」却因为一个写
 * 「咖啡」一个写「夜宵」判成零重合，匹配会整体失真。
 */
function normalizeTopic(t) {
  const s = String(t || '').trim();
  if (!s) return '';
  return topicFamilyOf(s) || s;
}

/** 两个成员的话题集合（social 用 tags ∪ topicsWanted，已归一） */
function topicSet(f, withTopics = true) {
  const raw = withTopics
    ? [...(f.tagsOnly || []), ...(f.topics || [])]
    : [...(f.tagsOnly || [])];
  return new Set(raw.map(normalizeTopic).filter(Boolean));
}

/**
 * §6.4 C9 话题连通判定。
 * 契约要求 topicsWanted 来自 12 个话题域，实际报名里是自由词（「早八」「螺丝刀」），
 * 所以除了字面重合，再放宽两条：共享 ≥2 个词，或落进同一个话题域（吃喝 / 运动 / 影音…）。
 * 话题域级连通仍然是「聊得起来」的事实依据，不是放水。
 */
function tagLink(fa, fb) {
  const A = topicSet(fa, true);
  const B = topicSet(fb, true);
  let shared = 0;
  for (const x of A) if (B.has(x)) shared += 1;
  if (shared >= 2) return true;
  if (jaccard(A, B) >= 0.2) return true;
  for (const fam of (fa.families || [])) {
    if ((fb.families || new Set()).has(fam)) return true;
  }
  return false;
}

function topicLink(fa, fb, category) {
  if (tagLink(fa, fb)) return true;
  if (category === 'buddy' && goalMatch(fa.goalText, fb.goalText) >= 0.3) return true;
  if (category === 'skill' && complement(fa, fb) >= 0.5) return true;
  return false;
}

function feature(m) {
  const p = (m && m.profile) || {};
  const tagsOnly = m.interestTags || [];
  const topics = m.topicsWanted || [];
  return {
    userId: m.userId,
    E: num(p.socialEnergy, 0.5),
    X: num(p.expressiveness, 0.45),
    O: num(p.openness, 0.5),
    C: num(p.chrono, 0.5),
    G: num(p.goalIntensity, 0.4),
    P: num(p.privacyBoundary, 0.5),
    L: m.level == null ? 1 / 3 : (LEVEL_VALUE[m.level] ?? 1 / 3),
    level: m.level || null,
    grade: GRADE_ORDER[normalizeGrade(m.grade)] || 2,
    tagsOnly,
    topics,
    families: new Set([...tagsOnly, ...topics].map(topicFamilyOf).filter(Boolean)),
    slots: m.availableSlots || [],
    goalText: m.goalText || '',
    majorName: m.major || '',
    majorFamily: m.majorFamily || majorFamily(m.major),
    school: m.school || '',
    teach: m.teachSkill || '',
    learn: m.learnSkill || '',
  };
}

/* ------------------------------------------------------------------ *
 * 5. §6.3 四套打分函数
 * ------------------------------------------------------------------ */

function normalizeCategory(category) {
  const c = String(category || 'social');
  return Object.prototype.hasOwnProperty.call(WEIGHTS, c) ? c : 'social';
}

/**
 * 两人契合度。
 * @returns {{score:number, parts:Object<string,{label:string,weight:number,raw:number,contribution:number}>}}
 */
export function scorePair(a, b, category, ctx = {}) {
  const A = ensureMember(a);
  const B = ensureMember(b);
  if (!A || !B) return { score: 0, parts: {} };
  const cat = normalizeCategory(category || (ctx && ctx.category));
  const W = WEIGHTS[cat];
  const fa = feature(A);
  const fb = feature(B);
  const parts = {};
  const put = (key, label, raw, weight) => {
    const r = clamp01(raw);
    parts[key] = { label, weight, raw: r, contribution: r * weight };
  };

  if (cat === 'social') {
    // §6.3.1
    put('energyBalance', '性格互补', energyBalance(fa.E, fb.E), W.energyBalance);
    put('topicOverlap', '话题重合', jaccard(topicSet(fa), topicSet(fb)), W.topicOverlap);
    put('expressionFit', '表达节奏', similarFit(fa.X, fb.X), W.expressionFit);
    put('opennessFit', '开放性相近', similarFit(fa.O, fb.O), W.opennessFit);
    put('chronoFit', '作息容忍', similarFit(fa.C, fb.C), W.chronoFit);
    put('gradeFit', '年级跨度', gradeFit(fa.grade, fb.grade), W.gradeFit);
  } else if (cat === 'buddy') {
    // §6.3.2
    put('goalMatch', '目标一致', goalMatch(fa.goalText, fb.goalText), W.goalMatch);
    put('chronoFit', '作息重合', similarFit(fa.C, fb.C), W.chronoFit);
    put('intensityFit', '强度相当', similarFit(fa.G, fb.G), W.intensityFit);
    put('majorDiversity', '专业互补', majorDiversity(fa.majorFamily, fb.majorFamily), W.majorDiversity);
    // 安静容忍：1 - |ΔX| × 0.5，任一方 X > 0.75 再乘 0.8（搭子局不欢迎话痨）
    let quiet = clamp01(1 - Math.abs(fa.X - fb.X) * 0.5);
    if (fa.X > 0.75 || fb.X > 0.75) quiet *= 0.8;
    put('quietFit', '安静容忍', quiet, W.quietFit);
    put('slotFit', '时段重合', slotOverlap(fa.slots, fb.slots), W.slotFit);
  } else if (cat === 'competitive') {
    // §6.3.3（单对项合计 0.84）
    put('levelCloseness', '段位接近', levelCloseness(fa.L, fb.L), W.levelCloseness);
    put('goalFit', '争胜心接近', similarFit(fa.G, fb.G), W.goalFit);
    put('expressionFit', '性格搭配', similarFit(fa.X, fb.X), W.expressionFit);
    put('chronoFit', '体力/作息', similarFit(fa.C, fb.C), W.chronoFit);
    put('topicOverlap', '话题兼容', jaccard(new Set(fa.tagsOnly), new Set(fb.tagsOnly)), W.topicOverlap);
  } else {
    // §6.3.4
    put('complement', '技能互补', complement(A, B), W.complement);
    const teachWilling = mean([
      clamp01(0.4 + 0.3 * fa.G + 0.3 * fa.X),
      clamp01(0.4 + 0.3 * fb.G + 0.3 * fb.X),
    ]);
    put('teachWilling', '教愿意愿', teachWilling, W.teachWilling);
    const articulate = Math.max(fa.X, fb.X) >= 0.55 ? 1 : similarFit(fa.X, fb.X);
    put('articulate', '能讲清楚', articulate, W.articulate);
    put('learnWilling', '学习意愿', similarFit(fa.O, fb.O), W.learnWilling);
    put('slotFit', '时段重合', slotOverlap(fa.slots, fb.slots), W.slotFit);
    put('topicOverlap', '话题兼容', jaccard(new Set(fa.tagsOnly), new Set(fb.tagsOnly)), W.topicOverlap);
  }

  const total = Object.values(parts).reduce((s, p) => s + p.contribution, 0);
  return { score: round4(clamp01(total)), parts };
}

/* ------------------------------------------------------------------ *
 * 6. 组级：蛇形分队、主持人、组分数
 * ------------------------------------------------------------------ */

/** §6.3.3 teamBalance：按段位降序蛇形分两队 */
export function computeTeamBalance(list) {
  if (!list || list.length < 2) return { value: 1, teams: [] };
  const sorted = list
    .map((m) => ({ m, f: feature(m) }))
    .sort((x, y) => (y.f.L - x.f.L) || String(x.f.userId).localeCompare(String(y.f.userId)));
  const A = [];
  const B = [];
  sorted.forEach((item, i) => {
    // 蛇形：1→A 2→B 3→B 4→A 5→A 6→B …
    const slot = i % 4;
    if (slot === 0 || slot === 3) A.push(item);
    else B.push(item);
  });
  const avg = (arr) => (arr.length ? mean(arr.map((x) => x.f.L)) : 0);
  const diff = Math.abs(avg(A) - avg(B));
  return {
    value: round4(clamp01(1 - diff / 0.5)),
    teams: [
      { key: 'A', memberIds: A.map((x) => x.f.userId), avgLevel: round4(avg(A)) },
      { key: 'B', memberIds: B.map((x) => x.f.userId), avgLevel: round4(avg(B)) },
    ],
  };
}

/** 主持人：非竞技局看 expressiveness，竞技局看 goalIntensity（§6.4 C4 / §6.9 注） */
/**
 * 主持人：按局型换维度（口径由主理人 2025 裁定，覆盖 §6.4 C4 里「一律看 expressiveness」的写法）。
 *   social      → expressiveness 最高，阈值 0.60（社交局需要话头）
 *   buddy       → goalIntensity 最高，阈值 0.60（搭子局需要目标最硬的人盯进度）
 *   competitive → 段位最高（并列取 goalIntensity 高者），阈值 0.6667 = 至少「进阶」（竞技局需要水平）
 *   skill       → teachSkill 非空者里描述最长者（长度当具体度），非空即可
 * 并列一律 localeCompare 兜底，保证同一输入两次跑出同一个主持。
 */
export function pickHost(list, category) {
  if (!list || !list.length) return { hostId: null, present: false, value: 0 };
  const cat = normalizeCategory(category);
  const scored = list
    .map((m) => {
      const f = feature(m);
      if (cat === 'buddy') return { id: f.userId, v: f.G, g: f.G, ok: f.G >= 0.6 };
      if (cat === 'competitive') return { id: f.userId, v: f.L, g: f.G, ok: f.L >= 0.6667 - 1e-9 };
      if (cat === 'skill') {
        const t = String(f.teach || '').trim();
        return { id: f.userId, v: t.length, g: f.G, ok: t.length > 0 };
      }
      return { id: f.userId, v: f.X, g: f.G, ok: f.X >= 0.6 };
    })
    .sort((x, y) => (y.v - x.v) || (y.g - x.g) || String(x.id).localeCompare(String(y.id)));
  const top = scored[0];
  return { hostId: top.id, present: top.ok, value: round4(top.v) };
}

/** 组分数（§6.5 groupScore 伪码，逐项对齐） */
function computeGroupScore(list, category, opts = {}) {
  const cat = normalizeCategory(category);
  const event = opts.event || {};
  const cfg = opts.cfg || buildConfig(opts.type || {}, event, {});
  const n = list.length;
  const empty = {
    total: 0, base: 0, bonus: 0, penalty: 0, meanPair: 0, minPair: 0,
    divisor: 1, teamBalance: null, penalties: [], pairs: [],
  };
  if (n < 2) return empty;

  const pairCache = opts.pairCache || null;
  const getPair = (ma, mb) => {
    if (!pairCache) return scorePair(ma, mb, cat, opts);
    const key = String(ma.userId) < String(mb.userId)
      ? `${ma.userId}|${mb.userId}`
      : `${mb.userId}|${ma.userId}`;
    let hit = pairCache.get(key);
    if (!hit) { hit = scorePair(ma, mb, cat, opts); pairCache.set(key, hit); }
    return hit;
  };

  const pairs = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const r = getPair(list[i], list[j]);
      pairs.push({ a: list[i].userId, b: list[j].userId, score: r.score, parts: r.parts });
    }
  }

  const divisor = cat === 'competitive' ? COMPETITIVE_PAIR_WEIGHT : 1;
  const meanPair = mean(pairs.map((p) => p.score)) / divisor;
  const minPair = Math.min(...pairs.map((p) => p.score)) / divisor;
  let base = 0.6 * meanPair + 0.4 * minPair;
  let teamBalance = null;
  if (cat === 'competitive') {
    teamBalance = computeTeamBalance(list);
    base = COMPETITIVE_PAIR_WEIGHT * base + COMPETITIVE_TEAM_WEIGHT * teamBalance.value;
  }

  const host = pickHost(list, cat);
  // §6.5：氛围标签一定能给出，故 +0.02 恒定；有带节奏的人再 +0.03
  const bonus = (host.present ? 0.03 : 0) + 0.02;

  const feats = list.map(feature);
  const penalties = [];
  const addPenalty = (key, label, amount, detail) => {
    if (amount > 0) penalties.push({ key, label, amount: round4(amount), detail });
  };

  // 通用惩罚（§6.5）
  const isolated = feats.filter((f, i) => !feats.some((g, k) => k !== i && topicLink(f, g, cat))).length;
  addPenalty('topicIsolated', '话题孤立', 0.1 * isolated, `${isolated} 人与其他人话题零交集`);

  const schoolCap = num(cfg.schoolCap, 2);
  const schoolMax = maxCount(countBy(feats, (f) => f.school)).count;
  addPenalty('schoolCluster', '同校聚集', 0.05 * Math.max(0, schoolMax - schoolCap), `同校最多 ${schoolMax} 人，上限 ${schoolCap}`);

  const majorCap = 2;
  const majorMax = maxCount(countBy(feats, (f) => f.majorName)).count;
  const majorRate = cat === 'buddy' ? 0.06 : 0.08; // §6.3.2 专项 0.06 / 通用 0.08
  addPenalty('majorCluster', '同专业聚集', majorRate * Math.max(0, majorMax - majorCap), `同专业最多 ${majorMax} 人`);

  const meanE = mean(feats.map((f) => f.E));
  addPenalty('energyRange', '内向/外向失衡', (meanE < 0.25 || meanE > 0.8) ? 0.15 : 0, `平均社交能量 ${round4(meanE)}`);

  // 各 profile 专项惩罚（§6.3.x「惩罚项」）
  if (cat === 'social') {
    const allIntrovert = feats.every((f) => f.E < 0.45);
    addPenalty('allIntrovert', '全内向', allIntrovert ? 0.15 : 0, '整组都没人会先开口');
  }
  if (cat === 'buddy') {
    const badPairs = pairs.filter((p) => {
      const ia = list.findIndex((m) => m.userId === p.a);
      const ib = list.findIndex((m) => m.userId === p.b);
      return goalMatch(feats[ia].goalText, feats[ib].goalText) < 0.3;
    }).length;
    addPenalty('goalSplit', '目标分离', 0.12 * (badPairs / pairs.length), `${badPairs} 对的目标几乎不搭`);
    let sum = 0;
    let cnt = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) { sum += slotOverlap(feats[i].slots, feats[j].slots); cnt += 1; }
    }
    const slotRate = cnt ? sum / cnt : 0.5;
    addPenalty('slotSplit', '时段分散', slotRate < 0.3 ? 0.15 : 0, `两两时段重合率 ${round4(slotRate)}`);
  }
  if (cat === 'competitive') {
    addPenalty('teamUnbalanced', '分队失衡', teamBalance && teamBalance.value < 0.5 ? 0.1 : 0, `分队均衡 ${teamBalance ? teamBalance.value : '-'}`);
    const allQuiet = feats.every((f) => f.X < 0.35);
    addPenalty('allQuiet', '全组太闷', allQuiet ? 0.05 : 0, '没人会喊一声');
  }
  if (cat === 'skill') {
    const teaches = new Set(feats.map((f) => skillCategoryOf(f.teach)).filter(Boolean));
    addPenalty('sameSkill', '全员同技能', teaches.size <= 1 ? 0.12 : 0, '没有可交换的方向');
    const noSpeaker = feats.every((f) => f.X < 0.5);
    addPenalty('noSpeaker', '没人讲得清', noSpeaker ? 0.1 : 0, '缺一个能把事说明白的人');
    const closure = skillClosureCount(list);
    addPenalty('noClosure', '教/学不闭环', closure < n - 1 ? 0.25 : 0, `${closure}/${n} 人能配上对`);
  }

  const penalty = penalties.reduce((s, p) => s + p.amount, 0);
  const total = clamp01(base + bonus - penalty);
  return {
    total: round4(total),
    base: round4(base),
    bonus: round4(bonus),
    penalty: round4(penalty),
    meanPair: round4(meanPair),
    minPair: round4(minPair),
    divisor,
    teamBalance,
    penalties,
    pairs,
    hostId: host.hostId,
    hostPresent: host.present,
    meanEnergy: round4(meanE),
  };
}

/** §6.4 C10：能配上对的人数（complement ≥ 0.5 即算一对） */
function skillClosureCount(list) {
  let count = 0;
  for (let i = 0; i < list.length; i += 1) {
    const me = list[i];
    const ok = list.some((o, k) => k !== i && complement(me, o) >= 0.5);
    if (ok) count += 1;
  }
  return count;
}

/** §6.3.4 / §7.5 教↔学配对：按互补度降序贪心配对，确定性 */
function skillPairs(list) {
  const cands = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const c = complement(list[i], list[j]);
      if (c <= 0) continue;
      cands.push({ i, j, c });
    }
  }
  cands.sort((x, y) => (y.c - x.c)
    || String(list[x.i].userId).localeCompare(String(list[y.i].userId))
    || String(list[x.j].userId).localeCompare(String(list[y.j].userId)));
  const used = new Set();
  const out = [];
  for (const cand of cands) {
    if (used.has(cand.i) || used.has(cand.j)) continue;
    used.add(cand.i);
    used.add(cand.j);
    const a = list[cand.i];
    const b = list[cand.j];
    // 谁教谁：看对方想学的是不是我会的
    const aTeachesB = skillMatch(a.teachSkill, b.learnSkill);
    const teacher = aTeachesB ? a : b;
    const learner = aTeachesB ? b : a;
    out.push({
      teacherId: teacher.userId,
      learnerId: learner.userId,
      skill: teacher.teachSkill || learner.learnSkill || '',
      score: round4(cand.c),
      // 0.7 = 只有一边对得上（单向教），1.0 = 互相都有的换
      direction: cand.c >= 0.9 ? 'swap' : 'single',
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 7. §6.4 硬约束
 * ------------------------------------------------------------------ */

export const CONSTRAINT_LABELS = {
  C1: '人数',
  C2: '性别比例',
  C3: '内外向配比',
  C4: '带节奏的人',
  C5: '同校聚集',
  C6: '同专业聚集',
  C7: '隐私边界',
  C8: '段位跨度',
  C9: '话题连通',
  C10: '技能闭环',
  C11: '质量线',
};

function buildConfig(type = {}, event = {}, config = {}) {
  const t = type || {};
  const e = event || {};
  const gre = { ...DEFAULT_GENDER_RULE, ...(e.genderRule || {}), ...(config.genderRule || {}) };
  const minGroupSize = Math.max(2, num(config.minGroupSize ?? e.minGroupSize ?? t.groupSizeMin, 3));
  const maxGroupSize = Math.max(minGroupSize, Math.min(
    num(t.groupSizeMax ?? minGroupSize, minGroupSize),
    num(e.capacityPerGroup ?? t.groupSizeMax ?? minGroupSize, minGroupSize),
  ));
  return {
    minGroupSize,
    maxGroupSize,
    schoolCap: Math.max(1, num(config.schoolCap ?? e.schoolCap, 2)),
    genderRule: gre,
    capacityGroups: Math.max(1, num(e.capacityGroups, 1)),
    qualityFloor: num(config.qualityFloor, QUALITY_FLOOR),
  };
}

/**
 * 硬约束校验（§6.4 C1–C11）。
 * @param {object} group  { memberIds?, members? }
 * @param {object} config { event, activityType, category, users?, applications?, memberIndex?, config? }
 * @returns {{ok:boolean, violated:Array<{code:string,label:string,detail:string}>, score:number|null, memberCount:number}}
 */
export function validateGroup(group, config = {}) {
  const type = config.activityType || {};
  const event = config.event || {};
  const category = normalizeCategory(config.category || (group && group.category) || type.category || 'social');
  const cfg = buildConfig(type, event, config.config || {});
  const memberIndex = buildMemberIndex({ ...config, activityType: type, category });
  const list = resolveMembers(group, { memberIndex });

  if (!list.length) {
    // 组员数据没给全（比如只传了 groupId）：直接报数，不假装通过
    return {
      ok: false,
      violated: [{ code: 'C1', label: CONSTRAINT_LABELS.C1, detail: '拿不到组员数据，没法校验' }],
      score: null,
      memberCount: 0,
    };
  }

  let score = null;
  if (!config.skipQuality) score = computeGroupScore(list, category, { event, cfg, type }).total;

  const violated = checkConstraints(list, {
    category,
    event,
    type,
    cfg,
    phase: config.phase || 'final',
    score,
    pairFloor: config.pairFloor ?? resolvePairFloor(type),
    mixedLevel: config.mixedLevel ?? resolveMixedLevel(type),
    relaxedGender: config.relaxedGender === true,
  });
  return { ok: violated.length === 0, violated, score, memberCount: list.length };
}

/** 逐条判定，phases：grow（扩张中）/ final（成组前） */
function checkConstraints(list, opts = {}) {
  const category = normalizeCategory(opts.category);
  const event = opts.event || {};
  const type = opts.type || {};
  const cfg = opts.cfg || buildConfig(type, event, {});
  const phase = opts.phase || 'final';
  const isGrow = phase === 'grow';
  const pairFloor = num(opts.pairFloor, PAIR_FLOOR);
  const mixedLevel = Boolean(opts.mixedLevel);
  const relaxedGender = Boolean(opts.relaxedGender);
  const violated = [];
  const n = list.length;
  if (!n) return violated;
  const feats = list.map(feature);

  // C1 人数
  if (n > cfg.maxGroupSize) {
    violated.push({ code: 'C1', label: CONSTRAINT_LABELS.C1, detail: `${n} 人超过上限 ${cfg.maxGroupSize} 人` });
  }
  if (phase === 'final' && n < cfg.minGroupSize) {
    violated.push({ code: 'C1', label: CONSTRAINT_LABELS.C1, detail: `${n} 人不够成局线 ${cfg.minGroupSize} 人` });
  }

  // C2 性别比例
  // 只在成组前（final）判定。扩张阶段 2–3 人时「单一性别占比」天然接近 100%，
  // 中途判会把所有可行路径提前砍死（真实报名里 6 女 2 男很常见，照样能排出 3 女 2 男）。
  const gr = cfg.genderRule;
  if (gr.enabled && !isGrow && n >= 3) {
    const female = list.filter((m) => m.gender === 'female').length;
    const male = list.filter((m) => m.gender === 'male').length;
    const known = female + male;
    // 池子层面就凑不出合规比例时（例如 12 人里 9 女），C2 降级为「不得全同性别」，
    // 否则一桌都开不出来。降级与否由 buildGroups 预检决定，并在 notes 里说明原因。
    const relaxed = (category === 'buddy' && n < 4) || relaxedGender;
    if (known >= 2) {
      if (relaxed) {
        if (known === n && (female === n || male === n)) {
          violated.push({ code: 'C2', label: CONSTRAINT_LABELS.C2, detail: `${n} 人全是${female === n ? '女生' : '男生'}，搭子局至少要混一个` });
        }
      } else {
        const femaleRatio = female / n;
        const sameMax = Math.max(female, male) / n;
        if (femaleRatio + 1e-9 < gr.minFemaleRatio) {
          violated.push({ code: 'C2', label: CONSTRAINT_LABELS.C2, detail: `女生 ${female}/${n}，低于下限 ${Math.round(gr.minFemaleRatio * 100)}%` });
        }
        if (sameMax - 1e-9 > gr.maxSameGenderRatio) {
          violated.push({ code: 'C2', label: CONSTRAINT_LABELS.C2, detail: `单一性别占 ${Math.round(sameMax * 100)}%，超过上限 ${Math.round(gr.maxSameGenderRatio * 100)}%` });
        }
      }
    }
  }

  // C3 不能全内向 / 全外向（整组属性，只在成组前判）
  if (!isGrow && n >= 3) {
    const mE = mean(feats.map((f) => f.E));
    if (mE < 0.25 || mE > 0.8) {
      violated.push({ code: 'C3', label: CONSTRAINT_LABELS.C3, detail: `平均社交能量 ${round4(mE)}，不在 [0.25, 0.80]` });
    }
  }

  // C4 必须有带节奏的人（竞技局判据改用 goalIntensity，见 §6.9 注；同样只对成组判）
  if (!isGrow && n >= 3) {
    let okMax = false;
    let okSpread = true;
    if (category === 'competitive') {
      const gs = feats.map((f) => f.G);
      okMax = Math.max(...gs) >= 0.65;
      okSpread = n < 3 || (Math.max(...gs) - Math.min(...gs)) >= 0.15;
    } else {
      const xs = feats.map((f) => f.X);
      // §6.4 C4 原文：max(expressiveness) ≥ 0.60，各类型统一（竞技局按 §6.9 注改用争胜心）
      okMax = Math.max(...xs) >= 0.6;
      okSpread = n < 3 || (Math.max(...xs) - Math.min(...xs)) >= 0.15;
    }
    if (!okMax || !okSpread) {
      violated.push({
        code: 'C4',
        label: CONSTRAINT_LABELS.C4,
        detail: category === 'competitive'
          ? `争胜心最高 ${round4(Math.max(...feats.map((f) => f.G)))}，缺一个愿意张罗的人`
          : `表达欲最高 ${round4(Math.max(...feats.map((f) => f.X)))}，缺一个会先开口的人`,
      });
    }
  }

  // C5 同校不过度聚集
  const schoolMax = maxCount(countBy(feats, (f) => f.school));
  if (schoolMax.key && schoolMax.count > cfg.schoolCap) {
    violated.push({ code: 'C5', label: CONSTRAINT_LABELS.C5, detail: `${schoolMax.key} ${schoolMax.count} 人，上限 ${cfg.schoolCap}` });
  }

  // C6 同专业不过度聚集（≤2）
  const majorMax = maxCount(countBy(feats, (f) => f.majorName));
  if (majorMax.key && majorMax.count > 2) {
    violated.push({ code: 'C6', label: CONSTRAINT_LABELS.C6, detail: `${majorMax.key} ${majorMax.count} 人，上限 2` });
  }

  // C7 隐私边界
  const privacyHigh = feats.filter((f) => f.P >= 0.85).length;
  if (privacyHigh > num(cfg.genderRule.highPrivacyCap, 1)) {
    violated.push({ code: 'C7', label: CONSTRAINT_LABELS.C7, detail: `${privacyHigh} 人高隐私，上限 ${cfg.genderRule.highPrivacyCap}` });
  }

  // C8 段位跨度（competitive / skill 且 needsLevel）；sport / hiking 允许混合段位（主理人裁定）
  if (!mixedLevel && (category === 'competitive' || category === 'skill') && type.needsLevel) {
    const levels = feats.map((f) => f.L);
    const span = Math.max(...levels) - Math.min(...levels);
    if (span > 0.3334 + 1e-9) {
      violated.push({ code: 'C8', label: CONSTRAINT_LABELS.C8, detail: `段位跨度 ${round4(span)}，最多允许差 1 档` });
    }
  }

  // C9 话题连通：每个人至少与一名成员连上（连通性是整组属性，扩张中途只做参考）
  if (!isGrow && n >= 2) {
    const lonely = feats.filter((f, i) => !feats.some((g, k) => k !== i && topicLink(f, g, category)));
    if (lonely.length) {
      violated.push({ code: 'C9', label: CONSTRAINT_LABELS.C9, detail: `${lonely.length} 人与其他人没有任何共同话题` });
    }
  }

  // C10 技能闭环（整组属性）
  if (!isGrow && category === 'skill' && n >= 2) {
    const closure = skillClosureCount(list);
    if (closure < n - 1) {
      violated.push({ code: 'C10', label: CONSTRAINT_LABELS.C10, detail: `${closure}/${n} 人能配上教/学对，至少要 ${n - 1} 人` });
    }
  }

  // C11 质量线（含本类型的最低单对分下限：badminton/billiards 0.40、sport/hiking 0.25、其余 0.35）
  if (phase === 'final' && typeof opts.score === 'number' && opts.score < cfg.qualityFloor) {
    violated.push({ code: 'C11', label: CONSTRAINT_LABELS.C11, detail: `组分数 ${round4(opts.score)}，低于质量线 ${cfg.qualityFloor}` });
  }
  if (phase === 'final' && n >= 2) {
    let minPair = 1;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const s = scorePair(list[i], list[j], category).score;
        if (s < minPair) minPair = s;
      }
    }
    if (minPair < pairFloor - 1e-9) {
      violated.push({
        code: 'C11',
        label: CONSTRAINT_LABELS.C11,
        detail: `最低单对分 ${round4(minPair)}，低于本类型下限 ${pairFloor}`,
      });
    }
  }

  return violated;
}

/* ------------------------------------------------------------------ *
 * 8. §6.5 组队算法
 * ------------------------------------------------------------------ */

/**
 * @param {object} input { event, applications, users, activityType, config? }
 * @returns {{groups:Array, waitlisted:Array, notes:string[]}}
 */
export function buildGroups(input = {}) {
  const event = input.event || {};
  const applications = Array.isArray(input.applications) ? input.applications : [];
  const users = Array.isArray(input.users) ? input.users : [];
  const type = input.activityType || {};
  const category = normalizeCategory(type.matchProfile || type.category || 'social');
  const cfg = buildConfig(type, event, input.config || {});
  const notes = [];

  // 0. 过滤（§6.5 步骤 0）
  const userMap = new Map(users.filter(Boolean).map((u) => [u.id, u]));
  const goalGate = (COMPETITIVE_TUNING[type.id] || {}).minGoalIntensity;
  const eligible = [];   // 过准入门槛的
  const belowGate = [];  // 目标强度没到门槛的（先留着，看够不够一桌再决定要不要拒）
  let dropped = 0;
  for (const app of applications) {
    if (!app || app.status !== 'submitted') { dropped += 1; continue; }
    const user = userMap.get(app.userId);
    if (!user) { dropped += 1; continue; }
    if (user.blacklisted) { dropped += 1; continue; }
    const verify = user.verifyStatus || (user.verified === false ? 'pending' : 'verified');
    if (verify !== 'verified') { dropped += 1; continue; }
    const member = toMember(user, app, type);
    if (goalGate && member.profile.goalIntensity < goalGate) belowGate.push(member);
    else eligible.push(member);
  }

  /**
   * 准入门槛自适应降级（主理人口径）：
   * 门槛的目的是排掉明显不匹配的人，不是让场次开不出来。
   *  - 过关人数 ≥ 一桌 → 门槛照常执行，没过的人进候补并写明数值；
   *  - 过关人数 < 一桌（且总人数够开一桌）→ 放开门槛，全员参与，notes 里说明降级原因；
   *  - 总人数本来就不够一桌 → 门槛不生效，也不给「你目标强度低」这种无意义的原因。
   */
  const pool = [];
  const gated = [];
  let gateRelaxed = false;
  const totalApplicants = eligible.length + belowGate.length;
  if (goalGate && totalApplicants > 0) {
    if (eligible.length >= cfg.minGroupSize) {
      pool.push(...eligible);
      for (const m of belowGate) {
        gated.push({
          member: m,
          reason: `这局是按「认真打到什么程度」排的，你的目标强度 ${round4(m.profile.goalIntensity)} 低于本场门槛 ${goalGate}`,
        });
      }
      if (belowGate.length) notes.push(`${belowGate.length} 人目标强度低于 ${goalGate}，按门槛进候补（本场过关的人够一桌，门槛未放开）。`);
    } else {
      pool.push(...eligible, ...belowGate);
      gateRelaxed = true;
      if (totalApplicants >= cfg.minGroupSize) {
        notes.push(`本场 ${totalApplicants} 人报名，目标强度 ≥${goalGate} 的只有 ${eligible.length} 人，不够一桌 ${cfg.minGroupSize} 人，已按宽松口径编排，本局强度偏休闲。`);
      } else {
        notes.push(`本场 ${totalApplicants} 人报名，不足一桌 ${cfg.minGroupSize} 人，目标强度门槛本场不生效，不据此筛人。`);
      }
    }
  } else {
    pool.push(...eligible, ...belowGate);
  }
  pool.sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt))
    || String(a.userId).localeCompare(String(b.userId)));

  const pairFloor = resolvePairFloor(type);
  const mixedLevel = resolveMixedLevel(type);

  const makeWaitlist = (members, reasonOf) => members.map((m, i) => ({
    userId: m.userId,
    applicationId: m.applicationId,
    rank: i + 1,
    reason: reasonOf ? reasonOf(m, i) : `本场只凑到 ${pool.length} 人，不够 ${cfg.minGroupSize} 人开一桌`,
  }));

  if (pool.length < cfg.minGroupSize) {
    // 走到这里说明门槛已降级或本就没有门槛，所以不给「你目标强度低」这种自相矛盾的原因
    notes.push(`本场 ${pool.length} 人报名，少于 ${cfg.minGroupSize} 人成局线，本场不成局。`);
    return { groups: [], waitlisted: makeWaitlist(pool), notes };
  }

  // 1. 目标组规模（§6.5 步骤 1）
  const target = clamp(
    Math.round(pool.length / cfg.capacityGroups),
    cfg.minGroupSize,
    cfg.maxGroupSize,
  );
  notes.push(`本场 ${pool.length} 人，最多开 ${cfg.capacityGroups} 桌，目标 ${target} 人一桌，单对分下限 ${pairFloor}。`);

  // 池级可行性预检：如果整池的性别构成连一桌都排不出来，就把 C2 降级为「不得全同性别」。
  // 约束的目的是「别让一桌全是同一性别」，不是「让一桌都开不出来」。
  const gr = cfg.genderRule;
  let relaxedGender = false;
  if (gr.enabled) {
    const femaleCnt = pool.filter((m) => m.gender === 'female').length;
    const maleCnt = pool.filter((m) => m.gender === 'male').length;
    const known = femaleCnt + maleCnt;
    const groupCount = Math.max(1, Math.min(cfg.capacityGroups, Math.floor(pool.length / cfg.minGroupSize)));
    const lo = Math.ceil(gr.minFemaleRatio * target);
    const hi = Math.floor(gr.maxSameGenderRatio * target);
    const feasible = known < 2
      || (groupCount * lo <= femaleCnt && femaleCnt <= groupCount * hi
        && maleCnt >= groupCount * (target - hi));
    if (!feasible) {
      relaxedGender = true;
      notes.push(`本场 ${pool.length} 人里女 ${femaleCnt} / 男 ${maleCnt}，按 ${gr.maxSameGenderRatio * 100}% 的单一性别上限排不出 ${groupCount} 桌，性别约束本场降级为「不得全同性别」。`);
    }
  }

  // 2. 预计算单对分（§6.5 步骤 2）
  const n = pool.length;
  const P = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const s = scorePair(pool[i], pool[j], category).score;
      P[i][j] = s;
      P[j][i] = s;
    }
  }
  const degree = P.map((row, i) => row.filter((v, j) => j !== i && v >= pairFloor).length);

  // 单对分缓存 + 组分数缓存：算法要反复算同一批组合，缓存后 N=200 也能同步跑完
  const pairCache = new Map();
  const scoreCache = new Map();
  const scoreOfIdx = (idx) => {
    const key = idx.slice().sort((a, b) => a - b).join(',');
    const hit = scoreCache.get(key);
    if (hit !== undefined) return hit;
    const value = computeGroupScore(listOfIdx(idx), category, { event, cfg, type, pairCache }).total;
    scoreCache.set(key, value);
    return value;
  };
  const listOfIdx = (idx) => idx.map((i) => pool[i]);
  const hardOKIdx = (idx, phase) => {
    const list = listOfIdx(idx);
    const score = phase === 'final' ? scoreOfIdx(idx) : undefined;
    return checkConstraints(list, {
      category, event, type, cfg, phase, score, pairFloor, mixedLevel, relaxedGender,
    }).length === 0;
  };

  /**
   * 兜底扩张：贪心在「话题连通 + 性别比例」同时生效时会过早绑定一对没法再扩的人
   * （真实报名里很常见：两个人聊得来，但第三个人跟谁都没交集）。
   * 这里用固定宽度的束搜索补一条确定性的退路：不引入随机、结果可重放。
   */
  const growWithBeam = (seedIdx, poolIdx, desiredSize = target, beamWidth = 4) => {
    let beam = [[seedIdx]];
    const seenAll = new Set([String(seedIdx)]);
    while (beam.length && beam[0].length < desiredSize) {
      const candidates = [];
      for (const g of beam) {
        for (const c of poolIdx) {
          if (g.includes(c)) continue;
          const cand = [...g, c];
          const key = cand.slice().sort((a, b) => a - b).join(',');
          if (seenAll.has(key)) continue;
          if (!hardOKIdx(cand, 'grow')) continue;
          seenAll.add(key);
          candidates.push(cand);
        }
      }
      if (!candidates.length) break;
      candidates.sort((a, b) => (scoreOfIdx(b) - scoreOfIdx(a))
        || a.slice().sort((x, y) => x - y).join(',').localeCompare(b.slice().sort((x, y) => x - y).join(',')));
      beam = candidates.slice(0, beamWidth);
    }
    const valid = beam
      .filter((g) => g.length >= cfg.minGroupSize && scoreOfIdx(g) >= cfg.qualityFloor && hardOKIdx(g, 'final'))
      .sort((a, b) => (scoreOfIdx(b) - scoreOfIdx(a))
        || a.slice().sort((x, y) => x - y).join(',').localeCompare(b.slice().sort((x, y) => x - y).join(',')));
    return valid[0] || null;
  };

  /** 在给定的一批人里凑一组（逐个种子试束搜索，取分最高），找不到返回 null */
  const formFrom = (idxs, desiredSize = target) => {
    const seeds = idxs.slice().sort((a, b) => {
      if (degree[b] !== degree[a]) return degree[b] - degree[a];
      const xa = feature(pool[a]).X;
      const xb = feature(pool[b]).X;
      if (xb !== xa) return xb - xa;
      return String(pool[a].userId).localeCompare(String(pool[b].userId));
    });
    let best = null;
    for (const seed of seeds) {
      const g = growWithBeam(seed, idxs.filter((i) => i !== seed), desiredSize);
      if (!g) continue;
      if (!best || scoreOfIdx(g) > scoreOfIdx(best)
        || (scoreOfIdx(g) === scoreOfIdx(best) && g.join(',') < best.join(','))) best = g;
    }
    return best;
  };

  // 3. 贪心种子扩张（§6.5 步骤 3）
  //    与伪码的两处差别，都是为了「12 人能开 2 桌时别只开 1 桌」：
  //    a) 凑不满一桌时不 break，而是把种子退回池子、换下一个种子重试；
  //    b) 整场跑多遍（种子排序按固定偏移轮换），取「桌数最多 → 总分最高」的那个划分。
  //    偏移是写死的 {0,1,2,3,5,7}，没有随机，同一输入永远同一个结果。
  const runGreedy = (offset = 0) => {
    const remaining = pool.map((_, i) => i);
    const groups = [];
    const left = [];
    let stuck = 0;
    let cursor = 0;

    while (remaining.length >= cfg.minGroupSize && cursor < 512) {
      cursor += 1;
      const ordered = remaining.slice().sort((a, b) => {
        if (degree[b] !== degree[a]) return degree[b] - degree[a];
        const xa = feature(pool[a]).X;
        const xb = feature(pool[b]).X;
        if (xb !== xa) return xb - xa;
        const sa = String(pool[a].submittedAt);
        const sb = String(pool[b].submittedAt);
        if (sa !== sb) return sa.localeCompare(sb);
        return String(pool[a].userId).localeCompare(String(pool[b].userId));
      });
      const seed = ordered[offset % ordered.length];
      const g = [seed];

      while (g.length < target) {
        let best = null;
        let bestDelta = -Infinity;
        const candidates = remaining.filter((i) => !g.includes(i)).sort((a, b) => {
          if (degree[b] !== degree[a]) return degree[b] - degree[a];
          return String(pool[a].userId).localeCompare(String(pool[b].userId));
        });
        for (const c of candidates) {
          const next = [...g, c];
          if (!hardOKIdx(next, 'grow')) continue;
          const delta = scoreOfIdx(next) - scoreOfIdx(g);
          if (delta > bestDelta + 1e-12) { bestDelta = delta; best = c; }
        }
        if (best === null) break;
        g.push(best);
      }

      // 贪心出来的组要么达标，要么用束搜索补一条退路；都没有就把种子退回池子（§6.5 3.3）
      let chosen = null;
      if (g.length >= cfg.minGroupSize
        && scoreOfIdx(g) >= cfg.qualityFloor
        && hardOKIdx(g, 'final')) {
        chosen = g;
      } else {
        chosen = growWithBeam(seed, remaining.filter((i) => i !== seed));
        if (!chosen) stuck += 1;
      }

      if (!chosen) {
        left.push(seed);
        const at = remaining.indexOf(seed);
        if (at >= 0) remaining.splice(at, 1);
        continue;
      }

      groups.push(chosen.slice());
      for (const i of chosen) {
        const at = remaining.indexOf(i);
        if (at >= 0) remaining.splice(at, 1);
      }
    }

    left.push(...remaining);
    return { groups, leftover: [...new Set(left)], stuck };
  };

  // 划分选择：桌数优先、其次总组分数，再其次按组签名做稳定兜底（保证可重放）
  const signature = (pGroups) => pGroups.map((g) => g.slice().sort((a, b) => a - b).join(',')).sort().join('|');
  const partitionScore = (p) => (p.groups.length * 100) + p.groups.reduce((s2, g) => s2 + scoreOfIdx(g), 0);
  const expectedGroups = Math.min(cfg.capacityGroups, Math.floor(pool.length / cfg.minGroupSize));
  let partition = runGreedy(0);
  if (partition.groups.length < expectedGroups && pool.length <= 80) {
    for (const offset of [1, 2, 3, 5, 7]) {
      const cand = runGreedy(offset);
      const d = partitionScore(cand) - partitionScore(partition);
      if (d > 1e-9
        || (Math.abs(d) <= 1e-9 && signature(cand.groups) < signature(partition.groups))) {
        partition = cand;
      }
      if (partition.groups.length >= expectedGroups) break;
    }
  }
  const groupsIdx = partition.groups;
  let leftover = partition.leftover;
  if (partition.stuck) notes.push(`${partition.stuck} 个种子凑不满 ${cfg.minGroupSize} 人，已回池换人重试。`);
  if (expectedGroups > 1) notes.push(`本场按 ${cfg.capacityGroups} 桌编排，目标 ${expectedGroups} 桌。`);

  // 4a. 修复阶段：先把违反 C2/C4/C9 的组换人换到能成立（§6.4「换人」）
  repairGroups(groupsIdx, {
    pool, category, event, type, cfg, scoreOfIdx, hardOKIdx, target, pairFloor, mixedLevel, relaxedGender,
  });

  // 4a-2. 跨组修复：候补里还剩得下一桌人时，从已成组借 1 人过来重新成组。
  //       贪心只对「组内」负责，会把最优的 6 人挑走、把剩下 6 人卡在性别/话题上；
  //       这一步专门收拾那种「12 人能开 2 桌却只开 1 桌」的场面。
  const cross = crossGroupRepair(groupsIdx, leftover, { cfg, scoreOfIdx, hardOKIdx, formFrom, target });
  leftover = cross.leftover;
  if (cross.added) notes.push(`跨组换人补开了 ${cross.added} 桌（从已成组借人，两组都过质量线才接受）。`);

  // 4b. 局部搜索：确定性全遍历（替代 §6.5 的随机采样，保证可重放）
  localSearch(groupsIdx, { pool, category, event, type, cfg, scoreOfIdx, hardOKIdx });

  // 5. 收尾（§6.5 步骤 5）
  const groupRows = groupsIdx.map((idx, i) => {
    const members = listOfIdx(idx);
    // tableNo 用 A1–H8 格式（§5.7），桌名用「A 桌 / B 桌」；本场 capacityGroups ≤ 8
    const letter = String.fromCharCode(65 + i);
    const tableNo = `${letter}1`;
    const name = `${letter} 桌`;
    const score = computeGroupScore(members, category, { event, cfg, type });
    const host = pickHost(members, category);
    const groupShell = { members, category, memberIds: members.map((m) => m.userId) };
    const vibe = predictVibe(groupShell, category);
    const reason = makeMatchReason(groupShell, category);
    const memberReasons = buildMemberReasons(groupShell, category);
    const checkinCode = String(
      (hashSeed(`${event.id || 'e'}:${tableNo}:${members.map((m) => m.userId).join(',')}`) % 900000) + 100000,
    );
    const row = {
      id: `g_${event.id || 'e'}${String(i + 1).padStart(2, '0')}`,
      eventId: event.id || null,
      name,
      tableNo,
      index: i + 1,
      memberIds: members.map((m) => m.userId),
      category,
      matchProfile: category,
      matchScore: score.total,
      reason,
      vibe,
      vibeLabel: vibe.tag,
      vibeNote: vibe.note,
      hostId: host.hostId,
      memberReasons,
      checkinCode,
      checkinCode6: checkinCode,
      locked: true,
      status: 'forming',
      explanation: explainScore(groupShell, category),
      notes: [],
    };
    // 内部用：不进入 JSON，避免把整份画像塞进存储
    Object.defineProperty(row, 'members', { value: members, enumerable: false, configurable: true });
    return row;
  });

  // 组数与随机扰动顺序无关，但按桌号稳定排序
  groupRows.sort((a, b) => a.index - b.index);

  // 6. 剩余人处理（§6.5 步骤 6）：先排正常候补，再把没过准入门槛的（gated）接在后面
  const waitlisted = leftover
    .map((i) => pool[i])
    .sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt))
      || String(a.userId).localeCompare(String(b.userId)))
    .map((m, i) => {
      const why = groupRows.length === 0
        ? `本场 ${pool.length} 人，没有一个组合同时过得了硬约束和质量线`
        : `本场开了 ${groupRows.length} 桌，剩下的位置不够一桌 ${cfg.minGroupSize} 人，先进候补`;
      return { userId: m.userId, applicationId: m.applicationId, rank: i + 1, reason: why };
    });

  for (const g of gated) {
    waitlisted.push({
      userId: g.member.userId,
      applicationId: g.member.applicationId,
      rank: waitlisted.length + 1,
      reason: g.reason,
    });
  }

  if (waitlisted.length) notes.push(`${waitlisted.length} 人进候补，按报名时间排位。`);
  if (gated.length) notes.push(`${gated.length} 人没过本局准入门槛（目标强度 / 段位），候补原因已写明。`);
  if (dropped) notes.push(`${dropped} 份报名被过滤（未提交 / 未认证 / 拉黑）。`);
  if (groupRows.length) notes.push(`平均组分数 ${round4(mean(groupRows.map((g) => g.matchScore)))}，各组差异见 explainScore 的加权拆解。`);

  return { groups: groupRows, waitlisted, notes };
}

/**
 * 跨组修复：候补人数还够一桌时，从已成组「借」1 人，用借来的人 + 候补重新成一组。
 * 只有「原组借完仍合法且 ≥ 质量线」+「新组同样合法」才接受，最多 50 轮。
 * 全流程确定性：遍历顺序固定，没有随机。
 */
function crossGroupRepair(groupsIdx, leftover, ctx) {
  const { cfg, scoreOfIdx, hardOKIdx, formFrom, target } = ctx;
  let wl = leftover.slice();
  let added = 0;

  for (let iter = 0; iter < 50 && wl.length >= cfg.minGroupSize; iter += 1) {
    // 1) 候补内部能不能直接成一组
    const direct = formFrom(wl, target);
    if (direct) {
      groupsIdx.push(direct.slice());
      wl = wl.filter((i) => !direct.includes(i));
      added += 1;
      continue;
    }

    // 2) 借人：从每一组里各借一人试（借出后原组仍要合法且过质量线）
    let accepted = false;
    for (let gi = 0; gi < groupsIdx.length && !accepted; gi += 1) {
      const group = groupsIdx[gi];
      for (const borrowed of group) {
        const donor = group.filter((x) => x !== borrowed);
        if (donor.length < cfg.minGroupSize) continue;
        if (scoreOfIdx(donor) < cfg.qualityFloor || !hardOKIdx(donor, 'final')) continue;
        const built = formFrom([...wl, borrowed], target);
        if (!built || !built.includes(borrowed)) continue;
        groupsIdx[gi] = donor;
        wl = wl.filter((i) => !built.includes(i));
        groupsIdx.push(built.slice());
        added += 1;
        accepted = true;
        break;
      }
    }
    if (!accepted) break;
  }

  return { leftover: wl, added };
}

/** §6.4「换人」：优先修硬约束，其次不显著掉分 */
function repairGroups(groupsIdx, ctx) {
  const {
    pool, category, event, type, cfg, scoreOfIdx, hardOKIdx, pairFloor, mixedLevel, relaxedGender,
  } = ctx;
  const listOfIdx = (idx) => idx.map((i) => pool[i]);
  const violationsOf = (idx) => {
    const score = scoreOfIdx(idx);
    return checkConstraints(listOfIdx(idx), {
      category, event, type, cfg, phase: 'final', score, pairFloor, mixedLevel, relaxedGender,
    });
  };

  for (let round = 0; round < REPAIR_ROUNDS; round += 1) {
    let improved = false;
    for (let gi = 0; gi < groupsIdx.length; gi += 1) {
      for (let gj = gi + 1; gj < groupsIdx.length; gj += 1) {
        const A = groupsIdx[gi];
        const B = groupsIdx[gj];
        const badA = violationsOf(A).length;
        const badB = violationsOf(B).length;
        if (!badA && !badB) continue;
        const before = badA + badB;
        let bestSwap = null;
        for (let ia = 0; ia < A.length; ia += 1) {
          for (let ib = 0; ib < B.length; ib += 1) {
            const a = A[ia];
            const b = B[ib];
            const nextA = A.map((x, k) => (k === ia ? b : x));
            const nextB = B.map((x, k) => (k === ib ? a : x));
            const after = violationsOf(nextA).length + violationsOf(nextB).length;
            if (after < before) {
              const delta = (scoreOfIdx(nextA) + scoreOfIdx(nextB)) - (scoreOfIdx(A) + scoreOfIdx(B));
              if (!bestSwap || after < bestSwap.after || (after === bestSwap.after && delta > bestSwap.delta)) {
                bestSwap = { gi, ia, ib, nextA, nextB, after, delta };
              }
            }
          }
        }
        if (bestSwap) {
          groupsIdx[bestSwap.gi] = bestSwap.nextA;
          groupsIdx[gj] = bestSwap.nextB;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
    if (!improved) break;
  }
}

/** §6.5 步骤 4：两两换人。目标函数额外惩罚「矮子组」 */
function localSearch(groupsIdx, ctx) {
  const { category, event, type, cfg, scoreOfIdx, hardOKIdx } = ctx;
  if (groupsIdx.length < 2) return;
  const objective = (groups) => {
    const scores = groups.map((g) => scoreOfIdx(g));
    const lowPenalty = scores.reduce((s, x) => s + Math.max(0, cfg.qualityFloor - x), 0);
    return scores.reduce((s, x) => s + x, 0) - 0.5 * lowPenalty;
  };
  let current = objective(groupsIdx);

  for (let round = 0; round < SWAP_ROUNDS; round += 1) {
    let accepted = false;
    for (let gi = 0; gi < groupsIdx.length; gi += 1) {
      for (let gj = gi + 1; gj < groupsIdx.length; gj += 1) {
        const A = groupsIdx[gi];
        const B = groupsIdx[gj];
        let best = null;
        for (let ia = 0; ia < A.length; ia += 1) {
          for (let ib = 0; ib < B.length; ib += 1) {
            const nextA = A.map((x, k) => (k === ia ? B[ib] : x));
            const nextB = B.map((x, k) => (k === ib ? A[ia] : x));
            if (!hardOKIdx(nextA, 'final') || !hardOKIdx(nextB, 'final')) continue;
            const trial = groupsIdx.map((g, k) => (k === gi ? nextA : (k === gj ? nextB : g)));
            const value = objective(trial);
            if (!best || value > best.value) best = { gi, gj, nextA, nextB, value };
          }
        }
        if (best && best.value > current + SWAP_EPSILON) {
          groupsIdx[best.gi] = best.nextA;
          groupsIdx[best.gj] = best.nextB;
          current = best.value;
          accepted = true;
          break;
        }
      }
      if (accepted) break;
    }
    if (!accepted) break;
  }
}

/* ------------------------------------------------------------------ *
 * 9. §6.6 匹配理由（模板填充，不调模型，不写「算法认为」）
 * ------------------------------------------------------------------ */

function shortQuote(text, max = 12) {
  // 先去掉原文里的引号/句号，避免「引用套引用」；再按第一个停顿截断
  const s = String(text || '')
    .replace(/[「」『』“”"'’‘]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  const clause = s.split(/[，。；！？,.;!?、]/)[0] || s;
  const cut = clause.length > max ? clause.slice(0, max) : clause;
  // 截断后去掉挂在末尾的虚词，避免出现「你最近一次觉得活着真好是」这种半截话
  return cut
    .replace(/[是的了和就在把被给对与及或很也都还]$/, '')
    .replace(/^我(想|觉得|是|在)/, '')
    .replace(/^我/, '');
}

const SLOT_DAY = { mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日' };
const SLOT_DAY_PART = {
  mon: '工作日', tue: '工作日', wed: '工作日', thu: '工作日', fri: '工作日', sat: '周末', sun: '周末',
};
const SLOT_TIME = { am: '上午', pm: '晚上' };

function slotLabel(slot) {
  const [day, time] = String(slot || '').split('-');
  if (!day) return '待定';
  return `${SLOT_DAY_PART[day] || ''}${SLOT_TIME[time] || ''}` || '相同时段';
}

function commonSlotLabel(list) {
  const counts = countBy(list.flatMap((m) => m.availableSlots || []), (s) => s);
  const top = maxCount(counts);
  return top.key ? slotLabel(top.key) : '还没对上时段';
}

function commonGoalKeyword(list) {
  const texts = list.map((m) => m.goalText).filter(Boolean);
  if (!texts.length) return '';
  const kw = countBy(
    texts.flatMap((t) => GOAL_KEYWORDS.filter((k) => t.includes(k))),
    (k) => k,
  );
  const best = maxCount(kw);
  return best.key || '';
}

/** 共同话题：按「提到该话题的人数」计（一个人同时写在 tags 和 topics 里只算一次） */
function commonTopics(list, min = 2) {
  const counts = new Map();
  for (const m of list) {
    const set = new Set([...(m.topicsWanted || []), ...(m.interestTags || [])]);
    for (const t of set) counts.set(t, (counts.get(t) || 0) + 1);
  }
  const exact = [...counts.entries()]
    .filter(([, c]) => c >= min)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .map(([topic, count]) => ({ topic, count }));
  if (exact.length) return exact;

  // 字面没有重合并：退到话题域一级，说「你们都提到吃喝」而不是编一个不存在的话题
  const famCounts = new Map();
  for (const m of list) {
    const fams = new Set([...(m.topicsWanted || []), ...(m.interestTags || [])]
      .map(topicFamilyOf)
      .filter(Boolean));
    for (const f of fams) famCounts.set(f, (famCounts.get(f) || 0) + 1);
  }
  return [...famCounts.entries()]
    .filter(([, c]) => c >= min)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .map(([topic, count]) => ({ topic, count }));
}

/**
 * 整组句（§6.6 A）。125 字以内，读起来像人写的。
 * @param {object} group  buildGroups 产出的组，或 { memberIds, members? }
 * @param {string} category
 * @param {object} ctx   { memberIndex }（外部调用时传 users/applications 也能解析）
 */
export function makeMatchReason(group, category, ctx = {}) {
  const cat = normalizeCategory(category || (group && group.category));
  const memberIndex = buildMemberIndex(ctx);
  const list = resolveMembers(group, { memberIndex });
  const n = list.length;
  if (n < 2) return '这桌还没凑齐人。人齐了会有一句说明为什么是你们几个。';

  const feats = list.map(feature);

  if (cat === 'social') {
    const topics = commonTopics(list, 2);
    if (!topics.length) {
      // content-plan §6.2 兜底句
      return '没有特别巧的理由。你们的问卷放在一起读，节奏差不多——都不是最先开口的那种，但都接得住。所以破冰多给了两道。';
    }
    const top = topics[0];
    const second = topics[1];
    const xs = feats.map((f) => f.X);
    const gap = Math.max(...xs) - Math.min(...xs);
    const diffSentence = gap >= 0.3
      ? `一个爱说的配了 ${n - 1} 个爱听的`
      : gap >= 0.15
        ? '有一个人会先开口，其余的人接得上'
        : '几个人说话的量差不多，不用抢话';
    const secondPart = (second && second.count < top.count) ? `，${second.count} 个人提到「${second.topic}」` : '';
    const lead = top.count >= n
      ? `你们 ${n} 个人全都提到「${top.topic}」`
      : `你们 ${n} 个人里，${top.count} 个都提到「${top.topic}」`;
    return `${lead}${secondPart}；${diffSentence}，正好有人能接住话题。`;
  }

  if (cat === 'buddy') {
    const keyword = commonGoalKeyword(list) || shortQuote(list.find((m) => m.goalText)?.goalText, 8) || '同一件事';
    const slot = commonSlotLabel(list);
    const families = new Set(feats.map((f) => f.majorFamily));
    const diversitySentence = families.size >= 2
      ? '专业也不太一样，不容易聊成同一个话题的死循环'
      : '进度差得不多，谁卡住了另一个人立刻知道';
    return `你们 ${n} 个人目标都指向「${keyword}」，可用的时间撞在${slot}，${diversitySentence}。`;
  }

  if (cat === 'competitive') {
    const levels = list.map((m) => m.level).filter(Boolean);
    const levelMode = maxCount(countBy(levels, (l) => l));
    const label = levelMode.key ? (LEVEL_CN[levelMode.key] || levelMode.key) : '入门';
    const tb = computeTeamBalance(list);
    const maxLevel = Math.max(...feats.map((f) => f.L));
    const balanceSentence = tb.value >= 0.8
      ? '分两队打起来不会一边倒'
      : (maxLevel <= 1 / 3 + 1e-9
        ? '分两队会有强弱差，新手多的那边多热两轮'
        : '分两队会有强弱差，适合让老手带一下');
    const meanGoal = mean(feats.map((f) => f.G));
    const goalSentence = meanGoal >= 0.65
      ? '都想赢，节奏会快'
      : meanGoal <= 0.4
        ? '都以玩为主，输赢不影响下一局'
        : '强度中等，打得起来但不会翻脸';
    return `你们 ${n} 个人段位都在「${label}」附近，${balanceSentence}，${goalSentence}。`;
  }

  const pairs = skillPairs(list);
  if (!pairs.length) {
    return `你们 ${n} 个人技能方向不太重合，牌里给每人留了十分钟讲自己会的那件事，讲完再决定谁教谁。`;
  }
  const teachList = pairs.slice(0, 2)
    .map((p) => {
      const teacher = list.find((m) => m.userId === p.teacherId);
      return `${teacher ? teacher.nickname : '有人'} 教 ${p.skill || '一样东西'}`;
    })
    .join('、');
  const learnerNames = pairs.slice(0, 2)
    .map((p) => (list.find((m) => m.userId === p.learnerId) || {}).nickname)
    .filter(Boolean)
    .join(' 和 ');
  const swapCount = pairs.filter((p) => p.direction === 'swap').length;
  const singleCount = pairs.length - swapCount;
  const learnList = learnerNames
    ? `${learnerNames} 想学的正好是${pairs.length > 1 ? '这两样' : '这个'}`
    : '另外几个人先当观众';
  // 只有一边对得上时不许说成「交换」：老老实实写单向，课表里留了补位时间
  const directionNote = singleCount > 0
    ? `；其中 ${singleCount} 对是单向教，课表后半段留了互换补位`
    : '';
  return `你们 ${n} 个人里，${pairs.length} 对能配上——${teachList}，${learnList}${directionNote}。`;
}

/** §6.6 B：每人一句，4 条候选不重复用 */
function buildMemberReasons(group, category) {
  const list = resolveMembers(group, {});
  if (!list.length) return [];
  const feats = list.map(feature);
  const topicCounts = commonTopics(list, 2);

  return list.map((m, i) => {
    const myQ = (m.questionsAsked || [])[0] || '';
    const myQShort = shortQuote(myQ, 12) || shortQuote(m.selfDesc, 10) || '一个还没问出口的问题';
    // 1. 提问撞方向：2-gram 有交集即算
    const qSiblings = list.filter((o, k) => k !== i && myQ && (o.questionsAsked || [])[0]
      && cosine2gram(myQ, o.questionsAsked[0]) >= 0.2).length;
    // 2. 自述标签撞车
    const mySelfTag = shortQuote(m.selfDesc, 8) || '话不算多';
    const selfSiblings = list.filter((o, k) => k !== i && o.selfDesc && m.selfDesc
      && cosine2gram(m.selfDesc, o.selfDesc) >= 0.15).length;
    // 3. 想遇见的人
    const wantSiblings = list.filter((o, k) => k !== i && o.wantMeet && m.wantMeet
      && cosine2gram(m.wantMeet, o.wantMeet) >= 0.15).length;
    // 4. 共同话题
    const shared = topicCounts[0];

    const candidates = [
      qSiblings > 0
        ? `你提的「${myQShort}」和另外 ${qSiblings} 个人的问题撞了同一个方向。`
        : `你提的「${myQShort}」这桌没人准备过，正好由你先问。`,
      selfSiblings > 0
        ? `你说自己${mySelfTag}，这桌上有 ${selfSiblings} 个人也是。`
        : `你写自己${mySelfTag}，这桌的牌会留出时间让这种节奏的人开口。`,
      wantSiblings > 0
        ? `你想遇见的人，这组里另外 ${wantSiblings} 个人也在找。`
        : `你想遇见的人，这桌暂时没有，所以牌里留了一张给你自己问的。`,
      shared
        ? `你们 ${shared.count} 个人的${shared.topic}是同一挂的，开场不用硬找话。`
        : `这桌没有重合的话题，从「这学期最早一节课几点」开始最安全。`,
    ];
    return { userId: m.userId, nickname: m.nickname, reasonForUser: candidates[i % candidates.length] };
  });
}

/* ------------------------------------------------------------------ *
 * 10. §6.7 氛围预测（1 个标签 + 1 句解释，按序短路）
 * ------------------------------------------------------------------ */

/**
 * @param {object} group  buildGroups 产出的组，或 { memberIds, snapshots? }
 * @param {string} category
 * @param {object} ctx   可选 { users, applications, memberIndex, event, activityType }
 * @returns {{tag:string, note:string, rule:string}}
 */
export function predictVibe(group, category, ctx = {}) {
  const cat = normalizeCategory(category || (group && group.category));
  const memberIndex = buildMemberIndex(ctx);
  const list = resolveMembers(group, { memberIndex });
  if (list.length < 2) return { tag: '等人到齐', note: '人还没凑齐，先不预测。', rule: 'fallback' };
  const feats = list.map(feature);
  const xs = feats.map((f) => f.X);
  const es = feats.map((f) => f.E);
  const os = feats.map((f) => f.O);
  const maxX = Math.max(...xs);
  const meanE = mean(es);
  const sdE = stdev(es);
  const sdO = stdev(os);

  if (cat === 'competitive') {
    const tb = computeTeamBalance(list).value;
    const levels = feats.map((f) => f.L);
    const span = Math.max(...levels) - Math.min(...levels);
    const goals = feats.map((f) => f.G);
    const maxL = Math.max(...levels);
    const speakerCount = xs.filter((x) => x >= 0.6).length;
    if (tb >= 0.8 && span <= 0.3334 + 1e-9) {
      return { tag: '势均力敌，会打到最后一分', note: '两队平均段位差不多，蛇形分队之后没有明显强侧。', rule: 'comp-1' };
    }
    if (stdev(goals) < 0.12) {
      return { tag: '水平差不多，气氛比输赢重要', note: '争胜心都在同一个水平，输赢不影响下一局。', rule: 'comp-2' };
    }
    if (span > 0.0001 && span <= 0.3334 + 1e-9 && maxL >= 2 / 3) {
      return { tag: '有人会教，有人会被带', note: '段位差一档，进阶的那位先打一局，给大家看站位。', rule: 'comp-3' };
    }
    if (maxL <= 1 / 3 + 1e-9) {
      return { tag: '新手友好局', note: `${list.length} 个人都是刚上手的水平，重点是别让谁一个人站角落。`, rule: 'comp-4' };
    }
    if (mean(goals) >= 0.65) {
      return { tag: '强度偏高，做好出汗准备', note: `都想赢，${speakerCount} 个人会主动喊，热身别省。`, rule: 'comp-5' };
    }
    return { tag: '打完去吃饭', note: '段位跨度不大，先打两轮再看谁想加场。', rule: 'comp-6' };
  }

  if (cat === 'skill') {
    const pairs = skillPairs(list);
    const maxXHere = maxX;
    if (pairs.length >= 3) {
      return { tag: '互教互学，散场能带走一个技能', note: `${pairs.length} 对能配上，每人至少当一次老师。`, rule: 'skill-1' };
    }
    if (maxXHere >= 0.65 && pairs.length >= 2) {
      return { tag: '有人在讲，有人在记', note: `${pairs.length} 对配对，话最多的那位先开讲。`, rule: 'skill-2' };
    }
    if (sdO >= 0.2) {
      return { tag: '一个想深挖，一个想广撒网', note: '有人想深挖一门，有人想铺开几门，节奏一快一慢。', rule: 'skill-3' };
    }
    return { tag: '先各讲十分钟，再决定学谁的', note: `只配上 ${pairs.length} 对，剩下的人先观摩，再决定学谁的。`, rule: 'skill-4' };
  }

  // 社交 / 搭子（§6.7 同一套标签集）
  const speakers = xs.filter((x) => x >= 0.6).length;
  const openHigh = os.filter((o) => o >= 0.65).length;
  if (maxX >= 0.65 && meanE >= 0.4 && meanE <= 0.6 && sdE >= 0.12) {
    return { tag: '一个带节奏，其余慢慢跟上', note: `有 ${speakers} 个人会主动开口，其余人接得上但不会抢话。`, rule: 'soc-1' };
  }
  if (meanE < 0.4 && Math.max(...os) >= 0.6) {
    return { tag: '慢热，但会越聊越深', note: '刚开始话少，聊到具体的事就接上了。', rule: 'soc-2' };
  }
  if (meanE >= 0.6 && sdE < 0.15) {
    return { tag: '一坐下就热闹', note: '坐下就能聊，不用谁先找话题。', rule: 'soc-3' };
  }
  if (maxX < 0.5) {
    return { tag: '需要一个开场的人', note: '没有天然的开场人，牌里预置了两道最安全的破冰题。', rule: 'soc-4' };
  }
  if (sdO >= 0.25 && openHigh >= 2) {
    return { tag: '观点会很不一样', note: '有人想深聊，有人只想随便说说，观点题会分岔。', rule: 'soc-5' };
  }
  if (meanE < 0.35 && sdE < 0.12) {
    return { tag: '安静但不冷场', note: '话都不多，节奏慢但稳，牌一张一张翻。', rule: 'soc-6' };
  }
  return { tag: '适合边吃边慢慢聊', note: '常规节奏，不赶时间，适合边吃边聊。', rule: 'soc-7' };
}

/* ------------------------------------------------------------------ *
 * 11. 后台可视化：把加权项拆开
 * ------------------------------------------------------------------ */

/**
 * 后台「匹配详情」用：单项均值 × 权重 = 贡献，能直接画条形图。
 * @returns {object} 可直接 JSON 化
 */
export function explainScore(group, category, ctx = {}) {
  const cat = normalizeCategory(category || (group && group.category));
  const memberIndex = buildMemberIndex(ctx);
  const list = resolveMembers(group, { memberIndex });
  const event = ctx.event || {};
  const type = ctx.activityType || {};
  const cfg = buildConfig(type, event, ctx.config || {});
  const detail = computeGroupScore(list, cat, { event, cfg, type });

  const keys = Object.keys(WEIGHTS[cat]);
  const terms = keys.map((key) => {
    const rows = detail.pairs.map((p) => p.parts[key]).filter(Boolean);
    const meanRaw = mean(rows.map((r) => r.raw));
    const weight = rows.length ? rows[0].weight : WEIGHTS[cat][key];
    return {
      key,
      label: rows.length ? rows[0].label : key,
      weight,
      meanRaw: round4(meanRaw),
      contribution: round4(meanRaw * weight),
    };
  });

  return {
    total: detail.total,
    floor: cfg.qualityFloor,
    category: cat,
    memberCount: list.length,
    pairCount: detail.pairs.length,
    divisor: detail.divisor,
    meanPair: detail.meanPair,
    minPair: detail.minPair,
    base: detail.base,
    bonus: detail.bonus,
    penalty: detail.penalty,
    teamBalance: detail.teamBalance,
    meanEnergy: detail.meanEnergy,
    hostId: detail.hostId ?? pickHost(list, cat).hostId,
    hostPresent: detail.hostPresent ?? pickHost(list, cat).present,
    terms,
    penalties: detail.penalties,
    pairs: detail.pairs.map((p) => ({ a: p.a, b: p.b, score: round4(p.score) })),
    vibe: predictVibe(group, cat),
  };
}

/* ------------------------------------------------------------------ *
 * 12. 权重自检（§6 开头：加总必须为 1，改了两边一起改）
 * ------------------------------------------------------------------ */
const EXPECTED_SUMS = { social: 1, buddy: 1, competitive: COMPETITIVE_PAIR_WEIGHT, skill: 1 };
for (const [cat, expected] of Object.entries(EXPECTED_SUMS)) {
  const sum = Object.values(WEIGHTS[cat]).reduce((s, v) => s + v, 0);
  if (Math.abs(sum - expected) > 1e-9) {
    throw new Error(`[match] ${cat} 权重合计 ${sum}，应为 ${expected}（见 site-spec §6.3，改权重须同步改文档）`);
  }
}
