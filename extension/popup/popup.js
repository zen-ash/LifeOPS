/**
 * LifeOPS Focus Blocker — Popup Script
 *
 * Reads/writes chrome.storage.local and notifies the background service worker
 * via chrome.runtime.sendMessage whenever state changes.
 */

// ── State ─────────────────────────────────────────────────────────────────────

let focusActive = false
let blockedSites = []   // array of bare domain strings, e.g. ['youtube.com']

// ── DOM refs ──────────────────────────────────────────────────────────────────

const focusToggle  = document.getElementById('focus-toggle')
const focusStatus  = document.getElementById('focus-status')
const siteInput    = document.getElementById('site-input')
const addBtn       = document.getElementById('add-btn')
const sitesList    = document.getElementById('sites-list')
const warnBanner   = document.getElementById('warn-banner')

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip protocol, www., path, and port from user input.
 * 'https://www.youtube.com/feed' → 'youtube.com'
 */
function normalizeDomain(raw) {
  let d = raw.trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '')
  d = d.replace(/^www\./, '')
  d = d.split('/')[0]
  d = d.split('?')[0]
  d = d.split(':')[0]
  return d
}

/** Persist state and tell the background worker to update blocking rules. */
async function syncState() {
  await chrome.storage.local.set({ focusActive, blockedSites })
  chrome.runtime.sendMessage({
    type: 'SET_FOCUS',
    focusActive,
    blockedSites,
  })
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderUI() {
  // Toggle
  focusToggle.checked = focusActive

  // Status label
  if (focusActive) {
    focusStatus.textContent =
      blockedSites.length === 0
        ? 'Active — no sites blocked yet'
        : `Active — blocking ${blockedSites.length} site${blockedSites.length > 1 ? 's' : ''}`
    focusStatus.className = 'focus-status active'
  } else {
    focusStatus.textContent = 'Inactive — sites are not blocked'
    focusStatus.className = 'focus-status inactive'
  }

  // Warning banner (only when focus is on but list is empty)
  warnBanner.style.display = focusActive && blockedSites.length === 0 ? 'block' : 'none'

  // Sites list
  sitesList.innerHTML = ''

  if (blockedSites.length === 0) {
    const empty = document.createElement('li')
    empty.className = 'empty'
    empty.textContent = 'No sites added yet'
    sitesList.appendChild(empty)
    return
  }

  blockedSites.forEach((domain) => {
    const li = document.createElement('li')
    li.className = 'site-item'

    const span = document.createElement('span')
    span.className = 'site-domain'
    span.textContent = domain
    span.title = domain

    const removeBtn = document.createElement('button')
    removeBtn.className = 'btn-remove'
    removeBtn.textContent = '×'
    removeBtn.title = `Remove ${domain}`
    removeBtn.addEventListener('click', () => removeSite(domain))

    li.appendChild(span)
    li.appendChild(removeBtn)
    sitesList.appendChild(li)
  })
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function toggleFocus() {
  focusActive = focusToggle.checked
  renderUI()
  await syncState()
}

async function addSite() {
  const raw = siteInput.value
  if (!raw.trim()) return

  const domain = normalizeDomain(raw)

  // Validate: must contain at least one dot and no spaces
  if (!domain || !domain.includes('.') || domain.includes(' ')) {
    siteInput.style.borderColor = '#ef4444'
    setTimeout(() => (siteInput.style.borderColor = ''), 1200)
    siteInput.select()
    return
  }

  // Deduplicate
  if (blockedSites.includes(domain)) {
    siteInput.value = ''
    return
  }

  blockedSites = [...blockedSites, domain]
  siteInput.value = ''
  renderUI()
  await syncState()
}

async function removeSite(domain) {
  blockedSites = blockedSites.filter((d) => d !== domain)
  renderUI()
  await syncState()
}

// ── Events ────────────────────────────────────────────────────────────────────

focusToggle.addEventListener('change', toggleFocus)

addBtn.addEventListener('click', addSite)

siteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addSite()
})

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  const stored = await chrome.storage.local.get(['focusActive', 'blockedSites'])
  focusActive  = stored.focusActive  === true
  blockedSites = Array.isArray(stored.blockedSites) ? stored.blockedSites : []
  renderUI()
}

init()
