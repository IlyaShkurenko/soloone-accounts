import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const port = Number(process.env.PORT || 9004)
const api = (process.env.API_BASE || 'https://api.solo1.ai').replace(/\/+$/, '')
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']]
])

createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end()
    return
  }
  const path = new URL(req.url || '/', 'http://localhost').pathname
  if (path === '/api/ports') {
    try {
      const response = await fetch(`${api}/api/ports`, { signal: AbortSignal.timeout(60000) })
      if (!response.ok) throw new Error('Backend unavailable')
      const data = await response.json()
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data))
    } catch {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ error: 'Port status is temporarily unavailable.' }))
    }
    return
  }
  const asset = assets.get(path)
  if (!asset) { res.writeHead(404).end(); return }
  try {
    const body = await readFile(new URL(`./public/${asset[0]}`, import.meta.url))
    res.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-cache' })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch { res.writeHead(500).end() }
}).listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`Port dashboard: http://localhost:${port}`)
})
