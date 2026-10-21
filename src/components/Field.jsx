import { useId } from 'react'

// 表单控件族。label 永远在上方（中文浮动 label 在字体不匹配时会错位），
// 错误文案永远在字段下方，前缀 ×，并带 role="alert" + aria-describedby。
export function Field({
  id,
  label,
  required = false,
  hint,
  error,
  count,
  over = false,
  children,
  className = '',
}) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={id}>
          <span className="field__label-text">{label}</span>
          {required ? <span className="req" aria-hidden="true">*</span> : null}
          {required ? <span className="sr-only">必填</span> : null}
        </label>
      ) : null}

      {children}

      {hint || error || count != null ? (
        <div className="field__foot">
          <div>
            {hint ? <p className="field__hint" id={`${id}-hint`}>{hint}</p> : null}
            {error ? (
              <p className="field__error" id={`${id}-err`} role="alert">
                <span aria-hidden="true">×</span>
                <span>{error}</span>
              </p>
            ) : null}
          </div>
          {count != null ? (
            <span className={`field__count ${over ? 'is-over' : ''}`.trim()}>{count}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function describedBy(id, hint, error) {
  return [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
}

export function Input({
  label, required, hint, error, id, showCount = false, maxLength,
  value = '', className = '', ...rest
}) {
  const autoId = useId()
  const fid = id || autoId
  const len = String(value ?? '').length

  return (
    <Field
      id={fid}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
      count={showCount ? `${len}${maxLength ? ` / ${maxLength}` : ''}` : null}
      over={showCount && maxLength ? len > maxLength : false}
    >
      <input
        id={fid}
        className="input"
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        {...rest}
      />
    </Field>
  )
}

export function Textarea({
  label, required, hint, error, id, showCount = true, maxLength,
  value = '', rows = 4, className = '', ...rest
}) {
  const autoId = useId()
  const fid = id || autoId
  const len = String(value ?? '').length

  return (
    <Field
      id={fid}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
      count={showCount ? `${len}${maxLength ? ` / ${maxLength}` : ''}` : null}
      over={showCount && maxLength ? len > maxLength : false}
    >
      <textarea
        id={fid}
        className="textarea"
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        {...rest}
      />
    </Field>
  )
}

export function Select({
  label, required, hint, error, id, options = [], placeholder, value = '', className = '', ...rest
}) {
  const autoId = useId()
  const fid = id || autoId
  const normalized = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))

  return (
    <Field
      id={fid}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <div className="select-wrap">
        <select
          id={fid}
          className="select"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fid, hint, error)}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {normalized.map(o => (
            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
          ))}
        </select>
      </div>
    </Field>
  )
}

const CheckMark = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M2 6.5l2.5 2.5L10 3.5" />
  </svg>
)

// 单选/多选共用外壳：整块 label 包一个 sr-only 的 input，
// 选中态同时用「边框 + ✓ 方块 + 字重」三重表达，不只靠颜色。
function Choice({ type, name, value, checked, onChange, title, sub, disabled }) {
  return (
    <label className={`choice ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''}`.trim()}>
      <input
        className="sr-only"
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(value, e)}
      />
      <span className="choice__check" aria-hidden="true"><CheckMark /></span>
      <span className="choice__title">{title}</span>
      {sub ? <span className="choice__sub">{sub}</span> : null}
    </label>
  )
}

export function ChoiceCard(props) {
  return <Choice type="radio" {...props} />
}

export function MultiChoiceCard(props) {
  return <Choice type="checkbox" {...props} />
}

function normalizeOptions(options) {
  return options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))
}

/** 单选组：value 是当前值，onChange(value) */
export function ChoiceGroup({
  name, label, required, hint, error, value, onChange, options = [], columns = 2, id, className = '',
}) {
  const autoId = useId()
  const fid = id || autoId
  const opts = normalizeOptions(options)

  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <p className="field__label" id={`${fid}-label`}>
          <span className="field__label-text">{label}</span>
          {required ? <span className="req" aria-hidden="true">*</span> : null}
          {required ? <span className="sr-only">必填</span> : null}
        </p>
      ) : null}

      <div
        className={`choice-grid ${columns === 3 ? 'choice-grid--3' : ''}`.trim()}
        role="radiogroup"
        aria-labelledby={label ? `${fid}-label` : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        aria-invalid={error ? true : undefined}
      >
        {opts.map(o => (
          <ChoiceCard
            key={o.value}
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={onChange}
            title={o.label}
            sub={o.sub}
            disabled={o.disabled}
          />
        ))}
      </div>

      {hint || error ? (
        <div className="field__foot">
          <div>
            {hint ? <p className="field__hint" id={`${fid}-hint`}>{hint}</p> : null}
            {error ? (
              <p className="field__error" id={`${fid}-err`} role="alert">
                <span aria-hidden="true">×</span><span>{error}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** 多选组：values 是数组，onChange(nextValues) */
export function MultiChoiceGroup({
  name, label, required, hint, error, values = [], onChange, options = [], columns = 2, id, max, className = '',
}) {
  const autoId = useId()
  const fid = id || autoId
  const opts = normalizeOptions(options)

  const toggle = (v) => {
    const has = values.includes(v)
    if (has) {
      onChange?.(values.filter(x => x !== v))
      return
    }
    if (max && values.length >= max) return
    onChange?.([...values, v])
  }

  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <p className="field__label" id={`${fid}-label`}>
          <span className="field__label-text">{label}</span>
          {required ? <span className="req" aria-hidden="true">*</span> : null}
          {required ? <span className="sr-only">必填</span> : null}
        </p>
      ) : null}

      <div
        className={`choice-grid ${columns === 3 ? 'choice-grid--3' : ''}`.trim()}
        role="group"
        aria-labelledby={label ? `${fid}-label` : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        aria-invalid={error ? true : undefined}
      >
        {opts.map(o => {
          const checked = values.includes(o.value)
          const blocked = Boolean(max && !checked && values.length >= max)
          return (
            <MultiChoiceCard
              key={o.value}
              name={name}
              value={o.value}
              checked={checked}
              onChange={toggle}
              title={o.label}
              sub={o.sub}
              disabled={o.disabled || blocked}
            />
          )
        })}
      </div>

      {hint || error || max ? (
        <div className="field__foot">
          <div>
            {hint ? <p className="field__hint" id={`${fid}-hint`}>{hint}</p> : null}
            {error ? (
              <p className="field__error" id={`${fid}-err`} role="alert">
                <span aria-hidden="true">×</span><span>{error}</span>
              </p>
            ) : null}
          </div>
          {max ? <span className="field__count">{values.length} / {max}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

/** 滑块：轨道 4px，拇指 20px 正方形，容器高 44px 保证触控热区 */
export function Slider({
  id, label, required, hint, error, value = 0, onChange,
  min = 0, max = 100, step = 1, leftLabel, rightLabel, format, name, className = '',
}) {
  const autoId = useId()
  const fid = id || autoId
  const percent = max > min ? ((Number(value) - min) / (max - min)) * 100 : 0
  const display = format ? format(value) : value

  return (
    <Field
      id={fid}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <div className="slider">
        <div className="slider__top">
          <output className="slider__value" htmlFor={fid}>{display}</output>
        </div>
        <input
          id={fid}
          name={name}
          type="range"
          className="slider__input"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ '--p': `${percent}%` }}
          aria-valuetext={String(display)}
          onChange={(e) => onChange?.(Number(e.target.value))}
        />
        <div className="slider__ends">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      </div>
    </Field>
  )
}

export default Field
