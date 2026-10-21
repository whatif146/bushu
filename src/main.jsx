import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'

// 样式顺序不能改：token → 基线 → 共享组件 → 页面私有
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/pages/landing.css'
import './styles/pages/join.css'
import './styles/pages/me.css'
import './styles/pages/table.css'
import './styles/pages/live.css'
import './styles/pages/recap.css'
import './styles/pages/admin.css'
import './styles/refine.css'   // 质感层：必须是最后一行

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
)
