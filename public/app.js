const $ = selector => document.querySelector(selector)
const availabilityLabels = { warming: 'Warming', free: 'Free', in_use: 'In use' }
const connectionLabels = { connected: 'Connected', disconnected: 'Disconnected' }
const stabilityLabels = { no_recent_disconnects: 'No recent disconnects', recent_disconnects: 'Recent disconnects', untested: 'Not enough activity yet', limited_history: 'Limited history' }
let snapshot = null
let fetching = false
let refreshFailed = false

const historyTooltip = document.createElement('div')
historyTooltip.id = 'disconnect-tooltip'
historyTooltip.className = 'history-tooltip'
historyTooltip.setAttribute('role', 'tooltip')
historyTooltip.hidden = true
document.body.append(historyTooltip)
let tooltipAnchor = null
let tooltipTimer
const historyDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hourCycle: 'h23'
})

function hideHistory() {
  clearTimeout(tooltipTimer)
  tooltipAnchor?.removeAttribute('aria-describedby')
  tooltipAnchor = null
  historyTooltip.hidden = true
}

function showHistory(button, port) {
  hideHistory()
  tooltipAnchor = button
  button.setAttribute('aria-describedby', historyTooltip.id)
  const details = port.disconnectHistory
  const count = details?.count
  const title = document.createElement('strong')
  title.textContent = typeof count === 'number' ? `${count} ${count === 1 ? 'disconnect' : 'disconnects'} · last 7 days` : 'Disconnect history unavailable'
  const dates = document.createElement('ul')
  for (const timestamp of details?.timestamps || []) {
    const item = document.createElement('li')
    item.textContent = historyDate.format(new Date(timestamp)) + ' UTC'
    dates.append(item)
  }
  historyTooltip.replaceChildren(title, dates)
  if (snapshot.historyPartial) {
    const note = document.createElement('small')
    note.textContent = 'Partial history · recorded events only'
    historyTooltip.append(note)
  }
  historyTooltip.hidden = false
  const anchor = button.getBoundingClientRect()
  const box = historyTooltip.getBoundingClientRect()
  const left = Math.max(8, Math.min(anchor.right - box.width, innerWidth - box.width - 8))
  const top = anchor.bottom + box.height + 8 < innerHeight ? anchor.bottom + 7 : Math.max(8, anchor.top - box.height - 7)
  historyTooltip.style.left = `${left}px`
  historyTooltip.style.top = `${top}px`
}

historyTooltip.addEventListener('pointerenter', () => clearTimeout(tooltipTimer))
historyTooltip.addEventListener('pointerleave', hideHistory)
document.addEventListener('pointerdown', event => {
  if (!historyTooltip.contains(event.target) && !event.target.closest('.history-help')) hideHistory()
})
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideHistory() })
window.addEventListener('resize', hideHistory)
document.addEventListener('scroll', event => { if (!historyTooltip.contains(event.target)) hideHistory() }, true)

function render() {
  if (!snapshot) return
  hideHistory()
  const ports = snapshot.ports
  $('#count-available').textContent = ports.filter(p => p.availability === 'free' && p.connection === 'connected').length
  $('#count-in-use').textContent = ports.filter(p => p.availability === 'in_use').length
  $('#count-attention').textContent = ports.filter(p => p.connection !== 'connected').length
  $('#count-all').textContent = ports.length
  const selected = new Set(Object.keys(availabilityLabels).filter(value => $(`#filter-${value.replace('_', '-')}`).checked))
  const search = $('#search').value.trim().toLowerCase().replace(/^port\s*/, '')
  const visible = ports.filter(p => selected.has(p.availability) && String(p.port).includes(search))
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
    row.querySelector('.connection').dataset.state = port.connection
    row.querySelector('.connection-label').textContent = connectionLabels[port.connection]
    if (port.stability === 'recent_disconnects' || port.disconnectHistory?.count > 0) {
      const help = document.createElement('button')
      help.type = 'button'
      help.className = 'history-help'
      help.textContent = '?'
      help.setAttribute('aria-label', `Disconnect history for ${port.label}`)
      help.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') showHistory(help, port) })
      help.addEventListener('pointerleave', () => { tooltipTimer = setTimeout(hideHistory, 150) })
      help.addEventListener('focus', () => showHistory(help, port))
      help.addEventListener('blur', hideHistory)
      help.addEventListener('click', () => showHistory(help, port))
      row.querySelector('.stability').after(help)
    }
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
for (const id of ['#filter-warming', '#filter-free', '#filter-in-use', '#search']) $(id).addEventListener('input', render)
$('#refresh').addEventListener('click', refresh)
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh() })
setInterval(() => { if (!document.hidden) refresh() }, 60000)
refresh()
