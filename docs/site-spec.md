# 不熟局 BU SHU · 站点规格卡

> 作者：文构间（requirement-architect）· 状态：**已冻结，可施工**
> 这是全队唯一施工依据。前端照第 3、4、10 节写页面，数据层照第 5、9 节写 store，算法照第 6 节写 `lib/match.js`，物料照第 7 节写 `lib/materials.js`。
> 本文件覆盖主理人冻结的 12 节结构（对应模板 7 节：第 1 节=模板 1，第 2 节=模板 2，第 3+4 节=模板 3+4，第 6 节=模板 6，第 9 节=模板 5，第 10 节=模板 7，第 5/7/8/11/12 节为本产品增补）。
> **全文不含任何「待定 / TBD / 视情况而定」。凡是规格，都可直接落代码。**

---

## 1. 站点定位与目标访客

### 1.1 一句话定位

**我们只问你想干什么，不问你想认识谁。**

不熟局把广州大学城 10 校的同学凑成一桌，一起干一件具体的小事。**局上不发生别的事。** 你和谁一组、去哪，活动开始前才知道。

> **写作约束（重要）**：这段是全站唯一的「产品定义句」，会被抄进 meta description、分享卡、应用商店简介。
> 它**只能陈述我们交付的东西**（一桌人 + 一件具体的事 + 局内引导），**不得出现任何结果承诺**——「认识几个新朋友」「交到朋友」「找到同好」全部禁用。原句曾写「认识几个新朋友」，与全站「不承诺任何结果」自相矛盾，已删。
> 「局上不发生别的事」这句依赖上下文才完整，**只用于页面内**；meta description / 分享卡等脱离上下文的位置，改用事实陈述版：「广州大学城 10 校的同学，凑一桌，一起干件小事。」

### 1.2 站点类型与转化动作

| 项 | 结论 | 理由 |
|---|---|---|
| 站点类型 | **工具站**（主）+ **落地页**（首页打法） | 用户一生会来 5 次以上（报名→查局→现场→回顾→下次），不是一次性浏览页；且每次来都要「办一件事」，工具站结构对。首页承担唯一转化入口，因此按落地页打法组织首屏与 CTA。 |
| 核心转化动作 | **提交一次报名**（`Application.status = submitted`） | 只有一个。付款、签到、评价、续桌都是这个动作的下游，不得在首屏与首屏附近与之竞争。 |
| 成功指标（首发唯一看板） | 首页 UV → 报名提交率 ≥ 8% | 不追注册数、不追停留时长。 |

### 1.3 三类典型访客（画像决定文案与字段取舍）

| 画像 | 具体是谁 | 此刻的真实处境 | 他听到什么会走 | 站点怎么接住他 |
|---|---|---|---|---|
| **A · 新生·小周**（18 岁，大一入学 6 周） | 大学城某校新生，宿舍 4 人，社交半径=室友+同班前两排 | 想认识人但**没有抓手**。班会、迎新都过去了，主动搭话又觉得冒犯。不知道大学城有哪些地方可去。 | 「脱单」「交友」「扩展人脉」——立刻判为相亲/微商局 | 首屏强调**一件事**（吃一顿饭/打一场球），不强调「认识人」；局类型带让他先认领「我想干的事」；明确写「不谈恋爱，不推销」 |
| **B · 考研党·阿May**（21 岁，大三下） | 目标是上岸，日程切成上午/下午/晚上三块 | 需要**能一起坐着的人**，不是能聊天的人。怕局上全是寒暄浪费时间，更怕被拉进玩乐的局。 | 「轻松愉快」「一起玩」「社交」 | 搭子型局写明**目标一致 + 作息匹配 + 全程低声**；报名表在搭子局把「性格题」换成「目标题」，字段更少，转化更高 |
| **C · 社交疲劳·老陈**（20 岁，大二） | 社团当过干事，破冰游戏玩到吐 | 讨厌**被安排的尬聊**。要具体的事当挡箭牌：「我不是来社交的，我是来打球的」。 | 「破冰」「团队游戏」「认识新朋友」这类字眼 | 文案一律用**事**做主语（打一场球 / 看一个展），人做宾语；现场页第一屏就是物料本身，不放自我介绍环节 |

> **禁止出现在任何页面的词**：脱单、配对、交友、缘分、心动、CP、灵魂伴侣、扩展人脉、高端。
> **推荐用词**：凑一桌、搭个伴、一起干件事、不熟、开局、散场。

### 1.4 核心转化路径与流失风险

主路径（最短路径 5 步可完成；第 5–8 步为留存回路，不是转化）：

| # | 步骤 | 用户此刻心里的问题 | 页面 + 承接手段 | 流失风险（高/中/低） | 削减措施（已定，不再讨论） |
|---|---|---|---|---|---|
| 1 | 落到首页 | 「这玩意是相亲吗？」 | `/` 首屏：一句话主张 + 唯一主 CTA「报一局」+ 本周已开 N 桌 | **高** | 首屏第一屏不出现「认识新朋友」；「我们不打保票」哲学段排在 §3.1 的**区块 7**（手机上约第 4–5 屏）；跑马灯第一句是「不谈恋爱，不推销」 |
| 2 | 挑一件事 | 「有没有我想干的？」 | `/` 局类型带（16 类横向滚动）+ 本周局列表（含剩余位/时间/校区/价格） | 中 | 16 类全露出，不用下拉筛选；每张局卡只 4 条信息，按钮直接进 `/join?type=dinner&event=e_xxx` **带着选择进表单** |
| 3 | 填问卷 | 「要填多少？会不会很麻烦？」 | `/join` 7 步，**每步 ≤5 个字段**，顶部进度条 + 「还剩 3 步」 | **高**（长表单是本产品第一杀手） | ①先认证后选题，第 1 步只 3 个必填；②性格题 3 道开放题全部允许 20 字短答并给示例句；③竞技/技能局才追加段位题（条件题），社交局全程不出现「段位」「装备」；④P1：草稿本地保存，中途退出可续填 |
| 4 | 等揭晓 | 「我会被分到什么人？」 | `/me` 报名卡：倒计时到 `matchAt` + 「正在给你排桌」+ 已报名场次列表 | 中 | 给**确定性**：明确写出「X 月 X 日 20:00 出结果，出结果微信/站内会有提示」；倒计时到分钟 |
| 5 | 看同组 | 「都是些什么人？会不会很尴尬？」 | `/table/:groupId` 同组速览 + 匹配理由 + 整组氛围标签 + 集合信息（`venueRevealAt` 前锁住） | **高** | ①每人给一句**我方生成**的正面画像句，不展示原始问卷；②展示「为你们这桌选的 3 个共同话题」制造期待；③集合地点锁住但显示「几点解锁」，把悬念做成参与感而不是不安全感 |
| 6 | 到现场 | 「我现在该干嘛？」 | `/live/:groupId` 首屏即物料（卡牌第 1 张/热身第 1 步），全屏无导航 | 低 | 现场页去掉一切导航与营销；字号加大到 18px 起；一个主按钮「下一题」 |
| 7 | 回顾 | 「要不要再看一眼？」 | `/recap/:groupId` 一句话总结 + 金句投票 + 合影墙 + 想续桌 | 低 | 金句投票 1 次点击即完成，不做长评价表；想续桌用「点人名」而非打分 |
| 8 | 续桌 / 再来 | 「下次还来吗？」 | `/recap` 底部「再报一局」→ `/` 局类型带 | 中 | 续桌结果下次开桌时兑现；「再报一局」按钮直接落到他没报过的局类型上 |

**关键机制（决定产品成立与否）**：`venueRevealAt` 之前，`/table/:groupId` **不显示场地名、地址、集合点**。这是「盲盒」的物理载体，任何页面都不得提前泄露。

---

## 2. 站点地图与路由表

### 2.1 站点地图

```
#/                                  落地页（产品介绍 + 本周局 + 报名入口）
├── #/join                           多步报名问卷（?type=<activityTypeId>&event=<eventId> 可预选）
├── #/me                             我的局（报名卡 / 局卡 / 已结束场的回顾入口）
├── #/table/:groupId                 同组速览 + 局内物料 + 集合信息
├── #/live/:groupId                  现场引导（移动端优先，全屏）
├── #/recap/:groupId                 回顾与评价 / 想续桌
└── #/admin                          管理后台（默认跳 #/admin/match）
    ├── #/admin/users                用户管理
    ├── #/admin/match                匹配工作台
    ├── #/admin/library              题库与玩法库
    ├── #/admin/activities           活动类型管理
    ├── #/admin/venues               场地管理
    ├── #/admin/materials            物料导出
    └── #/admin/tasks                运营任务清单（含紧急反馈收件箱）
```

**路由实现约定**：使用 `hashchange` 手写路由（不引 react-router）。路由匹配器 `src/lib/router.jsx` 导出 `matchRoute(hash)`，返回 `{ name, params, query }`。

**已冻结的两条路由决定（不允许再讨论）**：
1. 后台 tab 用**子路径**而非 query：`#/admin/users`、`#/admin/match`、`#/admin/library`、`#/admin/activities`、`#/admin/venues`、`#/admin/materials`、`#/admin/tasks`。**不采用 `?tab=` 形式。** `#/admin` 无子路径时重定向到 `#/admin/match`。
2. 七个页面路由的路径与参数名一次定死：`/`、`/join`、`/me`、`/table/:groupId`、`/live/:groupId`、`/recap/:groupId`、`/admin`。**参数名是 `groupId`，不是 `id`。** 页面组件从 `params.groupId` 取值。

### 2.2 全局派生状态（五个阶段）

所有页面的展示差异由 `lib/state.js → resolveStage({ event, application, now })` 统一计算，**页面不得自己判断时间**。

| 阶段 | 判定条件（按序短路） | 语义 |
|---|---|---|
| `guest` | 无 `application`（含 application.status ∈ {canceled, expired}） | 没报名 |
| `submitted` | `event.status ∈ {signup, matching}` 且 `application.status ∈ {submitted, waitlisted}` | 已报名未揭晓 |
| `matched` | `event.status ∈ {locked}` 或 `now < event.startAt - 15min`，且 `application.status = matched` | 已揭晓，未到现场 |
| `live` | `now ∈ [event.startAt - 15min, event.endAt + 60min]` 且 `application.status ∈ {matched, checked_in}` | 活动中 |
| `ended` | `now > event.endAt + 60min` 或 `event.status = ended` | 已结束 |

> 边界：`startAt - 15min` 起开放现场页（提前到场的人比准点到的人多，这是真实数据）；`endAt + 60min` 后开放回顾页（留 1 小时散场缓冲）。

### 2.3 七路由 × 五状态 展示矩阵

| 路由 | `guest`（未报名） | `submitted`（已报名未揭晓） | `matched`（已揭晓） | `live`（活动中） | `ended`（已结束） |
|---|---|---|---|---|---|
| `#/` | 完整落地页；CTA=「报一局」 | 首屏 CTA 变体「再看看别的局」；顶部细条提示「你有 1 个局在排桌中 → 我的局」 | 顶部细条「你和 4 个人凑成一桌了 → 看同组」 | 顶部细条**置顶悬浮**「已到点，去现场页 →」 | 顶部细条「这局结束了，去看看回顾 →」 |
| `#/join` | 正常进入，Step0 起 | 允许进入；顶部提示「你已报名 X 局，可再加报」；已报场次在选局步骤置灰标「已报」 | 进入即提示「当前有进行中的局，改报请联系管理员」并只允许浏览，提交按钮 disabled | 同上（只读） | 同 `matched` |
| `#/me` | 空态：一句「你还没报过局」+ 3 张推荐局卡 + CTA | **报名卡**：场次、类型、倒计时、状态徽章「排桌中」；下方「已报名场次」列表 | **局卡**：桌号、组内人数、集合时间、场地（`venueRevealAt` 前为锁）；按钮「看同组」 | 局卡上主按钮变「去现场」（朱红实心，唯一主按钮） | 局卡变灰 + 「看回顾」按钮 + 「再报一局」 |
| `#/table/:groupId` | 重定向 `#/me`（无权限） | 重定向 `#/me`（未揭晓不得看同组） | **完整**：同组 5 人卡、匹配理由、共同话题、氛围标签、集合信息（锁/开） | 同 `matched`，但顶部加「现场页入口」大按钮，集合信息常显 | 只读；人物卡保留；物料区替换为「本局已结束，看回顾」 |
| `#/live/:groupId` | 重定向 `#/me` | 显示「还没到点」占位页 + 到点倒计时 + 「返回我的局」 | 显示「现场页将于 HH:mm 开放」+ 倒计时（不足 24h 时） | **完整物料播放器**，全屏无导航 | 重定向 `#/recap/:groupId` |
| `#/recap/:groupId` | 重定向 `#/me` | 重定向 `#/me` | 显示「局还没开始，回顾在散场后开放」 | 显示「散场后开放」+ 剩余时间 | **完整**：总结、金句榜、合影墙、想续桌、评价 |
| `#/admin/*` | `role !== 'admin'` → 显示 403 页 + 「切回学生视角」按钮（不重定向，避免死循环） | 同左 | 同左 | 同左 | 同左 |

### 2.4 后台 7 个 tab 一览

| tab | 路径 | 用途 | 核心数据源 |
|---|---|---|---|
| 用户管理 | `#/admin/users` | 查看报名者、校园认证审核、按画像筛选、加黑名单 | `User`, `Application` |
| 匹配工作台 | `#/admin/match` | 选场次 → 触发匹配 → 看每组得分/氛围/硬约束告警 → 手动换人换场地 → 锁定并解禁 | `Event`, `Group`, `GroupMember` |
| 题库与玩法库 | `#/admin/library` | 维护话题题库（按 `social`/`buddy`/`competitive`/`skill` 与三段分类）、热身流程库、赛制库 | `data/questions.js` 种子 + 后台覆盖层 |
| 活动类型管理 | `#/admin/activities` | 16 类开关、改价、改组规模、改时长、排序 | `ActivityType` |
| 场地管理 | `#/admin/venues` | 场地库 CRUD、可容纳组数、开放日、分配组到场地 | `Venue`, `Group.venueId` |
| 物料导出 | `#/admin/materials` | 按场次批量看物料生成状态、单组预览、批量打印、重生成 | `Material` |
| 运营任务清单 | `#/admin/tasks` | 顶部「紧急反馈收件箱」（`Report`），下方任务卡（场地分配/补位/物料下发/签到核对） | `AdminTask`, `Report` |

---

## 3. 逐页区块清单

> 版式意图由颜一屏在 `design-spec.md` 里定稿。本节只锁**区块顺序、信息、字段、交互**——区块名与顺序不得改，视觉可改。

### 3.1 落地页 `#/` — 9 个区块

| # | 区块 | 版式意图 | 承载信息 | 数据来源字段 | 交互 |
|---|---|---|---|---|---|
| 1 | `Nav` | 细条吸顶，左字标「不熟局 BU SHU」右「我的局」 | 品牌字标、`我的局` 入口、`管理` 隐形入口（仅 admin 可见） | `Session.role` | 点击 `我的局` → `#/me` |
| 2 | 开屏 Hero | **整幅开屏**，左侧竖排大标题，右侧放本周数字 | 主张「不熟的人，一起干件小事。」+ 副标「广州大学城 · 10 校 · 盲盒组局」+ 主 CTA「报一局」+ 三个数字：本周开桌数、在校报名人数、已开桌数 | `events.filter(status=signup).length`, `users.length`, `groups.filter(status=finished).length` | 主 CTA → 平滑滚到区块 6；移动端 CTA 常驻底部 |
| 3 | 跑马灯 `Marquee` | **横向无限滚动条**，朱红底白字 | 首句固定「不谈恋爱 · 不推销 · 不承诺结果」，其后 16 类局名循环 | `activityTypes.name` | 无点击（纯氛围）；`prefers-reduced-motion` 时静止 |
| 4 | 局类型带 | **横向滚动卡片带**（16 张，可左右拖） | 每张：类型名、一句干什么、匹配逻辑标签（社交型/搭子型/竞技型/技能型）、最近一场时间 | `ActivityType.name/tagline/matchProfile`, 下一场 `Event.startAt` | 点卡片 → `#/join?type=<id>`；无场次时卡片显示「这周没开」且 disabled |
| 5 | 一局怎么发生 | 5 步横向流程（编号 + 短句） | ①报一局 ②等着被排桌 ③看同组（不知道去哪）④现场按物料走 ⑤散场投票，想续桌的点个名 | 静态文案 | 悬停/聚焦时高亮当前步 |
| 6 | 本周局列表 | **卡片栅格 2 列**（移动端 1 列），每卡 4 条信息 + 1 按钮 | 场次：活动名 + 时间 + 校区 + 剩余位（`capacity - 已报名`）+ 价格（AA/固定） | `Event.title/startAt/campus/capacityGroups`, `Application` 计数, `price/priceMode` | 按钮「报这个」→ `#/join?type=<id>&event=<eventId>`；满了显示「进候补」→ 同一路径，提交后 `status=waitlisted` |
| 7 | 我们不打保票 | 大段留白 + 引文排版，纯文字 | 产品哲学：「无所求，有所得。这局不承诺你交到朋友，也不承诺任何结果。我们只保证：人到齐、事有着落、话题有人开。」+ 女生比例保护、签到、紧急反馈三项安全说明 | 静态文案 + `event.genderRule` 默认值 | 无 |
| 8 | 常见疑虑 | 6 条折叠项（`<details>`） | ①会不会很尴尬 ②我很内向能去吗 ③安全吗 ④要花多少钱 ⑤能带朋友吗 ⑥为什么出发前不告诉我地点 | 静态文案 | 点击展开，一次只开一个 |
| 9 | `Footer` | 细字三栏 | 左：品牌行「不熟局 BU SHU · 广州大学城」；中：隐私说明 / 紧急反馈 / 校园认证说明 三个锚点（打开 `Modal`）；右：备案号占位 + 版本号 | `data/seed.js` 的 `version` | 点「紧急反馈」打开 `Modal`，内含一键反馈表单（`Report` 简化版，允许匿名） |

### 3.2 报名问卷 `#/join` — 7 步

顶部固定：`Progress`（当前步/总步数 + 剩余步数文案）+ 「离开会保留填写内容」小字。
底部固定：主按钮「下一步」（末步为「提交报名」）+ 次按钮「上一步」。
条件分支：Step4 的题目按 `ActivityType.matchProfile` 动态切换。

| 步 | 标题 | 字段（类型/必填/约束） | 交互与校验 |
|---|---|---|---|
| 0 | 校园认证 | `school` enum(10 校)/必填；`studentNo` string/必填/8–14 位数字；`realName` string/必填/2–10 字 | 提交时调 `POST /api/auth/verify`；通过则 `Session.role=student`、`User.verifiedAt` 写入。**学号不落明文展示**，列表里只显示后 4 位 |
| 1 | 你是谁 | `nickname` string/必填/2–12 字（不得含真实姓名）；`grade` enum/必填；`major` string/必填/2–20 字；`gender` enum(female/male/other/prefer_not)/必填；`age` number/必填/16–30；`campus` enum/必填 | 只有 6 个字段，无开放题，保证「第 1 步很快」 |
| 2 | 想干点什么 | `activityTypeIds` string[]/必填/1–3 项；`eventId` string/必填（选中的局对应场次，单选） | 16 张类型卡多选（上限 3）；选中后展开该类型本周场次单选列表；若从首页带 `?type=&event=` 进入则预填 |
| 3 | 说三句 | `selfDesc` string/必填/20–200 字（占位示例：「话不算多，但聊到喜欢的乐队会突然说很多」）；`wantMeet` string/必填/20–200 字；`recentState` string/必填/10–150 字 | 每框下方实时字数 + 「一句话也行，别空着」提示；`selfDesc` 触发画像推导预览（只显示 3 个标签，不显示分数） |
| 4A | 社交型补问（`matchProfile=social`） | `topicsWanted` string[]/必填/1–3 项（从 12 个话题域多选）；`privacyLevel` enum(low/mid/high)/必填 | 话题域：影视/音乐/游戏/运动/吃喝/旅行/展览/读书/科研考研/二次元/职场实习/本地生活 |
| 4B | 搭子型补问（`buddy`） | `goalText` string/必填/10–100 字；`availableSlots` string[]/必填/≥2 项（周一~周日 × 上午/下午/晚上）；`privacyLevel` | 目标框给 3 个示例可点击填入；时段用 21 格按钮矩阵 |
| 4C | 竞技型补问（`competitive`） | `levelChoice` enum(rookie/beginner/advanced/veteran)/必填；`gearHave` string[]/选填；`goalText` string/选填/≤60 字（想打到什么程度）；`privacyLevel` | 段位用 4 张说明卡，每张写清「指什么水平」避免自评失真 |
| 4D | 技能型补问（`skill`） | `teachSkill` string/必填/2–20 字；`learnSkill` string/必填/2–20 字；`levelChoice` enum/必填（教的那项的水平）；`privacyLevel` | 教/学不可相同，相同则行内报错；提供「技能交换建议」提示（你教吉他，可以学剪视频） |
| 5 | 最后两个 | `questionsAsked` string[]/必填/1 项/**5–32 字**（你想问陌生人的一个问题；32 字是卡面可印上限，见 §7.2）；`shareContact` boolean/必填；`contactChannel` enum(wechat/phone/none)/必填 | 若 `shareContact=true` 则 `contactChannel` 不得为 `none`。联系方式默认**仅组长与管理员可见**，页面明写这句 |
| 6 | 确认 | 回显摘要（场次、类型、昵称、第 3 步三句话的前 20 字）+ 两个勾选：`agreePrivacy`（必勾）、`agreeNoPromise`（必勾，文案：我理解这局不承诺任何结果） | 提交 → `POST /api/applications` → 成功跳 `#/me` 并 `Toast`「排桌中，X 月 X 日 20:00 出结果」 |

### 3.3 我的局 `#/me` — 4 个区块

| # | 区块 | 内容 | 字段 | 交互 |
|---|---|---|---|---|
| 1 | `Nav`（简化） | 只有字标 + 「报新局」 | — | 「报新局」→ `#/join` |
| 2 | 状态头 | 一句与当前阶段匹配的话（按 `resolveStage` 切换 5 句文案） | `resolveStage` 结果 | 无 |
| 3 | 主卡（按阶段切换形态） | `guest`：空态插画位 + 3 张推荐局卡<br>`submitted`：场次名 + 类型 + 倒计时（到 `matchAt`）+ 徽章「排桌中」+ 「查看我填的」展开原始答卷（只读）<br>`matched`：桌号 + 组内人数 + 集合时间 + 场地（锁/开）+ 匹配理由首句<br>`live`：桌号 + 「去现场」大按钮<br>`ended`：桌号（灰）+ 「看回顾」 | `Group.tableNo/memberIds`, `Event.startAt/venueRevealAt`, `Group.matchReason`, `Venue.name/address` | `matched` 主按钮 → `#/table/:groupId`；`live` 主按钮 → `#/live/:groupId`；`ended` → `#/recap/:groupId` |
| 4 | 历史列表 | 曾报过的所有场次（倒序），每行：日期 + 类型 + 结果徽章（已结束/已取消/候补中/未成局） | `Application[]` join `Event` | 点行 → 对应详情；`候补中` 行显示「前面还有 N 人」 |

### 3.4 同组速览 + 物料 `#/table/:groupId` — 6 个区块

| # | 区块 | 内容 | 字段 | 交互 |
|---|---|---|---|---|
| 1 | 桌头 | 桌号（大字号）+ 活动类型 + 时间 + 人数 + 氛围标签 `Tag` | `Group.tableNo`, `Event.startAt`, `Group.memberIds.length`, `Group.vibeLabel` | 无 |
| 2 | 氛围与理由 | 氛围标签一句解释 + 「为什么是你们这几个人」匹配理由（整组句 + 每人一句） | `Group.vibeNote`, `Group.matchReason`, `GroupMember.reasonForUser` | 「每人一句」默认折叠，点「展开」 |
| 3 | 同组 5 人卡 | 每人：昵称、学校**简称**、年级、专业（宽泛化，见 11.4）、一句画像、3 个 `Tag`。**不显示**性别、年龄、真实姓名、学号、微信 | `User.nickname/school/grade/major`, `GroupMember.reasonForUser` | 点人卡展开其「自己提的那个问题」 |
| 4 | 共同话题 | 3 条从 `topicOverlap` 里取的交集话题，写成可聊的句子 | `Group.material.payload.cards.sharedTopics` | 无 |
| 5 | 集合信息 | **`now < venueRevealAt`**：大锁图标 + 「集合地点 X 月 X 日 HH:mm 解锁」+ 倒计时<br>**解锁后**：场地名、详细集合点、时间、组号、**负责人姓名与完整电话**（不掩码，见 §11.6）+ **签到位**（见 §11.3） | `Event.venueRevealAt`, `Venue.name/address/mapHint/hostName/hostPhone`, `Group.tableNo` | 「复制集合信息」按钮；签到位三态见 `design-spec.md` §5.18.1（**不显示签到码本身**） |
| 6 | 物料预览 | 卡牌前 3 题 / 目标卡摘要 / 赛制摘要 / 课程表摘要 + 两个按钮：「现场页」`#/live/:groupId`、「导出打印」 | `Material.kind/payload` | 导出 → `lib/print.js` 按 `kind` 选模板（`cards` 裁切卡版 / 其余 `sheet` 双栏版）并 `window.print()` |

### 3.5 现场引导 `#/live/:groupId` — 5 个区块（移动端优先，隐藏全局导航）

| # | 区块 | 内容 | 字段 | 交互 |
|---|---|---|---|---|
| 1 | 顶条 | 桌号 + 当前进度「第 3 / 28 题」+ **未签到时右侧「签到」chip（签到后消失）** + 关闭（返回 `#/me`） | `Material.payload.progressIndex`, `Checkin` | 点 chip 开签到 Modal；关闭需二次确认（防误触） |
| 2A | 卡牌播放器（`cards`） | 一整屏一张卡：段标签（破冰/兴趣/观点）+ 题面（大字，18px 起）+ 提示句 + 「跳过」「下一题」 | `payload.cards.segments[n].questions[m]` | 左右滑 + 按钮双通道；跳过计入 `skipped[]` |
| 2B | 打卡表（`goal`） | 每人一行的 7 天格，点格打勾；顶部显示「本组今日打卡 3/5 人」 | `payload.goal.checkins` | 点格切换，写入 `Material.progress` |
| 2C | 赛制页（`tournament`） | 热身流程（步骤 + 分钟 + 谁带）+ 当前轮次对阵表 + 计分板 | `payload.tournament.warmup/rounds` | 点「下一轮」推进；计分 +/- 按钮 |
| 2D | 课程表（`curriculum`） | 时间轴：第 1 节 谁教谁 教什么 产出什么 | `payload.curriculum.slots` | 点当前节「开始了」标记 |
| 3 | 身份卡快查 | 底部横滑一排 5 张身份卡缩略（昵称 + 我提的问题） | `payload.cards.identityCards` | 点开看全文 |
| 4 | 安全条 | 常驻一行：「不舒服就点这里」+ 「紧急反馈」按钮 | `Report` 创建入口 | 打开 `Modal`，3 个字段（类别/一句话/是否留电话），提交即 `POST /api/reports` |
| 5 | 散场 | 到 `endAt` 后底部出现「这局结束了，去回顾」 | `Event.endAt` | → `#/recap/:groupId` |

**现场页排版硬约束（验收项）**

1. **字号分两层，但只有一层能承载操作**：必读层 ≥18px（题面 24px / 主按钮 18px / 打卡人名 18px）；辅助层 11–14px（段标签 11px mono / 署名 12px / 提示句 14px）。
2. **操作指令按「主路径 / 兜底路径」分两级，不是一刀切 18px。**
   - **主路径**（删掉它用户就没法完成这件事）：「下一题」「打勾」「下一轮」「跳过」「紧急反馈」「签到」→ **必须 ≥18px**，进必读层。
   - **兜底路径**（删掉它用户还有别的路可走）：「没看到桌上的纸？先记我到了」这类逃生口 → **可留 15px + 下划线**，但必须同时满足三条：① ≥15px；② 有下划线或其他非颜色手段标识可点；③ **它不得是完成该任务的唯一途径**。
   - **判定方法**：问「删掉它，用户还能不能用别的方式完成？」能 → 兜底，可降权；不能 → 主路径，必须 18px。
   - **为什么兜底要降权**：兜底做成和主路径同权，人会默认走简单的那个，主路径当场作废（签到里最典型：给了「我到了」和「输码」两个同权按钮，强签到率直接归零）。**刻意降权不是妥协，是引导。**
3. **一屏只允许一个 primary 按钮。** 现场是站着、边吃边看、光线不一定好的场景，第二个主按钮会让人犹豫。
4. **不渲染 `Nav` / `Footer` / `Marquee`。** 局上 AI 必须消失，界面也别抢注意力。
5. 段标签用 mono 且不放大到 18px——它是标记不是内容，硬撑会抢题面。

### 3.6 回顾 `#/recap/:groupId` — 5 个区块

| # | 区块 | 内容 | 字段 | 交互 |
|---|---|---|---|---|
| 1 | 一句话总结 | 整组回顾句（模板生成）：「周三晚上，5 个原本不熟的人在大学城某某餐厅聊了 2 小时，最热闹的话题是『家里蹲还是出去野』」 | `Group.recapLine`（物料生成时一并产出） | 无 |
| 2 | 金句榜 | 本组 `Quote` 按 `votes` 倒序 Top 5，每句带「说的是谁」 | `Quote.text/saidByUserId/votes` | 每条一个「这句好」按钮 → `POST /api/quotes/:id/vote`（每人每条只能投 1 次） |
| 3 | 合影墙 | 6 宫格占位（本地不存图片，显示「本局没有上传照片」+ 上传按钮显示为 disabled 并提示「下一版开放」） | `Group.photos`（本期恒为 `[]`） | 无 |
| 4 | 想续桌 | 组内人名列表（昵称 + 头像块），点选「下次还想和 TA 一组」，可多选 | `ReseatVote` | 提交 → `POST /api/groups/:id/reseat`；提交后按钮变「已记录，下次开桌时优先」 |
| 5 | 评价与再来 | 一句话评价（选填，≤60 字）+ **4 个标签多选**（聊得开 / 有点冷 / 想再约 / 节奏刚好，见 §5.11 `Review.tags`）+ 「再报一局」 | `Review` | 「再报一局」→ `#/`；评价 → `POST /api/groups/:id/reviews` |

### 3.7 管理后台 `#/admin/*` — 7 个 tab

公共外壳：左侧竖排 tab 列表（7 项）+ 顶部场次选择器 `Select` + 右侧内容区。

#### Tab 1 用户管理 `#/admin/users`
- 表格列：`昵称` / `学校` / `年级` / `专业` / `性别` / `认证状态` / `报名次数` / `出勤次数` / `最近活跃` / `操作`
- 筛选：学校（10 校）、认证状态（待审/已过/驳回）、报名次数排序
- 操作按钮：`查看答卷`（Modal，含原始三句 + 画像 7 维数值条）、`通过认证`、`驳回认证`、`加黑名单`（需填原因）
- 分页：每页 20 行

#### Tab 2 匹配工作台 `#/admin/match`（后台主战场）
- 顶部：场次选择器 + 状态徽章 + `触发匹配` 按钮（仅 `status ∈ {signup, matching}` 可用，点击需二次确认）
- 匹配后每行一组，表格列：`桌号` / `人数` / `成员昵称` / `组得分` / `氛围标签` / `硬约束告警` / `场地` / `操作`
- 硬约束告警列：通过为绿点；违反时红字列出具体项（如「段位跨度 2 档 > 1」「同校 3 人」）
- 操作按钮：`换人`（弹 Modal：从本场未分组人员里选，实时预演新得分）、`换场地`、`重新生成物料`、`锁定本组`
- 底部汇总条：未分组人数、候补人数、平均组得分、告警组数

#### Tab 3 题库与玩法库 `#/admin/library`
- 三个子表：`话题题` / `热身流程` / `赛制模板`
- 话题题表格列：`题面` / `段（破冰/兴趣/观点）` / `适用匹配逻辑` / `强度（1-3）` / `使用次数` / `操作`（启用/停用/编辑）
- 热身流程列：`名称` / `适用类型` / `步骤数` / `总时长` / `操作`
- 赛制模板列：`名称` / `赛制（循环/淘汰/守擂）` / `人数` / `轮次` / `操作`
- 操作按钮：`新增`、`批量导入（粘贴文本）`、`停用`

#### Tab 4 活动类型管理 `#/admin/activities`
- 表格列：`id` / `名称` / `分类` / `匹配逻辑` / `组规模（min-max）` / `时长` / `段位必填` / `默认价` / `计价方式` / `上线` / `排序` / `操作`
- 操作按钮：`编辑`（Modal，字段同 `ActivityType`）、`上线/下线`、`上移/下移`

#### Tab 5 场地管理 `#/admin/venues`
- 表格列：`名称` / `校区` / `类型` / `可容纳组数` / `每组人数` / `开放日` / `开放时段` / `负责人` / `在用组数` / `操作`
- 操作按钮：`新增场地`、`编辑`、`停用`、`分配到组`（弹 Modal 选组）
- 分组视图（底部）：按场地列出已分配组号

#### Tab 6 物料导出 `#/admin/materials`
- 顶部：场次选择 + 「批量生成」（为所有已锁定组生成 `Material`）+ 「批量打印」
- 表格列：`桌号` / `物料类型` / `版本号` / `生成时间` / `已打印次数` / `预警` / `操作`
- 预警列：`题目数 < 20` 或 `身份卡缺失` 时红字
- 操作按钮：`预览`（右侧抽屉渲染 A4）、`重生成`、`打印单组`、`下载 HTML`

#### Tab 7 运营任务清单 `#/admin/tasks`
- **顶部：紧急反馈收件箱**（`Report`，`status ∈ {open, handling}`，`level=urgent` 置顶并整行朱红底）
  - 列：`时间` / `组号` / `类别` / `等级` / `一句话` / `联系电话` / `状态` / `操作`
  - 操作：`接手`（→ handling）、`标记已处理`（→ closed，必填 `resolution`）
- 中部：任务看板三列（待办 / 进行中 / 已完成），卡片字段：标题、类型、关联对象、截止时间、负责人
- 操作：`新建任务`、`领取`、`完成`（记 `doneAt`）
- 右侧：本周运营数字（报名数、成局数、平均组得分、候补转正数、紧急反馈数）

---

## 4. 功能清单

> P0 = 首发必做（缺一则不能上线）· P1 = 首发可做（时间够就做）· P2 = 上线后迭代
> 每条验收标准都是**可勾选的行为描述**，不含主观词。

### 4.1 落地页 `#/`

| 功能 | 优先级 | 验收标准 |
|---|---|---|
| 本周局列表渲染 | P0 | 打开 `#/` 能看到 ≥4 张局卡；每卡显示活动名、时间、校区、剩余位、价格；`剩余位 = capacityGroups × capacityPerGroup − 已提交报名数` |
| 局卡跳转带参 | P0 | 点「报这个」后 URL 变为 `#/join?type=<id>&event=<id>`，且问卷 Step2 的对应类型与场次已选中 |
| 满员转候补 | P0 | 剩余位 ≤0 时按钮文案为「进候补」；提交后 `Application.status = waitlisted`，`#/me` 显示「候补中，前面还有 N 人」 |
| 16 类局类型带 | P0 | 横向可滚动，16 张全在；4 种匹配逻辑标签正确对应（social/buddy/competitive/skill） |
| 无场次类型禁用 | P0 | 某类型本周无 `status=signup` 场次时，卡片显示「这周没开」且不可点击 |
| 跑马灯 | P1 | 无限横向滚动；系统开启「减少动态效果」时静止不滚 |
| 常见疑虑折叠 | P0 | 6 条可展开；同时只展开 1 条 |
| 顶部状态细条 | P0 | 处于 `submitted`/`matched`/`live`/`ended` 时顶部出现对应细条，文案与 2.3 矩阵一致 |
| 页脚紧急反馈 | P0 | 页脚点「紧急反馈」弹出 Modal，可匿名提交 `Report` |

### 4.2 报名问卷 `#/join`

| 功能 | 优先级 | 验收标准 |
|---|---|---|
| 校园认证 | P0 | 10 校下拉；学号 8–14 位数字校验；认证通过写 `User.verifiedAt` 与 `Session`；学号在页面任何位置不显示完整值 |
| 7 步进度 | P0 | 顶部显示「第 N / 7 步」；点「下一步」未通过校验时停留在原步并在首个错误字段旁显示红字 |
| 条件题动态切换 | P0 | Step4 按所选第一个类型的 `matchProfile` 渲染 4A/4B/4C/4D 之一；切换类型时已填内容保留 |
| 类型多选上限 3 | P0 | 选第 4 个时第 4 个不可选并提示「最多 3 个」 |
| 场次单选联动 | P0 | 选中类型后展示该类本周场次；未选场次不能进入下一步 |
| 字数与示例 | P0 | 每个开放题显示实时字数与下限提示；未达下限时下一步按钮 disabled |
| 画像标签预览 | P1 | Step3 填完 `selfDesc`（≥20 字）后显示 3 个推导标签（如「偏内向」「话题偏文艺」「作息偏夜」），不显示数值 |
| 技能教/学冲突校验 | P0 | `teachSkill === learnSkill` 时行内报错，无法下一步 |
| 提交幂等 | P0 | 同一 `userId + eventId` 重复提交返回 `409 ALREADY_APPLIED`，前端提示「你已经报过这个局了」并跳 `#/me` |
| 草稿保存 | P1 | 中途关闭页面后重新进 `#/join`，已填字段回填；提交成功后草稿清除 |
| 双勾选 | P0 | `agreePrivacy` 与 `agreeNoPromise` 未勾选时提交按钮 disabled，且显示缺哪一项 |

### 4.3 我的局 `#/me`

| 功能 | 优先级 | 验收标准 |
|---|---|---|
| 五态主卡切换 | P0 | 用 `resolveStage` 驱动；五种阶段各渲染对应主卡形态，且主按钮指向正确路由 |
| 倒计时 | P0 | `submitted` 阶段显示到 `matchAt` 的天/时/分；到点后页面刷新即切 `matched`（无需登录重进） |
| 场地解锁 | P0 | `now < venueRevealAt` 时只显示锁与解锁时间；解锁后显示 `Venue.name/address/mapHint` |
| 历史列表 | P0 | 按 `Event.startAt` 倒序列出全部报名；每条有结果徽章；候补行显示排位 |
| 空态引导 | P0 | `guest` 时显示 3 张推荐局卡（取最近有位的 3 场）+ CTA |

### 4.4 同组速览 `#/table/:groupId`

| 功能 | 优先级 | 验收标准 |
|---|---|---|
| 权限守卫 | P0 | 非本组成员访问 → 重定向 `#/me`；未揭晓（`submitted`）访问 → 重定向 `#/me` |
| 隐私脱敏 | P0 | 页面 DOM 中不出现任何成员的 `realName`、`studentNo`、`phone`、`wechat`、`age`、`gender`；仅组长与 admin 可见联系方式 |
| 五人卡 | P0 | 每人一张卡，含昵称/学校简称/年级/专业宽泛化/一句画像/3 标签；卡片数量 = `Group.memberIds.length` |
| 匹配理由 | P0 | 整组一句常显；每人一句默认折叠，展开后 5 条全出 |
| 共同话题 | P0 | 显示 3 条交集话题；交集不足 3 条时显示实际条数，不填充假数据 |
| 集合信息锁 | P0 | 解锁前 DOM 中**不存在**场地名与地址字符串（不是 CSS 隐藏）；解锁后出现复制按钮 |
| 物料预览 + 打印 | P0 | 显示对应 `kind` 的摘要；点「导出打印」调用 `window.print()`，`@media print` 下只渲染打印件；`kind=cards` 出 2×3 裁切卡网格，其余出双栏参考表 |

### 4.5 现场页 `#/live/:groupId`

| 功能 | 优先级 | 验收标准 |
|---|---|---|
| 时间窗守卫 | P0 | 早于 `startAt - 15min` 显示倒计时占位；晚于 `endAt + 60min` 重定向 `#/recap/:groupId` |
| 卡牌逐题翻页 | P0 | 一期一屏一题；「下一题」推进；进度「第 N / 总」正确；最后一题后按钮变「全部走完了」 |
| 跳题 | P0 | 点「跳过」记录到 `payload.progress.skipped[]` 并前进，且该题在回顾里标为跳过 |
| 进度持久化 | P0 | 刷新页面后回到上次 `progressIndex` |
| 打卡表/赛制/课程表三形态 | P0 | 按 `Material.kind` 渲染 2B/2C/2D；打卡点格可切换；赛制可推进轮次并加减分 |
| 身份卡快查 | P1 | 底部横滑 5 张，点开显示「昵称 + 我提的问题」全文 |
| 签到入口 | P0 | 未签到时顶条右侧渲染「签到」chip，签到后不再渲染；点击打开签到弹层（六态见 §11.3）；chip **不得用 primary 实心样式**，不得与「下一题」抢视觉 |
| 一键反馈 | P0 | 安全条常驻；提交后 `Report.status = open`，`level=urgent` 时在 admin 收件箱置顶 |
| 无导航 | P0 | 现场页不渲染 `Nav`/`Footer`/跑马灯 |

### 4.6 回顾 `#/recap/:groupId`

| 功能 | 优先级 | 验收标准 |
|---|---|---|
| 时间窗守卫 | P0 | `now <= endAt + 60min` 时显示「散场后开放」+ 剩余时间 |
| 一句话总结 | P0 | 显示 `Group.recapLine`，其中含真实场地名、人数、时长 |
| 金句投票 | P0 | 每条可投 1 次，重复点击返回 `409 ALREADY_VOTED` 且按钮变「已投」；票数实时 +1 |
| 合影墙占位 | P0 | 6 宫格，本期恒显示「本局没有上传照片」，上传按钮 disabled 且有说明 |
| 想续桌 | P0 | 可多选人名提交；提交后按钮文案变「已记录」；不可选自己 |
| 一句话评价 | P1 | ≤60 字 + 3 标签多选；提交后不重复提交（按 `fromUserId + groupId` 唯一） |

### 4.7 管理后台

| 功能 | 优先级 | 验收标准 |
|---|---|---|
| 权限墙 | P0 | `role !== 'admin'` 时 7 个 tab 全部只显示 403 页 |
| 触发匹配 | P0 | 点击后对该场次所有 `status=submitted` 的申请执行匹配；产出 `Group` + `GroupMember`，组数与人数满足硬约束；完成后 `Event.status = locked`，`Application.status = matched` |
| 硬约束告警 | P0 | 任何组违反约束时该行红字列出具体违规项；不允许在告警未清空时「锁定本组」 |
| 换人预演 | P1 | 换人 Modal 内选人后即时显示「新得分 vs 原得分」，确认后才写入 |
| 换场地 | P0 | 场地可用组数不足时不可选；选定后 `Group.venueId` 更新，`/table` 集合信息同步 |
| 批量物料导出 | P0 | 「批量打印」把 N 组各生成一页 A4 并一次性 `window.print()` |
| 候补补位 | P0 | 有人取消 → 任务清单自动出现「补位」任务 → 管理员点「补位」后从候补池取第 1 名 → 重新校验该组硬约束 → 通过则 `Application.status=matched` 并把原 `GroupMember.seatStatus` 置 `replaced` |
| 紧急反馈处理 | P0 | 收件箱按 `level` 与时间排序；`接手` 改 `handling`；`标记已处理` 必须填 `resolution` |
| 活动类型上下线 | P0 | 下线后落地页不再出现该类型卡片，但历史报名与组不受影响 |

### 4.8 数据层（不分页面）

| 功能 | 优先级 | 验收标准 |
|---|---|---|
| 统一 store | P0 | 所有页面通过 `store.get()` / `store.subscribe()` 读，通过 `actions.*` 写；`src/pages/**` 中不出现 `localStorage` 字样（grep 为 0） |
| 种子数据 | P0 | 首次打开自动写入种子：16 类活动、8 个场地、6 场本周场次、40 个用户、5 个已锁定组（含物料与回顾） |
| 版本迁移 | P0 | `localStorage` 中 `bs:version` 与 `seed.version` 不一致时，清空重建（本期无兼容包袱） |
| 重置数据 | P1 | `#/admin/tasks` 底部「重置演示数据」按钮，二次确认后重建种子 |

---

## 5. 数据模型

### 5.1 实体关系

```
ActivityType 1 ──< Event 1 ──< Application >── 1 User
                      │                         │
                      │                         └──< GroupMember >── Group
                      ├──< Venue (多对多，经 Group.venueId 实例化)
                      └──< Group 1 ──< GroupMember
                                1 ──  1 Material
                                1 ──< Checkin
                                1 ──< Review
                                1 ──< Quote
                                1 ──< ReseatVote
                                1 ──< Report
Event 1 ──< WaitlistEntry >── 1 User
AdminTask >── (多态引用：event | group | material | report)
Session 1 ── 1 User
```

**基数说明**

| 关系 | 基数 | 外键位置 |
|---|---|---|
| ActivityType → Event | 1 : N | `Event.activityTypeId` |
| Event → Application | 1 : N | `Application.eventId` |
| User → Application | 1 : N | `Application.userId`（同一 `eventId` 下唯一） |
| Event → Group | 1 : N | `Group.eventId` |
| Group → GroupMember | 1 : N | `GroupMember.groupId` |
| User → GroupMember | 1 : N（可跨场次多次） | `GroupMember.userId` |
| Application → GroupMember | 1 : 1 | `GroupMember.applicationId` |
| Group → Material | 1 : 1 | `Material.groupId` |
| Group → Checkin / Review / Quote / ReseatVote / Report | 1 : N | 各自 `groupId` |
| Venue → Group | 1 : N（受 `capacityGroups` 限制） | `Group.venueId` |
| Event → WaitlistEntry | 1 : N | `WaitlistEntry.eventId` |

### 5.2 ActivityType（活动类型）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | 16 个枚举值之一，全小写 | `"dinner"` | 主键 |
| `name` | string | 是 | 2–8 字 | `"饭局"` | 展示名 |
| `category` | string | 是 | `social`\|`buddy`\|`competitive`\|`skill` | `"social"` | 分类，决定首页标签 |
| `matchProfile` | string | 是 | 同上四值 | `"social"` | **使用哪套匹配打分函数**；本期与 `category` 同值，分列是为将来拆分（如「摄影」归 skill 类但用 social 匹配） |
| `tagline` | string | 是 | ≤24 字 | `"一顿饭的时间，认识五个不熟的人"` | 卡片副句 |
| `glyph` | string | 是 | 1 个汉字或 1 个 emoji，不引外部图标 | `"碗"` | 卡片字标 |
| `durationMin` | number | 是 | 45–300，整数 | `120` | 单场时长 |
| `groupSizeMin` | number | 是 | 2–12，且 ≤ `groupSizeMax` | `5` | 每桌最少人数 |
| `groupSizeMax` | number | 是 | ≤ 12 | `6` | 每桌最多人数 |
| `needsLevel` | boolean | 是 | — | `false` | 报名是否强制填 `levelChoice` |
| `needsGear` | boolean | 是 | — | `false` | 报名是否展示装备题 |
| `materialKind` | string | 是 | `cards`\|`goal`\|`tournament`\|`curriculum` | `"cards"` | 物料类型 |
| `defaultPrice` | number | 是 | ≥0，整数（元） | `45` | 默认价 |
| `priceMode` | string | 是 | `aa`\|`fixed` | `"aa"` | AA 还是固定报名费 |
| `active` | boolean | 是 | — | `true` | 下线后首页不出现 |
| `sortOrder` | number | 是 | ≥0 | `10` | 首页排序 |
| `createdAt` | ISO string | 是 | — | `"2025-03-01T10:00:00.000Z"` | — |

**16 类冻结配置**（`src/data/activityTypes.js` 直接照抄）

| id | name | category=matchProfile | 组规模 | 时长 | 段位 | 装备 | 物料 | 默认价 | 计价 |
|---|---|---|---|---|---|---|---|---|---|
| `dinner` | 饭局 | social | 5–6 | 120 | 否 | 否 | cards | 45 | aa |
| `boardgame` | 桌游·剧本杀局 | social | 5–6 | 180 | 否 | 否 | cards | 40 | aa |
| `movie` | 观影局 | social | 4–5 | 150 | 否 | 否 | cards | 35 | aa |
| `ktv` | KTV歌局 | social | 6–8 | 180 | 否 | 否 | cards | 45 | aa |
| `citywalk` | City Walk·扫街局 | social | 4–6 | 150 | 否 | 否 | cards | 0 | aa |
| `gallery` | 看展逛馆局 | social | 4–5 | 120 | 否 | 否 | cards | 60 | aa |
| `study` | 自习局 | buddy | 3–4 | 180 | 否 | 否 | goal | 0 | fixed |
| `exam` | 考研·考证搭子局 | buddy | 3–4 | 120 | 否 | 否 | goal | 0 | fixed |
| `nightrun` | 夜跑局 | buddy | 3–4 | 60 | 否 | 否 | goal | 0 | fixed |
| `sport` | 运动局 | competitive | 6–8 | 90 | 是 | 是 | tournament | 0 | aa |
| `billiards` | 桌球·乒乓局 | competitive | 4–4 | 90 | 是 | 否 | tournament | 30 | aa |
| `badminton` | 羽毛球局 | competitive | 4–4 | 90 | 是 | 否 | tournament | 35 | aa |
| `hiking` | 爬山局 | competitive | 6–8 | 240 | 是 | 是 | tournament | 20 | aa |
| `gaming` | 游戏开黑局 | competitive | 5–5 | 150 | 是 | 否 | tournament | 25 | aa |
| `photo` | 摄影互拍局 | skill | 4–6 | 150 | 否 | 是 | curriculum | 0 | aa |
| `skillswap` | 技能交换局 | skill | 4–6 | 120 | 否 | 否 | curriculum | 0 | fixed |

### 5.3 Venue（场地）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `v_` 前缀 | `"v_001"` | 主键 |
| `name` | string | 是 | ≤24 字 | `"大学城新天地·蕉叶小馆"` | 场地名 |
| `campus` | string | 是 | 10 校 slug 或 `"shared"` | `"shared"` | 所属片区 |
| `kind` | string | 是 | `classroom`\|`activity_room`\|`outdoor`\|`merchant` | `"merchant"` | 场地类型 |
| `address` | string | 是 | ≤60 字 | `"大学城中环东路 232 号 3 层"` | 详细地址，**解禁后才下发前端** |
| `mapHint` | string | 是 | ≤40 字；未获授权时**必须升到地标级**（见下） | `"商场 3 层扶梯口右手第二家，门口有绿色灯箱"` | 集合点文字指引。**它是「找不到店」的唯一兜底** |
| `capacityGroups` | number | 是 | 1–8 | `2` | 能同时容纳几组 |
| `capacityPerGroup` | number | 是 | 2–12 | `6` | 每组座位/场地人数上限 |
| `openDays` | number[] | 是 | 元素 1–7（周一到周日） | `[1,2,3,4,5,6,7]` | 开放日 |
| `openFrom` | string | 是 | `HH:mm` 24 小时制 | `"17:00"` | 开放起始 |
| `openTo` | string | 是 | `HH:mm`，晚于 `openFrom` | `"22:30"` | 开放结束 |
| `hostName` | string | 是 | 2–10 字 | `"陈店长"` | 现场对接人 |
| `hostPhone` | string | 是 | 手机 11 位数字，或座机 `020-8位` 形式 | `"020-3934-3123"` | 现场对接电话。**解锁后完整显示，不掩码**（现场打不通等于没有这个功能）；号码为虚构号段，不构成真实个人信息 |
| `active` | boolean | 是 | — | `true` | 停用后不进分配池 |
| `notes` | string | 否 | ≤100 字 | `"需提前 1 天报人数"` | 运营备注 |

**`address` 与 `mapHint` 必须成对降级（授权约束）**

未获场地方授权时，两条须同时执行，**不许只降一条**：

| 字段 | 未授权时 | 授权后 |
|---|---|---|
| `address` | 退到**路口 / 牌坊级**（「贝岗村口往里」「商场东侧」），不写门牌 | 完整门牌 |
| `mapHint` | **升到地标级**：看得见的地标 + 走几步 + 门面特征（「村口牌坊进来第二家，门口绿色灯箱，说『不熟局 A3』」） | 常规描述即可 |

**为什么必须成对**：`address` 降级是**降低第三方信息暴露**，`mapHint` 升级是**保证可达性**。只降地址不升提示，合规上过关、体验上把人扔在村口打转——**这种「看起来合规、实际不可用」的处理比不合规更讨厌**，因为它把风险从平台转移给了用户。
`mapHint` 是可达性的唯一兜底（`address` 已退到路口级时，它是唯一能让人走到桌边的东西），所以它的内容标准比 `address` 更高，不是更低。

### 5.4 Event（场次）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `e_` 前缀 | `"e_2601"` | 主键 |
| `activityTypeId` | string | 是 | FK → ActivityType | `"dinner"` | 活动类型 |
| `title` | string | 是 | ≤30 字 | `"周三晚饭局 · 大学城"` | 场次名 |
| `campus` | string | 是 | 10 校 slug 或 `"shared"` | `"shared"` | 片区 |
| `startAt` | ISO string | 是 | 晚于 `signupDeadlineAt` | `"2025-04-09T11:30:00.000Z"` | 开始时间（存 UTC，展示按 Asia/Shanghai） |
| `endAt` | ISO string | 是 | = `startAt + durationMin` | `"2025-04-09T13:30:00.000Z"` | 结束时间 |
| `signupDeadlineAt` | ISO string | 是 | 早于 `startAt` | `"2025-04-08T15:59:00.000Z"` | 报名截止 |
| `matchAt` | ISO string | 是 | ∈ (`signupDeadlineAt`, `startAt`) | `"2025-04-08T12:00:00.000Z"` | 出结果时间（`#/me` 倒计时目标） |
| `venueRevealAt` | ISO string | 是 | ∈ (`matchAt`, `startAt`) | `"2025-04-09T10:00:00.000Z"` | **集合信息解禁时间**，盲盒机制的物理载体 |
| `status` | string | 是 | `draft`\|`signup`\|`matching`\|`locked`\|`ongoing`\|`ended`\|`canceled` | `"signup"` | 见第 8 节状态机 |
| `capacityGroups` | number | 是 | 1–8 | `3` | 本场最多开几桌 |
| `capacityPerGroup` | number | 是 | 2–12 | `6` | 每桌人数上限（覆盖类型的 `groupSizeMax` 时以本字段为准） |
| `genderRule` | object | 是 | 见下方子表 | — | 性别比例保护配置 |
| `price` | number | 是 | ≥0 | `45` | 实际价 |
| `priceMode` | string | 是 | `aa`\|`fixed` | `"aa"` | — |
| `budgetNote` | string | 否 | ≤40 字 | `"人均 45 左右，AA"` | 价格补充说明 |
| `venuePoolIds` | string[] | 是 | 元素 FK → Venue，可为空数组 | `["v_001","v_004"]` | 本场可用场地池 |
| `minGroupSize` | number | 是 | 2–12 | `4` | 低于此人数不成局，转 `canceled` |
| `schoolCap` | number | 是 | 1–6，默认 2 | `2` | 同校人数上限（匹配硬约束） |
| `notes` | string | 否 | ≤120 字 | — | 运营备注 |
| `createdAt` | ISO string | 是 | — | — | — |

`genderRule` 子结构：

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `enabled` | boolean | 是 | — | `true` | 关掉则不做性别约束 |
| `minFemaleRatio` | number | 是 | 0–1，默认 0.25 | `0.25` | 组内女生占比下限 |
| `maxSameGenderRatio` | number | 是 | 0.5–1，默认 0.75 | `0.75` | 单一性别占比上限 |
| `highPrivacyCap` | number | 是 | 0–3，默认 1 | `1` | 每组 `privacyBoundary=high` 人数上限 |

### 5.5 User（用户，含校园认证与画像）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `u_` 前缀 | `"u_007"` | 主键 |
| `nickname` | string | 是 | 2–12 字，不得含真实姓名 | `"阿澈"` | 展示名 |
| `realName` | string | 是 | 2–10 字 | `"周子澈"` | **仅本人与 admin 可见** |
| `school` | string | 是 | 10 校 **slug 枚举**（见下方 slug 表） | `"sysu"` | 学校。**存 slug 不存中文名**，展示时查 `data/schools.js` |
| `studentNo` | string | 是 | 8–14 位数字 | `"2023110456"` | 仅存后 4 位用于展示，见 11.1 |
| `grade` | string | 是 | `freshman`\|`sophomore`\|`junior`\|`senior`\|`postgrad` | `"freshman"` | 年级（`postgrad` 含硕士博士） |
| `major` | string | 是 | 2–20 字 | `"新闻传播"` | 专业原名；展示时按 11.4 宽泛化 |
| `gender` | string | 是 | `female`\|`male`\|`other`\|`prefer_not` | `"female"` | 仅用于匹配硬约束，**不在同组页展示** |
| `age` | number | 是 | 16–30 整数 | `18` | 仅用于匹配，不展示 |
| `campus` | string | 是 | 10 校 slug 或 `"shared"` | `"sysu"` | 常驻校区。`shared` = 大学城公共区域（不住校/跨校常活动）。<br>**使用范围已限定**：只用于① 场次筛选与展示；② 场地归属。**不得参与 `pairScore`、不得用于生成距离/时长表述**（见 §6.6-C2） |
| `phone` | string | 否 | 11 位数字 | `"13900005678"` | 仅 `shareContact` 时收集 |
| `wechat` | string | 否 | 4–20 字 | `"ac_0707"` | 仅 `shareContact` 时收集 |
| `role` | string | 是 | `student`\|`admin` | `"student"` | 权限 |
| `verifyStatus` | string | 是 | `pending`\|`verified`\|`rejected` | `"verified"` | 校园认证状态 |
| `verifiedAt` | ISO string | 否 | 仅在 `verified` 时有值 | `"2025-03-02T09:12:00.000Z"` | 认证通过时间 |
| `profile` | object | 是 | 见下方子表 | — | 画像向量，由问卷推导 |
| `interestTags` | string[] | 是 | 0–8 项，来自 12 个话题域 | `["电影","探店"]` | 用于 `topicOverlap` |
| `avatarSeed` | string | 是 | 2 字符 | `"07"` | 生成色块头像（不引图片） |
| `blacklisted` | boolean | 是 | — | `false` | 拉黑后不能报名 |
| `createdAt` | ISO string | 是 | — | — | — |
| `lastActiveAt` | ISO string | 是 | — | — | 后台「最近活跃」列 |

`profile` 子结构（全部 0–1 浮点，除 `skillLevels`）：

| 字段 | 类型 | 必填 | 取值 | 示例 | 说明 |
|---|---|---|---|---|---|
| `socialEnergy` | number | 是 | 0–1 | `0.72` | 社交能量：0=极被动，1=主动张罗 |
| `expressiveness` | number | 是 | 0–1 | `0.80` | 表达欲：0=只听不说，1=话很多 |
| `openness` | number | 是 | 0–1 | `0.70` | 开放性：0=只要熟悉的路，1=什么都想试 |
| `chrono` | number | 是 | 0\|0.5\|1 | `0.5` | 作息：0=早起型，0.5=都行，1=夜猫 |
| `goalIntensity` | number | 是 | 0–1 | `0.30` | 目标强度（搭子局=自律度，竞技局=争胜心） |
| `privacyBoundary` | number | 是 | 0.2\|0.5\|0.85 | `0.2` | 隐私边界：由 `privacyLevel` low/mid/high 映射 |
| `skillLevels` | object | 是 | key=activityTypeId, value=`rookie`\|`beginner`\|`advanced`\|`veteran`；无则空对象 | `{"badminton":"beginner"}` | 分活动段位（一个人羽毛球老手、摄影小白是常态） |
| `derivedAt` | ISO string | 是 | — | — | 推导时间，改答卷后重算 |
| `source` | string | 是 | `rule`\|`admin` | `"rule"` | 画像来源（本期恒 `rule`） |

**10 校 slug 枚举（已冻结，`src/data/schools.js` 照此建）**

| `school` / `campus` 值 | 中文名 | `short`（同组页展示） | 备注 |
|---|---|---|---|
| `sysu` | 中山大学（大学城东校区） | 中大 | 唯一带校区的校名，slug 不加后缀（见下） |
| `scut` | 华南理工大学 | 华工 | — |
| `scnu` | 华南师范大学 | 华师 | — |
| `gdut` | 广东工业大学 | 广工 | — |
| `gzhu` | 广州大学 | 广大 | — |
| `gzucm` | 广州中医药大学 | 广中医 | — |
| `gdufs` | 广东外语外贸大学 | 广外 | — |
| `xhcom` | 星海音乐学院 | 星海 | — |
| `gafa` | 广州美术学院 | 广美 | — |
| `gdpu` | 广东药科大学 | 广药 | — |
| `shared` | 大学城公共 | 大学城 | 仅 `campus`/`Event.campus`/`Venue.campus` 可用，`User.school` 不得为 `shared` |

- **为什么 `sysu` 不带 `_e` 后缀**：中大在大学城是东校区，但产品按「哪所学校」分组，不区分校内分区；枚举里出一个带后缀的值会让人误以为我们支持多校区，后面必然有人加 `scut_w`。校区信息写进中文名与 `campusLabel`。
- `data/schools.js` 每项形状：`{ id, name, short, campusLabel }`，`id` 即上表值。**不存在 `data/campuses.js`**，`campus` 复用同一套 id。
- **`campusLabel` 格式 = `校名 · 片区`，校名在前**（例：`中山大学 · 大学城东校区`、`华南理工大学 · 大学城校区`）。
  **顺序不可颠倒**：学生说「我是广工的」，不说「我是大学城的」——**身份先于位置**。倒过来写会让同组页的学校信息读起来像地址。
  用途：同组页与集合信息里的完整校名展示；窄栏（组员卡、表格列）用 `short`。

### 5.6 Application（报名 + 问卷答案）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `a_` 前缀 | `"a_0031"` | 主键 |
| `eventId` | string | 是 | FK → Event | `"e_2601"` | 报名场次 |
| `userId` | string | 是 | FK → User；`(userId,eventId)` 唯一 | `"u_007"` | 报名人 |
| `activityTypeId` | string | 是 | FK → ActivityType，**等于本场 `Event.activityTypeId`** | `"dinner"` | 本场实际类型（冗余，便于筛选） |
| `activityTypeIds` | string[] | 是 | 1–3 项，元素 FK → ActivityType，**必须包含 `activityTypeId`** | `["dinner","ktv"]` | 用户在第 2 步勾选的 1–3 个类型。**不能只存本场那一个**：否则「再报一局」推荐、本场不成局时换场次、以及运营看「哪类局被选了却没开」都无数据可用 |
| `status` | string | 是 | `submitted`\|`waitlisted`\|`matched`\|`checked_in`\|`reviewed`\|`canceled`\|`no_show`\|`expired` | `"submitted"` | 见第 8 节状态机 |
| `answers` | object | 是 | 见下方子表 | — | 问卷原始答案 |
| `groupId` | string \| null | 是 | FK → Group，匹配前为 `null` | `"g_0012"` | 所在组 |
| `waitlistRank` | number \| null | 是 | ≥1，仅在 `waitlisted` 时有值 | `null` | 候补排位 |
| `shareContact` | boolean | 是 | — | `false` | 是否愿在组内交换联系方式 |
| `cancelReason` | string \| null | 否 | ≤60 字 | `null` | 取消原因 |
| `submittedAt` | ISO string | 是 | — | — | 提交时间 |
| `matchedAt` | ISO string \| null | 是 | 匹配后写入 | `null` | 匹配时间 |
| `updatedAt` | ISO string | 是 | — | — | 最后修改 |

`answers` 子结构：

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `selfDesc` | string | 是 | 20–200 字 | `"话不算多，但聊到喜欢的乐队会突然说很多"` | 你是什么样的人 |
| `wantMeet` | string | 是 | 20–200 字 | `"想认识会去看展的人，不用很熟也能一起出门"` | 你想遇见什么样的人 |
| `recentState` | string | 是 | 10–150 字 | `"刚考完一门，周末想出去走走"` | 近期状态 |
| `topicsWanted` | string[] | 是 | 1–3 项，来自 12 话题域 | `["电影","吃喝"]` | 社交型必填，其余可为空数组 |
| `privacyLevel` | string | 是 | `low`\|`mid`\|`high` | `"low"` | 愿意暴露多少私人信息 |
| `levelChoice` | string \| null | 是 | `rookie`\|`beginner`\|`advanced`\|`veteran`\|`null` | `null` | 竞技/技能局必填 |
| `gearHave` | string[] | 是 | 0–6 项，元素为**中文自由串**（不枚举），去重 | `["拍子","球"]` | 装备（可为空数组）。只用于展示与「有没有人能借」的弱匹配，**不参与 `pairScore` 计算** |
| `goalText` | string | 是 | 0–100 字（搭子局必填 ≥10） | `""` | 目标描述 |
| `availableSlots` | string[] | 是 | 0–21 项；元素格式 `d{1-7}_{am\|pm\|night}`（`d1`=周一 … `d7`=周日），不得重复 | `["d3_night","d6_pm"]` | 可用时段（搭子局必填 ≥2）。**格式已冻结**，不得改用英文星期或中文 |
| `teachSkill` | string | 是 | 0–20 字（技能局必填） | `""` | 我能教 |
| `learnSkill` | string | 是 | 0–20 字（技能局必填，且 ≠ `teachSkill`） | `""` | 我想学 |
| `questionsAsked` | string[] | 是 | 恰好 1 项，**5–32 字** | `["你最近一次觉得活着真好是什么时候"]` | 你想问陌生人的问题。**32 字是硬上限**：这道题要印在卡面上被人念出来，超了必然溢出（卡面内容宽 287px / 题面 24px / 一行 12 字 / 最多 3 行 = 36 字物理上限）。超长题通常是在解释背景而不是提问 |
| `contactChannel` | string | 是 | `wechat`\|`phone`\|`none` | `"none"` | 联系方式渠道 |
| `agreePrivacy` | boolean | 是 | 必须 `true` | `true` | 同意隐私说明 |
| `agreeNoPromise` | boolean | 是 | 必须 `true` | `true` | 理解不承诺结果 |

### 5.7 Group（组 / 桌）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `g_` 前缀 | `"g_0012"` | 主键 |
| `eventId` | string | 是 | FK → Event | `"e_2601"` | 所属场次 |
| `activityTypeId` | string | 是 | FK → ActivityType | `"dinner"` | 冗余 |
| `tableNo` | string | 是 | `A1`–`H8` 格式，场次内唯一 | `"A3"` | 桌号 |
| `index` | number | 是 | 从 1 开始 | `3` | 第几桌 |
| `venueId` | string \| null | 是 | FK → Venue；未分配为 `null` | `"v_001"` | 场地 |
| `status` | string | 是 | `forming`\|`locked`\|`ongoing`\|`finished`\|`disbanded` | `"locked"` | 组状态 |
| `matchProfile` | string | 是 | 四值之一 | `"social"` | 使用的匹配逻辑 |
| `memberIds` | string[] | 是 | 2–12 项，FK → User | `["u_007","u_011","u_019","u_023","u_031"]` | 成员（顺序=展示顺序） |
| `hostId` | string \| null | 是 | ∈ `memberIds`；按 §6.5「组长选择规则」选出，**不按单一维度取最大值** | `"u_007"` | 组长／主心骨。他决定谁能代签（`method=admin`）、谁的联系方式对组内可见 |
| `groupScore` | number | 是 | 0–1，保留 4 位小数 | `0.6880` | 组得分 |
| `vibeLabel` | string | 是 | 见 6.7 标签集 | `"一个带节奏，其余慢慢跟上"` | 整组氛围标签 |
| `vibeNote` | string | 是 | ≤60 字 | `"有 1 个人会主动开口，其余人接得上但不会抢话"` | 标签解释 |
| `matchReason` | string | 是 | ≤120 字 | `"你们 5 个人里，3 个都说想『出门走走』，…"` | 整组匹配理由 |
| `recapLine` | string \| null | 是 | ≤100 字，结束后生成 | `null` | 一句话回顾 |
| `checkinCode` | string | 是 | 6 位数字 | `"482913"` | 现场签到码 |
| `photos` | string[] | 是 | 本期恒 `[]` | `[]` | 合影（本地不存图） |
| `createdAt` | ISO string | 是 | — | — | — |
| `lockedAt` | ISO string \| null | 是 | 锁定后写入 | — | — |
| `finishedAt` | ISO string \| null | 是 | — | `null` | — |

### 5.8 GroupMember

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `gm_` 前缀 | `"gm_0088"` | 主键 |
| `groupId` | string | 是 | FK → Group | `"g_0012"` | — |
| `userId` | string | 是 | FK → User；`(groupId,userId)` 唯一 | `"u_007"` | — |
| `applicationId` | string | 是 | FK → Application，1:1 | `"a_0031"` | — |
| `role` | string | 是 | `member`\|`host` | `"host"` | 组长 |
| `seatStatus` | string | 是 | `active`\|`left`\|`replaced` | `"active"` | 座位状态 |
| `reasonForUser` | string | 是 | ≤60 字 | `"你提的问题和另外两个人撞了同一个方向"` | 给本人的一句理由 |
| `snapshot` | object | 是 | 见下 | — | 入组时的画像快照（防用户改答案后历史数据漂移） |
| `joinedAt` | ISO string | 是 | — | — | — |
| `leftAt` | ISO string \| null | 是 | — | `null` | 退出时间 |

`snapshot` 子结构：`socialEnergy` / `expressiveness` / `openness` / `chrono` / `goalIntensity` / `privacyBoundary`（均 number）、`level`（string \| null）、`interestTags`（string[]）、`school`（string）、`major`（string）、`grade`（string）、`nickname`（string）。

> **为什么存快照**：匹配分数必须可复现。用户改一次问卷就重算历史组的分数会让运营看不懂，也让「匹配数据积累」这个壁垒失效。

### 5.9 Material（局内物料）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `m_` 前缀 | `"m_0012"` | 主键 |
| `groupId` | string | 是 | FK → Group，1:1 | `"g_0012"` | — |
| `kind` | string | 是 | `cards`\|`goal`\|`tournament`\|`curriculum` | `"cards"` | 物料类型（= `ActivityType.materialKind`） |
| `payload` | object | 是 | 结构见第 7 节 | — | 物料正文 |
| `progress` | object | 是 | 见下 | — | 现场进度 |
| `version` | number | 是 | ≥1，重生成时 +1 | `1` | 版本 |
| `generatedAt` | ISO string | 是 | — | — | — |
| `generatedBy` | string | 是 | `rule`\|`admin` | `"rule"` | — |
| `printedAt` | ISO string \| null | 是 | — | `null` | 首次打印时间 |
| `printCount` | number | 是 | ≥0 | `0` | 打印次数 |

`progress` 子结构：`index`（number，当前题/步骤/轮次）、`skipped`（number[]，跳过的题号）、`checkedIn`（string[]，已签到 `userId`）、`scores`（object，`competitive` 用：`{teamA:number, teamB:number}`）、`updatedAt`（ISO string）。

### 5.10 Checkin

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `ck_` 前缀 | `"ck_0044"` | 主键 |
| `groupId` | string | 是 | FK → Group | `"g_0012"` | — |
| `userId` | string | 是 | FK → User；`(groupId,userId)` 唯一 | `"u_007"` | — |
| `method` | string | 是 | `code`\|`admin`\|`self` | `"code"` | 签到方式。`code`/`admin` = 强签到（已验证在场）；`self` = 弱签到（自我声明，后台待核实）。详见 §11.3 |
| `code` | string \| null | 是 | 6 位数字；`method=code` 时必填，其余为 `null` | `"482913"` | 本人输入的签到码（**只存不回显**，任何接口都不下发此字段） |
| `at` | ISO string | 是 | — | — | 签到时间 |
| `note` | string | 否 | ≤40 字 | — | 备注（如「迟到 10 分钟」） |

**`checkinCode` 下发禁令（硬约束）**：`Group.checkinCode` **不得出现在任何面向学员（`role=student`）的响应体里**，包括 `GET /api/groups/:groupId`、`GET /api/me/dashboard`、`GET /api/groups/:groupId/recap` 及其嵌套对象。它只允许出现在两处：① 打印物料的页眉（由 `print.js` 在浏览器内从 store 读取后渲染，不经过接口）；② 管理后台的组详情（`role=admin`）。

> 理由：码的价值完全建立在「只有站在桌边、低头看到那张纸的人才输得对」上。一旦它随接口下发，锁就挂在了门上。验收方式：`#/table`、`/live`、`/recap` 三页的 DOM 中都 grep 不到该值。

### 5.11 Review

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `rv_` 前缀 | `"rv_0021"` | 主键 |
| `groupId` | string | 是 | FK → Group | `"g_0012"` | — |
| `eventId` | string | 是 | FK → Event | `"e_2601"` | 冗余 |
| `fromUserId` | string | 是 | FK → User；`(groupId,fromUserId)` 唯一 | `"u_007"` | 评价人 |
| `ratingOverall` | number | 是 | 1–5 整数 | `4` | 整组评分 |
| `ratingVibe` | number | 是 | 1–5 整数 | `4` | 氛围评分 |
| `wouldMeetAgain` | boolean | 是 | — | `true` | 愿不愿再遇 |
| `tags` | string[] | 是 | 从 `聊得开`\|`有点冷`\|`想再约`\|`节奏刚好` 中选 | `["聊得开"]` | 标签 |
| `comment` | string | 否 | ≤60 字 | `"没想到能聊这么久"` | 一句话 |
| `at` | ISO string | 是 | — | — | — |

### 5.12 Quote（金句）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `q_` 前缀 | `"q_0009"` | 主键 |
| `groupId` | string | 是 | FK → Group | `"g_0012"` | — |
| `text` | string | 是 | 5–60 字 | `"我家猫比我先脱单"` | 金句正文 |
| `saidByUserId` | string \| null | 是 | FK → User 或 `null`（记不清） | `"u_011"` | 谁说的 |
| `submittedByUserId` | string | 是 | FK → User | `"u_019"` | 谁提交的 |
| `votes` | number | 是 | ≥0 | `3` | 票数 |
| `votedBy` | string[] | 是 | FK → User，不重复 | `["u_007","u_023"]` | 已投票用户 |
| `at` | ISO string | 是 | — | — | — |

### 5.13 ReseatVote（想续桌）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `rs_` 前缀 | `"rs_0005"` | 主键 |
| `groupId` | string | 是 | FK → Group | `"g_0012"` | 来源组 |
| `fromUserId` | string | 是 | FK → User；`(groupId,fromUserId)` 唯一 | `"u_007"` | 投票人 |
| `targetUserIds` | string[] | 是 | 0–11 项，不含自己 | `["u_019","u_023"]` | 想再同组的人 |
| `wantSameTable` | boolean | 是 | — | `true` | 是否想整桌续 |
| `createdAt` | ISO string | 是 | — | — | — |

### 5.14 AdminTask

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `t_` 前缀 | `"t_0102"` | 主键 |
| `type` | string | 是 | `venue_assign`\|`material_export`\|`waitlist_fill`\|`checkin_audit`\|`report_handle`\|`reminder_push` | `"venue_assign"` | 任务类型 |
| `refKind` | string | 是 | `event`\|`group`\|`material`\|`report` | `"group"` | 关联对象类型 |
| `refId` | string | 是 | 对应实体 id | `"g_0012"` | 关联对象 |
| `title` | string | 是 | ≤40 字 | `"A3 桌需要分配场地"` | 标题 |
| `detail` | string | 是 | ≤120 字 | `"场次 e_2601，5 人，场地池有 2 个可选"` | 详情 |
| `status` | string | 是 | `todo`\|`doing`\|`done`\|`blocked` | `"todo"` | 状态 |
| `assignee` | string \| null | 是 | 用户名或 `null` | `null` | 负责人 |
| `dueAt` | ISO string | 是 | — | — | 截止 |
| `createdAt` | ISO string | 是 | — | — | — |
| `doneAt` | ISO string \| null | 是 | — | `null` | — |

### 5.15 WaitlistEntry（候补）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `w_` 前缀 | `"w_0033"` | 主键 |
| `eventId` | string | 是 | FK → Event | `"e_2601"` | — |
| `userId` | string | 是 | FK → User；`(eventId,userId)` 唯一 | `"u_031"` | — |
| `applicationId` | string | 是 | FK → Application | `"a_0040"` | — |
| `rank` | number | 是 | ≥1，场次内唯一 | `1` | 排位（1 = 最先补） |
| `status` | string | 是 | `waiting`\|`promoted`\|`expired`\|`canceled` | `"waiting"` | 状态 |
| `promotedGroupId` | string \| null | 是 | FK → Group | `null` | 补进哪组 |
| `joinedAt` | ISO string | 是 | — | — | — |
| `promotedAt` | ISO string \| null | 是 | — | `null` | — |

### 5.16 Report（紧急反馈）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `r_` 前缀 | `"r_0007"` | 主键 |
| `groupId` | string \| null | 是 | FK → Group 或 `null`（落地页匿名提交） | `"g_0012"` | — |
| `eventId` | string \| null | 是 | FK → Event 或 `null` | `"e_2601"` | — |
| `fromUserId` | string \| null | 是 | FK → User 或 `null`（匿名） | `"u_007"` | 提交人 |
| `category` | string | 是 | `safety`\|`harassment`\|`discomfort`\|`venue`\|`other` | `"discomfort"` | 类别 |
| `level` | string | 是 | `normal`\|`urgent` | `"urgent"` | `harassment`/`safety` 自动 `urgent` |
| `text` | string | 是 | 5–200 字 | `"有人一直在追问隐私问题"` | 一句话 |
| `contactPhone` | string | 否 | 11 位数字 | `null` | 留电话便于回访 |
| `status` | string | 是 | `open`\|`handling`\|`closed` | `"open"` | — |
| `handledBy` | string \| null | 是 | — | `null` | — |
| `handledAt` | ISO string \| null | 是 | — | `null` | — |
| `resolution` | string \| null | 是 | ≤100 字，`closed` 时必填 | `null` | 处理结果 |
| `createdAt` | ISO string | 是 | — | — | — |

### 5.17 Session（当前登录态，假登录）

| 字段 | 类型 | 必填 | 约束 | 示例 | 说明 |
|---|---|---|---|---|---|
| `id` | string | 是 | `s_` 前缀 | `"s_01"` | 主键 |
| `userId` | string | 是 | FK → User | `"u_007"` | 当前用户 |
| `role` | string | 是 | `student`\|`admin` | `"student"` | 冗余便于守卫 |
| `token` | string | 是 | 32 位随机十六进制字符串 | `"9f3c…"` | 假 token，仅本地 |
| `issuedAt` | ISO string | 是 | — | — | — |
| `expiresAt` | ISO string | 是 | = `issuedAt + 7d` | — | 过期后回落地页重新选择演示身份 |
| `fake` | boolean | 是 | 恒 `true` | `true` | 明示这是演示登录，不是真实鉴权 |

**演示身份切换**：`#/me` 底部与 `#/admin/*` 顶栏各有一个「切换演示身份」`Select`，列出种子里的 3 个学生 + 1 个 admin。切换即重写 `Session`。这是本期唯一的「登录」。

---

## 6. 匹配引擎算法规格

> 实现文件：`src/lib/profile.js`（问卷→向量）、`src/lib/match.js`（打分+组队）。纯函数、无副作用、输入输出都可 JSON 序列化，便于后台跑批与单测。
> **所有权重已冻结，加总必须为 1。** 任何人改权重必须同时改本节与本文件的版本记录。

### 6.1 七维画像向量与推导

| 维度 | 字段 | 类型 | 取值 | 取值语义 |
|---|---|---|---|---|
| 社交能量 | `socialEnergy` | number | 0–1 | 0 = 绝不主动开口；0.5 = 别人问就答；1 = 主动张罗、点菜、加微信 |
| 表达欲 | `expressiveness` | number | 0–1 | 0 = 只听不说、句子短；0.5 = 正常对话；1 = 话多、爱讲段子、能连讲 5 分钟 |
| 开放性 | `openness` | number | 0–1 | 0 = 只走熟悉的路、抗拒新场合；1 = 什么都想试 |
| 作息 | `chrono` | number | 0 / 0.5 / 1 | 0 = 早起型（23 点前睡）；0.5 = 都行；1 = 夜猫（1 点后睡） |
| 目标强度 | `goalIntensity` | number | 0–1 | 0 = 随便玩玩；1 = 有明确截止日与量化目标 |
| 段位 | `skillLevels[activityTypeId]` | string | `rookie`/`beginner`/`advanced`/`veteran` | 映射为数值 0 / 0.3333 / 0.6667 / 1（仅 `needsLevel=true` 的类型） |
| 隐私边界 | `privacyBoundary` | number | 0.2 / 0.5 / 0.85 | 由 `privacyLevel` low/mid/high 映射；越高越不接受个人信息公开 |

**推导规则**（`deriveProfile(answers, user)`，纯关键词打分，无模型依赖）

以基线上限 1.0 / 下限 0.0 累计，最后 `clamp(x, 0.05, 0.95)`。

| 维度 | 基线 | 加分规则 | 减分规则 |
|---|---|---|---|
| `socialEnergy` | 0.50 | `selfDesc` 含主动词（我来/叫我/组织/组局/张罗/发起/搭话）+0.15；`recentState` 含（想认识人/想出去/憋坏了）+0.10；`questionsAsked` 非空且长度 ≥12 +0.08 | 含被动词（慢热/社恐/i人/I人/不太会/安静/一个人/闷）+0.15；`privacyLevel=high` −0.10 |
| `expressiveness` | 0.45 | `selfDesc` 字数 ≥80 +0.15；含（聊/讲/分享/表达/安利/话多）+0.12；`questionsAsked` 长度 ≥20 +0.08 | 含（听/不太说/不会表达/话少/嘴笨）+0.15；`selfDesc` 字数 <30 −0.10 |
| `openness` | 0.50 | 含（想试/新鲜/没试过/都可以/随便/想去看看）+0.18；`topicsWanted` 跨 ≥2 大类 +0.10；`privacyLevel=low` +0.10 | 含（只想/固定/习惯/不喜欢变/最好别）+0.18；`privacyLevel=high` −0.10 |
| `chrono` | 0.50 | 含（早起/早睡/晨跑/六点）+0.5 → 置 0；含（夜猫/熬夜/凌晨/夜跑）+0.5 → 置 1 | 无（若有冲突词，取最后一次出现） |
| `goalIntensity` | 0.40 | 含（必/一定/每天/坚持/上岸/拿证/打卡/刷题/周更）+0.15；`goalText` 含数字或频率词（每天/每周/3 次/个月）+0.15；`availableSlots` ≥4 项 +0.10 | 含（随便/轻松/不勉强/玩着）+0.15；`availableSlots` ≤1 项 −0.10 |
| `skillLevels` | `{}` | `answers.levelChoice` 非空 → `{[activityTypeId]: levelChoice}` | — |
| `privacyBoundary` | — | `low`→0.2，`mid`→0.5，`high`→0.85（直接映射） | — |

**派生标签**（Step3 预览用，只显示 3 个，不显示数值）：
`socialEnergy<0.4`→「偏内向」；`≥0.65`→「会主动开口」；`expressiveness≥0.7`→「话不少」；`openness≥0.7`→「什么都想试」；`chrono===0`→「作息偏早」；`chrono===1`→「作息偏夜」；`goalIntensity≥0.65`→「目标很明确」；`privacyLevel=high`→「话不多说私事」。
取置信度最高的 3 个（加分幅度大者优先，平手按上表顺序）。

### 6.2 基础距离函数（所有打分函数的构件）

设 `d` 表示对应维度差值，全部返回 0–1，越大越好。

| 函数 | 公式 | 区间行为 |
|---|---|---|
| `energyBalance(a,b)` | `1 - \| \|a-b\| - 0.30 \| / 0.70`，clamp[0,1] | 差值 0.30 时满分（典型「一个会聊一个会听」）；完全相同 0.571；相差 1.0 得 0 |
| `similarFit(a,b)` | `1 - \|a-b\|` | 越像越好 |
| `jaccard(A,B)` | `\|A∩B\| / \|A∪B\|`，两者皆空记 0 | 话题重合度 |
| `gradeFit(gi,gj)` | 年级序号差 Δ：0→1.00 / 1→0.85 / 2→0.65 / ≥3→0.45 | 同级最顺，跨度过大略降但不清零 |
| `levelCloseness(li,lj)` | `1 - \|li-lj\| / 0.6667`，clamp[0,1] | 同档 1.0；差 1 档 0.50；差 2 档 0 |
| `slotOverlap(Si,Sj)` | `\|Si∩Sj\| / min(\|Si\|,\|Sj\|)`，任一为空记 0.5（视为「都行」） | 可用时段重合率 |
| `goalMatch(gi,gj)` | 词袋余弦：把 `goalText` 按 2-gram 切分后算余弦相似度；同一 `activityTypeId` 下有共同关键词（考研/雅思/考公/四六级/减脂/吉他/剪辑…）时取 `max(余弦, 0.6)` | 0–1 |
| `majorDiversity(mi,mj)` | 不同学科门类记 1.0；同学科门类不同专业 0.6；同专业 0 | 专业互补 |

**年级序号**：freshman=1, sophomore=2, junior=3, senior=4, postgrad=5。
**学科门类**：从 `major` 字符串前缀匹配 12 个门类关键词表（`data/lexicon.js → majorFamilies`）。

### 6.3 四套打分函数

单对分数 `pairScore(i,j)` 定义在 **0–1** 区间，权重加总为 1。

#### 6.3.1 社交型 `social`（饭局 / 桌游·剧本杀 / 观影 / KTV / City Walk / 看展逛馆）

| # | 项 | 权重 | 计算 |
|---|---|---|---|
| 1 | 性格互补 | **0.30** | `energyBalance(Ei,Ej)` |
| 2 | 话题重合 | **0.22** | `jaccard(tags_i ∪ topicsWanted_i, tags_j ∪ topicsWanted_j)` |
| 3 | 表达节奏 | **0.18** | `similarFit(Xi,Xj)` |
| 4 | 开放性相近 | **0.12** | `similarFit(Oi,Oj)` |
| 5 | 作息容忍 | **0.10** | `similarFit(Ci,Cj)` |
| 6 | 年级跨度 | **0.08** | `gradeFit(gi,gj)` |
| | **合计** | **1.00** | |

惩罚项（在 `groupScore` 阶段扣，详见 6.5）：全内向 −0.15、话题孤立每人 −0.10、同校超限每人 −0.05、同专业 >2 每人 −0.08。

#### 6.3.2 搭子型 `buddy`（自习 / 考研·考证搭子 / 夜跑）

| # | 项 | 权重 | 计算 |
|---|---|---|---|
| 1 | 目标一致 | **0.32** | `goalMatch(gi,gj)`；同类目标关键词命中保底 0.6 |
| 2 | 作息重合 | **0.24** | `similarFit(Ci,Cj)` |
| 3 | 强度相当 | **0.16** | `similarFit(Gi,Gj)`（`goalIntensity`） |
| 4 | 专业互补 | **0.10** | `majorDiversity(mi,mj)` ← 本类型**刻意求异**，不是求同 |
| 5 | 安静容忍 | **0.10** | `1 - \|Xi - Xj\| × 0.5`，并对 `Xi>0.75` 额外乘 0.8（搭子局不欢迎话痨） |
| 6 | 时段重合 | **0.08** | `slotOverlap(Si,Sj)` |
| | **合计** | **1.00** | |

惩罚项：目标词分离（`goalMatch<0.3`）−0.12、专业雷同 >2 人 −0.06/人、全组时段两两重合率 <0.3 −0.15。

#### 6.3.3 竞技型 `competitive`（运动 / 桌球·乒乓 / 羽毛球 / 爬山 / 游戏开黑）

| # | 项 | 权重 | 计算 |
|---|---|---|---|
| 1 | 段位接近 | **0.38** | `levelCloseness(Li,Lj)` |
| 2 | 争胜心接近 | **0.20** | `similarFit(Gi,Gj)` |
| 3 | 性格搭配 | **0.10** | `similarFit(Xi,Xj)`（避免全是闷葫芦或全是对喷型） |
| 4 | 体力/作息 | **0.10** | `similarFit(Ci,Cj)` |
| 5 | 话题兼容 | **0.06** | `jaccard(tags_i, tags_j)` |
| 6 | 分队均衡 | **0.16** | **组级项**，见下（不参与单对计算） |
| | **合计** | **1.00** | 单对项合计 0.84，组级项 0.16 |

**分队均衡 `teamBalance`**：按段位数值降序蛇形分两队（A 拿 1、4、5…，B 拿 2、3、6…），
`teamBalance = clamp(1 - |avgLevel_A - avgLevel_B| / 0.5, 0, 1)`。
**组分数** = `0.84 × (0.6×meanPairNorm + 0.4×minPairNorm) + 0.16 × teamBalance`，其中 `pairNorm = pairScore / 0.84`。

惩罚项：段位跨度 >1 档 → **硬拒**（不进惩罚，直接不可成组）；`teamBalance<0.5` −0.10；全组 `expressiveness<0.35` −0.05。

#### 6.3.4 技能型 `skill`（摄影互拍 / 技能交换）

| # | 项 | 权重 | 计算 |
|---|---|---|---|
| 1 | 技能互补 | **0.34** | `complement(i,j)`：`teachSkill_i` 与 `learnSkill_j` 或 `teachSkill_j` 与 `learnSkill_i` 语义相近（2-gram 余弦 ≥0.5 或同义词表命中）→ 1.0；一方命中 → 0.7；都不命中但技能类别不同 → 0.4；技能相同 → 0 |
| 2 | 教愿意愿 | **0.20** | `teachWilling = clamp(0.4 + 0.3×Gi + 0.3×Xi, 0, 1)`，单对取两人均值 |
| 3 | 能讲清楚 | **0.16** | `similarFit(Xi,Xj)`，且 `max(Xi,Xj) ≥ 0.55` 时该项置 1.0 |
| 4 | 学习意愿 | **0.14** | `similarFit(Oi,Oj)` |
| 5 | 时段重合 | **0.08** | `slotOverlap(Si,Sj)` |
| 6 | 话题兼容 | **0.08** | `jaccard(tags_i, tags_j)` |
| | **合计** | **1.00** | |

惩罚项：全组无法形成教/学闭环 −0.25（且硬拒）、全员同技能 −0.12、无人 `X≥0.5` −0.10。

### 6.4 整组硬约束（违反即不可成组，不可用分数抵扣）

| # | 约束 | 判定 | 来源 | 违反时 |
|---|---|---|---|---|
| C1 | 人数 | `minGroupSize ≤ n ≤ min(groupSizeMax, event.capacityPerGroup)` | 类型 + 场次 | 不足则进「不成局池」 |
| C2 | 性别比例 | `genderRule.enabled` 时：`femaleCount/n ≥ minFemaleRatio` 且 `max(femaleCount,maleCount)/n ≤ maxSameGenderRatio` | `Event.genderRule` | 换人；无法满足则该组减 1 人重试 |
| C3 | 不能全内向 / 全外向 | `mean(E) ∈ [0.25, 0.80]` | 常量 | 换人 |
| C4 | 必须有带节奏的人 | 按 `matchProfile` 分维度判定（**不是一刀切表达欲**）：<br>· `social`/`buddy`/`skill`：`max(expressiveness) ≥ 0.60` 且 `max-min ≥ 0.15`<br>· `competitive`：`max(goalIntensity) ≥ 0.65` 且 `max-min ≥ 0.15` | 常量 | 换人 |
| C4b | 竞技局准入门槛（按项目，`PAIR_FLOOR` 覆盖） | `gaming`：全组 `max(goalIntensity) ≥ 0.65`（**游戏没有统一段位尺度**，王者/青铜/主机/手游不可比，故用投入度代替段位门槛）<br>`billiards`/`badminton`：`PAIR_FLOOR = 0.40`（比默认 0.35 更严）<br>`sport`/`hiking`：`PAIR_FLOOR = 0.25`（比默认更宽，允许明显混合段位）<br>其余类型：默认 0.35 | `activityTypeId` | 硬拒 |
| C5 | 同校不过度聚集 | 任一学校人数 `≤ event.schoolCap`（默认 2） | `Event.schoolCap` | 换人 |
| C6 | 同专业不过度聚集 | 同 `major` 人数 `≤ 2` | 常量 | 换人 |
| C7 | 隐私边界 | `privacyBoundary=0.85` 人数 `≤ genderRule.highPrivacyCap`（默认 1） | `Event.genderRule` | 换人 |
| C8 | 段位跨度 | `competitive`/`skill` 且 `needsLevel`：`max(L) - min(L) ≤ 0.3334`（最多差 1 档） | 类型 | 硬拒 |
| C8b | 段位跨度按项目放宽/收紧 | **按 `activityTypeId` 覆盖 C8**：<br>· `billiards` / `badminton` → **≤ 1 档（0.3334）不变，且 `PAIR_FLOOR` 提到 0.40**（隔网/对台项目，差一档就是被打到自闭）<br>· `sport` / `hiking` → **`PAIR_FLOOR` 放宽到 0.25，且段位跨度放宽到 ≤ 2 档（0.6668）**（篮球足球爬山是混合参与，强弱共存是常态，不是缺陷）。**两个放宽必须同时生效**：只降门槛不改 C8，rookie+advanced 仍会被 C8 拦掉，「混合段位」就落不了地<br>· `gaming` → **不适用 C8**（见 C4b），改用 `goalIntensity` 门槛<br>· `hiking` 另需 `needsGear` 校验：全组至少 1 人 `gearHave` 含鞋或水 | 类型 | 硬拒 |
| C9 | 话题连通 | 组内**每个人**至少与一名成员 `jaccard ≥ 0.2` | 常量 | 换掉孤立者 |
| C10 | 技能闭环 | `skill`：至少 `n-1` 人能配成教/学对 | 类型 | 硬拒 |
| C11 | 质量线 | `groupScore ≥ 0.62` | 常量 `QUALITY_FLOOR` | 该组解散，成员回池 |

**约束优先级**：C1 > C2 > C8 > C9 > C4 > C3 > C5 > C6 > C7 > C10 > C11。冲突时保前者。

### 6.5 组队算法（贪心种子 + 局部搜索）

```
buildGroups(event, applications):   # 旧名 MATCH()，对外统一叫 buildGroups
  QUALITY_FLOOR = 0.62
  # 单对门槛按项目差异化（B1 裁决）：隔网/对台项目收紧，混合参与项目放宽
  PAIR_FLOOR    = (type.id in ['billiards','badminton']) ? 0.40
                : (type.id in ['sport','hiking'])       ? 0.25
                : 0.35
  SWAP_ROUNDS   = 200

  # 0. 过滤
  pool = applications.filter(a =>
            a.status == 'submitted'
            and user(a.userId).blacklisted == false
            and user(a.userId).verifyStatus == 'verified')
  if pool.length < event.minGroupSize: return { groups: [], ungrouped: pool }

  # 1. 目标组规模
  type = activityType(event.activityTypeId)
  target = clamp(round(pool.length / event.capacityGroups),
                 type.groupSizeMin,
                 min(type.groupSizeMax, event.capacityPerGroup))

  # 2. 预计算单对分
  P = matrix(pool.length, pool.length)
  for i < j:
     P[i][j] = P[j][i] = pairScore(pool[i], pool[j], type.matchProfile)   # 6.3
     if P[i][j] < PAIR_FLOOR: P[i][j] = -INF                             # 断开弱连接

  # 3. 贪心种子扩张
  groups = []
  while remaining.length >= event.minGroupSize:
     # 3.1 选种子：有效邻居数降序 → expressiveness 降序 → 报名时间升序
     seed = argmax(remaining, by: [degree, X, -submittedAt])
     g = [seed]
     # 3.2 逐人扩张
     while g.length < target:
        best = null; bestDelta = -INF
        for c in remaining \ g:
           if not hardOK(g + [c], event): continue                       # 6.4
           delta = groupScore(g + [c], event) - groupScore(g, event)
           if delta > bestDelta: bestDelta = delta; best = c
        if best == null: break
        g.push(best)
     # 3.3 组规模不足
     if g.length < event.minGroupSize:
        ungrouped.push(...g); removeAll(remaining, g); break
     if groupScore(g) < QUALITY_FLOOR or not hardOK(g): 
        ungrouped.push(g[0]); removeAll(remaining, [g[0]]); continue     # 拆掉种子，其余回池
     groups.push(g); removeAll(remaining, g)

  # 4. 局部搜索（两两换人）
  for round in 1..SWAP_ROUNDS:
     (ga, gb) = randomTwoGroupsWithMinSize(groups)
     (a, b)   = randomMember(ga), randomMember(gb)
     if not hardOK(ga - a + b) or not hardOK(gb - b + a): continue
     before = groupScore(ga) + groupScore(gb)
     after  = groupScore(ga - a + b) + groupScore(gb - b + a)
     if after > before + 0.005: accept(swap)
     # 目标函数额外奖励抬升最低分组分，避免出现 1 个矮子组
     objective = Σ groupScore - 0.5 × (QUALITY_FLOOR - min groupScore).clamp(0,..)

  # 5. 收尾
  for g in groups:
     g.tableNo   = nextTableNo(event)                    # A1..A8, B1..
     g.hostId    = pickHost(g, profile, type.id)        # 见下方「组长选择规则」
     g.vibeLabel, g.vibeNote = pickVibe(g, profile)       # 6.7
     g.matchReason, memberReasons = buildReason(g, profile)  # 6.6
     g.status    = 'forming'
     g.groupScore = round(groupScore(g), 4)

  # 6. 剩余人处理
  for a in ungrouped: a.status = 'waitlisted'; WaitlistEntry.create(rank = next)
  for g in groups:
     h = hardOK(g, event)                       # { ok:boolean, violations:[{code,detail}] }
     g.hardOK     = h.ok                        # 是否满足全部硬约束（含被 B1 放宽后的判定）
     g.violations = h.violations                # 未通过时逐条列出，后台红字直接渲染
  return { groups, ungrouped, hardOK: groups.every(g => g.hardOK),
           violations: groups.flatMap(g => g.violations.map(v => ({ tableNo: g.tableNo, ...v }))) }
```

**组长（`hostId`）选择规则 ——「谁是主心骨」**

这是**独立于 §6.4 C4 的另一件事**，两者不要混：
- **C4** 判「这桌有没有一个能撑住场的人」（布尔，用于决定这组能不能成立）
- **`pickHost`** 判「那个人是谁」（选择，用于决定谁当组长）

组长拥有实际权限（代签、联系方式对组内可见、物料里的 `lead`），所以四个 `matchProfile` 的判据不同——**球局的组长是会打的人，不是会聊的人**。

| `matchProfile` | 选取规则 | 并列时 |
|---|---|---|
| `social` | `expressiveness` 最高 | `socialEnergy` 高者 |
| `buddy` | `goalIntensity` 最高，**且 `availableSlots.length ≥ 2`**（代理守时性：可用时段太少的人无法稳定带队） | `availableSlots` 多者 |
| `competitive` | **`skillLevels[activityTypeId]` 数值最高**（老手带新手） | `goalIntensity` 高者 |
| `skill` | `teachSkill` 字数最多者（越长通常越具体） | `expressiveness` 高者 |

> **`buddy` 的判据里有两个代理指标，后台不得当成真实值读：**
> · **守时性**：本期无此字段，用 `availableSlots.length ≥ 2` 代理（可选时段太少的人无法稳定带队）。接后端后改用历史 `Checkin` 准时率。
> · **自律度**：用 `goalIntensity` 代理（它由问卷关键词推导，不是用户自报的打卡率）。
> 二者都只是**门槛与排序的近似**，后台「匹配工作台」展示时不得标注为「守时度高」「自律度高」——那是把一个代理说成了事实。

**`pickHost` 不得跨 profile 复用**：`social` 的判据用在球局上会选出「最能说但打得最差」的人当组长，热身和分队都要他来带，直接失效。

**`groupScore(g, event)`**

```
n = |g|
if n < 2: return 0
pairs = all P[i][j] for i<j in g
meanPair = mean(pairs) / pairNormDivisor(profile)     # competitive: /0.84, 其他: /1
minPair  = min(pairs)  / pairNormDivisor(profile)
base = 0.6 * meanPair + 0.4 * minPair

if profile == 'competitive':
   base = 0.84 * base + 0.16 * teamBalance(g)

bonus = (hostPresent(g) ? 0.03 : 0) + 0.02            # 氛围标签一定能给出，故 +0.02 恒定

penalty = 0
penalty += 0.10 * countTopicIsolated(g)               # C9 违反人数
penalty += 0.05 * max(0, sameSchoolCount - event.schoolCap)
penalty += 0.08 * max(0, sameMajorCount - 2)
penalty += 0.15 * (meanE(g) < 0.25 or meanE(g) > 0.80 ? 1 : 0)
penalty += profilePenalties(g, profile)               # 6.3 各自惩罚项

return clamp(base + bonus - penalty, 0, 1)
```

**复杂度**：`pairScore` O(N²)；贪心 O(N² × target)；局部搜索 O(K × n)。N=200 时单场匹配 < 50ms，浏览器里可同步跑。**匹配逻辑必须可重放**：输入相同 + 随机种子固定（`seed = hash(eventId)`）→ 输出相同。`Math.random` 在 `match.js` 内一律禁用，改用 `mulberry32(seed)`。

### 6.6 匹配理由生成（模板句规则）

三类句子，全部模板填充，不调用模型。

**A. 整组句 `Group.matchReason`（1 句，≤120 字）**
结构：`共同点 + 差异点 + 一个具体由头`

| profile | 模板 | 槽位取法 |
|---|---|---|
| social | `你们 {n} 个人里，{k} 个都提到{sharedTopic}；{diffSentence}。` | `sharedTopic` = 组内出现 ≥2 次的 `topicsWanted`（取频次最高）；`diffSentence` **只描述测得的配比，不推断效果**，由 `max(X)-min(X)` 三选一：`≥0.30` →「表达欲上一个人明显高，其余偏低」／`0.15–0.30` →「表达欲有高有低」／`<0.15` →「几个人表达欲差不多」 |
| buddy | `你们 {n} 个人目标都指向{goalKeyword}，可用的时间撞在{slotLabel}，{diversitySentence}。` | `goalKeyword` = `goalText` 共同关键词；`slotLabel` = 两两重合最多的时段中文（如「工作日晚」）；`diversitySentence` = 专业差异 ≥2 时「专业也不太一样，不容易聊成同一个话题的死循环」 |
| competitive | `你们 {n} 个人段位都在{levelLabel}附近，{balanceSentence}，{goalSentence}。` | `levelLabel` = 组内众数段位；`balanceSentence` = `teamBalance≥0.8` ? 「分两队打起来不会一边倒」: 「分两队会有强弱差，适合让老手带一下」；`goalSentence` 由 mean(goal) 三选一 |
| skill | `你们 {n} 个人里，{pairs} 能配上对——{teachList}，{learnList}。` | `pairs` = 配对数；`teachList`/`learnList` = 前 2 个技能名 |

**B. 每人一句 `GroupMember.reasonForUser`（≤60 字）**
从 4 条候选里取**不重复**的一条（同一组内尽量 4 条都用上，n>4 时循环）：

1. `你提的「{myQuestionShort}」和另外 {k} 个人的问题撞了同一个方向。`
2. `你说自己{selfDescTag}，这桌上有 {k} 个人也是。`
3. `你想遇见{myWantTag}，这组里 {k} 个人也提到了{sharedTag}。`（**只说他提到了，不说他就是**——「有人正好是这样」是对人的定性，我们只有他勾过的标签）
4. `你们 {k} 个人的{sharedTag}是同一挂的，开场不用硬找话。`

**C. 禁止表述**

1. **不得预测**：「性格很配」「很适合你」「会聊得来」「可能有火花」——把匹配说成预测就是过度承诺。只用**事实型**表述（都提到 / 都在 / 撞了同一个方向）。
2. **不得用连接词把两件事实串成因果或效果推断**——`所以` / `因此` / `正好` / `怪不得` / `难怪` 一律不许出现在理由句里。
   **假因果比假数字活得久**：假数字会被核对，假因果听着顺、没人查。典型形态：
   · 反例：`正好有人能接住话题` —— 我们并不知道有人会接话，这句话把一个配比事实说成了效果承诺。
   · 反例：`正好互相盯得住` —— 「盯得住」是三个月的自律结果，不是分组能保证的。
   · 正确写法：只陈述**测得的配比**（「表达欲上一个人明显高，其余偏低」）或**我们据此排了什么**（「开场题从这个话题起」）。
   **判据**：把句子里的连接词删掉，如果后半句仍然成立，它是事实；如果后半句靠连接词才站得住，它是假因果。
3. **不得出现任何距离或时长表述**：「骑车 X 分钟」「走路 15 分钟就到」「离你宿舍很近」「顺路」「步行可达」全部禁用。
   **原因**：`campus` 的粒度只到「哪所学校 / 公共片区」，拿它算出来的距离是把两个片区的直线距离当成了真实通勤时间，误差最大 10 分钟以上。**说「骑车 8 分钟」等于承诺了一件事，而我们算不出它。** 场地归属由管理员人工分配，理由句不需要、也没有能力描述距离。
   替代写法：只陈述**场地与片区的归属事实**（「这局在你们校区这边」），不给任何分钟数。

### 6.7 整组氛围预测（1 个标签 + 1 句解释）

`pickVibe(g, profile)` 按序短路，命中即停。`σ()` 为标准差。

**社交型 / 搭子型标签集**

| # | 条件 | 标签 |
|---|---|---|
| 1 | `maxX ≥ 0.65` 且 `meanE ∈ [0.40,0.60]` 且 `σ(E) ≥ 0.12` | **一个带节奏，其余慢慢跟上** |
| 2 | `meanE < 0.40` 且 `maxO ≥ 0.60` | **慢热，但会越聊越深** |
| 3 | `meanE ≥ 0.60` 且 `σ(E) < 0.15` | **一坐下就热闹** |
| 4 | `maxX < 0.50` | **需要一个开场的人**（此种组由 `hostId` 指定种子，并在物料里预置 2 道安全破冰题） |
| 5 | `σ(O) ≥ 0.25` 且 `≥2 人 O ≥ 0.65` | **观点会很不一样** |
| 6 | `meanE < 0.35` 且 `σ(E) < 0.12` | **安静但不冷场** |
| 7 | 兜底 | **适合边吃边慢慢聊** |

**竞技型标签集**

| # | 条件 | 标签 |
|---|---|---|
| 1 | `teamBalance ≥ 0.80` 且 段位跨度 ≤ 1 档 | **势均力敌，会打到最后一分** |
| 2 | `σ(goal) < 0.12` | **水平差不多，气氛比输赢重要** |
| 3 | 段位跨度 = 1 档 且 `maxL ≥ advanced` | **有人会教，有人会被带** |
| 4 | `maxL ≤ beginner` | **新手友好局** |
| 5 | `mean(goal) ≥ 0.65` | **强度偏高，做好出汗准备** |
| 6 | 兜底 | **打完去吃饭** |

**技能型标签集**

| # | 条件 | 标签 |
|---|---|---|
| 1 | 配对数 ≥ 3 | **互教互学，散场能带走一个技能** |
| 2 | `maxX ≥ 0.65` 且 配对数 ≥ 2 | **有人在讲，有人在记** |
| 3 | `σ(O) ≥ 0.20` | **一个想深挖，一个想广撒网** |
| 4 | 兜底 | **先各讲十分钟，再决定学谁的** |

`vibeNote` 用固定句式：`{触发条件的自然语言描述}`，例如「有 1 个人会主动开口，其余人接得上但不会抢话」。**不得写评价性形容词**（「这组很棒」）。

### 6.8 手算示例一：社交型 · 饭局（5 人一桌）

**输入画像**（Step 3/4 推导结果，`E`=社交能量、`X`=表达欲、`O`=开放性、`C`=作息、`g`=年级序号、`tags`=`interestTags ∪ topicsWanted`）

| 代号 | 昵称 | 年级(g) | E | X | O | C | tags | 学校 |
|---|---|---|---|---|---|---|---|---|
| U1 | 林 | 大一(1) | 0.72 | 0.80 | 0.70 | 0.5 | 电影、城市观察、探店 | 中山大学 |
| U2 | 陈 | 大三(3) | 0.35 | 0.30 | 0.55 | 0.8 | 游戏、健身、考研 | 华南理工 |
| U3 | 苏 | 大二(2) | 0.55 | 0.60 | 0.85 | 0.5 | 展览、摄影、独立音乐 | 广州美术 |
| U4 | 何 | 研一(5) | 0.30 | 0.25 | 0.45 | 0.5 | 考研、科研、羽毛球 | 广东工业 |
| U5 | 周 | 大二(2) | 0.65 | 0.55 | 0.60 | 0.8 | 旅行、探店、电影 | 广东外语外贸 |
| U6 | 张 | 大一(1) | 0.50 | 0.50 | 0.65 | 0.5 | 电影、建筑、探店 | 华南师范 |

（U6 为候补名单里的下一位，示例二会用到。）

**第一步：算单对分**（social 权重 0.30 / 0.22 / 0.18 / 0.12 / 0.10 / 0.08）

以 U1–U5 为例逐项代入：
- 性格互补：`|0.72-0.65| = 0.07` → `1 - |0.07-0.30| / 0.70 = 1 - 0.3286 = 0.671`，×0.30 = **0.201**
- 话题重合：交集 {探店, 电影} = 2，并集 {电影,城市观察,探店,旅行} = 4 → `2/4 = 0.50`，×0.22 = **0.110**
- 表达节奏：`1 - |0.80-0.55| = 0.75`，×0.18 = **0.135**
- 开放性：`1 - |0.70-0.60| = 0.90`，×0.12 = **0.108**
- 作息：`1 - |0.5-0.8| = 0.70`，×0.10 = **0.070**
- 年级：Δ=1 → 0.85，×0.08 = **0.068**
- **小计 0.692**

同理算出全部 10 对：

| 对 | 互补 | 话题 | 表达 | 开放 | 作息 | 年级 | pairScore |
|---|---|---|---|---|---|---|---|
| U1–U2 | 0.900 | 0.000 | 0.500 | 0.850 | 0.700 | 0.650 | **0.584** |
| U1–U3 | 0.814 | 0.000 | 0.800 | 0.850 | 1.000 | 0.850 | **0.658** |
| U1–U4 | 0.829 | 0.000 | 0.450 | 0.750 | 1.000 | 0.450 | **0.556** |
| U1–U5 | 0.671 | 0.500 | 0.750 | 0.900 | 0.700 | 0.850 | **0.692** |
| U2–U3 | 0.857 | 0.000 | 0.700 | 0.700 | 0.700 | 0.850 | **0.605** |
| U2–U4 | 0.643 | 0.200 | 0.950 | 0.900 | 0.700 | 0.650 | **0.638** |
| U2–U5 | 1.000 | 0.000 | 0.750 | 0.950 | 1.000 | 0.850 | **0.717** |
| U3–U4 | 0.929 | 0.000 | 0.650 | 0.600 | 1.000 | 0.450 | **0.604** |
| U3–U5 | 0.714 | 0.000 | 0.950 | 0.750 | 0.700 | 1.000 | **0.625** |
| U4–U5 | 0.929 | 0.000 | 0.700 | 0.850 | 0.700 | 0.450 | **0.613** |

上表每格是该项权重后的贡献值，最后一列是 6 项之和。全部 ≥ `PAIR_FLOOR = 0.35`，无断边。

**第二步：方案 A（初版贪心结果 {U1,U2,U3,U4,U5}）打分**

- `meanPair = (0.584+0.658+0.556+0.692+0.605+0.638+0.717+0.604+0.625+0.613) / 10 = 6.292 / 10 = 0.629`
- `minPair = 0.556`（U1–U4）
- `base = 0.6 × 0.629 + 0.4 × 0.556 = 0.377 + 0.222 = 0.600`
- `bonus = 0.03`（U1 `X=0.80 ≥ 0.60`，有带节奏的人）`+ 0.02 = 0.05`
- `penalty`：
  - 话题孤立人数 = **1**（U3 的 {展览, 摄影, 独立音乐} 与其余 4 人两两交集皆 0）→ −0.10
  - 同校超限 0、同专业超限 0、隐私超限 0（U4 `privacyBoundary=0.85` 仅 1 人，上限 1）
- `groupScore = 0.600 + 0.05 - 0.10 = 0.550`

**结论：方案 A 被拒。** 两个独立原因：
1. **C9 话题连通违反** —— U3 是孤立点，进组必然被冷落；
2. `0.550 < QUALITY_FLOOR 0.62`。

其余约束检查：`mean(E) = (0.72+0.35+0.55+0.30+0.65)/5 = 0.514 ∈ [0.25, 0.80]` ✅；`maxX - minX = 0.80-0.25 = 0.55 ≥ 0.15` ✅；5 人 5 校 ✅。

**第三步：局部搜索换一次人（U3 ↔ U6）**

重算涉及 U6 的 4 对：

| 对 | 互补 | 话题 | 表达 | 开放 | 作息 | 年级 | pairScore |
|---|---|---|---|---|---|---|---|
| U1–U6 | 0.886 | 0.500 | 0.700 | 0.950 | 1.000 | 1.000 | **0.796** |
| U2–U6 | 0.786 | 0.000 | 0.800 | 0.900 | 0.700 | 0.650 | **0.610** |
| U4–U6 | 0.857 | 0.000 | 0.750 | 0.800 | 1.000 | 0.450 | **0.624** |
| U5–U6 | 0.786 | 0.500 | 0.950 | 0.950 | 0.700 | 0.850 | **0.769** |

（U1–U6 的互补项：`|0.72-0.50| = 0.22` → `1 - |0.22-0.30|/0.70 = 0.886`；话题：交集 {电影, 探店} = 2，并集 {电影,城市观察,探店,建筑} = 4 → 0.50。）

**方案 B（{U1,U2,U4,U5,U6}）**
- 10 对之和 `= 0.584+0.556+0.692+0.796+0.638+0.717+0.610+0.613+0.624+0.769 = 6.599`
- `meanPair = 0.660`，`minPair = 0.556`
- `base = 0.6 × 0.660 + 0.4 × 0.556 = 0.396 + 0.222 = 0.618`
- `bonus = 0.05`，`penalty = 0`
- **`groupScore = 0.618 + 0.05 = 0.668`** → 66.8 分，≥ 0.62 ✅

约束复核：话题连通 —— U1↔U5/U6（探店, 电影）、U2↔U4（考研）、U4↔U2、U5↔U1/U6、U6↔U1/U5 ✅ 无孤立点。
`mean(E) = (0.72+0.35+0.30+0.65+0.50)/5 = 0.504` ✅；`maxX=0.80`、`minX=0.25`、差 0.55 ✅；`privacy 0.85` 仅 U4 一人 ✅；5 校 5 人 ✅。
设性别为 3 女 2 男 → 女比 0.60 ∈ [0.25, 0.75] ✅。

**第四步：氛围标签**
`maxX = 0.80 ≥ 0.65`；`meanE = 0.504 ∈ [0.40, 0.60]`；`σ(E)`：偏离 `+0.216 / -0.154 / -0.204 / +0.146 / -0.004`，方差 `0.1333/5 = 0.0267`，`σ = 0.163 ≥ 0.12` → **命中规则 1：「一个带节奏，其余慢慢跟上」**。
`vibeNote`：「有 1 个人会主动开口，其余人接得上但不会抢话」。

**第五步：理由句**
`matchReason`：「你们 5 个人里，2 个人都提到「探店」，2 个人提到「电影」；表达欲上一个人明显高，其余偏低。」
（共同话题按频次排序：探店 2 次、电影 2 次——电影在 U1 与 U5/U6 的话题域中都出现，取频次最高两条。）
`hostId = U1`（`social` 按 `expressiveness` 最高，U1 = 0.80；并列时看 `socialEnergy`，无并列）。

### 6.9 手算示例二：竞技型 · 羽毛球（4 人一桌）

**输入画像**（`L` = 段位数值，rookie 0 / beginner 0.3333 / advanced 0.6667 / veteran 1）

| 代号 | 昵称 | 段位 | L | 争胜心 goal | 表达 X | 作息 C | tags |
|---|---|---|---|---|---|---|---|
| P1 | 郑 | beginner | 0.3333 | 0.70 | 0.55 | 0.5 | 羽毛球、动漫 |
| P2 | 吴 | beginner | 0.3333 | 0.55 | 0.40 | 0.8 | 羽毛球、健身 |
| P3 | 李 | advanced | 0.6667 | 0.65 | 0.60 | 0.5 | 运动、电影 |
| P4 | 孙 | rookie | 0.0000 | 0.35 | 0.30 | 0.5 | 羽毛球、游戏 |
| P5 | 何 | beginner | 0.3333 | 0.60 | 0.50 | 0.5 | 羽毛球、摄影 |

**第一步：单对分**（权重 0.38 / 0.20 / 0.10 / 0.10 / 0.06，合 0.84）

以 P1–P2 为例：
- 段位：`|0.3333-0.3333| = 0` → `1 - 0/0.6667 = 1.000`，×0.38 = **0.380**
- 争胜心：`1 - 0.15 = 0.85`，×0.20 = **0.170**
- 性格：`1 - 0.15 = 0.85`，×0.10 = **0.085**
- 作息：`1 - 0.30 = 0.70`，×0.10 = **0.070**
- 话题：`{羽毛球}∩ = 1`，并集 3 → `1/3 = 0.333`，×0.06 = **0.020**
- **小计 0.725**

全部 6 对：

| 对 | 段位 | 争胜 | 性格 | 作息 | 话题 | pairScore |
|---|---|---|---|---|---|---|
| P1–P2 | 1.000 | 0.850 | 0.850 | 0.700 | 0.333 | **0.725** |
| P1–P3 | 0.500 | 0.950 | 0.950 | 1.000 | 0.000 | **0.575** |
| P1–P4 | 0.500 | 0.650 | 0.750 | 1.000 | 0.333 | **0.515** |
| P2–P3 | 0.500 | 0.900 | 0.800 | 0.700 | 0.000 | **0.520** |
| P2–P4 | 0.500 | 0.800 | 0.900 | 0.700 | 0.333 | **0.530** |
| P3–P4 | 0.000 | 0.700 | 0.700 | 1.000 | 0.000 | **0.310** |

**第二步：方案 A（{P1,P2,P3,P4}）先撞硬约束**

段位跨度 `= 0.6667 - 0 = 0.6667`，等于 **2 档**，违反 **C8（跨度 ≤ 1 档）**。
→ **直接不可成组，不进入打分。**（若强行计算：`mean=0.529`、`min=0.310`，`base = 0.84×(0.6×0.529+0.4×0.310)=0.84×0.4415=0.371`，因 `P3–P4 = 0.310 < PAIR_FLOOR 0.35` 实际已断边。无论如何都不能要——新手和老手互相折磨就是这个产品最该避免的事。）

**第三步：方案 B（{P1,P2,P4,P5}，把 advanced 换成 beginner）**

新增 3 对：

| 对 | 段位 | 争胜 | 性格 | 作息 | 话题 | pairScore |
|---|---|---|---|---|---|---|
| P1–P5 | 1.000 | 0.900 | 0.950 | 1.000 | 0.333 | **0.775** |
| P2–P5 | 1.000 | 0.950 | 0.900 | 0.700 | 0.333 | **0.750** |
| P4–P5 | 0.500 | 0.750 | 0.800 | 1.000 | 0.333 | **0.540** |

- 6 对之和 `= 0.725+0.515+0.775+0.530+0.750+0.540 = 3.835`
- `meanPair = 0.639`，`minPair = 0.515`
- 归一化（÷0.84）：`meanNorm = 0.761`，`minNorm = 0.613`
- `pairPart = 0.6 × 0.761 + 0.4 × 0.613 = 0.457 + 0.245 = 0.702`

**分队均衡**：按 `L` 降序 P1(0.3333)、P2(0.3333)、P5(0.3333)、P4(0)，蛇形分队
→ A 队 = {P1, P4}，`avgL_A = 0.1667`；B 队 = {P2, P5}，`avgL_B = 0.3333`
→ `teamBalance = 1 - |0.1667-0.3333| / 0.5 = 1 - 0.333 = 0.667`

- `groupScore = 0.84 × 0.702 + 0.16 × 0.667 = 0.590 + 0.107 = 0.696`
- `bonus = 0.03`（`hostId` 已确定：`competitive` 按段位最高，P1/P2/P5 同为 beginner（0.3333）并列 → 按 `goalIntensity` 取 P1 = 0.70）+ `0.02 = 0.05`
- `penalty = 0`
- **`groupScore = 0.746`** → 74.6 分 ✅

约束复核：段位跨度 `0.3333 - 0 = 0.3333` = 1 档 ✅（`badminton` 走 C8b 的严格档，≤1 档）。
C4 按 `competitive` 分支判定 —— `max(goalIntensity) = 0.70 ≥ 0.65` ✅，且 `0.70 - 0.35 = 0.35 ≥ 0.15` ✅（**不是看表达欲**：这四人 `maxX = 0.55 < 0.60`，若按旧版一刀切规则会误判不合法）。
C4b：`badminton` 的 `PAIR_FLOOR = 0.40`，本组 6 对最低 `0.515 ≥ 0.40` ✅。
顺带验一下旧版为什么必须改：若按旧 C4（`maxX ≥ 0.60`），本组四人都老实（最高 0.55）会被判不合法——**而这恰是一桌会准时到场、肯认真打的羽毛球组**。这就是 B1 裁决要解决的问题。

**第四步：氛围标签**
`teamBalance = 0.667 < 0.80` → 规则 1 不命中。
`σ(goal)`：值 0.70/0.55/0.35/0.60，均值 0.55，方差 `0.065/4 = 0.0163`，`σ = 0.127 ≥ 0.12` → 规则 2 不命中。
段位跨度 = 1 档但 `maxL = 0.3333 < advanced` → 规则 3 不命中。
`maxL = 0.3333 ≤ beginner` → **命中规则 4：「新手友好局」**。
`vibeNote`：「4 个人都是刚摸拍的水平，重点是别让谁一个人站角落」。

**第五步：赛制侧联动**：因为是「新手友好局」，物料里的 `tournament.format` 从 `knockout` 降级为 `king_of_court`（守擂轮换，输了下场，人人有球打），每轮 7 分钟，共 6 轮。这条规则写在 7.3。

---

## 7. 物料生成规格

> 实现文件：`src/lib/materials.js`（`generateMaterial(group, type) → Material`）+ `src/lib/print.js`（打印渲染，两种模板见 7.6）。
> 题目全部来自 `src/data/questions.js` 种子池（≥120 题，按 `segment` × `profile` × `intensity` 三维打标），生成时**只做选择、排序、轻改写**，不凭空造题。

### 7.1 公共字段

```js
payload = {
  meta: { groupId, tableNo, eventTitle, activityName, campus, durationMin,
          memberCount, generatedAt, version },
  // 以下按 kind 分支
}
```

`meta.tableNo`、`meta.eventTitle`、`meta.campus` 出现在打印页页眉；`groupId` 不出现在打印件上（只有桌号）。

### 7.2 社交型：话题卡牌 `kind = 'cards'`

```js
payload.cards = {
  segments: [
    { key: 'icebreak', label: '破冰', note: '先别聊太深', questions: [{ id, text, intensity }] },
    { key: 'interest', label: '兴趣与经历', note: '讲一件真事', questions: [...] },
    { key: 'opinion',  label: '观点',    note: '可以不同意', questions: [...] }
  ],
  identityCards: [{ userId, nickname, schoolShort, majorBroad, grade,
                    oneLineImage, myQuestion, tags: [3] }],
  sharedTopics: ['探店', '电影', '想出去走走'],
  depthNote: '这桌整体偏慢热，第 2 段结束前不用急着聊观点题'
}
```

**题量公式**（`meanE` = 组内平均 `socialEnergy`，`meanX` = 平均 `expressiveness`，`n` = 人数）

| 段 | 题量 | 上下限 |
|---|---|---|
| 破冰 | `6 + round(2 × (1 - meanE))` | clamp 6–10 |
| 兴趣与经历 | `8 + n`（其中 `n` 道是每人自提的 `questionsAsked`） | clamp 8–16 |
| 观点 | `6 + round(3 × meanX)` | clamp 4–10 |
| **合计** | 常规落在 **26–34 题** | — |

**改写规则（3 条，全部确定性）**
1. `meanE < 0.40`：破冰 +2 题（取 `intensity=1` 里最短的），观点 −2 题，`depthNote` 改为「这桌整体偏慢热…」。
2. `meanX ≥ 0.65`：观点段前置 1 道 `intensity=3` 的题，`depthNote` 改为「这桌话多，可以直接上硬题」。
3. 每道自提题前插入一行提示卡：`「{昵称} 想问：」`，排在兴趣段末尾。

**自提题的长度兜底（渲染层，不靠输入校验兜全部）**

| 长度 | 渲染 |
|---|---|
| ≤32 字 | 正常（输入层已拦，绝大多数走这条） |
| 33–36 字 | 允许贴满 3 行，不截断 |
| >36 字 | 正面截断到 36 字，底部提示改为「**轻点看全文**」；**翻到背面**在顶部显示全文（20px / 行高 1.4 / 最多 5 行） |

**为什么是翻面而不是「全文」按钮**（口径已与 `design-spec.md` §5.12.1 统一）：
卡牌整块已经可点翻面，再叠一个按钮就要写 `stopPropagation`；而现场的手指是湿的、抖的、可能戴手套，**多一个可点区域就多一类误触**。翻面是这一页已经学会的手势，不用教第二次——而且真实卡牌本来就是翻过来看背面，按钮是纯网页产物，和「纸张实物」这套隐喻相斥。

**禁止自动降字号硬塞。** 同一副牌里字号不一致，比截断难看得多——牌是一起摊在桌上的，大小不一立刻显脏。
超长数据只能来自粘贴、历史迁移、批量导入（输入校验拦不住这三条路径），所以渲染层必须有兜底。

**排序规则**：段内按 `intensity` 升序；同强度按种子池 `sortOrder`。**禁止同一 `id` 出现两次**（`questionsAsked` 与种子池撞题时，自提题保留，删种子题）。

**身份卡 `oneLineImage`**：由 `reasonForUser` 截取主语部分改编，模板 `「{学校简称} {年级中文}，{majorBroad}，{tag1} / {tag2}」`，≤24 字。

### 7.3 竞技型：热身流程 + 赛制 `kind = 'tournament'`

```js
payload.tournament = {
  warmup: { totalMin, steps: [{ no, name, min, lead: userId, cue }] },
  format: 'king_of_court' | 'round_robin' | 'knockout',
  teams: [{ key: 'A', name, memberIds: [] }, { key: 'B', name, memberIds: [] }],
  rounds: [{ no, courtNo, teamA: [], teamB: [], rule, min, scoreTo: 11 }],
  scoring: { mode: 'rally' | 'side_out', scoreTo: 11, winBy: 2, cap: 15 },
  rotationRule: '输的一方下场，场边队补上',
  safetyNote: '热身不到位别开打；有膝踝旧伤提前说'
}
```

**赛制选择（按氛围标签联动，规则确定）**

| 氛围标签 | `format` | 轮次 | 每轮时长 |
|---|---|---|---|
| 新手友好局 | `king_of_court` | 6 轮 | 7 min |
| 水平差不多，气氛比输赢重要 | `round_robin` | 每组循环（n=4 时 6 场） | 8 min |
| 势均力敌，会打到最后一分 | `knockout` | 半决赛 + 决赛 = 3 场 | 12 min |
| 有人会教，有人会被带 | `king_of_court` + 第 1 轮设为「老手示范局」 | 5 轮 | 10 min |
| 强度偏高，做好出汗准备 | `round_robin` | 循环 + 1 场加赛 | 10 min |
| 打完去吃饭（兜底） | `king_of_court` | 5 轮 | 8 min |

**热身流程（固定 5 步，`lead` = `hostId`）**
1. 慢跑 2 分钟绕场
2. 手腕脚踝绕环 1 分钟
3. 动态拉伸（高抬腿/侧滑步）2 分钟
4. 对拉 3 分钟（两人一组）
5. 规则宣讲 1 分钟（`cue`：「先讲清出界怎么算，避免打起来」）

桌球/乒乓 → 前 2 步替换为「空挥 20 板」「推挡 1 分钟」；爬山 → 替换为「原地高抬腿 + 踝关节」并删去对拉；游戏开黑 → 替换为「设备检查 + 网络确认 + 1 局热身」。

**分队**：直接用 6.3.3 的蛇形分队结果，写入 `teams`，并在打印页醒目显示。

### 7.4 搭子型：目标卡 + 互相监督打卡表 `kind = 'goal'`

```js
payload.goal = {
  goalCards: [{ userId, nickname, goalText, deadline, weeklyCommit, blockers, partnerId }],
  checkinSheet: { days: ['周一'...'周日'],
                  rows: [{ userId, nickname, marks: [false ×7] }] },
  groupRules: [5 条固定文案],
  reviewQuestions: [3 条固定问句],
  partnerPairs: [{ a: userId, b: userId }]
}
```

- `partnerId` / `partnerPairs`：按 `goalMatch` 最高配对，奇数人时最后一人与 `hostId` 互督。
- `weeklyCommit` 由 `goalIntensity` 分档：`<0.4`→「每周至少 2 次」；`0.4–0.65`→「每周 4 次」；`>0.65`→「每周 5 次，每次 ≥2 小时」。
- `deadline` 取 `goalText` 里的日期词，无则填场次后 90 天。
- `groupRules`（固定 5 条）：①手机静音放在包里 ②到点开始，迟到不等人 ③中途离开说一声 ④不打听对方成绩与排名 ⑤散场前 10 分钟一起复盘。
- `reviewQuestions`：①这周最有进展的一件事？②卡在哪？③下周要不要加量？

### 7.5 技能型：互教课程表 `kind = 'curriculum'`

```js
payload.curriculum = {
  pairs: [{ teacherId, learnerIds: [], skill, direction: 'teach' }],
  slots: [{ no, startMin, durationMin, teacherId, learnerIds: [],
            topic, output, materials: [] }],
  swapRound: { enabled: true, atMin: 60, note: '到中段角色互换' },
  materialsNote: '自带：' + 装备清单
}
```

- 时长 120 分钟 → 4 节 × 25 分钟 + 中间 20 分钟互换说明；150 分钟 → 5 节。
- 每节必须有 `output`（产出物），不可为空：摄影局 →「每人 3 张对方满意的照片」；吉他 →「能弹完 4 个和弦的副歌」；剪辑 →「一条 15 秒成片」；英语口语 →「一段 1 分钟自我介绍」。
- `teacherId` 由 `complement()` 配对结果定，一人可同时是某节 teacher 与另一节 learner。
- 若 `slots` 出现「无人可教」（全组同技能）→ 触发 6.3.4 的硬拒，本物料不生成。

### 7.6 一键导出打印

**产物**：浏览器内生成的 HTML 文档（`print.js` 用 `document.createElement('div')` + `window.print()`，不引 PDF 库、不引 QR 库）。

#### 两种打印模板（按 `Material.kind` 二选一）

| 模板 | 适用 kind | 版式 | 为什么 |
|---|---|---|---|
| **`cards` 裁切卡版** | `cards`（社交型 6 类局） | 页眉通栏 → 卡网格 **2 列 × 3 行 = 6 张/页**，单卡 **88×60mm**，卡间距 4mm，虚线裁切框 → 页脚通栏 | 话题卡牌是**桌面上的实物**：要能裁开、洗牌、抽一张、传着看。印成「题目清单」的话桌上只有一张纸，没人愿意拿纸念题，卡牌的意义就没了 |
| **`sheet` 双栏参考表版** | `goal` / `tournament` / `curriculum` | 页眉通栏 → 双栏主体（左 58% 主干内容，右 42% 附表）→ 页脚通栏 | 这三种是**参考表**不是实物：打卡表要笔填、赛制要对阵一眼看全、课程表要时间轴连贯，双栏阅读效率最高，不需要裁 |

- `sheet` 版的左右分栏归属：`goal` → 左「目标卡列表」右「打卡表 + 组规」；`tournament` → 左「赛制与对阵表」右「热身流程 + 分队名单」；`curriculum` → 左「课程时间轴」右「技能配对 + 产出物清单」。
- `cards` 版的身份卡**单独起一页**（同样 2×3 网格，n 张占 1 页），不与题卡混排——裁剪时两类卡要分开。

#### 两版共用规格

| 项 | 值 |
|---|---|
| 纸张 | A4 纵向，`@page { size: A4; margin: 12mm 10mm }` |
| 字体字号 | 全站字体栈（不引外部字体）；页眉标题 20pt / 正文 10.5pt / 页脚 8pt / 卡内题面 11pt |
| 分页 | `break-inside: avoid` 保护单卡与单行不撕裂；`cards` 版题量 26–34 题 → **预计 5–7 页（含身份卡 1 页）**，这是卡牌作为实物的必然代价，不要为省纸缩字号 |
| 颜色 | 强制 `print-color-adjust: exact`（别让浏览器自作聪明省墨）；**朱红仅用于页眉条与分隔线，正文与卡面文字纯黑** |
| 打印计量 | `Material.printCount` 每次打印 +1，首次打印写 `printedAt`；后台「物料导出」的预警列依此判断是否漏打 |

#### 页眉必含 5 项（两版一致）

`不熟局 BU SHU` 字标（8pt）/ 活动名 + 场次时间（10.5pt）/ **桌号（20pt，全页最大，如 A3）** / 校区 + 场地名（8pt）/ **右角标识位（两行 mono，11pt）**：

```
GROUP A3
CODE 482913
```

**桌号在页眉出现两次是刻意的，不要合并**：左侧 20pt 大字是给桌上人看的（抬头找自己的桌），右角 `GROUP … / CODE …` 是给运营对页与裁切后归档用的机器可读标识（每页裁完只剩卡，靠这一行还能认回是哪个组）。两处职责不同，合并任何一处都会让另一方失效。
签到位沿用 `design-spec.md` §10.4 的四角描边框作为容器，框内即上述两行。

**签到位的内容必须是 `Group.checkinCode`（6 位数字）的可读文本**，配一行小字「现场签到码」。**不要写成「扫码看现场页」**——本期不渲染真二维码，放一句指向不存在的码的引导就是在骗用户；而签到码是当下唯一有功能价值、且必须让人看见的东西。位置必须留（将来接真 QR 时整页不必重排），但框里装签到码。

#### 页脚必含 3 项

`有问题找现场负责人：{Venue.hostName} {maskPhone}` / 组内规则摘要（`cards` 版印「一次只聊一道题，跳过去也没关系」；`goal` 版印 5 条组规前 3 条）/ `第 X 页 / 共 Y 页`（右下）。

> **几何数值的权威在 `design-spec.md` §10.4**（mm / pt / 网格 / 间距）；**本节的职责是规定每块放什么内容、哪个模板装哪类物料**。两边冲突时，尺寸听设计的、内容归属听本节的。

---

## 8. 状态机

### 8.1 Event 状态机

| 当前 | 事件 | 触发条件 | 目标 | 副作用 |
|---|---|---|---|---|
| `draft` | `publish` | 管理员填完 `startAt/signupDeadlineAt/matchAt/venueRevealAt/venuePoolIds` 且 `venueRevealAt > matchAt > signupDeadlineAt > now` | `signup` | 落地页出现该场次 |
| `signup` | `closeSignup` | `now ≥ signupDeadlineAt`（定时或管理员手动） | `matching` | 停止接受新报名；`Application.status=submitted` 冻结 |
| `matching` | `runMatch` | 待处理申请数 ≥ `minGroupSize` | `locked` | 生成 `Group`+`GroupMember`+`Material`；所有入组申请置 `matched`；未入组置 `waitlisted`；为每组生成 `venue_assign` 与 `material_export` 任务 |
| `matching` | `abortMatch` | 待处理申请数 < `minGroupSize` | `canceled` | 所有申请置 `expired`；通知报名者「本场人数不足，已取消」 |
| `locked` | `startEvent` | `now ≥ startAt - 15min` | `ongoing` | 开放 `#/live`；生成 `checkin_audit` 任务 |
| `ongoing` | `finishEvent` | `now ≥ endAt` | `ended` | `Group.status` 全部 `finished`；生成 `recapLine`；开放 `#/recap`；生成 `reminder_push`（评价提醒） |
| `signup`/`matching`/`locked` | `cancelEvent` | 管理员手动（必填原因） | `canceled` | 所有申请置 `canceled`；`Report`/任务留痕；通知全量 |
| `ended` | — | 终态 | — | 不可回退；补办须新建场次 |

**非法流转处理**：`transitionEvent(id, event)` 校验上表；不在表内的组合 → `throw new StoreError(409, 'ILLEGAL_TRANSITION', { from, event })`，**store 状态不变**，UI 显示「当前状态不支持这个操作」。禁止「先写再校验」。

**定时推进**：`store` 在每次读操作时调用 `tick(now)`，按时间条件自动推进 `signup→matching`、`locked→ongoing`、`ongoing→ended`。这样无需真实定时器，刷新即生效。

### 8.2 Application 状态机

| 当前 | 事件 | 触发条件 | 目标 | 副作用 |
|---|---|---|---|---|
| `submitted` | `waitlist` | 场次名额已满 | `waitlisted` | 创建 `WaitlistEntry(rank=末尾)` |
| `submitted` | `match` | 匹配入组 | `matched` | 写 `groupId`、`matchedAt`；创建 `GroupMember` |
| `submitted` | `cancel` | 用户在 `#/me` 撤回且 `now < signupDeadlineAt` | `canceled` | 释放名额；候补池第 1 名进 `submitted` |
| `submitted` | `expire` | 场次 `canceled` | `expired` | — |
| `waitlisted` | `promote` | 有人取消或扩组 | `matched` | 写 `groupId`；`WaitlistEntry.status=promoted` |
| `waitlisted` | `cancel` | 用户撤回 | `canceled` | 后续候补排位前移 |
| `waitlisted` | `expire` | 场次 `canceled` 或补位截止 | `expired` | — |
| `matched` | `checkin` | 强签到（输对 `checkinCode` 或管理员代签）**或**弱签到（`method=self`，见 §11.3） | `checked_in` | 创建 `Checkin`；`GroupMember.seatStatus` 保持 `active`；`method=self` 时后台标为待核实 |
| `matched` | `cancel` | `now < matchAt`（已排桌后取消需管理员确认） | `canceled` | 触发补位流程（8.3）；原 `GroupMember.seatStatus=left` |
| `matched` | `noShow` | `now > endAt` 且无 `Checkin` | `no_show` | 计入用户出勤记录；后台任务提示 |
| `checked_in` | `review` | 提交 `Review` 或 `ReseatVote` 任一 | `reviewed` | — |
| `checked_in` | `finish` | `now > endAt + 60min` 且未评价 | `reviewed`（记为已结束，`Review` 为空） | — |
| `reviewed` | — | 终态 | — | — |
| `canceled` / `expired` / `no_show` | — | 终态 | — | 重新报名须新建 `Application` |

**非法流转**：如 `canceled → matched`、`reviewed → checked_in`，一律 409 `ILLEGAL_TRANSITION`。

### 8.3 候补补位流程（有人取消 → 补人 → 重校验 → 通知）

```
1. 触发：Application(A) 从 matched → canceled，或 GroupMember 被管理员标为 left
2. 系统立刻做三件事（同一事务内）：
   a. GroupMember(A).seatStatus = 'left'; GroupMember(A).leftAt = now
   b. Group.memberIds 移除 A；若 A 是 `hostId`，按 §6.5「组长选择规则」在剩余成员中重选（**不是简单取 `expressiveness` 最高**）
   c. AdminTask.create({ type:'waitlist_fill', refKind:'group', refId: groupId,
                         title: 'A{k} 桌缺 1 人，需补位', dueAt: event.startAt - 2h })
3. 管理员在 #/admin/tasks 点「补位」→ 打开候补池（WaitlistEntry where eventId, status='waiting'，按 rank 升序）
4. 取 rank 最小的 W，做**三重校验**：
   ① 硬约束：把 W 的 snapshot 代入 group，跑 hardOK()（C2/C3/C4/C5/C6/C7/C9 全套）
   ② 质量线：groupScore(新组) ≥ QUALITY_FLOOR 且 ≥ 原组分数 - 0.05（补位不得让组显著变差）
   ③ 重生成物料：题量、身份卡、共同话题、分组对抗都依赖人数与画像，必须 generateMaterial() 重跑，
      version + 1，写 AdminTask(material_export)
5. 校验通过：Application(W).status = 'matched', groupId = 新组；
              WaitlistEntry(W).status = 'promoted', promotedAt = now
   → 补位成功，进 6
6. 校验不通过：WaitlistEntry(W) 保留原 rank（**不消耗**），跳到下一个 rank 重试，最多试 5 人
7. 5 人全不通过：任务标 blocked，管理员手动决定「本组减 1 人照常开」或「整组并到别组」
8. 通知（本期为站内）：
   站内：新组员在 #/me 看到「你已补进 A3 桌」；原组员看到「A3 桌有 1 位新成员」
   超时：若到 startAt - 2h 仍无人补位，自动降级为「本组 n-1 人照常开」并通知组长
```

**硬规则**：补位**不得**跳过重校验直接补人——这是最容易出的线上事故（补进来的人段位差 2 档、或让同校变 3 人）。

### 8.4 Group 状态机（简）

`forming` →（锁场地+物料生成完成）→ `locked` →（`now ≥ startAt-15min`）→ `ongoing` →（`now ≥ endAt`）→ `finished`。
`disbanded`：组内 `active` 成员 < `minGroupSize` 且无法补位时置此，成员全部转候补或并组。

---

## 9. 接口契约表

> **本期实现方式**：`src/lib/api.js` 在浏览器内实现下表全部方法，落到 `store`。函数签名、入参、出参与错误码与真实 REST 完全一致；未来接后端只需把 `api.js` 内部换成 `fetch`，页面与 store 一行不改。
> **统一约定**：路径以 `/api` 前缀；时间一律 ISO 8601 UTC 字符串；金额为整数（元）；`ok:true` 不出现，成功直接返回资源体，失败返回 `{ code, message, detail }`。
> **签到两端点与 `Checkin.method` 的对应（写死，勿自行组合）**：
> · `POST .../checkin` 本人提交 → `method = code`
> · `POST .../checkin` 带 `targetUserId` 且调用者为 `hostId` 或 admin → `method = admin`
> · `POST .../checkin-self` → `method = self`
> 弱签到后再调 `.../checkin` → **原地升级**为 `code`（更新同一条 `Checkin`，不新建、不报 409）。

> **统一错误码**：`400 VALIDATION_ERROR` / `401 UNAUTHENTICATED` / `403 FORBIDDEN` / `404 NOT_FOUND` / `409 ILLEGAL_TRANSITION` / `409 ALREADY_APPLIED` / `409 ALREADY_VOTED` / `410 REVEAL_NOT_READY` / `423 EVENT_CLOSED` / `429 RATE_LIMITED` / `500 SERVER_ERROR`。

| # | 方法 | 路径 | 入参（字段:类型:必填） | 出参 | 错误码 |
|---|---|---|---|---|---|
| 1 | GET | `/api/activities` | `active:boolean:选填` | `ActivityType[]` | 500 |
| 2 | GET | `/api/events` | `campus:string:选填, status:string:选填, activityTypeId:string:选填` | `Event[]`（含 `signupCount:number`、`seatsLeft:number`） | 400 / 500 |
| 3 | GET | `/api/events/:eventId` | — | `Event`（含 `signupCount`、`seatsLeft`、`groupCount`） | 404 / 500 |
| 4 | POST | `/api/auth/verify` | `school:string:必填, studentNo:string:必填, realName:string:必填` | `{ session:Session, user:User }` | 400 学号格式 / 401 学号与学校不匹配 / 429 连续失败 5 次 / 500 |
| 5 | GET | `/api/me` | — | `{ user:User, session:Session, applications:Application[] }` | 401 / 500 |
| 6 | PATCH | `/api/me` | `nickname:string:选填, major:string:选填, campus:string:选填, wechat:string:选填, phone:string:选填` | `User` | 400 / 401 / 409 昵称含真实姓名 / 500 |
| 7 | POST | `/api/applications` | `eventId:string:必填, activityTypeId:string:必填, activityTypeIds:string[]:必填（1–3 项，须含 activityTypeId）, answers:object:必填, shareContact:boolean:必填` | `Application`（含 `status`、`waitlistRank`） | 400 校验失败（含具体字段）/ 401 / 409 ALREADY_APPLIED / 423 EVENT_CLOSED / 429 / 500 |
| 8 | GET | `/api/applications` | `userId:string:选填（默认本人）, eventId:string:选填` | `Application[]` | 401 / 403（查他人）/ 500 |
| 9 | PATCH | `/api/applications/:applicationId` | `answers:object:选填, status:string:选填（仅 canceled）` | `Application` | 400 / 401 / 403 / 404 / 409 ILLEGAL_TRANSITION / 500 |
| 10 | GET | `/api/me/dashboard` | — | `{ stage:string（枚举 guest\|submitted\|matched\|live\|ended，由 resolveStage() 产出，见 §2.2，实现方不得自造值）, active:{ application, event, group, venue:Venue\|null } \| null, history:Array<{application,event,result:string}> }` | 401 / 500 |
| 11 | GET | `/api/groups/:groupId` | — | `{ group:Group, members:GroupMemberView[], event:Event, venue:Venue\|null, revealLocked:boolean }`；`GroupMemberView` 已脱敏（见 11.4） | 401 / 403 非本组 / 404 / 500 |
| 12 | GET | `/api/groups/:groupId/material` | — | `Material` | 401 / 403 / 404 / 410 未到 `matchAt` / 500 |
| 13 | PATCH | `/api/groups/:groupId/material` | `progress:object:必填（部分更新：index/skipped/checkedIn/scores 任一）` | `Material` | 400 / 401 / 403 / 404 / 500 |
| 14 | POST | `/api/groups/:groupId/checkin` | `code:string:必填（6 位数字）, targetUserId:string:选填（代签他人；不填即本人）` | `{ checkin:Checkin, application:Application }` | 400 码格式错 / 401 / 403 非本组 / 403 `targetUserId` 非本人且调用者非 `hostId` 或 admin / 404 / 409 该成员已强签到 / 410 不在签到窗口 / 500 |
| 14b | POST | `/api/groups/:groupId/checkin-self` | — （无请求体） | `{ checkin:Checkin, application:Application }` | 401 / 403 非本组 / 404 / 409 已强签到（弱签到可直接升级，不报错）/ 410 不在签到窗口 / 500 |
| 15 | GET | `/api/groups/:groupId/recap` | — | `{ group:Group, quotes:Quote[], reseat:ReseatVote[], myReview:Review\|null, stats:{checkinCount:number} }` | 401 / 403 / 404 / 410 未结束 / 500 |
| 16 | POST | `/api/groups/:groupId/reviews` | `ratingOverall:number:必填(1-5), ratingVibe:number:必填(1-5), wouldMeetAgain:boolean:必填, tags:string[]:必填, comment:string:选填` | `Review` | 400 / 401 / 403 / 404 / 409 已评价 / 500 |
| 17 | POST | `/api/groups/:groupId/quotes` | `text:string:必填(5-60), saidByUserId:string:选填` | `Quote` | 400 / 401 / 403 / 404 / 500 |
| 18 | POST | `/api/quotes/:quoteId/vote` | — | `Quote`（`votes` 已 +1） | 401 / 403 / 404 / 409 ALREADY_VOTED / 500 |
| 19 | POST | `/api/groups/:groupId/reseat` | `targetUserIds:string[]:必填, wantSameTable:boolean:必填` | `ReseatVote` | 400 含自己 / 401 / 403 / 404 / 409 已提交 / 500 |
| 20 | POST | `/api/reports` | `groupId:string:选填, eventId:string:选填, category:string:必填, text:string:必填(5-200), contactPhone:string:选填` | `Report` | 400 / 429 10 分钟内 >3 条 / 500 |
| 21 | GET | `/api/admin/events` | `status:string:选填` | `Event[]`（含 `signupCount`、`groupCount`、`waningCount`） | 401 / 403 / 500 |
| 22 | POST | `/api/admin/events` | `activityTypeId:string:必填, title:string:必填, campus:string:必填, startAt:string:必填, endAt:string:必填, signupDeadlineAt:string:必填, matchAt:string:必填, venueRevealAt:string:必填, capacityGroups:number:必填, capacityPerGroup:number:必填, minGroupSize:number:必填, schoolCap:number:必填, genderRule:object:必填, price:number:必填, priceMode:string:必填, venuePoolIds:string[]:必填` | `Event` | 400 时间序列非法（须 `venueRevealAt > matchAt > signupDeadlineAt > now`）/ 401 / 403 / 500 |
| 23 | POST | `/api/admin/events/:eventId/match` | `dryRun:boolean:选填（默认 false）` | `{ groups:Group[]（每项含 hardOK:boolean、violations:Array<{code,detail}>）, ungrouped:string[], hardOK:boolean, violations:Array<{tableNo, code, detail}> }` | 401 / 403 / 404 / 409 ILLEGAL_TRANSITION（非 `matching`）/ 500 |
| 24 | PATCH | `/api/admin/events/:eventId` | `status:string:选填, venuePoolIds:string[]:选填, capacityGroups:number:选填` | `Event` | 400 / 401 / 403 / 404 / 409 ILLEGAL_TRANSITION / 500 |
| 25 | GET | `/api/admin/groups` | `eventId:string:必填` | `Array<{ group:Group, members:GroupMemberView[], constraints:Array<{code,ok,detail}> }>` | 400 / 401 / 403 / 500 |
| 26 | PATCH | `/api/admin/groups/:groupId` | `venueId:string:选填, addUserId:string:选填, removeUserId:string:选填, status:string:选填` | `{ group:Group, groupScore:number, constraints:[...] }` | 400 / 401 / 403 / 404 / 409 违反硬约束（`detail` 列出违反项）/ 500 |
| 27 | GET | `/api/admin/waitlist` | `eventId:string:必填` | `WaitlistEntry[]`（join `User.nickname`） | 400 / 401 / 403 / 500 |
| 28 | POST | `/api/admin/waitlist/promote` | `waitlistId:string:必填, groupId:string:必填` | `{ application:Application, group:Group, material:Material, constraints:[...] }` | 400 / 401 / 403 / 404 / 409 校验未通过（`detail` 列违反项）/ 500 |
| 29 | GET | `/api/admin/venues` | `active:boolean:选填` | `Venue[]`（含 `usedGroups:number`） | 401 / 403 / 500 |
| 30 | POST | `/api/admin/venues` | `name:string:必填, campus:string:必填, kind:string:必填, address:string:必填, mapHint:string:必填, capacityGroups:number:必填, capacityPerGroup:number:必填, openDays:number[]:必填, openFrom:string:必填, openTo:string:必填, hostName:string:必填, hostPhone:string:必填` | `Venue` | 400 `openTo` 须晚于 `openFrom` / 401 / 403 / 500 |
| 31 | PATCH | `/api/admin/venues/:venueId` | 同 30 全字段选填 + `active:boolean:选填` | `Venue` | 400 / 401 / 403 / 404 / 409 有在用组时不可停用 / 500 |
| 32 | GET | `/api/admin/activities` | — | `ActivityType[]` | 401 / 403 / 500 |
| 33 | PATCH | `/api/admin/activities/:activityTypeId` | `active:boolean:选填, defaultPrice:number:选填, groupSizeMin:number:选填, groupSizeMax:number:选填, durationMin:number:选填, sortOrder:number:选填` | `ActivityType` | 400 `groupSizeMin>groupSizeMax` / 401 / 403 / 404 / 500 |
| 34 | GET | `/api/admin/materials` | `eventId:string:必填` | `Array<{ material:Material, tableNo:string, warnings:string[] }>` | 400 / 401 / 403 / 500 |
| 35 | POST | `/api/admin/materials/regenerate` | `groupId:string:必填` | `Material`（`version` +1） | 400 / 401 / 403 / 404 / 500 |
| 36 | GET | `/api/admin/tasks` | `status:string:选填` | `AdminTask[]` | 401 / 403 / 500 |
| 37 | PATCH | `/api/admin/tasks/:taskId` | `status:string:必填, assignee:string:选填` | `AdminTask`（`done` 时写 `doneAt`） | 400 / 401 / 403 / 404 / 500 |
| 38 | GET | `/api/admin/reports` | `status:string:选填, level:string:选填` | `Report[]`（join 桌号与提交人昵称） | 401 / 403 / 500 |
| 39 | PATCH | `/api/admin/reports/:reportId` | `status:string:必填, resolution:string:选填（closed 时必填）` | `Report` | 400 `closed` 缺 `resolution` / 401 / 403 / 404 / 500 |
| 40 | POST | `/api/admin/session/switch` | `userId:string:必填` | `{ session:Session, user:User }` | 401 / 404 / 500 |

**数量核对：41 条**（14 与 14b 为签到的一对端点，共用一个 `Checkin` 资源；要求 ≥18）。前端 `api.js` 必须导出与上表同名的 41 个函数，名字按 `verb + Resource` 驼峰化，例如 `listEvents`、`createApplication`、`promoteWaitlist`、`regenerateMaterial`。**store action 只允许调用 `api.js`，不允许页面直接调 store 写方法。**

---

## 10. 目录结构与组件清单

> **全队工程约定（写在这里，因为它影响所有目录里的代码）**
>
> 1. **新增枚举值时，必须全库搜索旧枚举的所有字符串形态，改完再 grep 一遍确认无残留。**
>    这条来自本规格的真实事故：`Review.tags` 后加了 `节奏刚好`，只改了 §5 的数据模型，忘了 §3.6 的区块清单还停在三个值，于是同一份文件对同一字段说了两个数。
>    检查清单：新增值后依次 grep ①旧值列表字符串 ②字段名（`tags` / `status` / `method` 等）③数字描述（「3 个标签」这类中文数量词）。**数量词是最容易漏的**，因为它不含字段名。
> 2. **字段只改一处 = 一定漂移。** 凡改动涉及某个实体，先 grep 该实体名与字段名的全部出现位置，列出清单后再改。
> 3. **口头结论不进文件就等于不存在。** 任何裁决、放宽、例外，先落到本文件再通知实现方；只发消息不改文件，实现方会按消息写、文档按旧版读，两边必然对不上。
>
> 4. **不要把一段文本当成一个范围去切；也不许用 catch 兜住解析失败后继续跑。**
>    **判据**：写 `JSON.parse(x)` 之前必须先问一句——**`x` 是一个「列的范围」（range），还是一段「文本」（value）？** 两者形状完全不同，混用不会报错，只会得到 `undefined`。
>    **真实事故形态**：`JSON.parse(undefined)` → 抛错 → 被外层 `try/catch` 吞掉 → 得到空数组 → 该组所有成员判为不合格 → **一整场开不出桌，而日志里什么都没有**。
>    两条硬规则：① 解析前校验「是字符串且非空」，否则 `throw`；② **`catch` 里必须 `throw` 或写入 `violations`，禁止吞掉后返回默认值**。
>    **吞掉异常比抛出来危险十倍**：抛出来你会去修，吞掉会让你以为跑通了——而它只是安静地让一整场开不出桌。

### 10.1 完整文件树

```
web应用/
├── index.html                  # 唯一 HTML 入口，<div id="root">，lang="zh-CN"，内联首屏底色防白闪
├── package.json                # 仅依赖 react/react-dom/vite/@vitejs/plugin-react
├── vite.config.js              # 无特殊配置，base:'./'（便于静态托管到任意子路径）
├── .gitignore
├── docs/
│   ├── site-spec.md            # 本文件
│   ├── content-plan.md         # 内容策划书（内容策略角色产出）
│   └── design-spec.md          # 设计规范（颜一屏产出）
├── public/
│   ├── favicon.svg             # 朱红方块 + 「不」字，手写 SVG
│   └── robots.txt              # 演示站，全部 Disallow
└── src/
    ├── main.jsx                # createRoot + import 全部 globals.css + <App/>
    ├── App.jsx                 # 全局 Provider（Toast/store 订阅）+ 路由出口 + 全局 Nav/Footer 条件渲染
    ├── data/
    │   ├── activityTypes.js    # 16 类活动冻结配置（5.2 表格直接照抄）
    │   ├── schools.js          # 10 校枚举 + 简称
    │   ├── venues.js           # 8 个场地种子（2 餐厅 / 2 活动室 / 2 操场球场 / 2 校外场馆）
    │   ├── events.js           # 6 场本周场次种子（四类匹配逻辑各至少 1 场）
    │   ├── users.js            # 40 个用户种子（含 1 个 admin 与 3 个「演示切换身份」）
    │   ├── applications.js     # 报名种子：已锁定场次 20 份 + 报名中 12 份 + 候补 3 份
    │   ├── groups.js           # 5 个已锁定组种子（含 1 个 finished 供 #/recap 演示）
    │   ├── materialSeeds.js    # 5 组物料种子（四种 kind 各至少 1 个）
    │   ├── quotes.js           # 金句种子 12 条
    │   ├── tasks.js            # 运营任务 8 条 + 紧急反馈 2 条
    │   ├── questions.js        # 话题题库 ≥120 题：{id,text,segment,profiles[],intensity,sortOrder}
    │   ├── warmups.js          # 5 套热身流程（球类/桌球/爬山/电竞/通用）
    │   ├── formats.js          # 3 套赛制模板（king_of_court / round_robin / knockout）
    │   └── lexicon.js          # 画像关键词词典：主动词/被动词/作息词/目标词/话题域/学科门类/技能同义词
    │
    ├── lib/
    │   ├── router.jsx          # 【冻结】hash 路由表 + matchRoute(hash) + matchHash()；admin 子路由
    │   ├── store.js            # 【冻结】唯一数据入口：state + localStorage + subscribe/notify + tick(now)
    │   │                       #          同文件导出 actions.*（全部写操作语义）与 StoreError(code,message,detail)
    │   ├── format.js           # 【冻结】formatTime/formatDate/formatPrice/countdownParts/maskPhone/majorBroad
    │   ├── match.js            # 【冻结】pairScore/groupScore/hardOK/MATCH/pickVibe/buildReason（第 6 节）
    │   ├── materials.js        # 【冻结】generateMaterial(group,type) → Material（第 7 节）
    │   ├── api.js              # 40 个 REST 形状函数（第 9 节），内部调 store；接后端只改此文件
    │   ├── seed.js             # 组装全部种子 + version + ensureSeeded()
    │   ├── profile.js          # deriveProfile(answers,user)/deriveTags()（第 6.1 节）
    │   ├── state.js            # resolveStage()/canEnter()/状态机守卫（第 8 节）
    │   ├── print.js            # buildPrintDoc() → 打印 DOM；printMaterial()（第 7.6 节）
    │   └── id.js               # nextId(prefix)、mulberry32(seed)（匹配必须可重放）
    │
    ├── styles/
    │   ├── tokens.css          # 唯一变量来源：色/字/间距/圆角/阴影/断点/打印尺寸（照 design-spec.md）
    │   ├── base.css            # reset（仅 6 条）+ html/body + 排版基线 + 焦点环
    │   ├── components.css      # 全部 .c-* 组件样式
    │   ├── print.css           # @page + @media print 全局规则
    │   └── pages/
    │       ├── landing.css     # 仅在 .p-landing 作用域内
    │       ├── join.css        # 仅在 .p-join 作用域内
    │       ├── me.css          # 仅在 .p-me 作用域内
    │       ├── table.css       # 仅在 .p-table 作用域内
    │       ├── live.css        # 仅在 .p-live 作用域内
    │       ├── recap.css       # 仅在 .p-recap 作用域内
    │       └── admin.css       # 仅在 .p-admin 作用域内
    │
    ├── components/
    │   ├── Nav.jsx
    │   ├── Footer.jsx
    │   ├── Marquee.jsx
    │   ├── Button.jsx
    │   ├── Tag.jsx
    │   ├── SectionHead.jsx
    │   ├── Modal.jsx
    │   ├── Progress.jsx
    │   ├── Grain.jsx
    │   ├── EmptyState.jsx
    │   ├── Countdown.jsx
    │   ├── Field.jsx
    │   ├── Stat.jsx
    │   ├── Toast.jsx
    │   ├── Tabs.jsx
    │   ├── DataTable.jsx
    │   └── Avatar.jsx
    │
    └── pages/
        ├── Landing.jsx         # #/  9 区块
        ├── Join.jsx            # #/join  7 步
        ├── Me.jsx              # #/me  4 区块
        ├── Table.jsx           # #/table/:groupId  6 区块
        ├── Live.jsx            # #/live/:groupId  5 区块
        ├── Recap.jsx           # #/recap/:groupId  5 区块
        ├── Admin/
        │   ├── AdminLayout.jsx     # 左 tab 列表 + 场次选择器 + 内容槽
        │   ├── UsersTab.jsx
        │   ├── MatchTab.jsx
        │   ├── LibraryTab.jsx
        │   ├── ActivitiesTab.jsx
        │   ├── VenuesTab.jsx
        │   ├── MaterialsTab.jsx
        │   └── TasksTab.jsx
        ├── NotFound.jsx        # 404
        └── Forbidden.jsx       # 403（后台非 admin）
```

**文件数核对**：根 2（`main.jsx`/`App.jsx`）· `data/` 14 · `lib/` 11 · `styles/` 4+7 · `components/` 17 · `pages/` 8+8 = **71 个源文件**。不再新增顶层目录。

> 带【冻结】标记的 5 个 lib 文件是队内已对齐的骨架，**文件名与位置不得改动**；其余 6 个是为满足第 5/6/8/9 节而必需的文件，可在此列表内调整职责，但不得新增第 12 个 lib 文件。

### 10.2 共享组件与 props 约定

> 前缀约定：组件 class 一律 `c-` 开头；props 一律 camelCase；**组件不得读取路由，路由信息由页面传入**。

| 组件 | props | 说明 |
|---|---|---|
| `Nav` | `variant: 'full'\|'mini'`、`stateBadge?: {text, to}`、`isAdmin:boolean` | `full` = 落地页版（含「我的局」「管理」）；`mini` = 内页版（字标 + 一个返回）。`stateBadge` 渲染 2.3 矩阵里的顶部细条 |
| `Footer` | `version:string`、`onFeedback:()=>void` | 三栏；不做任何数据请求 |
| `Marquee` | `items:string[]`、`speed?:number`(默认 40，秒/圈) | 纯展示；`prefers-reduced-motion` 下 `animation: none` |
| `Button` | `variant: 'primary'\|'ghost'\|'quiet'\|'danger'`、`size:'md'\|'lg'`、`disabled`、`full`、`onClick`、`as?:'button'\|'a'`、`href` | 全站唯一按钮；**一屏只允许一个 `primary`** |
| `Tag` | `children`、`tone:'default'\|'accent'\|'muted'`、`size:'sm'\|'md'` | 局类型标签、氛围标签、画像标签共用 |
| `SectionHead` | `eyebrow?:string`、`title:string`、`sub?:string`、`align?:'left'\|'center'` | 每页每个区块的标题统一走这个，不自己写 `<h2>` 样式 |
| `Modal` | `open:boolean`、`title:string`、`onClose`、`footer?:ReactNode`、`width?:number` | 需处理 Esc 关闭、点遮罩关闭、焦点困锁；**现场页（`/live`）禁用 Modal 以免分心** |
| `Progress` | `current:number`、`total:number`、`label?:string`、`hint?:string` | 问卷进度；也用于物料进度条 |
| `Grain` | `opacity?:number`(默认 0.04)、`fixed?:boolean` | 纸张质感叠加层，纯 CSS（repeating-radial-gradient），不引图片 |
| `EmptyState` | `title:string`、`desc?:string`、`action?:ReactNode`、`glyph?:string` | 空态统一 |
| `Countdown` | `target:ISOString`、`onDone?:()=>void`、`format?:'dhms'\|'hm'` | 内部 1s tick；`onDone` 触发后不再计时 |
| `Field` | `label:string`、`hint?:string`、`error?:string`、`required?:boolean`、`children`、`counter?:{now,max}` | 表单唯一包装器，负责 label/hint/error/字数 |
| `Stat` | `value:string\|number`、`label:string`、`tone?:'default'\|'accent'` | 首屏三个数字、后台汇总条共用 |
| `Toast` | `items:Array<{id,text,tone}>`、`onDismiss` | 全局由 `App.jsx` 持有；只在路由切换时自动清 |
| `Tabs` | `items:Array<{key,label,badge?}>`、`active:string`、`onChange`、`orientation:'vertical'\|'horizontal'` | 后台 7 tab、题库 3 子表共用 |
| `DataTable` | `columns:Array<{key,label,width?,render?}>`、`rows:any[]`、`emptyText`、`onRowClick?` | 后台所有表格共用；不做分页（本期数据量小），但支持 `maxHeight` 滚动 |
| `Avatar` | `seed:string`、`size?:number`、`label?:string` | 由 `seed` 的两字符 hash 出色块，不引图片 |

### 10.3 CSS 切分规则

| 文件 | 允许写什么 | 禁止写什么 |
|---|---|---|
| `tokens.css` | 只在 `:root` 里定义 CSS 变量；按 `--color-*` / `--font-*` / `--space-*` / `--radius-*` / `--shadow-*` / `--dur-*` 分组 | 任何选择器样式（`body`、`.btn` 都不行） |
| `base.css` | `*{box-sizing}`、`html,body`、`#root`、标题与段落基线、`a`、`:focus-visible`、`::selection`、`@media (prefers-reduced-motion)` | 组件类、页面类 |
| `components.css` | 只写 `.c-*` 开头的类，以及其内部 `&` 嵌套结构（手写 CSS 展开为后代选择器） | 裸元素选择器、`.p-*`、`#id` |
| `pages/<page>.css` | **每个选择器必须以 `.p-<page>` 开头**（如 `.p-landing .hero`）；允许 `@media` 内部同样规则 | 全局元素选择器、`.c-*` 重定义（需要改组件就改 components.css）、其他页面的 `.p-*` |
| `print.css` | `@page`、`@media print` 内的一切；打印时隐藏 `Nav/Footer/Marquee/Grain` | 屏幕样式 |

**页面样式不污染其他页面的三条硬约定**

1. **每页根节点必须带作用域类**：`<div className="p-landing">`。没有这个类，`landing.css` 全部失效——这样才能在评审时一眼看出漏写。
2. **禁止跨页复用页面类名**：`.p-join .step` 与 `.p-landing .step` 是两个东西，不允许抽到 `components.css` 里叫 `.step`。要复用就做成组件。
3. **自检命令**（写进 `README` 的提交前检查）：
   ```bash
   grep -nE '^[^@/ ][^{]*\{' src/styles/pages/*.css | grep -v '\.p-'
   ```
   输出必须为空。这条命令检查「页面 CSS 里不以 `.p-` 开头的选择器」，是唯一可机检的隔离手段。

**引入顺序**（`main.jsx` 固定）：`tokens.css → base.css → components.css → pages/*.css（7 个按字母序） → print.css`。顺序错会导致变量未定义。

---

## 11. 安全与合规

### 11.1 校园认证（假登录，但流程必须真）

| 环节 | 规格 |
|---|---|
| 表单 | `school`（10 校下拉）+ `studentNo`（8–14 位数字）+ `realName`（2–10 字） |
| 校验规则（本期本地实现） | ① `studentNo` 必须为纯数字且 8–14 位；② 不同学校校验位数前缀：中大/华工/华师/广工/广大取 10 位，其余校允许 8–14 位；③ 同一 `studentNo` 不得绑定到两个 `userId`（本地查重）；④ `realName` 不得与 `nickname` 完全相同 |
| 状态流转 | `pending`（提交）→ `verified`（规则全过，**本地直接通过**）/ `rejected`（人工驳回） |
| 假登录的明示 | `#/me` 页脚固定小字：「当前为演示环境，校园认证为本地校验，未接入学校系统。」**这句不可删** |
| 失败处理 | 连续失败 5 次 → `429 RATE_LIMITED`，10 分钟内不再受理 |
| 存储 | `studentNo` 完整值只存 `state`，**页面展示一律只显示后 4 位**（`maskStudentNo()`），列表、Modal、导出文件均如此 |
| 未来真接 | 换成学校统一身份 / 学信网；`POST /api/auth/verify` 的出参与错误码不变，只换内部实现 |

### 11.2 隐私说明（`Modal` 全文要点，落地页页脚可打开）

必须逐条写清的五件事：
1. **收什么**：学校、学号、真实姓名、昵称、年级、专业、性别、年龄、校区、问卷开放回答、联系方式（仅当你选择交换时）。
2. **干什么用**：学号与姓名只用于确认你是本校在读生；性别与年龄只用于组内比例与年龄跨度平衡；开放回答用于生成匹配理由与局内物料，**不会把原文给别人看**。
3. **给谁看**：同组同学看到的是「昵称 + 学校简称 + 年级 + 宽泛专业 + 一句画像」，看不到真实姓名、学号、联系方式。
4. **存多久**：本期数据只存在你自己的浏览器（`localStorage`），清除浏览器数据即彻底删除；接入后端后保留 180 天，可申请删除。
5. **不做什么**：不做人脸识别、不上传通讯录、不把回答用于训练、不向第三方共享。

### 11.3 活动签到

**核心裁决：签到码不进 App。** 6 位码只存在于两个地方 —— ① 打印出来的物料页眉（每组一份，摆在桌上，低头就能看到）；② 后台组详情（管理员可念给物料漏打的组）。**任何页面（含 `#/table` 解锁后的集合信息）都不显示这串数字。** 这是「能输对码 ≈ 人确实在桌边」的唯一前提：一旦 App 里能直接看到，签到就退化成「点一下确认」，`no_show` 数据立刻不可信，落地页承诺给用户的三项安全之一（签到）也随之变成空话。

| 项 | 规格 |
|---|---|
| 签到码 | `Group.checkinCode`，6 位数字。**不在 App 任何位置渲染**，`#/table` 只给 6 个空白输入格（三态规格见 `design-spec.md` §5.18.1） |
| 签到窗口 | `[startAt - 15min, startAt + 30min]`。窗口外提交 → `410`：早了提示「还没到签到时间」，晚了提示「签到已关闭，请联系现场负责人」（后者带 `tel:` 链接，接 `Venue.hostPhone`） |
| 强签到（已验证） | `method = code`：本人输对 6 位码。<br>`method = admin`：管理员后台代签（需 `role=admin`，否则 403）。<br>二者在后台视为**已验证在场** |
| 弱签到（冷启动兜底） | `method = self`：「我到了」。<br>**为什么必须有它**：物料每组只有一份，通常由组长带着；第一个到场的人可能还没见到人、也没见到纸。若只认码，这个人就签到不了，散场后被判 `no_show`——冤枉好人比漏记坏人更糟。<br>**它也把 `Application.status` 置 `checked_in`**（否则误判 `no_show`），但后台「签到核对」任务把它**单列为待核实**，运营可一眼看出这组是码签到还是自我声明 |
| 唯一性 | `(groupId, userId)` 唯一，重复签到返回 `409`；**已弱签到的人仍可补输码升级为强签到**（原地更新 `method` 与 `code`，不新建记录） |
| 未签到处理 | `now > endAt` 且无任何 `Checkin` → `Application.status = no_show`；后台生成 `checkin_audit` 任务；计入用户出勤统计（连续 2 次 `no_show` 由管理员人工介入，不自动惩罚） |
| 防代签的本质（必须如实描述） | 本期靠「码只在纸上」实现**弱证明**：伪造需要拿到桌上那张纸，成本高于收益。**不得宣称「实名签到 / 现场核验 / 刷脸」**——落地页与物料文案都只能用「签到」二字。接后端后叠加「同一设备 5 分钟内最多签 3 人」的地域限频 |
| 弱签到滥用监控 | 任一组 `self` 占比 100% 且 `checkinCode` 从未被任何成员使用 → 后台该组标黄，运营电话核实。<br>同一用户连续 2 次仅 `self` 且 `Review` 为空 → 人工介入（不是自动惩罚） |

**签到入口出现在两处**（到场的人不一定先打开同组页）：
1. `#/table/:groupId` 集合信息卡内的签到位（未到窗口时 disabled 并显示开窗时间）—— 主入口
2. `/live/:groupId` 顶条右侧一个「签到」小 chip，**未签到时才显示，签到后消失**—— 到场后最先打开的就是现场页，不放这里等于逼人退回上一页

### 11.4 隐私边界：同组速览的字段脱敏清单

`GET /api/groups/:groupId` 返回的 `GroupMemberView` **只允许包含下表「同组可见」为 ✅ 的字段**。这是后端（`api.js`）的职责，页面不得自行过滤。

| 字段 | 同组可见 | 组长额外可见 | admin 可见 | 说明 |
|---|---|---|---|---|
| `nickname` | ✅ | ✅ | ✅ | — |
| `school`（简称） | ✅ | ✅ | ✅ | 显示「中大」不显示全称 |
| `grade` | ✅ | ✅ | ✅ | — |
| `majorBroad` | ✅ | ✅ | ✅ | **宽泛化后的专业**，见下 |
| `oneLineImage` | ✅ | ✅ | ✅ | 我方生成的一句画像 |
| `tags`（≤3） | ✅ | ✅ | ✅ | 只从话题域取 |
| `myQuestion` | ✅ | ✅ | ✅ | 他自己提的问题，本就为公开而写 |
| `realName` | ❌ | ✅ | ✅ | — |
| `studentNo` | ❌ | ❌ | ✅（后 4 位） | 组长也不给完整学号 |
| `wechat` / `phone` | ❌ | ✅（仅 `shareContact=true`） | ✅ | — |
| `age` | ❌ | ❌ | ✅ | 只用于匹配 |
| `gender` | ❌ | ❌ | ✅ | 只用于匹配与比例校验 |
| `profile`（7 维数值） | ❌ | ❌ | ✅ | **数值绝不下发同组**，否则「盲盒」失效且可被反推 |
| `answers`（三句原文） | ❌ | ❌ | ✅ | 原文只在后台答卷 Modal 与本人 `#/me` 出现 |
| `blacklisted` | ❌ | ❌ | ✅ | — |

**专业宽泛化规则**（`majorBroad()`）：把专业映射到 12 个门类宽称。
`新闻传播/广告/汉语言` → 「人文」；`计算机/软件/电子/自动化` → 「工科」；`化学/化工/生物/材料` → 「理科」；`视觉传达/美术/音乐/舞蹈` → 「艺术」；`工商管理/会计/金融/旅游管理` → 「商科」；`临床/药学/中医/护理` → 「医药」；其余 → 「其他」。
**理由**：精确专业 + 学校 + 年级三者组合足以在小范围内定位到人，必须降一档。

### 11.5 女生比例保护（可配置）

| 项 | 默认 | 说明 |
|---|---|---|
| `genderRule.enabled` | `true` | 关掉即不做性别约束（用于纯自习局等无社交风险的场景） |
| `genderRule.minFemaleRatio` | `0.25` | 组内女生占比下限。4 人组 → 至少 1 名；6 人组 → 至少 2 名 |
| `genderRule.maxSameGenderRatio` | `0.75` | 单一性别占比上限。4 人组不得 4 男或 4 女 |
| `genderRule.highPrivacyCap` | `1` | 每组高隐私边界人数上限 |
| 生效点 | 匹配硬约束 C2（6.4）+ 换人预演（后台 `#/admin/match`） | 违反时不可成组，后台红字提示具体比例 |
| 数据不足时 | 候选池无法满足时，**优先缩小该组人数**（4→3）而不是破例；仍无法满足则该组解散，成员进候补 | |
| 未填性别 | `gender` 为 `other`/`prefer_not` 的人不计入分子分母，但在提示里说明「本组有 1 人未标注性别」 | 不强迫填、也不假装有数据 |

### 11.6 紧急联系人与一键反馈

| 通道 | 入口 | 规格 |
|---|---|---|
| 现场一键反馈 | `/live` 常驻安全条「不舒服就点这里」 | 3 个字段：类别（安全/骚扰/不适/场地/其他）、一句话（5–200 字）、是否留电话。可匿名。提交后 `Report.status=open` |
| 类别自动升级 | `harassment` / `safety` 一律 `level=urgent`，在后台收件箱**置顶且整行朱红** | 不经人工判断，避免漏判 |
| 集合信息里的负责人 | `#/table` 解锁后显示 `Venue.hostName` + **完整电话** + 「点此拨打」（`tel:` 直拨，不掩码）。<br>**为什么不用掩码**：现场打不通等于没有这个功能；且掩一个「本来就要打的号」会让用户觉得平台在防着他。`hostPhone` 是场地工作人员的对外联络号码，不是成员个人隐私（§11.4 的脱敏清单约束的是成员字段），演示数据用虚构号段 | 现场第一联系人 |
| 平台紧急联系人 | 落地页页脚 + `/live` 安全条第二行：「平台值班：`138****0000`（每日 17:00–23:00）」 | 演示占位，需用户替换真实号码 |
| 处理时限（写进后台） | `urgent` 30 分钟内接手、2 小时内闭环；`normal` 24 小时内闭环 | 后台任务卡显示倒计时 |
| 同步动作 | 任一 `urgent` 反馈生成 `AdminTask(type=report_handle)`，且在同场次所有组的现场页顶部挂一条黄色横幅「本场已收到安全反馈，正在处理」 | 让同场其他人知道「有人在管」 |

### 11.7 内容红线（写进评审清单）

| 禁止 | 原因 |
|---|---|
| 「脱单 / 配对 / 缘分 / 心动 / CP / 灵魂伴侣」 | 产品哲学是「无所求」，出现即变成相亲产品 |
| 「保证认识 N 个朋友」「一定能聊得来」 | 过度承诺；匹配只能是概率安排，不是结果保证 |
| **预测词表**（匹配理由 / `vibeNote` / 氛围标签内一律禁用）：`一定会` `保证` `肯定能` `聊得来` `合得来` `处得来` `断不了` `冷不了` `不会有人` `大概会` `想必` `应该会` | 单字「会」**不在此列**——「他会弹吉他」「她带了双份球拍」是事实。**按语境判，不按字判** |
| **句式红线**：匹配理由的主语必须是事实源（「他写了」「大家都选」「我们据此怎么排」），谓语不得指向未来结果 | 正例：`她会弹吉他` / `他带了双份球拍`；反例：`你们会聊探店` / `他会提前把拍子借给你`。一预测就变成承诺，第一次冷场就是我们的错 |
| ⚠️ 白名单：`聊得开` 可用于 `Review.tags` | 同一个词，**事后评价是事实，事前匹配理由里是承诺**。`Review.tags` 的四个值是用户自己填的选项，不是平台预测 |
| 把 `profile` 数值、原始三句回答展示给同组 | 泄露隐私 + 摧毁盲盒 |
| 展示真实姓名、完整学号、完整手机号 | 校园场景的硬底线 |
| 用「i 人 / 社恐」当**标签贴在具体人身上** | 可以用于自我描述，不可以由平台给别人贴 |
| 现场页出现任何营销、推荐、评价入口 | 局上 AI 必须消失，人也别被打扰 |
| 未解禁就下发场地名称与地址 | 盲盒机制失效，是产品级 bug 不是体验问题 |
| 匹配理由 / 氛围标签里出现距离或时长（「骑车 8 分钟」「走路就到」「离你宿舍很近」） | `campus` 粒度只到校区/片区，算不出真实通勤时间；说分钟数就是承诺了一件我们做不到的事（见 §6.6-C2） |
| 在 App 内显示 `checkinCode` | 签到退化成点一下，`no_show` 数据失真，安全承诺变空话（见 §11.3） |
| 宣称「实名签到 / 现场核验 / 刷脸 / 人脸识别」 | 本期只做到「码在纸上」的弱证明，这么写是虚假宣传 |

---

## 12. 上线方式与已知风险

### 12.1 构建与托管

| 项 | 结论 | 理由 |
|---|---|---|
| 构建 | `npm run build` → `dist/`，纯静态产物（HTML + JS + CSS，无服务端） | 本产品没有真实后端，静态产物可以直接跑；包体目标 < 300KB gzip |
| `vite.config.js` | `base: './'` | 用相对路径，才能托管到任意子路径（`/bushu/`）而不用改配置 |
| 路由 | hash 路由 | 静态托管不需要 `rewrite` 到 `index.html`，避免配错导致刷新 404；这也是「7 个路由」全部用 hash 的原因 |
| 托管平台 | **EdgeOne Pages**（主）/ 任意静态托管（备） | 最快上线路径，无需服务器；`dist/` 直接拖拽或 `git push` 触发构建 |
| 域名与 HTTPS | 首发用平台默认子域（自带 HTTPS）；有自有域名再绑，绑域名前需完成 ICP 备案 | 备案是国内绑自有域名的前置条件，不能省；默认子域可先让用户看到成品 |
| 缓存策略 | `assets/*` 长缓存（带 hash），`index.html` 不缓存 | 避免用户看到旧版本 |
| 环境变量 | 本期**无** | 没有密钥、没有后端地址。将来接后端只加 `SITE_API_BASE`（全大写、只引名不写值） |

### 12.2 未来接后端的迁移点

**唯一改动文件：`src/lib/api.js`。** 40 个函数内部从 `store.*` 换成 `fetch(SITE_API_BASE + path)`，签名与返回值不变。页面、组件、`store.js` 读取层都不动。

| 迁移项 | 本期 | 接后端后 | 需要动的文件 |
|---|---|---|---|
| 数据读写 | `api.js` → `store` → `localStorage` | `api.js` → `fetch` | 仅 `api.js` |
| 鉴权 | `Session` 假 token，`#/me` 底部切身份 | `POST /api/auth/verify` 返回真 token，存 `sessionStorage` | `api.js` + `Session` 存储位置 |
| 匹配跑批 | 浏览器内 `MATCH()` 同步执行 | 服务端跑批（同一份 `match.js` 可直接搬 Node 运行，纯函数无 DOM 依赖） | 无（复制 `match.js`） |
| 物料生成 | 浏览器内生成 + `window.print()` | 服务端生成 HTML → 前端拉取 → 打印 | `materials.js` 复制，`print.js` 改为拉取 |
| 图片/合影 | 本期禁用 | 对象存储（`workbuddy_cloud_service` 存储） | 新增上传组件 |
| 通知 | 站内提示条 | 短信/微信订阅消息 | 新增 |

**为什么现在就能确定迁移点**：`store.js` 只暴露 `get/subscribe`，`api.js` 是唯一写入口，页面从 `api.js` 取数据。这条约束已写进 4.8 的验收标准（`src/pages/**` 里 grep `localStorage` 必须为 0）。

### 12.3 TOP 5 风险与缓解

| # | 风险 | 影响 | 缓解措施（已定） |
|---|---|---|---|
| 1 | **匹配质量无法在本地验证**。种子数据是我们自己编的，组分数再高也只证明算法自洽，不证明真人坐一起聊得起来 | 致命：产品价值主张=匹配质量 | ①组分数与 `min pairScore` 双指标入库，不只看均值；②`Review.ratingVibe` 与 `Group.groupScore` 做相关性留存，第一次真实开桌后立即对账；③首发只开 3 场，宁可慢；④质量线 `QUALITY_FLOOR=0.62` 一旦不达标就散组，不硬凑 |
| 2 | **「不承诺结果」的定位让转化率偏低**。用户要一个理由才肯报名，而我们拒绝给「你会认识 5 个人」这种承诺 | 高：直接决定报名率 | ①用**具体的事**替代结果承诺（「一顿饭」而不是「新朋友」）；②用**确定性**替代说服（明确写出结果时间、场地解锁时间）；③「我们不打保票」不是免责声明，而是信任区块，排在**区块 7**（§3.1 顺序已锁，因区块 3 跑马灯与区块 5 五步都是矮块，手机上实际落在第 4–5 屏） |
| 3 | **盲盒机制与安全感冲突**。不告诉地点会让人不报名；随便告诉地点会让「盲盒」失去意义 | 高 | ①只锁**地点**，不锁时间与人数——时间与人数给足；②`venueRevealAt` 设在开场前 3–4 小时（不是前 10 分钟），把悬念控制在「今天下午知道」；③解锁后立刻给场地名 + 文字指路 + 负责人电话，把不确定感一次性清掉 |
| 4 | **候选人不足导致大量「不成局」**。4–6 人一桌、10 校、还要满足性别与段位约束，冷启动阶段很可能凑不齐 | 高：不成局 = 用户流失且不再回来 | ①不成局时**不静默失败**：明确告知「本场人数不足」，并给「换到下一场」一键通道；②`minGroupSize` 按类型差异化（搭子局 3 人即可开）；③后台「匹配工作台」允许管理员降 1 人开桌 |
| 5 | **隐私事故**。同组页误展示真实姓名/学号/微信，或提前泄露场地 | 致命：校园场景一次事故就够 | ①脱敏在 `api.js` 层做，页面无法自行绕过（11.4 清单即验收标准）；②加一条 P0 自检：`#/table` 页面 DOM 中 grep 不到 `realName`/`studentNo`/`wechat`；③解锁前场地字符串**不进 DOM**（不是 CSS 隐藏）；④`Report` 的 `urgent` 自动升级 + 30 分钟响应承诺 |

### 12.4 上线前必过的 8 条检查

1. `#/` 首屏在 375px 宽下不出现横向滚动条，主 CTA 可见。
2. 从 `#/` 到提交报名，全程 ≤ 9 次点击，且中途刷新不丢已填内容（P1 若未做，则至少不报错）。
3. 4 种 `materialKind` 各打开一次 `#/live`，都能翻页/打勾/推进轮次。
4. 打印一次：分别用 `cards` 与 `tournament` 各打一次。`cards` 出 2×3 裁切卡网格（身份卡单独一页），`tournament` 出双栏参考表；两者页眉 5 项齐、桌号 20pt 最大、页脚 3 项齐、无单卡撕裂。
5. `#/table` 在 `venueRevealAt` 前后各看一次，确认锁/开正确，且锁态下 DOM 无地址字符串。
6. 后台走通一遍完整链路：触发匹配 → 看告警 → 换场地 → 批量打印 → 补位 → 处理一条 `urgent` 反馈。
7. `grep -rn "localStorage" src/pages/` 结果为 0。
8. 全站搜一轮红名单词（11.7 前两条），结果为 0。
9. **场地信息三件套已获授权**（真实信息时必过，占位数据在 `data/venues.js` 中用注释标注并在上线前替换）：
   - **`Venue.name` + `address`**：须确认场地方同意公开列示于平台。
   - **`hostPhone` —— 营业号码**：须确认该号是**场地/商户营业号码**，同意对外公布。
   - **`hostPhone` —— 负责人个人号码**：**必须单独取得同意，不得默认可公开。**「能公开营业座机」不等于「能公开负责人私人手机」——两件事、两个授权、不可合并判断。
   `hostPhone` 改为完整显示后（见 §11.6），泄露的已不是一个不可用的字符串，而是一个真能拨通的号码：风险从「不专业」升级为「骚扰」。
10. **降级成对执行**：任一项未获授权时，`address` 退到路口/牌坊级的同时，`mapHint` 必须升到地标级（见 §5.3）。只降一条 = 合规上过关、体验上把用户扔在村口打转。

---

## 范围建议（砍到哪层能上线）

**能上线的最小集合 = 全部 P0 + 4 套物料里的 2 套（cards + tournament）。** 具体切法：

- **不可砍**：`/`、`/join`、`/me`、`/table`、`/live`、`/recap` 六个页面 + 匹配引擎（6.4 硬约束全集）+ `cards` 与 `tournament` 两套物料 + 后台「匹配工作台 / 场地 / 物料导出 / 任务清单」四个 tab。
  理由：`/live` 是「AI 在幕后」唯一的实物证据，砍掉它整个产品就退化成微信群；匹配的硬约束（尤其 C8 段位与 C2 性别）砍掉任何一条都会出事故，不是体验问题。
- **可砍到下一版**：`goal` 与 `curriculum` 两套物料（先只用 `cards` 兜底，搭子局用「目标纸条 + 手写打卡」顶替）；后台「题库与玩法库」「活动类型管理」「用户管理」三个 tab（16 类配置写死在 `data/activityTypes.js`，运营改动走代码）；`/recap` 的金句投票（只留想续桌）。
- **砍完的形态**：一个只开 3 类局（饭局 / 自习局 / 羽毛球局）、跑通「报名→揭晓→同组→现场→续桌」五步的可演示产品。**这已经足以验证匹配质量这个核心假设**，也是唯一值得先验证的假设。

### 已记录但本期不做

| 项 | 为什么现在不做 | 什么时候做 |
|---|---|---|
| **`User.homeArea`（北亭 / 南亭 / 穗石 / 贝岗 / 校内）** | 本期 `campus` 用校名 slug + `shared`，粒度只到「哪所学校 / 公共片区」。岛上四个村是真实学生居住区，骑车到同一场地最多差 10 分钟，这个精度本期拿不到。<br>但本期 `campus` 只用于**筛场次与展示**，**不参与 `pairScore`、也不参与场地距离计算**（场地由管理员人工分配），所以精度损失本期不影响任何功能。 | 当后台要做「按骑车距离自动分配场地」时再加。只参与距离估算，**不进 `pairScore`**——居住地不是匹配维度，把人按住哪分桌会强化圈子。 |
| 合影上传 | 需要对象存储 + 内容审核，本期不做 | 接后端后 |
| 真二维码 | 需要引入 QR 生成依赖；本期签到位装 6 位签到码文本，位置按 QR 尺寸预留 | 接后端后替换签到位内容 |

## 最大风险（一句话）

**匹配质量是这产品的命，而本地种子数据证明不了匹配质量**——所有分数、氛围标签、匹配理由都只是自洽的推算，真正有没有人愿意坐到第二次，只有真实开桌后看 `Review.wouldMeetAgain` 与 `Review.ratingVibe` 才能知道。

## 需要用户拍板的 1–3 个决策

1. **域名**：首发用 EdgeOne Pages 默认子域（当天可上线、自带 HTTPS）还是等自有域名 + ICP 备案（约 1–3 周，但链接更好看、更像正经产品）？我建议先默认子域上线，跑通一场真实开桌再换域名。
2. **演示身份切换入口是否保留在页面上**：保留（评审/演示时能一键看学生视角与后台视角，但会削弱「真实产品」的观感）还是收进 URL 参数（`#/admin` 直接进，页面不留入口）？我建议保留在 `#/me` 最底部小字里，两全。
3. **首发开几场**：本周只开 3 场（人数可控、匹配质量能兜住、但首页局列表显得单薄）还是开 6 场（列表好看、但可能多场凑不齐人而取消）？我建议 3 场 + 首页把「本周已开 N 桌」的历史数字做大，用累计数据补列表的单薄。


