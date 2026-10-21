// 把 docs/manual.html 打成 A4 PDF（带页码页脚）
import { spawn } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const PORT = 9361
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const src = pathToFileURL(`${process.cwd()}/docs/manual.html`).href
const out = 'docs/不熟局-产品说明书.pdf'

const child = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu',
  '--user-data-dir=C:/Users/lenovo/AppData/Local/Temp/qa-manual', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let wsUrl
for (let i = 0; i < 40; i++) {
  try { const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break } } catch {}
  await sleep(250)
}
const ws = new WebSocket(wsUrl); await new Promise(r => { ws.onopen = r })
let id = 0; const pending = new Map()
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
const send = (method, params = {}, sessionId) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params, sessionId })) })

const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' })
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Page.navigate', { url: src }, sessionId)
await sleep(3500) // 等 Google Fonts

const pdf = await send('Page.printToPDF', {
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: '<div style="width:100%;font-size:7.5pt;color:#8B8276;font-family:sans-serif;padding:0 18mm;display:flex;justify-content:space-between;"><span>不熟局 · 产品说明书 v1.0</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  marginTop: 0.78, marginBottom: 0.7, marginLeft: 0.7, marginRight: 0.7,
}, sessionId)

if (!pdf.result) { console.error('printToPDF 失败'); process.exit(1) }
writeFileSync(out, Buffer.from(pdf.result.data, 'base64'))
const buf = readFileSync(out).toString('latin1')
console.log('saved', out, (readFileSync(out).length / 1024 | 0) + 'KB', '页数:', (buf.match(/\/Type\s*\/Page[^s]/g) || []).length)
ws.close(); child.kill(); process.exit(0)
