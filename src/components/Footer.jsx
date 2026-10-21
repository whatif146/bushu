import { navigate, goSection } from '../lib/router.jsx'
import ShareRow from './ShareRow.jsx'

// 页脚：墨底纸字。左 5 栏是 serif italic 标语，右 7 栏三列链接（4:4:4）。
// 页内区块链接同样走 goSection，不写 `#how` 这类会和 hash 路由打架的 href。
const COLS = [
  {
    title: '局',
    links: [
      { label: '本周的局', to: '/' },
      { label: '怎么玩', section: 'how' },
      { label: '我的局', to: '/me' },
      { label: '去报名', to: '/join' },
    ],
  },
  {
    title: '关于',
    links: [
      { label: '我们在做什么', section: 'how' },
      { label: '常见问题', section: 'faq' },
      { label: '联系方式', section: 'contact' },
    ],
  },
  {
    title: '安全',
    links: [
      { label: '校园认证', section: 'safety' },
      { label: '一键反馈', section: 'safety' },
      { label: '隐私说明', section: 'safety' },
    ],
  },
]

export default function Footer() {
  const jump = (e, link) => {
    e.preventDefault()
    if (link.to) navigate(link.to)
    else goSection(link.section)
  }

  return (
    <footer className="site-footer on-ink grain-static">
      <div className="wrap">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <p className="site-footer__slogan">{'下次见面，\n别问我是谁。'}</p>
            <p className="site-footer__slogan-en">BU SHU · XIAOGUWEI ISLAND</p>
          </div>

          <div className="site-footer__cols">
            {COLS.map(col => (
              <div key={col.title}>
                <h2 className="site-footer__col-title">{col.title}</h2>
                <ul className="site-footer__col">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <a
                        className="site-footer__link"
                        href={link.to ? `#${link.to}` : '#/'}
                        onClick={(e) => jump(e, link)}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <ShareRow />

        <p className="site-footer__credit">
          站内实拍来自 Wikimedia Commons：南亭村口 © TONY LU、中心湖 © Jasonjiang.1998，均为 CC BY-SA 4.0（已裁切）。详见 docs/credits.md。
        </p>

        <div className="site-footer__bar">
          <span>不熟局 BU SHU · 广州大学城 · 小谷围岛</span>
          <span>© 2026</span>
          <span className="site-footer__bar-item--end">粤ICP备 2026000000 号（演示）</span>
        </div>
      </div>
    </footer>
  )
}
