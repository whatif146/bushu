// 打印检查：把页面按 A4 打到 PDF，数页数（一页 = 合格；多页 = 物料会断在两张纸上）
// 用法：node scripts/print-check.mjs <url> <out.pdf>
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'

const [url, out] = process.argv.slice(2)
const PORT = 9334
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const child = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu',
  '--user-data-dir=C:/Users/lenovo/AppData/Local/Temp/qa-print-profile', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl
    } catch {}
    await sleep(250)
  }
  throw new Error('CDP 未就绪')
}

const ws = new WebSocket(await wsUrl())
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
const send = (method, params = {}, sessionId) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params, sessionId })) })

const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' })
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Page.navigate', { url }, sessionId)
await sleep(2200)
const pdf = await send('Page.printToPDF', {
  printBackground: true, preferCSSPageSize: true, paperWidth: 8.27, paperHeight: 11.69,
}, sessionId)
if (!pdf.result) { console.error(JSON.stringify(pdf).slice(0, 300)); process.exit(1) }
writeFileSync(out, Buffer.from(pdf.result.data, 'base64'))
const buf = readFileSync(out).toString('latin1')
const pages = (buf.match(/\/Type\s*\/Page[^s]/g) || []).length
console.log(`saved ${out} · ${pages} 页`)
ws.close(); child.kill(); process.exit(0)
