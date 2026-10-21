// 展示层格式化。所有日期一律按 Asia/Shanghai 读，种子里的 ISO 带 +08:00 偏移，
// 这样即使用户在别的时区打开，看到的也是「北京时间 18:30 集合」。

export const TZ = 'Asia/Shanghai'

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function toDate(value) {
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  return new Date(value)
}

export function isValidDate(value) {
  const d = toDate(value)
  return d instanceof Date && !Number.isNaN(d.getTime())
}

function partsOf(value, opts) {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return null
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, ...opts })
  const out = {}
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value
  return out
}

export const pad2 = (n) => String(n).padStart(2, '0')

/** '10月19日' */
export function fmtDate(value) {
  const p = partsOf(value, { month: 'numeric', day: 'numeric' })
  if (!p) return '—'
  return `${Number(p.month)}月${Number(p.day)}日`
}

const EN_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** '周一' */
export function fmtWeekday(value) {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  const zh = new Intl.DateTimeFormat('zh-CN', { timeZone: TZ, weekday: 'short' }).format(d)
  if (zh && zh.startsWith('周')) return zh
  // 极端情况下（系统缺中文数据）退回英文缩写再映射
  const en = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d)
  const i = EN_WEEK.indexOf(en)
  return i >= 0 ? WEEK[i] : '—'
}

/** '18:30' */
export function fmtTime(value) {
  const p = partsOf(value, { hour: '2-digit', minute: '2-digit', hour12: false })
  if (!p) return '—'
  return `${pad2(Number(p.hour) % 24)}:${p.minute}`
}

/** '10月19日 周一' */
export function fmtDateWeek(value) {
  return `${fmtDate(value)} ${fmtWeekday(value)}`
}

/** '10月19日 周一 18:30' */
export function fmtDateTime(value) {
  return `${fmtDateWeek(value)} ${fmtTime(value)}`
}

/** '10月19日 周一 18:30–20:30' */
export function fmtRange(start, end) {
  if (!isValidDate(start)) return '—'
  const head = fmtDateTime(start)
  if (!isValidDate(end)) return head
  return `${head}–${fmtTime(end)}`
}

/** '2026-10-19' */
export function fmtISODate(value) {
  const p = partsOf(value, { year: 'numeric', month: '2-digit', day: '2-digit' })
  if (!p) return '—'
  return `${p.year}-${p.month}-${p.day}`
}

/**
 * 相对倒计时。返回结构化对象，页面自己决定显示到「天」还是「秒」。
 * text 用于一眼看懂的一句话；short 用于 HH:MM:SS 大字。
 */
export function countdown(target, now = Date.now()) {
  const end = toDate(target).getTime()
  const rest = Number.isNaN(end) ? 0 : end - now
  const total = Math.max(0, Math.floor(rest / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  let text
  if (rest <= 0) text = '已经开始'
  else if (days > 0) text = `还有 ${days} 天 ${hours} 小时`
  else if (hours > 0) text = `还有 ${hours} 小时 ${minutes} 分`
  else text = `还有 ${minutes} 分 ${seconds} 秒`

  const short = days > 0
    ? `${days} 天 ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
    : `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`

  return { total, days, hours, minutes, seconds, ended: rest <= 0, text, short, raw: rest }
}

/** '3 分钟前' / '2 小时后' / '昨天' */
export function relativeTime(value, now = Date.now()) {
  const t = toDate(value).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = now - t
  const abs = Math.abs(diff)
  const future = diff < 0
  const pick = (n, unit) => (future ? `${n} ${unit}后` : `${n} ${unit}前`)

  if (abs < 60e3) return future ? '马上' : '刚刚'
  if (abs < 3600e3) return pick(Math.floor(abs / 60e3), '分钟')
  if (abs < 86400e3) return pick(Math.floor(abs / 3600e3), '小时')
  if (abs < 86400e3 * 7) return pick(Math.floor(abs / 86400e3), '天')
  return fmtDate(value)
}

/** 价格：种子里已经是人话（'AA · 人均 45 上下'），数字兜底加 ¥ */
export function fmtPrice(price) {
  if (price == null || price === '') return '不收费'
  if (typeof price === 'string') return price
  return price === 0 ? '不收费' : `¥${price}`
}

/** '6 人' */
export function fmtPeople(n) {
  return `${n} 人`
}

/** '5–6 人' */
export function fmtGroupSize(min, max) {
  if (!min && !max) return '—'
  if (!max || min === max) return `${min || max} 人`
  return `${min}–${max} 人`
}

/** 90 → '90 分钟'，120 → '2 小时'，150 → '2.5 小时' */
export function fmtDuration(min) {
  if (!min) return '—'
  if (min < 60) return `${min} 分钟`
  const h = min / 60
  return Number.isInteger(h) ? `${h} 小时` : `${h.toFixed(1)} 小时`
}

/** 剩余名额文案：满 / 剩 n 位 */
export function fmtRemain(remain, capacity) {
  if (remain == null) return '名额待定'
  if (remain <= 0) return '已满，可候补'
  if (capacity != null) return `剩 ${remain} / ${capacity} 位`
  return `剩 ${remain} 位`
}

/** 千分位，只给统计用 */
export function fmtNumber(n) {
  return Number(n || 0).toLocaleString('zh-CN')
}

/** 百分比：0.7421 → '74%' */
export function fmtPercent(v, digits = 0) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return `${(Number(v) * 100).toFixed(digits)}%`
}

/** 手机号掩码：138****1234 */
export function maskPhone(phone) {
  if (!phone || String(phone).length < 7) return phone || '—'
  const s = String(phone)
  return `${s.slice(0, 3)}****${s.slice(-4)}`
}

/** 大厅展示：'林**' */
export function maskName(name) {
  if (!name) return '—'
  if (name.length <= 1) return name
  if (name.length === 2) return `${name[0]}*`
  return `${name[0]}${'*'.repeat(Math.min(2, name.length - 1))}`
}

/** 段位文案 */
export const LEVEL_LABEL = {
  rookie: '纯小白',
  beginner: '入门',
  advanced: '进阶',
  veteran: '老手',
}
export const levelLabel = (v) => LEVEL_LABEL[v] || '未填'

/** 隐私档位 */
export const PRIVACY_LABEL = { low: '愿意多说', mid: '看情况', high: '只聊轻松的' }
