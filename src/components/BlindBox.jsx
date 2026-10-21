import { useCallback, useRef, useState } from 'react'
import { topicBank } from '../data/questions.js'

/**
 * 开一个盲盒 —— 全站唯一的「玩」。
 *
 * 它不是装饰：真的从 16 种局里随机抽一个，附一道题库里的破冰题，
 * 抽到不想去的可以再开。开盒结果只代表「有这种局」，不代表有空位，
 * 所以卡片上不写人数、不写时间，避免把随机当成库存。
 */
export default function BlindBox({ types = [] }) {
  const [phase, setPhase] = useState('idle') // idle | opening | open
  const [pick, setPick] = useState(null)
  const [count, setCount] = useState(0)
  const timers = useRef([])

  const clearAll = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const draw = useCallback(() => {
    const pool = types.filter((t) => t && t.id)
    if (!pool.length) return null
    const idx = Math.floor(Math.random() * pool.length)
    const type = pool[idx]
    const bank = topicBank.icebreak
    const question = bank[Math.floor(Math.random() * bank.length)]
    const all = types.filter((t) => t && t.id)
    return { type, question, no: String(all.findIndex((t) => t.id === type.id) + 1).padStart(2, '0') }
  }, [types])

  const open = () => {
    clearAll()
    setCount((c) => c + 1)
    if (phase === 'open') {
      // 再开一个：先盖上，再开
      setPhase('idle')
      timers.current.push(setTimeout(() => {
        setPick(draw())
        setPhase('opening')
        timers.current.push(setTimeout(() => setPhase('open'), 420))
      }, 260))
      return
    }
    setPick(draw())
    setPhase('opening')
    timers.current.push(setTimeout(() => setPhase('open'), 420))
  }

  return (
    <section className="p-box" aria-labelledby="box-title">
      <div className="wrap wrap--content p-box__inner">
        <div className="p-box__copy">
          <h2 className="p-box__title" id="box-title">
            不知道报哪个，<br />就开一个。
          </h2>
          <p className="p-box__lead">
            16 种局，随手抽一个。抽到不想去的，再开一次——反正不要钱，也不用负责。
          </p>
          <div className="p-box__actions">
            <button type="button" className="p-box__btn" onClick={open}>
              {phase === 'open' ? '再开一个' : '开一个看看'}
            </button>
            <span className="p-box__note">
              {count >= 3 ? (
                <a className="p-box__more" href="#this-week">开够了，直接看这周的局 →</a>
              ) : (
                '开盒只是随机看看，不代表还有位置。'
              )}
            </span>
          </div>
        </div>

        <div className={`p-box__stage is-${phase}`}>
          <button
            type="button"
            className="p-box__box"
            onClick={open}
            aria-label={phase === 'open' ? '再开一个盲盒' : '打开盲盒'}
          >
            <span className="p-box__lid" aria-hidden="true" />
            <span className="p-box__label" aria-hidden="true">不熟局</span>
            <span className="p-box__shine" aria-hidden="true" />
          </button>

          <div className="p-box__card" aria-live="polite">
            {pick ? (
              <>
                <span className="p-box__card-no">NO.{pick.no} / {types.length}</span>
                <strong className="p-box__card-name">{pick.type.name}</strong>
                <span className="p-box__card-tag">{pick.type.tagline}</span>
                <span className="p-box__card-q">{pick.question.text}</span>
                <a className="p-box__card-cta" href={`#/join?type=${pick.type.id}`}>
                  就报这个 →
                </a>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
