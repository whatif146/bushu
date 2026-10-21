import { useEffect, useState } from 'react'
import { useRoute, navigate, goSection } from '../lib/router.jsx'
import Button from './Button.jsx'
import Modal from './Modal.jsx'

// 导航项：路由项用 href，页内区块用 goSection（hash 路由下 `#how` 会被当成路径，不能直接写锚点）。
const LINKS = [
  { label: '本周局', to: '/' },
  { label: '怎么玩', section: 'how' },
  { label: '安全说明', section: 'safety' },
  { label: '我的局', to: '/me' },
]

export default function Nav() {
  const { isActive } = useRoute()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (item) => {
    setMenuOpen(false)
    if (item.to) navigate(item.to)
    else goSection(item.section)
  }

  const logo = (onInk = false) => (
    <a
      className={onInk ? 'menu__logo' : 'nav__logo'}
      href="#/"
      onClick={(e) => { e.preventDefault(); setMenuOpen(false); navigate('/') }}
    >
      <span className={onInk ? 'menu__mark' : 'nav__mark'}>不熟局</span>
      <span className={onInk ? 'menu__sub' : 'nav__sub'}>BU SHU</span>
    </a>
  )

  return (
    <>
      <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`.trim()}>
        <div className="nav__inner">
          {logo(false)}

          <nav className="nav__links" aria-label="主导航">
            {LINKS.map(item => (
              item.to ? (
                <a
                  key={item.label}
                  className={`nav__link ${isActive(item.to) ? 'is-active' : ''}`.trim()}
                  href={`#${item.to}`}
                  aria-current={isActive(item.to) ? 'page' : undefined}
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className="nav__link"
                  onClick={() => go(item)}
                >
                  {item.label}
                </button>
              )
            ))}
          </nav>

          <div className="nav__actions">
            <Button as="a" href="#/join" size="sm" arrow>报名</Button>
            <button
              type="button"
              className="nav__burger"
              aria-label="打开菜单"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <span className="nav__burger-lines" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        variant="menu"
        labelledBy="mobile-menu-title"
      >
        <div className="menu">
          <div className="menu__top">
            {logo(true)}
            <button
              type="button"
              className="menu__close"
              aria-label="关闭菜单"
              onClick={() => setMenuOpen(false)}
            >
              <svg viewBox="0 0 20 20" width="20" height="20" fill="none"
                stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" />
              </svg>
            </button>
          </div>

          <h2 className="sr-only" id="mobile-menu-title">菜单</h2>

          <nav className="menu__list" aria-label="移动端主导航">
            {LINKS.map((item, i) => (
              item.to ? (
                <a
                  key={item.label}
                  className="menu__item"
                  href={`#${item.to}`}
                  style={{ '--i': i }}
                  onClick={(e) => { e.preventDefault(); go(item) }}
                >
                  <span className="menu__item-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="menu__item-label">{item.label}</span>
                </a>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className="menu__item"
                  style={{ '--i': i }}
                  onClick={() => go(item)}
                >
                  <span className="menu__item-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="menu__item-label">{item.label}</span>
                </button>
              )
            ))}
          </nav>

          <div className="menu__foot">
            <Button
              as="a"
              href="#/join"
              block
              arrow
              onClick={() => setMenuOpen(false)}
            >
              报名
            </Button>
            <p className="menu__place">广州大学城 · 小谷围岛</p>
          </div>
        </div>
      </Modal>
    </>
  )
}
