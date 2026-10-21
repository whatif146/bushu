// 一次性 QA 工具：用 CDP 在无头 Edge 里滚动 + 截图（Windows 上 --screenshot 会把视口撑到 500px，不可信）
// 用法：node scripts/shot.mjs <url> <out.png> [scrollY] [w] [h]
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const [url, out, scrollY = '0', w = '1440', h = '900'] = process.argv.slice(2)
const PORT = 9333
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const child = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--window-size=${w},${h}`,
  '--disable-gpu',
  '--hide-scrollbars',
  '--user-data-dir=C:/Users/lenovo/AppData/Local/Temp/qa-edge-profile',
  'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      const j = await res.json()
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl
    } catch { /* 还没起来 */ }
    await sleep(250)
  }
  throw new Error('CDP 未就绪')
}

const ws = new WebSocket(await getWsUrl())
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
}
const send = (method, params = {}, sessionId) => new Promise((res) => {
  const mid = ++id
  pending.set(mid, res)
  ws.send(JSON.stringify({ id: mid, method, params, sessionId }))
})

const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' })
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true })

await send('Page.enable', {}, sessionId)
await send('Network.enable', {}, sessionId)
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId)
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile: false,
}, sessionId)
await send('Page.navigate', { url }, sessionId)
await sleep(1800)
await send('Runtime.evaluate', {
  expression: `document.documentElement.style.scrollBehavior='auto'; window.scrollTo(0, ${Number(scrollY)});`,
}, sessionId)
await sleep(700)
if (process.env.PRINT_MEDIA === '1') {
  await send('Emulation.setEmulatedMedia', { media: 'print' }, sessionId)
  await sleep(500)
}
const shot = await send('Page.captureScreenshot', process.env.FORMAT === 'jpeg'
  ? { format: 'jpeg', quality: Number(process.env.QUALITY || 82) }
  : { format: 'png' }, sessionId)
if (!shot.result) { console.error(JSON.stringify(shot).slice(0, 300)); process.exit(1) }
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
console.log('saved', out)

ws.close()
child.kill()
process.exit(0)
