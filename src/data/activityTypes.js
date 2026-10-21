// 16 类活动配置。文案取自 content-plan §3，配置取自 site-spec §5.2「16 类冻结配置」。
// venueKinds 是场地类型词（用于筛选 chips），真正的 活动↔场地 关联在 venues.js 的 activityTypes 里。
// scene 是 1–6 的整数，对应 components.css 里的 .pattern--{scene}，卡片背景只用 CSS 图案，不引图片。

const RAW = [
  {
    id: 'dinner', name: '饭局', en: 'DINNER', category: 'social', scene: 3,
    blurb: '六个人，一家小馆，点六个菜',
    detail: '贝岗或南亭的小馆，人均 30 上下，AA；吃完可以散步到中心湖。',
    duration: 120, groupSize: [5, 6], levelRequired: false, equipmentRequired: false,
    priceLabel: 'AA · 人均 45 上下', venueKinds: ['餐饮', '小馆'],
  },
  {
    id: 'boardgame', name: '桌游·剧本杀局', en: 'BOARDGAME', category: 'social', scene: 2,
    blurb: '狼人杀或一个本，玩到有人笑岔气',
    detail: 'GOGO 三楼的桌游店，桌游人均 25–40，剧本杀 60 起。',
    duration: 180, groupSize: [5, 6], levelRequired: false, equipmentRequired: false,
    priceLabel: 'AA · 人均 40 上下', venueKinds: ['桌游店', '商场'],
  },
  {
    id: 'movie', name: '观影局', en: 'MOVIE', category: 'social', scene: 1,
    blurb: '挑一部都没看过的片，散场再聊半小时',
    detail: '可以先借教室投影，也可以去 GOGO 的影院，学生票 30–40。',
    duration: 150, groupSize: [4, 5], levelRequired: false, equipmentRequired: false,
    priceLabel: 'AA · 学生票 35 上下', venueKinds: ['影院', '教室'],
  },
  {
    id: 'ktv', name: 'KTV 歌局', en: 'KTV', category: 'social', scene: 5,
    blurb: '不飙高音，轮流点自己会唱的',
    detail: '北亭或广大商业中心的小包，3 小时人均 30–50，含饮料。',
    duration: 180, groupSize: [6, 8], levelRequired: false, equipmentRequired: false,
    priceLabel: 'AA · 人均 45 上下', venueKinds: ['KTV', '商场'],
  },
  {
    id: 'citywalk', name: 'City Walk·扫街局', en: 'CITY WALK', category: 'social', scene: 6,
    blurb: '绕岛走一条线，中途便利店补给',
    detail: '内环一圈 4.3 公里，走到南亭拐进去吃碗牛杂再回。',
    duration: 150, groupSize: [4, 6], levelRequired: false, equipmentRequired: false,
    priceLabel: '不收费 · 自带补给', venueKinds: ['户外', '街巷'],
  },
  {
    id: 'gallery', name: '看展逛馆局', en: 'GALLERY', category: 'social', scene: 4,
    blurb: '大学城或市区的展，看完在门口聊',
    detail: '广美美术馆常有毕业展，免费；市区的展要坐 4 号线转 8 号线。',
    duration: 120, groupSize: [4, 5], levelRequired: false, equipmentRequired: false,
    priceLabel: 'AA · 门票 60 上下', venueKinds: ['美术馆', '展厅'],
  },
  {
    id: 'study', name: '自习局', en: 'STUDY', category: 'buddy', scene: 2,
    blurb: '四个人一桌，各看各的，中间不聊天',
    detail: '广工图书馆研讨室要刷校园卡预约，早上八点放号；华工西湖苑旁的自习室十点关。',
    duration: 180, groupSize: [3, 4], levelRequired: false, equipmentRequired: false,
    priceLabel: '不收费', venueKinds: ['研讨室', '自习室', '图书馆'],
  },
  {
    id: 'exam', name: '考研·考证搭子局', en: 'EXAM', category: 'buddy', scene: 1,
    blurb: '考同一场的人，对进度，对错题',
    detail: '期末周图书馆抢不到座，通常约宿舍楼下的自习室或空教室。',
    duration: 120, groupSize: [3, 4], levelRequired: false, equipmentRequired: false,
    priceLabel: '不收费', venueKinds: ['自习室', '教室'],
  },
  {
    id: 'nightrun', name: '夜跑局', en: 'NIGHT RUN', category: 'buddy', scene: 6,
    blurb: '内环一圈 4.3 公里，按最慢的配速',
    detail: '晚上九点半内环，路灯够亮，南亭那个路口没有红绿灯，要停一下。',
    duration: 60, groupSize: [3, 4], levelRequired: false, equipmentRequired: false,
    priceLabel: '不收费', venueKinds: ['户外', '跑道'],
  },
  {
    id: 'sport', name: '运动局', en: 'SPORT', category: 'competitive', scene: 5,
    blurb: '什么都能玩，看当天场地空哪个',
    detail: '大学城体育中心，篮球和排球场要提前三天订，周日下午基本满。',
    duration: 90, groupSize: [6, 8], levelRequired: true, equipmentRequired: true,
    priceLabel: 'AA · 场地费均摊', venueKinds: ['体育中心', '球场'],
  },
  {
    id: 'billiards', name: '桌球·乒乓局', en: 'BILLIARDS', category: 'competitive', scene: 3,
    blurb: '台球或乒乓，输的人下楼买水',
    detail: '南亭和贝岗的台球厅 15–25 一小时，杆有点旧，皮头该换了。',
    duration: 90, groupSize: [4, 4], levelRequired: true, equipmentRequired: false,
    priceLabel: 'AA · 人均 30 上下', venueKinds: ['台球厅', '球室'],
  },
  {
    id: 'badminton', name: '羽毛球局', en: 'BADMINTON', category: 'competitive', scene: 4,
    blurb: '两小时场地，四个人轮着上场',
    detail: '体育中心羽毛球 30–40 一小时，场地费 AA，球自己带或现场买。',
    duration: 90, groupSize: [4, 4], levelRequired: true, equipmentRequired: false,
    priceLabel: 'AA · 人均 35 上下', venueKinds: ['体育中心', '球馆'],
  },
  {
    id: 'hiking', name: '爬山局', en: 'HIKING', category: 'competitive', scene: 6,
    blurb: '4 号线出岛，半天爬完一座小山',
    detail: '大夫山（7 号线）或火炉山（转 6 号线），来回车费 10 块以内，山上没信号。',
    duration: 240, groupSize: [6, 8], levelRequired: true, equipmentRequired: true,
    priceLabel: 'AA · 车费 20 上下', venueKinds: ['山地', '户外'],
  },
  {
    id: 'gaming', name: '游戏开黑局', en: 'GAMING', category: 'competitive', scene: 1,
    blurb: '五排或联机，有人负责报点',
    detail: '一般约宿舍或 GOGO 的电竞馆，自带耳机，馆里一小时 15 左右。',
    duration: 150, groupSize: [5, 5], levelRequired: true, equipmentRequired: false,
    priceLabel: 'AA · 人均 25 上下', venueKinds: ['电竞馆', '宿舍'],
  },
  {
    id: 'photo', name: '摄影互拍局', en: 'PHOTO', category: 'skill', scene: 2,
    blurb: '互相拍，走之前每人拿到 5 张',
    detail: '中心湖下午四点的光最好；广美外墙和南亭老街都能出片。',
    duration: 150, groupSize: [4, 6], levelRequired: false, equipmentRequired: true,
    priceLabel: '不收费 · 自带设备', venueKinds: ['户外', '街巷', '美术馆'],
  },
  {
    id: 'skillswap', name: '技能交换局', en: 'SKILLSWAP', category: 'skill', scene: 4,
    blurb: '你教我剪视频，我教你弹第一首歌',
    detail: '带电脑和带琴的各一半，通常在空教室或咖啡店，两节课各 40 分钟。',
    duration: 120, groupSize: [4, 6], levelRequired: false, equipmentRequired: false,
    priceLabel: '不收费 · 各带各的', venueKinds: ['教室', '咖啡店'],
  },
]

// 16 个字标定稿（content-strategist）：必须是物件或动作，16 字互不重复，
// 且不与所属局名里的任一个字相同，所以「跑/羽/展/山/换」故意不用。只存汉字，不用 emoji。
const GLYPH = {
  dinner: '碗', boardgame: '骰', movie: '幕', ktv: '麦',
  citywalk: '步', gallery: '框', study: '书', exam: '卷',
  nightrun: '鞋', sport: '哨', billiards: '杆', badminton: '拍',
  hiking: '峰', gaming: '键', photo: '镜', skillswap: '课',
}

// site-spec 的字段名（durationMin / groupSizeMin / tagline …）在此一次性派生，
// 让按接口契约写代码的同事也能直接读到，避免两套字段各写一遍。
export const activityTypes = RAW.map((t, i) => ({
  ...t,
  glyph: GLYPH[t.id],
  matchProfile: t.category,
  tagline: t.blurb,
  durationMin: t.duration,
  groupSizeMin: t.groupSize[0],
  groupSizeMax: t.groupSize[1],
  needsLevel: t.levelRequired,
  needsGear: t.equipmentRequired,
  materialKind: t.category === 'social' ? 'cards'
    : t.category === 'buddy' ? 'goal'
      : t.category === 'competitive' ? 'tournament' : 'curriculum',
  sortOrder: (i + 1) * 10,
  active: true,
}))

export const activityTypeMap = Object.fromEntries(activityTypes.map(t => [t.id, t]))

export const categories = [
  { id: 'social', name: '闲聊型', en: 'SOCIAL', note: '侧重性格配比与话题兼容' },
  { id: 'buddy', name: '搭子型', en: 'BUDDY', note: '侧重目标一致与作息匹配' },
  { id: 'competitive', name: '竞技型', en: 'COMPETITIVE', note: '侧重水平段位接近' },
  { id: 'skill', name: '技能型', en: 'SKILL', note: '侧重技能互补配对' },
]
