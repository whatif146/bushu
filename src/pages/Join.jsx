import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { actions, demoIdentities, schoolShortOf, selectors, useStore } from '../lib/api.js'
import { navigate, useRoute } from '../lib/router.jsx'
import { fmtDateTime, fmtTime, fmtWeekday } from '../lib/format.js'
import { useToast } from '../components/Toast.jsx'
import Button from '../components/Button.jsx'
import Tag from '../components/Tag.jsx'
import {
  ChoiceCard, ChoiceGroup, MultiChoiceCard, MultiChoiceGroup,
  Input, Select, Textarea,
} from '../components/Field.jsx'
import { StepBar } from '../components/Progress.jsx'

const DRAFT_KEY = 'bushu.draft'
const STEPS = ['校园认证', '你是谁', '想干点什么', '说三句', '补问', '最后两个', '确认']
const TOTAL = STEPS.length

// content-plan §2.2：10 所学校，文案里不带「东校区」的地方以 seed 的写法为准。
const SCHOOLS = [
  '中山大学', '华南理工大学', '华南师范大学', '广东工业大学', '广州大学',
  '广州中医药大学', '广东外语外贸大学', '星海音乐学院', '广州美术学院', '广东药科大学',
]
const CAMPUSES = [...SCHOOLS, '大学城公共']

const GRADES = [
  { value: 'freshman', label: '大一' },
  { value: 'sophomore', label: '大二' },
  { value: 'junior', label: '大三' },
  { value: 'senior', label: '大四' },
  { value: 'postgrad', label: '研究生及以上' },
]
const GRADE_LABEL = Object.fromEntries(GRADES.map(g => [g.value, g.label]))

const GENDERS = [
  { value: 'female', label: '女' },
  { value: 'male', label: '男' },
  { value: 'other', label: '其他' },
  { value: 'prefer_not', label: '不想说' },
]

const TOPICS = [
  '影视', '音乐', '游戏', '运动', '吃喝', '旅行',
  '展览', '读书', '科研考研', '二次元', '职场实习', '本地生活',
]

const PRIVACY_OPTIONS = [
  { value: 'low', label: '昵称和专业就够了' },
  { value: 'mid', label: '可以说说是哪里人、有什么爱好' },
  { value: 'high', label: '随便聊，我不太在意' },
]

// 四档必须各带「指什么水平」的绝对参照，否则自评会整体虚高一档（content-plan §2.2 4C）。
const LEVEL_OPTIONS = [
  { value: 'rookie', label: '纯小白', sub: '规则刚弄清，发球还在失误' },
  { value: 'beginner', label: '入门', sub: '能连续对拉 10 板以上，但不会控制落点' },
  { value: 'advanced', label: '进阶', sub: '会杀球、会吊球，能打出战术，双打懂站位' },
  { value: 'veteran', label: '老手', sub: '打过比赛或校队，能带新手打' },
]

const GEAR_OPTIONS = ['拍子', '球', '护具', '什么都没有，能借就行', '我有一整套，可以共用']

const SLOT_DAYS = [
  { key: 'd1', label: '周一' }, { key: 'd2', label: '周二' }, { key: 'd3', label: '周三' },
  { key: 'd4', label: '周四' }, { key: 'd5', label: '周五' }, { key: 'd6', label: '周六' },
  { key: 'd7', label: '周日' },
]
const SLOT_PERIODS = [
  { key: 'am', label: '上午' }, { key: 'pm', label: '下午' }, { key: 'night', label: '晚上' },
]

const GOAL_EXAMPLES = [
  '数学一，第二轮，真题刚开。',
  '雅思 6.5，口语卡在 5.5。',
  '就想每天有两小时不看手机。',
]

const EMPTY = {
  school: '', studentNo: '', realName: '',
  nickname: '', grade: '', major: '', gender: '', age: '', campus: '',
  typeIds: [], eventId: '',
  selfDesc: '', wantMeet: '', recentState: '',
  topicsWanted: [], privacyLevel: '', levelChoice: '', gearHave: [],
  goalText: '', availableSlots: [], teachSkill: '', learnSkill: '',
  question: '', shareContact: '', contactChannel: '',
  agreePrivacy: false, agreeNoPromise: false,
}

const len = (value) => Array.from(String(value ?? '').trim()).length

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.v !== 1 || !parsed.answers) return null
    return parsed
  } catch {
    return null
  }
}

/** 画像预览：只给 3 个标签，不给分数（content-plan §2.2 Step 3）。 */
function portraitTags(text = '') {
  const out = []
  const add = (tag) => { if (!out.includes(tag) && out.length < 3) out.push(tag) }
  if (/安静|内向|慢热|话不多|不太会|沉默|先听/.test(text)) add('慢热')
  if (/书|电影|展|音乐|乐队|写|读|画|剧/.test(text)) add('偏文')
  if (/夜|凌晨|晚上|熬夜|睡不着|深夜/.test(text)) add('夜行')
  if (/跑|球|骑|健身|运动|走路|爬山/.test(text)) add('爱动')
  if (/直接|直说|不绕|主动|快人/.test(text)) add('直接')
  for (const fallback of ['慢热', '偏文', '稳']) {
    if (out.length >= 3) break
    if (!out.includes(fallback)) out.push(fallback)
  }
  return out.slice(0, 3)
}

const ErrorLine = ({ id, children }) => (
  <p className="p-join__err" id={id} role="alert">
    <span aria-hidden="true">×</span>
    <span>{children}</span>
  </p>
)

export default function Join() {
  const state = useStore()
  const route = useRoute()
  const { showToast } = useToast()

  const initialDraft = useRef(readDraft()).current
  const [answers, setAnswers] = useState(() => ({ ...EMPTY, ...(initialDraft?.answers || {}) }))
  const [step, setStep] = useState(() => {
    const saved = Number(initialDraft?.step) || 0
    return Math.min(TOTAL - 1, Math.max(0, saved))
  })
  const [errors, setErrors] = useState({})
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [presetNote, setPresetNote] = useState('')
  const [showSuggest, setShowSuggest] = useState(false)

  const headingRef = useRef(null)
  const firstRender = useRef(true)
  const verifyTimer = useRef(null)
  const [barHost, setBarHost] = useState(null)

  // 底部条要躲开 <main class="page"> 的 transform（会让 fixed 失效），
  // 但又必须排在 main 之后、页脚之前，否则键盘要穿过整个页脚才够得到「下一步」。
  useLayoutEffect(() => {
    const host = document.createElement('div')
    host.className = 'p-join__portal'
    const main = document.getElementById('main')
    if (main && main.parentNode) main.parentNode.insertBefore(host, main.nextSibling)
    else document.body.appendChild(host)
    setBarHost(host)
    return () => { host.remove() }
  }, [])

  const openEvents = state.events
    .filter(e => e.status === 'open')
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))

  const selectedEvent = openEvents.find(e => e.id === answers.eventId) || null
  const selectedEventType = selectedEvent ? selectors.activityType(state, selectedEvent.typeId) : null
  const category = selectedEventType?.category || 'social'
  const eventOptions = openEvents.filter(e => answers.typeIds.includes(e.typeId))

  const myApplied = new Set(
    state.applications
      .filter(a => a.userId === state.session.userId && !['canceled', 'expired'].includes(a.status))
      .map(a => a.eventId),
  )

  const isAdmin = state.session.role === 'admin'

  /* ── 从 #/join?type=&event= 预选 ───────────────── */
  useEffect(() => {
    const typeId = route.query.type
    const eventId = route.query.event
    if (!typeId && !eventId) return
    const type = typeId ? selectors.activityType(state, typeId) : null
    const event = eventId ? openEvents.find(e => e.id === eventId) : null

    setAnswers(prev => {
      const next = { ...prev }
      if (type && !next.typeIds.includes(type.id)) next.typeIds = [type.id, ...next.typeIds].slice(0, 3)
      if (event) {
        next.eventId = event.id
        if (!next.typeIds.includes(event.typeId)) next.typeIds = [event.typeId, ...next.typeIds].slice(0, 3)
      }
      return next
    })

    if (type) setPresetNote(`已经帮你选好了${type.name}。想换也行。`)
    // 只在 query 变化时跑，不跟随用户后续选择
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.query.type, route.query.event])

  /* ── 草稿：sessionStorage 只存草稿，不存学号与真实姓名 ── */
  useEffect(() => {
    const { studentNo, realName, ...rest } = answers
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, step, answers: rest }))
    } catch {
      /* 隐私模式 / 配额满：不阻断填写 */
    }
  }, [answers, step])

  /* ── 切步后焦点移到该步标题 ───────────────────── */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus({ preventScroll: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  useEffect(() => () => clearTimeout(verifyTimer.current), [])

  const clearError = (name) => {
    setErrors(prev => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      if (name === 'teachSkill' || name === 'learnSkill') {
        delete next.teachSkill
        delete next.learnSkill
      }
      return next
    })
  }

  const setField = (name, value) => {
    setAnswers(prev => ({ ...prev, [name]: value }))
    setSubmitError('')
    clearError(name)
  }

  const onTypesChange = (nextTypes) => {
    setAnswers(prev => {
      const keptType = prev.eventId
        ? state.events.find(e => e.id === prev.eventId)?.typeId
        : null
      return {
        ...prev,
        typeIds: nextTypes,
        eventId: keptType && nextTypes.includes(keptType) ? prev.eventId : '',
      }
    })
    clearError('typeIds')
    clearError('eventId')
  }

  const onShareContactChange = (value) => {
    const willing = value === 'yes'
    setAnswers(prev => ({
      ...prev,
      shareContact: willing,
      contactChannel: willing ? (prev.contactChannel && prev.contactChannel !== 'none' ? prev.contactChannel : 'wechat') : 'none',
    }))
    clearError('shareContact')
    clearError('contactChannel')
  }

  const onSlotToggle = (slot) => {
    setAnswers(prev => {
      const has = prev.availableSlots.includes(slot)
      return {
        ...prev,
        availableSlots: has
          ? prev.availableSlots.filter(x => x !== slot)
          : [...prev.availableSlots, slot],
      }
    })
    clearError('availableSlots')
  }

  const validate = (target = step) => {
    const e = {}

    if (target === 0) {
      if (!answers.school) e.school = '选一下学校。'
      if (!/^\d{8,14}$/.test(String(answers.studentNo).trim())) {
        e.studentNo = '学号是 8 到 14 位数字。'
      }
      const realLen = len(answers.realName)
      if (realLen < 2 || realLen > 10) e.realName = '填 2 到 10 个字。'
    }

    if (target === 1) {
      const nickLen = len(answers.nickname)
      if (nickLen < 2 || nickLen > 12) e.nickname = '昵称写 2 到 12 个字，别放真实姓名。'
      if (!answers.grade) e.grade = '选一个年级。'
      if (len(answers.major) < 2) e.major = '专业至少写两个字。'
      if (!answers.gender) e.gender = '选一个，或者选「不想说」。'
      const age = Number(answers.age)
      if (!answers.age || !Number.isFinite(age) || age < 16 || age > 30) {
        e.age = '年龄填 16 到 30 之间。'
      }
      if (!answers.campus) e.campus = '选一个，用来判断你能不能走到。'
    }

    if (target === 2) {
      if (answers.typeIds.length === 0) e.typeIds = '至少选一件事。'
      if (answers.typeIds.length > 3) e.typeIds = '最多选三个，够我们排了。'
      if (!answers.eventId) e.eventId = '选一场具体的时间。'
      else if (!eventOptions.some(x => x.id === answers.eventId)) {
        e.eventId = '这一场不在你选的范围里，重新点一个。'
      } else if (myApplied.has(answers.eventId)) {
        e.eventId = '你已经报过这场了，去「我的局」看看。'
      }
    }

    if (target === 3) {
      const selfLen = len(answers.selfDesc)
      const wantLen = len(answers.wantMeet)
      const stateLen = len(answers.recentState)
      if (selfLen < 20 || selfLen > 200) e.selfDesc = '写 20 到 200 字。这句是分桌主要看的。'
      if (wantLen < 20 || wantLen > 200) e.wantMeet = '写 20 到 200 字。写具体一点，匹配会准。'
      if (stateLen < 10 || stateLen > 150) e.recentState = '写 10 到 150 字，一句话也行。'
    }

    if (target === 4) {
      if (category === 'social') {
        if (answers.topicsWanted.length < 1) e.topicsWanted = '选一个你想接的话题。'
        if (answers.topicsWanted.length > 3) e.topicsWanted = '最多三个。'
        if (!answers.privacyLevel) e.privacyLevel = '选一档。'
      }
      if (category === 'buddy') {
        const goalLen = len(answers.goalText)
        if (goalLen < 10 || goalLen > 100) e.goalText = '写 10 到 100 字，具体到在做什么。'
        if (answers.availableSlots.length < 2) e.availableSlots = '至少选 2 个时段。'
        if (!answers.privacyLevel) e.privacyLevel = '选一档。'
      }
      if (category === 'competitive') {
        if (!answers.levelChoice) e.levelChoice = '选一档，拿不准就选「入门」。'
        if (len(answers.goalText) > 60) e.goalText = '最多 60 字。'
        if (!answers.privacyLevel) e.privacyLevel = '选一档。'
      }
      if (category === 'skill') {
        const teachLen = len(answers.teachSkill)
        const learnLen = len(answers.learnSkill)
        if (teachLen < 2 || teachLen > 20) e.teachSkill = '写 2 到 20 字，具体到能教什么。'
        if (learnLen < 2 || learnLen > 20) e.learnSkill = '写 2 到 20 字，具体到想学什么。'
        if (teachLen >= 2 && learnLen >= 2
          && answers.teachSkill.trim() === answers.learnSkill.trim()) {
          e.learnSkill = '这两项不能是同一个。换一个，或者把「学」写具体一点。'
        }
        if (!answers.levelChoice) e.levelChoice = '选一档你教的那项的水平。'
        if (!answers.privacyLevel) e.privacyLevel = '选一档。'
      }
    }

    if (target === 5) {
      const qLen = len(answers.question)
      if (qLen === 0) {
        e.question = '这题得写。全组每人一道，缺一道牌就不齐。'
      } else if (qLen < 5) {
        e.question = '再写具体一点。'
      } else if (qLen > 32) {
        e.question = '再短一点。32 字以内——这道题要被人念出来的。'
      }
      if (answers.shareContact === '') e.shareContact = '选愿意或不愿意。'
      if (answers.shareContact === true && (!answers.contactChannel || answers.contactChannel === 'none')) {
        e.contactChannel = '留联系方式的话，得选一种。'
      }
    }

    if (target === 6) {
      if (!answers.agreePrivacy) e.agreePrivacy = '需要勾选隐私说明。'
      if (!answers.agreeNoPromise) e.agreeNoPromise = '需要勾选「不承诺任何结果」。'
    }

    return e
  }

  const errorCount = Object.keys(errors).length

  const next = () => {
    const found = validate(step)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      requestAnimationFrame(() => headingRef.current?.focus())
      return
    }
    setErrors({})

    if (step === 0 && !verified) {
      setVerifying(true)
      clearTimeout(verifyTimer.current)
      verifyTimer.current = setTimeout(() => {
        setVerifying(false)
        setVerified(true)
        setStep(1)
      }, 700)
      return
    }
    setStep(s => Math.min(TOTAL - 1, s + 1))
  }

  const prev = () => {
    setErrors({})
    setStep(s => Math.max(0, s - 1))
  }

  const submit = async () => {
    const found = validate(6)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    if (!selectedEvent) {
      setStep(2)
      setErrors({ eventId: '选一场具体的时间。' })
      return
    }

    setSubmitting(true)
    setSubmitError('')

    // 本地演示没有真实网络：留一个可感知的加载态，避免按钮「点了没反应」。
    await new Promise(resolve => setTimeout(resolve, 420))

    const payload = {
      eventId: selectedEvent.id,
      activityTypeId: selectedEvent.typeId,
      activityTypeIds: answers.typeIds,
      shareContact: answers.shareContact === true,
      answers: {
        selfDesc: answers.selfDesc.trim(),
        wantMeet: answers.wantMeet.trim(),
        recentState: answers.recentState.trim(),
        topicsWanted: category === 'social' ? answers.topicsWanted : [],
        privacyLevel: answers.privacyLevel || 'mid',
        levelChoice: category === 'competitive' || category === 'skill'
          ? answers.levelChoice || null
          : null,
        gearHave: category === 'competitive' ? answers.gearHave : [],
        goalText: category === 'buddy' || category === 'competitive'
          ? answers.goalText.trim()
          : '',
        availableSlots: category === 'buddy' ? answers.availableSlots : [],
        teachSkill: category === 'skill' ? answers.teachSkill.trim() : '',
        learnSkill: category === 'skill' ? answers.learnSkill.trim() : '',
        questionsAsked: [answers.question.trim()],
        contactChannel: answers.shareContact === true ? answers.contactChannel : 'none',
        agreePrivacy: answers.agreePrivacy === true,
        agreeNoPromise: answers.agreeNoPromise === true,
      },
    }

    const result = actions.createApplication(payload)
    setSubmitting(false)

    if (!result.ok) {
      setSubmitError(result.error || '没交上去。你填的都还在，过一分钟再试。')
      showToast(result.error || '提交失败，请稍后重试', 'error')
      return
    }

    try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* 忽略 */ }
    showToast(
      `排桌中。${fmtDateTime(selectedEvent.matchAt)} 出结果，到时候站内会有提示。`,
      'ok',
    )
    navigate('/me')
  }

  const slotSummary = (() => {
    if (!answers.availableSlots.length) return ''
    const counts = { am: 0, pm: 0, night: 0 }
    answers.availableSlots.forEach((slot) => {
      const period = slot.split('_')[1]
      if (counts[period] != null) counts[period] += 1
    })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    const label = top[1] === 0 ? '' : { am: '上午', pm: '下午', night: '晚上' }[top[0]]
    return `选了 ${answers.availableSlots.length} 格${label ? `，主要在${label}` : ''}`
  })()

  const currentTitle = ['先花十分钟，\n说清你想干什么。', '你是谁', '想干点什么', '说三句', '补问', '最后两个', '确认'][step]
  const headingProps = {
    className: 'p-join__title',
    tabIndex: -1,
    ref: headingRef,
  }

  const submitBlocked = step === 6 && !(answers.agreePrivacy && answers.agreeNoPromise)

  return (
    <div className="p-join">
      {/* 顶部：步数 + 进度 + 草稿提示 */}
      <div className="p-join__top">
        <div className="p-join__top-inner">
          <div className="p-join__count-row">
            <p className="p-join__count">第 {step + 1} / {TOTAL} 步</p>
          </div>
          <StepBar
            steps={STEPS}
            current={step + 1}
            className="p-join__stepbar"
          />
          <p className="p-join__draft">离开会保留填写内容</p>
        </div>
      </div>

      <div className="wrap p-join__body">
        <div
          className={`p-join__form ${step === 2 ? 'is-wide' : ''}`.trim()}
          key={step}
          aria-busy={verifying || submitting}
          onKeyDown={(e) => {
            // 输入框里按回车 = 下一步；多行输入、按钮、下拉保持原行为
            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
            const tag = e.target.tagName
            if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return
            e.preventDefault()
            if (step < TOTAL - 1) next()
            else submit()
          }}
        >
          <p className="p-join__step-name">
            <span className="num">{String(step + 1).padStart(2, '0')}</span>
            <span aria-hidden="true"> / </span>
            {STEPS[step]}
          </p>

          {step === 0 ? (
            <h1 {...headingProps}>{currentTitle}</h1>
          ) : (
            <h2 {...headingProps}>{currentTitle}</h2>
          )}

          {errorCount > 0 ? (
            <p className="sr-only" role="alert">还有 {errorCount} 项没填好，看下面的提示。</p>
          ) : null}

          {/* ── Step 0 · 校园认证 ── */}
          {step === 0 ? (
            <>
              <p className="p-join__lead">先确认你真的是学生。学号只用来核对，列表里只显示后四位。</p>
              <p className="p-join__firsthint">带 * 的必须填。开放题写短也行，但写短了只能靠基本信息猜你。</p>

              <div className="p-join__fields">
                <Select
                  id="join-school"
                  label="你在哪所学校"
                  required
                  placeholder="选一下"
                  options={SCHOOLS}
                  value={answers.school}
                  error={errors.school}
                  onChange={(e) => setField('school', e.target.value)}
                />
                <Input
                  id="join-studentno"
                  label="学号"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={14}
                  placeholder="8–14 位数字"
                  value={answers.studentNo}
                  error={errors.studentNo}
                  onChange={(e) => setField('studentNo', e.target.value.replace(/\D/g, ''))}
                />
                <Input
                  id="join-realname"
                  label="真实姓名"
                  required
                  maxLength={10}
                  placeholder="只用于核对，不会出现在任何页面上"
                  value={answers.realName}
                  error={errors.realName}
                  onChange={(e) => setField('realName', e.target.value)}
                />
              </div>
            </>
          ) : null}

          {/* ── Step 1 · 你是谁 ── */}
          {step === 1 ? (
            <>
              <p className="p-join__lead">
                {verified ? '核对上了。下面这些，同组的人看得到。' : '六项，都快。昵称会被同桌看到，别用真名。'}
              </p>

              <div className="p-join__fields">
                <Input
                  id="join-nickname"
                  label="昵称"
                  required
                  maxLength={12}
                  showCount
                  placeholder="2–12 字。别人叫你什么，就写什么"
                  value={answers.nickname}
                  error={errors.nickname}
                  onChange={(e) => setField('nickname', e.target.value)}
                />

                <ChoiceGroup
                  id="join-grade"
                  name="grade"
                  label="年级"
                  required
                  columns={3}
                  className="p-join__pills"
                  options={GRADES}
                  value={answers.grade}
                  error={errors.grade}
                  onChange={(value) => setField('grade', value)}
                />

                <Input
                  id="join-major"
                  label="专业"
                  required
                  maxLength={20}
                  placeholder="写简称就行：软件工程 / 汉语言 / 临床医学（五年）"
                  value={answers.major}
                  error={errors.major}
                  onChange={(e) => setField('major', e.target.value)}
                />

                <ChoiceGroup
                  id="join-gender"
                  name="gender"
                  label="性别"
                  required
                  columns={4}
                  className="p-join__pills"
                  options={GENDERS}
                  value={answers.gender}
                  error={errors.gender}
                  hint="选「不想说」也能报，只是没法被排进有性别比例要求的那一桌，有时候会没有合适的局。"
                  onChange={(value) => setField('gender', value)}
                />

                <Input
                  id="join-age"
                  label="年龄"
                  required
                  type="number"
                  inputMode="numeric"
                  min={16}
                  max={30}
                  placeholder="16–30"
                  value={answers.age}
                  error={errors.age}
                  onChange={(e) => setField('age', e.target.value)}
                />

                <Select
                  id="join-campus"
                  label="你平时在哪个片区活动"
                  required
                  placeholder="选一个"
                  options={CAMPUSES}
                  value={answers.campus}
                  error={errors.campus}
                  hint="住北亭 / 南亭 / 穗石 / 贝岗或校外，都选「大学城公共」。不用精确到宿舍楼。"
                  onChange={(e) => setField('campus', e.target.value)}
                />
              </div>
            </>
          ) : null}

          {/* ── Step 2 · 想干点什么 ── */}
          {step === 2 ? (
            <>
              <p className="p-join__lead">这里只问事，不问人。最多选三个。</p>
              {presetNote ? <p className="p-join__notice">{presetNote}</p> : null}
              {myApplied.size > 0 ? (
                <p className="p-join__notice">你已报名 {myApplied.size} 局，可以再加报。</p>
              ) : null}

              <div className="p-join__fields">
                <MultiChoiceGroup
                  id="join-types"
                  name="activityTypes"
                  label="这周想干点什么"
                  required
                  max={3}
                  columns={2}
                  className="p-join__types"
                  options={state.activityTypes.map(t => ({ value: t.id, label: t.name }))}
                  values={answers.typeIds}
                  error={errors.typeIds}
                  onChange={onTypesChange}
                />

                <fieldset className="p-join__fieldset">
                  <legend className="field__label">
                    <span className="field__label-text">具体报哪一场</span>
                    <span className="req" aria-hidden="true">*</span>
                    <span className="sr-only">必填</span>
                  </legend>

                  {answers.typeIds.length === 0 ? (
                    <p className="p-join__muted">先选一类，下面会出现这周的场次。</p>
                  ) : eventOptions.length === 0 ? (
                    <p className="p-join__muted">这一类这周没开，换一个。</p>
                  ) : (
                    <div className="p-join__events">
                      {eventOptions.map((event) => {
                        const type = selectors.activityType(state, event.typeId)
                        const left = selectors.seatsLeft(state, event.id)
                        const applied = myApplied.has(event.id)
                        return (
                          <ChoiceCard
                            key={event.id}
                            name="eventId"
                            value={event.id}
                            checked={answers.eventId === event.id}
                            disabled={applied}
                            title={`${fmtWeekday(event.startAt)} ${fmtTime(event.startAt)} · ${type?.name || ''}`}
                            sub={
                              applied
                                ? '已报'
                                : `${event.campus}　${left > 0 ? `还剩 ${left} 位` : '已满，可候补'}　${event.priceLabel}`
                            }
                            onChange={(value) => setField('eventId', value)}
                          />
                        )
                      })}
                    </div>
                  )}

                  {errors.eventId ? <ErrorLine id="join-event-err">{errors.eventId}</ErrorLine> : null}
                </fieldset>
              </div>
            </>
          ) : null}

          {/* ── Step 3 · 说三句 ── */}
          {step === 3 ? (
            <>
              <p className="p-join__lead">三句话决定你和谁坐一桌。不用写得漂亮，写得像你就行。</p>

              <div className="p-join__fields p-join__fields--loose">
                <div>
                  <Textarea
                    id="join-selfdesc"
                    label="说说你是个什么样的人"
                    required
                    rows={5}
                    maxLength={200}
                    placeholder="话不算多，但聊到喜欢的乐队会突然说很多。工作日晚上一般在自习室，周末会骑车绕岛一圈。"
                    value={answers.selfDesc}
                    error={errors.selfDesc}
                    hint={len(answers.selfDesc) < 20
                      ? `还差 ${Math.max(0, 20 - len(answers.selfDesc))} 字。这句是分桌主要看的。`
                      : undefined}
                    onChange={(e) => setField('selfDesc', e.target.value)}
                  />
                  {len(answers.selfDesc) > 0 ? (
                    <p className="p-join__portrait">
                      <span className="eyebrow">画像预览</span>
                      {portraitTags(answers.selfDesc).map(tag => (
                        <Tag key={tag} variant="seal">{tag}</Tag>
                      ))}
                    </p>
                  ) : null}
                </div>

                <Textarea
                  id="join-wantmeet"
                  label="你想遇见什么样的人"
                  required
                  rows={5}
                  maxLength={200}
                  placeholder="能安静吃饭、不硬找话的那种。或者反过来，会主动接一句不让场子冷的。不太想遇到全程刷手机的。"
                  value={answers.wantMeet}
                  error={errors.wantMeet}
                  hint={len(answers.wantMeet) < 20
                    ? `还差 ${Math.max(0, 20 - len(answers.wantMeet))} 字。`
                    : undefined}
                  onChange={(e) => setField('wantMeet', e.target.value)}
                />

                <Textarea
                  id="join-recentstate"
                  label="最近在过什么日子"
                  required
                  rows={4}
                  maxLength={150}
                  placeholder="期末周，作息有点乱。上午能起来，下午在图书馆，晚上想找人说两句但不想动脑子。"
                  value={answers.recentState}
                  error={errors.recentState}
                  hint={len(answers.recentState) < 10
                    ? `还差 ${Math.max(0, 10 - len(answers.recentState))} 字。一句话也行，别空着。`
                    : undefined}
                  onChange={(e) => setField('recentState', e.target.value)}
                />
              </div>
            </>
          ) : null}

          {/* ── Step 4 · 条件分支 ── */}
          {step === 4 ? (
            <>
              <p className="p-join__branch">
                {{ social: '社交型', buddy: '搭子型', competitive: '竞技型', skill: '技能型' }[category]}
              </p>

              {category === 'social' ? (
                <>
                  <p className="p-join__lead">这一页只影响发给你们的那副牌，不影响你和谁坐。</p>
                  <div className="p-join__fields">
                    <MultiChoiceGroup
                      id="join-topics"
                      name="topicsWanted"
                      label="桌上出现这些话题，你想接哪几个"
                      required
                      max={3}
                      columns={2}
                      className="p-join__chips"
                      options={TOPICS}
                      values={answers.topicsWanted}
                      error={errors.topicsWanted}
                      onChange={(values) => { setField('topicsWanted', values) }}
                    />
                    <ChoiceGroup
                      id="join-privacy"
                      name="privacyLevel"
                      label="你的私人信息，愿意露到哪一步"
                      required
                      columns={1}
                      options={PRIVACY_OPTIONS}
                      value={answers.privacyLevel}
                      error={errors.privacyLevel}
                      onChange={(value) => setField('privacyLevel', value)}
                    />
                  </div>
                </>
              ) : null}

              {category === 'buddy' ? (
                <>
                  <p className="p-join__lead">搭子局不问性格，问作息。作息对不上，坐一起也难受。</p>
                  <div className="p-join__fields">
                    <div>
                      <Textarea
                        id="join-goal"
                        label="你在为什么目标坐着"
                        required
                        rows={3}
                        maxLength={100}
                        placeholder="数学一，第二轮，真题刚开。"
                        value={answers.goalText}
                        error={errors.goalText}
                        onChange={(e) => setField('goalText', e.target.value)}
                      />
                      <div className="p-join__examples">
                        {GOAL_EXAMPLES.map(text => (
                          <button
                            key={text}
                            type="button"
                            className="p-join__example"
                            onClick={() => setField('goalText', text)}
                          >
                            {text}
                          </button>
                        ))}
                      </div>
                    </div>

                    <fieldset
                      className="p-join__fieldset p-join__slots"
                      aria-describedby={errors.availableSlots ? 'join-slots-err' : 'join-slots-hint'}
                    >
                      <legend className="field__label">
                        <span className="field__label-text">一周里哪些时段你基本能坐</span>
                        <span className="req" aria-hidden="true">*</span>
                        <span className="sr-only">必填，至少选 2 个时段</span>
                      </legend>
                      <p className="field__hint" id="join-slots-hint">至少选 2 格。下面是周一至周日 × 上午 / 下午 / 晚上。</p>

                      <div className="p-join__slots-grid">
                        <div className="p-join__slots-head" aria-hidden="true">
                          <span />
                          {SLOT_PERIODS.map(p => <span key={p.key}>{p.label}</span>)}
                        </div>
                        {SLOT_DAYS.map(day => (
                          <div className="p-join__slots-row" key={day.key}>
                            <span className="p-join__slots-day">{day.label}</span>
                            {SLOT_PERIODS.map((period) => {
                              const value = `${day.key}_${period.key}`
                              const on = answers.availableSlots.includes(value)
                              return (
                                <button
                                  key={period.key}
                                  type="button"
                                  className="p-join__slot"
                                  aria-pressed={on}
                                  aria-label={`${day.label}${period.label}`}
                                  onClick={() => onSlotToggle(value)}
                                >
                                  {on ? <span aria-hidden="true">✓</span> : null}
                                </button>
                              )
                            })}
                          </div>
                        ))}
                      </div>

                      {slotSummary ? <p className="p-join__slot-summary">{slotSummary}</p> : null}
                      {errors.availableSlots
                        ? <ErrorLine id="join-slots-err">{errors.availableSlots}</ErrorLine>
                        : null}
                    </fieldset>

                    <ChoiceGroup
                      id="join-privacy"
                      name="privacyLevel"
                      label="你的私人信息，愿意露到哪一步"
                      required
                      columns={1}
                      options={PRIVACY_OPTIONS}
                      value={answers.privacyLevel}
                      error={errors.privacyLevel}
                      onChange={(value) => setField('privacyLevel', value)}
                    />
                  </div>
                </>
              ) : null}

              {category === 'competitive' ? (
                <>
                  <p className="p-join__lead">水平写真实一点。新手和老手放一桌，两边都不痛快。</p>
                  <div className="p-join__fields">
                    <ChoiceGroup
                      id="join-level"
                      name="levelChoice"
                      label="你的水平"
                      required
                      columns={2}
                      options={LEVEL_OPTIONS}
                      value={answers.levelChoice}
                      error={errors.levelChoice}
                      hint="拿不准就选「入门」。选高了会尴尬，选低了会无聊，选低了至少不难受。"
                      onChange={(value) => setField('levelChoice', value)}
                    />

                    <MultiChoiceGroup
                      id="join-gear"
                      name="gearHave"
                      label="你自带什么"
                      columns={2}
                      className="p-join__chips"
                      options={GEAR_OPTIONS}
                      values={answers.gearHave}
                      hint="没有也能报，写清楚就行。"
                      onChange={(values) => setField('gearHave', values)}
                    />

                    <Textarea
                      id="join-goal-sport"
                      label="想打到什么程度"
                      rows={3}
                      maxLength={60}
                      placeholder="出一身汗就行 / 想学会发球不失误"
                      value={answers.goalText}
                      error={errors.goalText}
                      onChange={(e) => setField('goalText', e.target.value)}
                    />

                    <ChoiceGroup
                      id="join-privacy"
                      name="privacyLevel"
                      label="你的私人信息，愿意露到哪一步"
                      required
                      columns={1}
                      options={PRIVACY_OPTIONS}
                      value={answers.privacyLevel}
                      error={errors.privacyLevel}
                      onChange={(value) => setField('privacyLevel', value)}
                    />
                  </div>
                </>
              ) : null}

              {category === 'skill' ? (
                <>
                  <p className="p-join__lead">这桌是交换，不是上课。两边都得有东西拿出来。</p>
                  <div className="p-join__fields">
                    <Input
                      id="join-teach"
                      label="你能教什么"
                      required
                      maxLength={20}
                      placeholder="吉他（能带完全不会的人弹下第一首）"
                      value={answers.teachSkill}
                      error={errors.teachSkill}
                      onChange={(e) => setField('teachSkill', e.target.value)}
                    />
                    <Input
                      id="join-learn"
                      label="你想学什么"
                      required
                      maxLength={20}
                      placeholder="剪视频（会剪，但不会调色）"
                      value={answers.learnSkill}
                      error={errors.learnSkill}
                      onChange={(e) => setField('learnSkill', e.target.value)}
                    />

                    <div className="p-join__suggest">
                      <p>你教吉他，也许可以学剪视频。要不要看看现在能换什么？</p>
                      <button
                        type="button"
                        className="p-join__suggest-btn"
                        aria-expanded={showSuggest}
                        onClick={() => setShowSuggest(v => !v)}
                      >
                        {showSuggest ? '收起' : '看看能换什么'}
                      </button>
                      {showSuggest ? (
                        <ul className="p-join__suggest-list">
                          <li>吉他 → 剪视频</li>
                          <li>剪视频 → 弹一首完整的歌</li>
                          <li>拍照 → 调色</li>
                        </ul>
                      ) : null}
                    </div>

                    <ChoiceGroup
                      id="join-level-skill"
                      name="levelChoice"
                      label="你教的那项，自己什么水平"
                      required
                      columns={2}
                      options={LEVEL_OPTIONS}
                      value={answers.levelChoice}
                      error={errors.levelChoice}
                      onChange={(value) => setField('levelChoice', value)}
                    />

                    <ChoiceGroup
                      id="join-privacy"
                      name="privacyLevel"
                      label="你的私人信息，愿意露到哪一步"
                      required
                      columns={1}
                      options={PRIVACY_OPTIONS}
                      value={answers.privacyLevel}
                      error={errors.privacyLevel}
                      onChange={(value) => setField('privacyLevel', value)}
                    />
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {/* ── Step 5 · 最后两个 ── */}
          {step === 5 ? (
            <>
              <p className="p-join__lead">这两个都跟局上的事有关。</p>
              <div className="p-join__fields">
                <Input
                  id="join-question"
                  label="出一道题，问桌上的人"
                  required
                  maxLength={32}
                  showCount
                  placeholder="你最近一次觉得「这个学校还挺好」，是什么时候？"
                  value={answers.question}
                  error={errors.question}
                  hint="这道题会印在卡牌上，署你的昵称。32 字以内，别出太难的——别人答不出来会尴尬。"
                  onChange={(e) => setField('question', e.target.value.slice(0, 32))}
                />

                <ChoiceGroup
                  id="join-share"
                  name="shareContact"
                  label="散场后愿意留联系方式吗"
                  required
                  columns={2}
                  className="p-join__pills"
                  options={[{ value: 'yes', label: '愿意' }, { value: 'no', label: '不愿意' }]}
                  value={answers.shareContact === '' ? '' : (answers.shareContact ? 'yes' : 'no')}
                  error={errors.shareContact}
                  hint="留了也只有组长和管理员看得到。"
                  onChange={onShareContactChange}
                />

                {answers.shareContact === true ? (
                  <ChoiceGroup
                    id="join-channel"
                    name="contactChannel"
                    label="留哪种"
                    required
                    columns={2}
                    className="p-join__pills"
                    options={[{ value: 'wechat', label: '微信号' }, { value: 'phone', label: '手机号' }]}
                    value={answers.contactChannel}
                    error={errors.contactChannel}
                    onChange={(value) => setField('contactChannel', value)}
                  />
                ) : null}
              </div>
            </>
          ) : null}

          {/* ── Step 6 · 确认 ── */}
          {step === 6 ? (
            <>
              <p className="p-join__lead">看一眼，然后就交上去。</p>

              <dl className="p-join__summary">
                <div className="p-join__summary-row">
                  <dt>场次</dt>
                  <dd>
                    {selectedEvent
                      ? `${fmtWeekday(selectedEvent.startAt)} ${fmtTime(selectedEvent.startAt)}　${selectedEventType?.name || ''}　${selectedEvent.campus}`
                      : '还没选场次'}
                  </dd>
                </div>
                <div className="p-join__summary-row">
                  <dt>桌数</dt>
                  <dd>
                    {selectedEvent
                      ? `本场最多开 ${selectedEvent.capacityGroups} 桌，每桌 ${selectedEvent.groupSize} 人`
                      : '—'}
                  </dd>
                </div>
                <div className="p-join__summary-row">
                  <dt>昵称</dt>
                  <dd>
                    {answers.nickname || '—'}
                    <span className="p-join__summary-sub">
                      {schoolShortOf(answers.school)} {GRADE_LABEL[answers.grade] || ''} {answers.major}
                    </span>
                  </dd>
                </div>
                <div className="p-join__summary-row">
                  <dt>画像</dt>
                  <dd>{portraitTags(answers.selfDesc).join(' / ')}</dd>
                </div>
                <div className="p-join__summary-row">
                  <dt>你说</dt>
                  <dd>「{Array.from(answers.selfDesc.trim()).slice(0, 20).join('')}{len(answers.selfDesc) > 20 ? '…' : ''}」</dd>
                </div>
                <div className="p-join__summary-row">
                  <dt>出结果</dt>
                  <dd>{selectedEvent ? `${fmtDateTime(selectedEvent.matchAt)} 前` : '—'}</dd>
                </div>
              </dl>

              <fieldset className="p-join__fieldset p-join__agreements">
                <legend className="field__label">
                  <span className="field__label-text">两件事要确认</span>
                  <span className="req" aria-hidden="true">*</span>
                </legend>

                <MultiChoiceCard
                  name="agreePrivacy"
                  value="privacy"
                  checked={answers.agreePrivacy}
                  title="我读过隐私说明，知道这些信息会用来分桌。"
                  onChange={() => setField('agreePrivacy', !answers.agreePrivacy)}
                />
                {errors.agreePrivacy ? <ErrorLine id="join-agree-p-err">{errors.agreePrivacy}</ErrorLine> : null}

                <MultiChoiceCard
                  name="agreeNoPromise"
                  value="nopromise"
                  checked={answers.agreeNoPromise}
                  title="我理解这局不承诺任何结果。"
                  onChange={() => setField('agreeNoPromise', !answers.agreeNoPromise)}
                />
                {errors.agreeNoPromise ? <ErrorLine id="join-agree-n-err">{errors.agreeNoPromise}</ErrorLine> : null}
              </fieldset>

              {submitError ? (
                <p className="p-join__submit-error" role="alert">
                  <span aria-hidden="true">×</span>
                  <span>{submitError}</span>
                </p>
              ) : null}
            </>
          ) : null}

          {isAdmin ? (
            <div className="p-join__admin">
              <p>管理员身份不能报名。切一个学生身份：</p>
              <div className="select-wrap">
                <select
                  className="select"
                  defaultValue=""
                  aria-label="切换演示身份"
                  onChange={(e) => {
                    if (!e.target.value) return
                    const res = actions.switchSession(e.target.value)
                    showToast(res.ok ? '身份已切换' : (res.error || '切换失败，请稍后重试'), res.ok ? 'ok' : 'error')
                  }}
                >
                  <option value="">选一个身份…</option>
                  {demoIdentities().filter(x => x.role === 'student').map(x => (
                    <option key={x.id} value={x.id}>{x.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* 底部固定条：挂到 main 与 footer 之间，避开入场动画的 transform 包含块 */}
      {barHost ? createPortal(
        <div className="p-join__bar">
          <div className="p-join__bar-tip" aria-live="polite">
            {submitBlocked ? '需要勾选两项' : ''}
          </div>
          <div className="p-join__bar-actions">
            <Button variant="secondary" onClick={prev} disabled={step === 0 || submitting}>
              上一步
            </Button>
            {step < 6 ? (
              <Button
                onClick={next}
                disabled={verifying || submitting}
                arrow={!verifying}
              >
                {verifying ? '在核对……' : '下一步'}
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={submitting || submitBlocked}
                arrow={!submitting}
              >
                {submitting ? '在排你的位置……' : '提交报名'}
              </Button>
            )}
          </div>
        </div>,
        barHost,
      ) : null}
    </div>
  )
}
