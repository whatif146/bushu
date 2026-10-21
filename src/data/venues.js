// 15 个大学城真实场地（content-plan §5）。开放时间按「都开放」处理，
// openDays 用 1=周一 … 7=周日。activityTypes 里存的是 activityTypes.js 的 id。

export const venues = [
  {
    id: 'v_001', name: '中心湖公园', kind: '校外', campus: '大学城公共',
    blurb: '岛上最大的一片草地，傍晚六点的光最好，人多但不吵',
    detail: '没有围墙，晚上十点以后路灯只亮一半。',
    capacityGroups: 3, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['citywalk', 'photo', 'study'],
  },
  {
    id: 'v_002', name: '内环路', kind: '校外', campus: '大学城公共',
    blurb: '绕岛一圈 4.3 公里的柏油路，九点以后基本只剩跑步的人',
    detail: '全程没有红绿灯，只有南亭那个路口要停。',
    capacityGroups: 4, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['nightrun', 'citywalk'],
  },
  {
    id: 'v_003', name: '大学城体育中心', kind: '校外', campus: '大学城公共',
    blurb: '羽毛球、篮球、田径场都有，场地要提前三天订',
    detail: '周日下午全场爆满，工作日晚上七点前好订。',
    capacityGroups: 5, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['sport', 'badminton', 'nightrun'],
  },
  {
    id: 'v_004', name: '岭南印象园', kind: '校外', campus: '大学城公共',
    blurb: '仿旧骑楼一条街，学生票 30，下午人少',
    detail: '园里卖鸡公榄的摊子只在周末摆。',
    capacityGroups: 3, openDays: [2, 3, 4, 5, 6, 7],
    activityTypes: ['citywalk', 'photo', 'gallery'],
  },
  {
    id: 'v_005', name: 'GOGO 新天地', kind: '校外', campus: '大学城公共',
    blurb: '岛上唯一的商场，桌游店、影院、奶茶都在一栋楼里',
    detail: '三楼桌游店的小包隔音一般，隔壁能听见你们喊。',
    capacityGroups: 6, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['boardgame', 'movie', 'gaming', 'dinner'],
  },
  {
    id: 'v_006', name: '贝岗美食街', kind: '校外', campus: '大学城公共',
    blurb: '一条街全是小馆，人均 30 能吃饱，十点还有人',
    detail: '巷子深处那家潮汕砂锅粥，十一点以后不再接单。',
    capacityGroups: 4, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['dinner', 'citywalk'],
  },
  {
    id: 'v_007', name: '广大商业中心', kind: '校外', campus: '大学城公共',
    blurb: '比 GOGO 便宜一档，KTV 和台球厅在同一层',
    detail: '负一层台球厅的杆比楼上的新。',
    capacityGroups: 5, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['ktv', 'billiards', 'dinner'],
  },
  {
    id: 'v_008', name: '南亭村', kind: '校外', campus: '大学城公共',
    blurb: '岛南边的村子，吃得比贝岗实在，晚上很安静',
    detail: '村口那家肠粉只开到上午十一点。',
    capacityGroups: 3, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['dinner', 'billiards', 'citywalk'],
  },
  {
    id: 'v_009', name: '穗石村', kind: '校外', campus: '大学城公共',
    blurb: '岛西边，靠近广美，适合边走边聊',
    detail: '村里有几面墙是广美学生画的，隔一学期会换。',
    capacityGroups: 2, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['citywalk', 'photo', 'nightrun'],
  },
  {
    id: 'v_010', name: '华工西湖苑', kind: '校内', campus: '华南理工大学',
    blurb: '华工里面的一片水面，旁边有石凳，坐着能聊两小时',
    detail: '石凳晚上有点凉，得带件外套。',
    capacityGroups: 3, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['study', 'photo', 'skillswap'],
  },
  {
    id: 'v_011', name: '广工图书馆研讨室', kind: '校内', campus: '广东工业大学',
    blurb: '刷校园卡预约，隔音好，适合真的要看书的局',
    detail: '每天早上八点放号，手慢就没有。',
    capacityGroups: 4, openDays: [1, 2, 3, 4, 5, 6],
    activityTypes: ['study', 'exam', 'skillswap'],
  },
  {
    id: 'v_012', name: '星海音乐厅周边', kind: '校内', campus: '星海音乐学院',
    blurb: '傍晚有学生在楼下大厅练琴，站外面听得见',
    detail: '有演出时门口查票，大厅随便进。',
    capacityGroups: 2, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['gallery', 'skillswap', 'citywalk'],
  },
  {
    id: 'v_013', name: '广美美术馆', kind: '校内', campus: '广州美术学院',
    blurb: '毕业展期间免费，六层楼能逛两小时',
    detail: '周一闭馆，第一次去的人基本都撞上过。',
    capacityGroups: 3, openDays: [2, 3, 4, 5, 6, 7],
    activityTypes: ['gallery', 'photo'],
  },
  {
    id: 'v_014', name: '中大东校区图书馆前草坪', kind: '校内', campus: '中山大学',
    blurb: '下午有人在这躺着看书，太阳落下前最好坐',
    detail: '边上那几棵树下最凉，去晚了没位置。',
    capacityGroups: 3, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['study', 'skillswap', 'photo'],
  },
  {
    id: 'v_015', name: '北亭', kind: '校外', campus: '大学城公共',
    blurb: 'KTV、烧烤、便利店都亮着，凌晨也不黑',
    detail: '烧烤摊到凌晨两点，收摊前会便宜卖。',
    capacityGroups: 4, openDays: [1, 2, 3, 4, 5, 6, 7],
    activityTypes: ['ktv', 'dinner', 'gaming'],
  },
]

export const venueMap = Object.fromEntries(venues.map(v => [v.id, v]))
