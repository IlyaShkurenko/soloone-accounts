const $ = selector => document.querySelector(selector)
const availabilityLabels = { free: 'Free', in_use: 'In use', unknown: 'Not set' }
const connectionLabels = { connected: 'Connected', disconnected: 'Disconnected', blocked: 'Blocked', starting: 'Disconnected', connection_issue: 'Connection issue', unknown: 'Not verified', not_configured: 'Not configured' }
const stabilityLabels = { no_recent_disconnects: 'No recent disconnects', recent_disconnects: 'Recent disconnects', untested: 'Not enough activity yet', limited_history: 'Limited history' }
let snapshot = null
let fetching = false
let refreshFailed = false

function render() {
  if (!snapshot) return
  const ports = snapshot.ports
  $('#count-available').textContent = ports.filter(p => p.availability === 'free' && p.connection === 'connected').length
  $('#count-in-use').textContent = ports.filter(p => p.availability === 'in_use').length
  $('#count-attention').textContent = ports.filter(p => p.connection !== 'connected').length
  $('#count-all').textContent = ports.length
  const showFree = $('#filter-free').checked
  const showInUse = $('#filter-in-use').checked
  const search = $('#search').value.trim().toLowerCase().replace(/^port\s*/, '')
  const visible = ports.filter(p => ((showFree && p.availability === 'free') || (showInUse && p.availability === 'in_use')
    || (showFree && showInUse && p.availability === 'unknown')) && String(p.port).includes(search))
  const fragment = document.createDocumentFragment()
  for (const port of visible) {
    const row = $('#row-template').content.cloneNode(true)
    row.querySelector('.rank').textContent = String(port.rank).padStart(2, '0')
    row.querySelector('.port-name').textContent = port.label
    row.querySelector('.device').hidden = port.device !== 'real_phone'
    for (const [selector, value, labels] of [['.availability', port.availability, availabilityLabels], ['.stability', port.stability, stabilityLabels]]) {
      row.querySelector(selector).textContent = labels[value] || 'Unknown'
      row.querySelector(selector).dataset.state = value
    }
    row.querySelector('.connection').dataset.state = port.connection === 'starting' ? 'disconnected' : port.connection
    row.querySelector('.connection-label').textContent = connectionLabels[port.connection] || 'Not verified'
    fragment.append(row)
  }
  $('#ports').replaceChildren(fragment)
  $('#result-count').textContent = `${visible.length} / ${ports.length}`
  $('#empty').hidden = visible.length > 0
  if (!visible.length) $('#empty').replaceChildren(Object.assign(document.createElement('h3'), { textContent: 'No matching ports' }), Object.assign(document.createElement('p'), { textContent: 'Try another port or change the availability filters.' }))
  const messages = []
  const stale = refreshFailed || Date.now() - Date.parse(snapshot.updatedAt) > 180000
  if (stale) messages.push('Status could not be refreshed. Showing the last checked data; connections may have changed.')
  if (!snapshot.providerAvailable) messages.push('Whapi is unavailable. Connection statuses could not be verified.')
  if (snapshot.historyPartial) messages.push('Some connection history is unavailable. Stability ordering uses the records we have.')
  $('#notice').hidden = !messages.length
  $('#notice').textContent = messages.join(' ')
  const checked = new Date(snapshot.updatedAt)
  $('#updated').textContent = `${stale ? 'Last checked' : 'Updated'} ${checked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  $('#updated').title = checked.toLocaleString()
}

async function refresh() {
  if (fetching) return
  fetching = true
  $('#refresh').disabled = true
  try {
    const response = await fetch('/api/ports', { cache: 'no-store', signal: AbortSignal.timeout(65000) })
    if (!response.ok) throw new Error('Unavailable')
    const data = await response.json()
    if (!Array.isArray(data.ports) || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Invalid response')
    snapshot = data
    refreshFailed = false
    render()
  } catch {
    refreshFailed = true
    if (snapshot) render()
    else {
      $('#updated').textContent = 'Status unavailable'
      $('#empty').replaceChildren(Object.assign(document.createElement('h3'), { textContent: 'Couldn’t load port status' }), Object.assign(document.createElement('p'), { textContent: 'Please try Refresh in a moment.' }))
    }
  } finally {
    fetching = false
    $('#refresh').disabled = false
  }
}
for (const id of ['#filter-free', '#filter-in-use', '#search']) $(id).addEventListener('input', render)
$('#refresh').addEventListener('click', refresh)
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh() })
setInterval(() => { if (!document.hidden) refresh() }, 60000)
refresh()
