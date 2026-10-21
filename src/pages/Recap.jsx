import { useEffect, useMemo, useState } from 'react'
import { useRoute } from '../lib/router.jsx'
import { actions, groupView, selectors, useStore } from '../lib/api.js'
import Button from '../components/Button.jsx'
import Empty from '../components/Empty.jsx'
import SectionHead from '../components/SectionHead.jsx'
import { useToast } from '../components/Toast.jsx'
import { countdown, fmtDate, fmtDuration } from '../lib/format.js'

/**
 * 回顾 #/recap/:groupId —— 5 区块（design-spec §6.6 / content-plan §2.6）
 *
 * 克制是这页的设计前提：没有彩带、没有礼花、没有 emoji、没有「🎉」。
 * 数据只走 api.js：groupView / quotesOf / reseatOf / reviewsOf + actions.voteQuote /
 * toggleReseat / submitReview。**不做假上传**：合影墙是 6 个虚框 + 一句实话。
 */

const TAGS = ['聊得开', '有点冷', '想再约']
const SCALE_OVERALL = { label: '聊得开吗', low: '很冷', high: '聊得很开' }
const SCALE_VIBE = { label: '还愿意再来吗', low: '不想', high: '很想' }
const PHOTO_NOTE = '本局没有上传照片'

export default function Recap() {
  const route = useRoute()
  const state = useStore()
  const { showToast } = useToast()
  const gid = route.params.groupId
  const me = state.session.userId

  const view = gid ? groupView(state, gid) : null
  const group = view && view.group
  const event = view && view.event
  const type = view && view.type
  const members = (view && view.members) || []
  const venue = view && view.venue

  const quotes = gid ? selectors.quotesOf(state, gid) : []
  const reviews = gid ? selectors.reviewsOf(state, gid) : []
  const reseatVotes = gid ? selectors.reseatOf(state, gid) : []
  const myReview = reviews.find((r) => r.fromUserId === me) || null
  const myReseat = reseatVotes.find((v) => v.fromUserId === me) || null

  /* ── 表单态：未选 → 已选 → 提交中 → 已提交 / 失败 ── */
  const [ratingOverall, setRatingOverall] = useState(0)
  const [ratingVibe, setRatingVibe] = useState(0)
  const [tags, setTags] = useState([])
  const [comment, setComment] = useState('')
  const [formState, setFormState] = useState(myReview ? 'done' : 'idle')
  const [formError, setFormError] = useState('')

  /* ── 续桌：本地先选，点「记下来」才逐条走接口 ── */
  const [picked, setPicked] = useState(() => (myReseat ? myReseat.targetUserIds.slice() : []))
  const [reseatSaved, setReseatSaved] = useState(false)
  const [reseatBusy, setReseatBusy] = useState(false)

  /* ── 散场后开放：没结束的组只给占位 ── */
  const endAt = event && event.endAt ? new Date(event.endAt).getTime() : NaN
  const isDone = group && (group.status === 'finished' || (Number.isFinite(endAt) && Date.now() > endAt))
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (isDone || !Number.isFinite(endAt)) return undefined
    const t = setInterval(() => setNowMs(Date.now()), 60 * 1000)
    return () => clearInterval(t)
  }, [isDone, endAt])
  const maxVotes = useMemo(() => quotes.reduce((m, q) => Math.max(m, q.votes || 0), 0), [quotes])
  const voters = useMemo(() => new Set(reseatVotes.map((v) => v.fromUserId)).size, [reseatVotes])

  if (!gid || !view || !group) {
    return (
      <section className="p-recap">
        <div className="p-recap__wrap section">
          <h1 className="p-recap__h1">找不到这一桌。</h1>
          <div className="row" style={{ marginTop: 'var(--s-5)' }}>
            <Button as="a" href="#/me" variant="secondary">回我的局</Button>
          </div>
        </div>
      </section>
    )
  }

  if (!isDone) {
    const left = countdown(event && event.endAt, nowMs)
    return (
      <section className="p-recap">
        <div className="p-recap__wrap">
          <header className="p-recap__head">
            <span className="num">05 / RECAP</span>
            <h1 className="p-recap__h1">这一桌</h1>
            <div className="p-recap__rule" aria-hidden="true" />
            <a className="p-recap__back" href="#/me">回我的局</a>
          </header>
          <div className="p-recap__lock">
            <p className="p-recap__lock-line">散场后开放</p>
            <p className="p-recap__lock-sub">{left.text} · {type ? type.name : '这一局'}</p>
            <Button as="a" href={`#/live/${gid}`} variant="secondary">去现场页</Button>
          </div>
        </div>
      </section>
    )
  }

  const tableNo = group.tableNo || ''
  const fallbackLine = `${members.length} 个人，${venue ? venue.name : '一张桌子'}。牌翻到一半就不按牌走了，这通常是好事。`
  const recapLine = group.recapLine || fallbackLine
  const durationMin = (type && type.duration) || (event && event.startAt && event.endAt
    ? Math.round((new Date(event.endAt) - new Date(event.startAt)) / 60000)
    : 0)

  function vote(quote) {
    const res = actions.voteQuote(gid, quote.id)
    if (res && res.ok) showToast('投上了。', 'ok')
    else showToast((res && res.error) || '没投上，再点一次。', 'error')
  }

  function togglePick(userId) {
    setReseatSaved(false)
    setPicked((list) => (list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId]))
  }

  function saveReseat() {
    setReseatBusy(true)
    const current = myReseat ? myReseat.targetUserIds.slice() : []
    const toAdd = picked.filter((id) => !current.includes(id))
    const toRemove = current.filter((id) => !picked.includes(id))
    let failed = ''
    for (const id of toAdd) {
      const res = actions.toggleReseat(gid, id)
      if (!res || !res.ok) failed = (res && res.error) || '没记上，再试一次。'
    }
    for (const id of toRemove) {
      const res = actions.toggleReseat(gid, id)
      if (!res || !res.ok) failed = (res && res.error) || '没记上，再试一次。'
    }
    setReseatBusy(false)
    if (failed) {
      showToast(failed, 'error')
      return
    }
    setReseatSaved(true)
    showToast('记下了。', 'ok')
  }

  function toggleTag(t) {
    setTags((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]))
  }

  function submitReview() {
    setFormError('')
    if (!(ratingOverall >= 1 && ratingOverall <= 5)) {
      setFormError('先给这一局打个分（1–5）。')
      return
    }
    setFormState('loading')
    // 接口是同步的本地实现：放到下一帧，保证「提交中」这一态真的被画出来
    Promise.resolve().then(() => {
      const res = actions.submitReview({
        groupId: gid,
        ratingOverall,
        ratingVibe: ratingVibe >= 1 ? ratingVibe : ratingOverall,
        wouldMeetAgain: (ratingVibe >= 1 ? ratingVibe : ratingOverall) >= 4,
        tags,
        comment: comment.slice(0, 60),
      })
      if (res && res.ok) {
        setFormState('done')
        showToast('记下了。', 'ok')
      } else {
        setFormState('error')
        setFormError((res && res.error) || '没交上，稍后重试一下。')
        showToast((res && res.error) || '没交上，稍后重试一下。', 'error')
      }
    })
  }

  const others = members.filter((m) => m.id !== me)

  return (
    <section className="p-recap">
      {/* ── 页头（刊物页眉）── */}
      <div className="p-recap__wrap">
        <header className="p-recap__head">
          <span className="num">05 / RECAP</span>
          <h1 className="p-recap__h1">这一桌</h1>
          <div className="p-recap__rule" aria-hidden="true" />
          <a className="p-recap__back" href="#/me">回我的局</a>
        </header>
      </div>

      {/* ── 区块 1 一句话总结（墨底反色，全页唯一） ── */}
      <div className="p-recap__hero on-ink">
        <div className="p-recap__hero-inner">
          <p className="p-recap__hero-eyebrow">第 {tableNo} 桌 · RECAP</p>
          <p className="p-recap__hero-line">{recapLine}</p>
          <p className="p-recap__hero-meta">
            {[type ? type.name : '不熟局', `${members.length} 人`, fmtDuration(durationMin), event ? fmtDate(event.startAt) : '']
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="p-recap__hero-note">
            {group.recapLine ? '这句是从你们那副牌里拼的。' : '这句是用人数和场地拼的。'}
          </p>
        </div>
      </div>

      <div className="p-recap__wrap">
        {/* ── 区块 2 金句榜 ── */}
        <section className="p-recap__section" aria-labelledby="recap-quotes">
          <SectionHead
            id="recap-quotes"
            num="01"
            aside="QUOTES"
            title="今天最好笑的一句"
            sub="点「这句好」。每条只能投一次，投完就不能改。"
          />
          {quotes.length === 0 ? (
            <Empty title="这桌没人记金句。可惜，通常都有一句。" />
          ) : (
            <ol className="p-recap__quotes">
              {quotes.map((q, i) => {
                const said = members.find((m) => m.id === q.saidByUserId)
                const voted = Array.isArray(q.votedBy) && q.votedBy.includes(me)
                const width = maxVotes > 0 ? Math.max(4, Math.round(((q.votes || 0) / maxVotes) * 100)) : 0
                return (
                  <li className={`p-recap__quote ${voted ? 'is-voted' : ''}`.trim()} key={q.id}>
                    <span className="num p-recap__quote-no">{String(i + 1).padStart(2, '0')}</span>
                    <div className="p-recap__quote-body">
                      <p className="p-recap__quote-text">「{q.text}」</p>
                      <p className="p-recap__quote-by">—— {said ? said.nickname : '有人说'}</p>
                      <span className="p-recap__quote-bar" aria-hidden="true">
                        <span className="p-recap__quote-bar-fill" style={{ width: `${width}%` }} />
                      </span>
                    </div>
                    <div className="p-recap__quote-side">
                      <span className="p-recap__quote-votes" aria-label={`${q.votes || 0} 票`}>{q.votes || 0} 票</span>
                      <Button
                        variant={voted ? 'secondary' : 'ghost'}
                        size="sm"
                        disabled={voted}
                        onClick={() => vote(q)}
                      >
                        {voted ? '已投' : '这句好'}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* ── 区块 3 合影墙（本期不开放，不做假上传） ── */}
        <section className="p-recap__section" aria-labelledby="recap-photos">
          <SectionHead id="recap-photos" num="02" aside="PHOTOS" title="今天的照片" />
          <div className="p-recap__photos">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="p-recap__photo" key={i}>
                <span className="p-recap__photo-note">{PHOTO_NOTE}</span>
              </div>
            ))}
          </div>
          <div className="p-recap__photo-foot">
            <Button variant="secondary" size="sm" disabled>+ 上传</Button>
            <span className="p-recap__photo-hint">这一版还传不了。先存在手机里。</span>
          </div>
        </section>

        {/* ── 区块 4 想续桌 ── */}
        <section className="p-recap__section" aria-labelledby="recap-reseat">
          <SectionHead
            id="recap-reseat"
            num="03"
            aside="SEAT AGAIN"
            title="下次还想和谁一桌"
            sub="点他们的名字。互相都点了，下次开桌时优先把你们放一起——不用你组织，也不用你在群里问。"
          />
          {others.length === 0 ? (
            <Empty title="这一桌只有你一个人。" text="下次报一局人多的。" />
          ) : (
            <>
              <div className="p-recap__people">
                {others.map((m) => {
                  const on = picked.includes(m.id)
                  return (
                    <button
                      type="button"
                      key={m.id}
                      className={`p-recap__person ${on ? 'is-on' : ''}`.trim()}
                      onClick={() => togglePick(m.id)}
                      aria-pressed={on}
                    >
                      <span className="p-recap__person-avatar" aria-hidden="true">{(m.nickname || '？').slice(0, 1)}</span>
                      <span className="p-recap__person-name">{m.nickname}</span>
                      <span className="p-recap__person-sub">{[m.schoolShort, m.grade].filter(Boolean).join(' · ')}</span>
                      {on && <span className="p-recap__person-check" aria-hidden="true">✓</span>}
                    </button>
                  )
                })}
              </div>
              <div className="p-recap__reseat-foot">
                <p className="p-recap__reseat-count">{voters} 人想和这桌再坐一次</p>
                {reseatSaved ? (
                  <p className="p-recap__reseat-done">已记录，下次开桌时优先</p>
                ) : (
                  <Button onClick={saveReseat} disabled={reseatBusy}>
                    {reseatBusy ? '记一下…' : '记下来'}
                  </Button>
                )}
              </div>
              <p className="p-recap__reseat-hint">也可以直接交，什么都不选就是这局到此为止。</p>
            </>
          )}
        </section>

        {/* ── 区块 5 评价与再来 ── */}
        <section className="p-recap__section" aria-labelledby="recap-review">
          <SectionHead
            id="recap-review"
            num="04"
            aside="REVIEW"
            title="这桌怎么样"
            sub="选填。写一句就够，不写也能走。"
          />

          {formState === 'done' ? (
            <div className="p-recap__done" role="status">
              <p className="p-recap__done-line">记下了。这条会进我们的分桌参考，不会公开。</p>
              {myReview && myReview.comment ? <p className="p-recap__done-quote">「{myReview.comment}」</p> : null}
            </div>
          ) : (
            <form
              className="p-recap__form"
              onSubmit={(e) => { e.preventDefault(); submitReview() }}
            >
              <fieldset className="p-recap__scale">
                <legend className="p-recap__scale-label">{SCALE_OVERALL.label}</legend>
                <div className="p-recap__scale-row">
                  <span className="p-recap__scale-end">{SCALE_OVERALL.low}</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={`p-recap__scale-btn ${ratingOverall === n ? 'is-on' : ''}`.trim()}
                      onClick={() => setRatingOverall(n)}
                      aria-pressed={ratingOverall === n}
                      aria-label={`${SCALE_OVERALL.label} ${n} 分，5 分是${SCALE_OVERALL.high}`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="p-recap__scale-end">{SCALE_OVERALL.high}</span>
                </div>
              </fieldset>

              <fieldset className="p-recap__scale">
                <legend className="p-recap__scale-label">{SCALE_VIBE.label}</legend>
                <div className="p-recap__scale-row">
                  <span className="p-recap__scale-end">{SCALE_VIBE.low}</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={`p-recap__scale-btn ${ratingVibe === n ? 'is-on' : ''}`.trim()}
                      onClick={() => setRatingVibe(n)}
                      aria-pressed={ratingVibe === n}
                      aria-label={`${SCALE_VIBE.label} ${n} 分，5 分是${SCALE_VIBE.high}`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="p-recap__scale-end">{SCALE_VIBE.high}</span>
                </div>
              </fieldset>

              <div className="p-recap__chips" role="group" aria-label="这一桌的标签（可多选）">
                {TAGS.map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`p-recap__chip ${tags.includes(t) ? 'is-on' : ''}`.trim()}
                    onClick={() => toggleTag(t)}
                    aria-pressed={tags.includes(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="recap-comment">
                  一句话评价<span className="p-recap__optional">（选填，最多 60 字）</span>
                </label>
                <textarea
                  id="recap-comment"
                  className="textarea p-recap__textarea"
                  rows={3}
                  maxLength={60}
                  value={comment}
                  placeholder="哪一段最好，或者哪一段下次别安排。写一句就够。"
                  aria-invalid={formError ? 'true' : undefined}
                  aria-describedby={formError ? 'recap-review-err' : undefined}
                  onChange={(e) => setComment(e.target.value.slice(0, 60))}
                />
                <div className="field__foot">
                  <span className="field__count">{comment.length} / 60</span>
                </div>
              </div>

              {formError ? (
                <p className="p-recap__err" id="recap-review-err" role="alert">× {formError}</p>
              ) : null}

              <div className="p-recap__form-foot">
                <Button type="submit" disabled={formState === 'loading'}>
                  {formState === 'loading' ? '提交中…' : '交上去'}
                </Button>
              </div>
            </form>
          )}

          <div className="p-recap__again">
            <Button as="a" href="#/" arrow>再报一局</Button>
          </div>
        </section>
      </div>
    </section>
  )
}
