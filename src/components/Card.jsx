import Tag from './Tag.jsx'
import { fmtDuration, fmtGroupSize } from '../lib/format.js'

// 局卡（design-spec §5.3.1）。整张卡是 <a>，槽位满时整卡降透明度且不可点。
// remain 由页面用 selectors.seatsLeft 算好传进来，组件不读 store，方便在后台预览里复用。
export function GameCard({
  event,
  type,
  index = 0,
  remain,
  full = false,
  href,
  className = '',
}) {
  if (!event) return null
  const num = String(index + 1).padStart(2, '0')
  const sizeText = type ? fmtGroupSize(type.groupSize[0], type.groupSize[1]) : `${event.groupSize} 人`
  const durationText = type ? fmtDuration(type.duration) : ''
  const isFull = full || remain === 0
  const low = typeof remain === 'number' && remain > 0 && remain <= 2

  const remainText = isFull
    ? '已满，可候补'
    : typeof remain === 'number'
      ? `剩 ${remain} 位`
      : (event.status === 'open' ? '报名中' : '已锁定')

  return (
    <a
      className={`gcard ${isFull ? 'is-full' : ''} ${className}`.trim()}
      href={href || `#/join?event=${event.id}`}
      aria-disabled={isFull || undefined}
      tabIndex={isFull ? -1 : undefined}
    >
      <div className="gcard__top">
        <span className="num">{num}</span>
        <Tag variant={isFull ? 'ghost' : 'seal'}>{isFull ? '已满' : (type?.name || '局')}</Tag>
      </div>

      <h3 className="gcard__title">{event.title}</h3>
      <p className="gcard__meta">
        {sizeText}
        {durationText ? ` · ${durationText}` : ''}
      </p>

      <div className="gcard__rule" />

      <div className="gcard__foot">
        <span className={`gcard__remain ${low ? 'gcard__remain--low' : ''}`.trim()}>{remainText}</span>
        <span className="gcard__price">{event.priceLabel}</span>
      </div>
    </a>
  )
}

// 组员卡（§5.3.2）：不可点，不做 hover 位移。头像用「首字 + serif italic」，不画人形。
export function MemberCard({ user, role, reason, showReason = false, className = '' }) {
  if (!user) return null
  const initial = (user.nickname || '？').slice(0, 1)
  return (
    <article className={`mcard ${className}`.trim()}>
      <div className="mcard__head">
        <div className="mcard__avatar" aria-hidden="true">{initial}</div>
        <div className="mcard__id">
          <div className="mcard__name">{user.nickname}</div>
          <div className="mcard__sub">{user.major} · {user.grade}</div>
        </div>
        {role === 'host' ? <Tag variant="solid">组长</Tag> : null}
      </div>

      {user.bio ? <p className="mcard__bio">{user.bio}</p> : null}
      {user.question ? <p className="mcard__quote">「{user.question}」</p> : null}
      {showReason && reason ? <p className="mcard__reason">{reason}</p> : null}

      {user.tags?.length ? (
        <div className="mcard__tags">
          {user.tags.slice(0, 4).map(tag => <Tag key={tag} variant="ghost">{tag}</Tag>)}
        </div>
      ) : null}
    </article>
  )
}

// 数据卡（§5.3.3，后台用）
export function StatCard({ label, value, delta, down = false, className = '' }) {
  return (
    <div className={`stat ${className}`.trim()}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {delta ? (
        <div className={`stat__delta ${down ? 'stat__delta--down' : ''}`.trim()}>{delta}</div>
      ) : null}
    </div>
  )
}

export default GameCard
