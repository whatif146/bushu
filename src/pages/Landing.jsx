import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { eventBoard, selectors, useStore } from '../lib/api.js'
import { navigate, scrollToId } from '../lib/router.jsx'
import { fmtDuration, fmtTime, fmtWeekday } from '../lib/format.js'
import Button from '../components/Button.jsx'
import Marquee from '../components/Marquee.jsx'
import BlindBox from '../components/BlindBox.jsx'
import SectionHead from '../components/SectionHead.jsx'
import Empty from '../components/Empty.jsx'

// 16 个汉字字标：文案取自 content-plan §3.6，仅用于局类型卡，装饰字 aria-hidden。
const GLYPH = {
  dinner: '碗', boardgame: '骰', movie: '幕', ktv: '麦',
  citywalk: '步', gallery: '框', study: '书', exam: '卷',
  nightrun: '鞋', sport: '哨', billiards: '杆', badminton: '拍',
  hiking: '峰', gaming: '键', photo: '镜', skillswap: '课',
}

const CATEGORY_LABEL = {
  social: '社交型', buddy: '搭子型', competitive: '竞技型', skill: '技能型',
}

// content-plan §2.1 区块 3：固定首句必须在第一屏循环位，其后 16 个局名。
const MARQUEE_ITEMS = [
  '不谈恋爱', '不推销', '不承诺结果',
  '饭局', '桌游·剧本杀局', '观影局', 'KTV歌局', 'City Walk·扫街局',
  '看展逛馆局', '自习局', '考研·考证搭子局', '夜跑局', '运动局',
  '桌球·乒乓局', '羽毛球局', '爬山局', '游戏开黑局', '摄影互拍局',
  '技能交换局',
]

// content-plan §2.1 区块 5
const STEPS = [
  { title: '报一局', text: '挑一件你想干的事，填一份问卷' },
  { title: '等着被排桌', text: '截止后统一分，不按脸按你写的话' },
  { title: '看同组', text: '知道有谁，还不知道去哪' },
  { title: '现场按物料走', text: '卡牌、打卡表或赛制，一步一步来' },
  { title: '散场投个票', text: '想续桌的点人名，不想的不用说话' },
]

// content-plan §2.1 区块 7：全站唯一一处讲立场的地方，逐字搬运。
// 性别比例的数值不写死，从 Event.genderRule 读（team-lead 已在 seed 补齐）。
const SAFETY_TITLES = ['女生比例有下限', '到场要签到', '不舒服随时说']

// content-plan §2.1 区块 8
const FAQ = [
  {
    q: '会不会很尴尬',
    a: '尴尬一般出现在「大家轮流自我介绍」的时候。我们没有这个环节。坐下就有牌，第一题通常是「你这学期最早的一节课几点，到过几次」——答得出来，不用想。',
  },
  {
    q: '我很内向，能去吗',
    a: '能。问卷里有一题专门问「多久能开口」，内向的人会被排到同样不快热的一桌，破冰题也会多给两道。整桌都不主动的情况我们预演过，牌会先短后长。',
  },
  {
    q: '安全吗',
    a: '三件硬性的事：校园认证（学号核对）、到场签到、每组性别比例下限。局上右侧常驻反馈按钮，直接进值班后台，深夜也有人看。',
  },
  {
    q: '要花多少钱',
    a: '按场次卡上写的来。多数是 AA，饭局人均 45 上下，自习和夜跑免费。没有会员费、没有押金、没有「解锁更多」的付费墙。',
  },
  {
    q: '能带朋友吗',
    a: '一个人报一局，不能带。理由很实在：带朋友来，这一桌就变成「你和你的朋友 + 四个外人」，不如两个人各报一局。',
  },
  {
    q: '为什么出发前不告诉我地点',
    a: '因为地点一给，你就能提前搜到店、提前判断、提前退出——这局就散了。所以只给到片区，地点出发前 30 分钟给。解散时间、怎么回去，都会在解锁时一起给你。',
  },
]

const Arrow = () => (
  <svg className="p-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
    <path d="M2 8h11M9 4l4 4-4 4" />
  </svg>
)

export default function Landing() {
  const state = useStore()
  const [openFaq, setOpenFaq] = useState(-1)
  const [showCta, setShowCta] = useState(false)
  const heroRef = useRef(null)
  const firstCardRef = useRef(null)
  const trackRef = useRef(null)

  const board = eventBoard(state).filter(e => e.status === 'open')
  const types = state.activityTypes

  // 每个活动类型的最近一场（只算还能报的）
  const nextByType = new Map()
  for (const e of board) if (!nextByType.has(e.typeId)) nextByType.set(e.typeId, e)

  // 这周有 open 场次的排前面，没场次的沉底——第一眼不要是先看到一排灰卡
  const sortedTypes = [...types].sort((a, b) => {
    const aClosed = nextByType.has(a.id) ? 0 : 1
    const bClosed = nextByType.has(b.id) ? 0 : 1
    return aClosed - bClosed
  })

  const openCount = state.events.filter(e => e.status === 'open').length
  const signupCount = state.users.length
  // 一桌几人比「累计开桌」更可信：后者在冷启动期必然小于本周场次，并排看像假数据
  const allSizes = types.map(t => t.groupSize).flat().filter(n => Number.isFinite(n))
  const sizeMin = allSizes.length ? Math.min(...allSizes) : 3
  const sizeMax = allSizes.length ? Math.max(...allSizes) : 8

  const genderRule = state.events.find(e => e.genderRule)?.genderRule || null
  const femaleMin = Math.round((genderRule?.femaleMin ?? 0.25) * 100)
  const singleMax = Math.round((genderRule?.singleMax ?? 0.75) * 100)
  const safety = [
    {
      title: SAFETY_TITLES[0],
      text: `每组女生占比不低于 ${femaleMin}%，单一性别不超过 ${singleMax}%，凑不齐就不开这一桌。`,
    },
    {
      title: SAFETY_TITLES[1],
      text: '组长签到，全员到齐才开始。有人没来，后台记一笔。',
    },
    {
      title: SAFETY_TITLES[2],
      text: '页面常驻一个按钮，三句话就能发给值班的人，可以不留电话。',
    },
  ]

  // 移动端常驻底部 CTA：滚过 Hero 出现，接近页底时让位给页脚
  useEffect(() => {
    const onScroll = () => {
      const heroH = heroRef.current ? heroRef.current.offsetHeight : 480
      const passedHero = window.scrollY > heroH - 160
      const nearBottom = window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 360
      setShowCta(passedHero && !nearBottom)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [board.length])

  // 类型带横滑：桌面滚轮竖着滚也能推横向，鼠标可以按住拖（拖过 6px 就不算点击）
  useEffect(() => {
    const el = trackRef.current
    if (!el) return undefined
    let down = false
    let moved = 0
    let startX = 0
    let startLeft = 0

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      down = true
      moved = 0
      startX = e.clientX
      startLeft = el.scrollLeft
    }
    const onMove = (e) => {
      if (!down) return
      const dx = e.clientX - startX
      moved = Math.max(moved, Math.abs(dx))
      if (moved > 6) el.scrollLeft = startLeft - dx
    }
    const onUp = () => { down = false }
    const onClick = (e) => {
      if (moved > 6) { e.preventDefault(); e.stopPropagation() }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('click', onClick, true)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('click', onClick, true)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  // 五步：进入视口后逐条点亮（一次性，滚回去也不重播）
  useEffect(() => {
    const items = [...document.querySelectorAll('.p-how__item')]
    if (!items.length || typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add('is-in'))
      return undefined
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const i = items.indexOf(entry.target)
        setTimeout(() => entry.target.classList.add('is-in'), Math.max(0, i) * 90)
        io.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.15 })
    items.forEach((el) => io.observe(el))
    // 兜底：1.5 秒后无论如何都点亮，避免观察器没触发时整段停在半透明
    const fallback = setTimeout(() => items.forEach((el) => el.classList.add('is-in')), 1500)
    return () => {
      clearTimeout(fallback)
      io.disconnect()
    }
  }, [])

  const goWeek = () => {
    navigate('/')
    requestAnimationFrame(() => {
      const ok = scrollToId('this-week', { offset: 72 })
      if (ok) requestAnimationFrame(() => firstCardRef.current?.focus({ preventScroll: true }))
    })
  }

  // 原生 details 一次只开一条：展开状态由 openFaq 控制
  return (
    <div className="p-landing">
      {/* 2 · 开屏 Hero */}
      <section className="p-hero" aria-labelledby="hero-title" ref={heroRef}>
        <div className="wrap p-hero__inner">
          <div className="p-hero__left">
            <h1 className="p-hero__title misreg" id="hero-title">
              <span className="p-hero__line">不熟的人，</span>
              <span className="p-hero__line">一起干件小事<span className="p-hero__dot">。</span></span>
            </h1>

            <div className="p-hero__lower">
              <p className="p-hero__sub">广州大学城 · 10 校 · 盲盒组局</p>
              <p className="p-hero__desc">16 种局，一桌 4–8 个人。出发前 30 分钟才知道去哪。</p>

              <div className="p-hero__ctas">
                <Button onClick={goWeek} arrow>报一局</Button>
                <Button
                  variant="ghost"
                  onClick={() => scrollToId('how', { offset: 72 })}
                >
                  怎么运作
                </Button>
              </div>
            </div>
          </div>

          <dl className="p-hero__stats">
            <div className="p-hero__stat">
              <dt className="eyebrow">本周场次</dt>
              <dd className="p-hero__num">{openCount > 0 ? openCount : '正在排'}</dd>
            </div>
            <div className="p-hero__stat">
              <dt className="eyebrow">在校报名</dt>
              <dd className="p-hero__num">{signupCount > 0 ? `${signupCount} 人` : '—'}</dd>
            </div>
            <div className="p-hero__stat">
              <dt className="eyebrow">一桌几人</dt>
              <dd className="p-hero__num">{sizeMin}–{sizeMax} 人</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 3 · 跑马灯（全页唯一朱红实心区） */}
      <Marquee items={MARQUEE_ITEMS} tone="vermilion" />

      {/* 3.5 · 一条实拍：大学城的样子，不是插画 */}
      <figure className="p-strip">
        <img
          className="p-strip__img"
          src="./img/street.jpg"
          alt="傍晚的南亭村口，学生骑车穿过牌坊"
          loading="lazy"
          decoding="async"
        />
        <figcaption className="p-strip__cap wrap">
          <span>南亭村口 · 傍晚 · 小谷围岛</span>
          <span className="p-strip__note">实拍，不是插画</span>
        </figcaption>
      </figure>

      {/* 3.6 · 开一个：全站唯一的「玩」，随机抽一种局 + 一道破冰题 */}
      <BlindBox types={state.activityTypes} />

      {/* 4 · 局类型带（16 张横滑卡，右侧故意露出半张） */}
      <section className="p-types" aria-labelledby="types-title">
        <div className="wrap wrap--content p-types__inner">
          <h2 className="sr-only" id="types-title">16 类局</h2>
          <p className="p-types__kicker">
            16 种局，先挑一种想干的 <span aria-hidden="true">—</span> 往右滑还有
          </p>
          <ul className="p-types__track" ref={trackRef} tabIndex={0} aria-label="16 类局，可左右滑动">
            {sortedTypes.map((type) => {
              const next = nextByType.get(type.id)
              return (
                <li key={type.id}>
                  <a
                    className={`p-type ${next ? '' : 'is-off'}`.trim()}
                    href={`#/join?type=${type.id}`}
                    aria-disabled={next ? undefined : true}
                    tabIndex={next ? undefined : -1}
                  >
                    <span className="p-type__glyph" aria-hidden="true">{GLYPH[type.id] || '局'}</span>
                    <span className="p-type__name">{type.name}</span>
                    <span className="p-type__tagline">{type.tagline}</span>
                    <span className="p-type__foot">
                      <span className="p-type__cat">{CATEGORY_LABEL[type.category] || '局'}</span>
                      <span className="p-type__next">
                        {next
                          ? `最近一场 ${fmtWeekday(next.startAt)} ${fmtTime(next.startAt)}`
                          : '这周没开'}
                      </span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* 5 · 一局怎么发生 */}
      <section id="how" className="p-how section" aria-labelledby="how-title">
        <div className="wrap wrap--content">
          <p className="p-how__kicker">报名不看脸，<span className="mark mark--soft">看你怎么说话</span>。</p>
          <SectionHead
            title="从报名到散场，中间只有五件事"
            id="how-title"
          />
          <ol className="p-how__list">
            {STEPS.map((step, i) => (
              <li className="p-how__item" key={step.title}>
                <span className="p-how__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="p-how__title">{step.title}</h3>
                <p className="p-how__text">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6 · 这周开的局 */}
      <section id="this-week" className="p-week section" aria-labelledby="week-title">
        <div className="wrap wrap--content">
          <SectionHead
            title="这周开的局"
            sub="报名截止后统一排桌。场次卡上写的是片区，不是店名。"
            id="week-title"
            meta={board.length > 0 ? `${board.length} 场` : '待上新'}
          />

          {board.length === 0 ? (
            <Empty
              title="这周还没排出来。"
              text="周三陆续上新。先去贝岗吃碗牛杂，回来再看。"
              action={<Button as="a" href="#/join" variant="secondary">先填问卷，有局优先通知我</Button>}
            />
          ) : (
            <ul className="p-week__grid">
              {board.map((e, i) => {
                const full = e.seatsLeft <= 0
                const waitCount = selectors.waitlistOf(state, e.id).length
                return (
                  <li key={e.id}>
                    <article
                      className={`p-week__card${i === 0 ? ' p-week__card--photo' : ''}`}
                      ref={i === 0 ? firstCardRef : undefined}
                      tabIndex={i === 0 ? -1 : undefined}
                    >
                      {i === 0 ? (
                        <img
                          className="p-week__photo"
                          src="./img/lake.jpg"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      {i === 0 ? (
                        <span className={`p-sticker${full ? ' is-full' : ''}`}>
                          {full ? '已满 · 可候补' : `还剩 ${e.seatsLeft} 位`}
                        </span>
                      ) : null}
                      <div className="p-week__top">
                        <span className="num">{String(i + 1).padStart(2, '0')}</span>
                        <span className="p-week__rule" aria-hidden="true" />
                        <span className="p-week__type">{CATEGORY_LABEL[e.type?.category] || '局'}</span>
                      </div>

                      <div className="p-week__row">
                        <h3 className="p-week__title">{e.type?.name || e.title}</h3>
                        <span className="p-week__when">
                          {fmtWeekday(e.startAt)} {fmtTime(e.startAt)}
                        </span>
                      </div>

                      <p className="p-week__meta">
                        <span>{e.campus}</span>
                        <span aria-hidden="true">·</span>
                        <span>{e.type ? fmtDuration(e.type.duration) : '时长待定'}</span>
                      </p>

                      <p className={`p-week__remain ${full ? 'is-full' : ''}`.trim()}>
                        {full ? '已满，可候补' : `还剩 ${e.seatsLeft} 位`}
                        {waitCount > 0 ? <span className="p-week__wait"> · {waitCount} 人在候补</span> : null}
                      </p>

                      <div className="p-week__foot">
                        <span className="p-week__price">{e.priceLabel}</span>
                        <Button
                          as="a"
                          size="sm"
                          variant="secondary"
                          arrow
                          href={`#/join?type=${e.typeId}&event=${e.id}`}
                        >
                          {full ? '进候补' : '报这个'}
                        </Button>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* 7 · 我们不打保票（全页唯一墨底反色区） */}
      <section id="safety" className="p-trust on-ink grain-static section--ink" aria-labelledby="trust-title">
        <div className="wrap wrap--content">
          <SectionHead
            title="我们不打保票"
            id="trust-title"
          />

          <blockquote className="p-trust__quote">
            <p className="p-trust__lead misreg">无所求，有所得。</p>
            <p>这局不承诺你交到朋友，也不承诺任何结果。</p>
            <p>
              我们只保证三件事：<strong>人到齐、事有着落、话题有人开。</strong>
            </p>
            <p className="p-trust__last">这三件事我们做得到。别的做不到，也不打算承诺。</p>
          </blockquote>

          <ul className="p-trust__list">
            {safety.map((item, i) => (
              <li className="p-trust__item" key={item.title}>
                <span className="p-trust__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="p-trust__title">
                  <span className="p-trust__check" aria-hidden="true">✓</span>
                  {item.title}
                </h3>
                <p className="p-trust__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8 · 常见疑虑 */}
      <section id="faq" className="p-faq section" aria-labelledby="faq-title">
        <div className="wrap wrap--content">
          <SectionHead title="常见疑虑" sub="没写进 FAQ 的问题，直接问负责人。" id="faq-title" />

          <div className="p-faq__list">
            {FAQ.map((item, i) => (
              <details
                className="p-faq__item"
                key={item.q}
                open={openFaq === i}
              >
                <summary
                  className="p-faq__q"
                  onClick={(event) => {
                    // 自己控制展开，保证一次只开一条（原生 <details> 没这个行为）
                    event.preventDefault()
                    setOpenFaq(prev => (prev === i ? -1 : i))
                  }}
                >
                  <span>{item.q}</span>
                  <span className="p-faq__sign" aria-hidden="true" />
                </summary>
                <p className="p-faq__a">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="p-faq__contact" id="contact">
            <p className="p-faq__contact-text">
              有问题直接找值班的人：微信 <b>bushu_gz</b>，每天 17:00–23:00 在线。急事打电话 138****0000。
            </p>
          </div>
        </div>
      </section>

      {/* 移动端常驻 CTA（≥768px 由 CSS 隐藏）
          挂到 body：<main class="page"> 的入场动画带 transform，
          会让内部 position:fixed 退化成相对页面定位。 */}
      {typeof document !== 'undefined' ? createPortal(
        <div className={`p-landing__cta ${showCta ? 'is-shown' : ''}`.trim()} aria-hidden={showCta ? undefined : true}>
          <button
            type="button"
            className="p-landing__cta-btn"
            tabIndex={showCta ? undefined : -1}
            onClick={goWeek}
          >
            <span>报一局</span>
            <Arrow />
          </button>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
