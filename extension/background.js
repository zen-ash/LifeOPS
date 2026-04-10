/**
 * LifeOPS Focus Blocker — Service Worker (Manifest V3)
 *
 * Responsibilities:
 *  - Listen for SET_FOCUS messages from the popup
 *  - Add / remove declarativeNetRequest dynamic rules to block sites
 *  - Persist focus state in chrome.storage.local so state survives popup close
 */

// ── Rule management ───────────────────────────────────────────────────────────

/**
 * Remove every existing dynamic rule, then optionally add new ones.
 * Each blocked domain gets its own rule that redirects main_frame requests
 * to the extension's blocked.html page (with the domain in the query string).
 */
async function updateBlockingRules(focusActive, blockedSites) {
  // Always wipe existing dynamic rules first
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existing.map((r) => r.id)

  if (!focusActive || blockedSites.length === 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: [],
    })
    return
  }

  // Build one rule per domain
  const addRules = blockedSites.map((domain, index) => ({
    id: index + 1,           // IDs must be positive integers
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        extensionPath: `/blocked.html?site=${encodeURIComponent(domain)}`,
      },
    },
    condition: {
      // ||domain^ matches http(s)://(www.)domain/... and subdomains
      urlFilter: `||${domain}^`,
      resourceTypes: ['main_frame'],
    },
  }))

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  })
}

// ── Message handler ───────────────────────────────────────────────────────────

/**
 * The popup sends a SET_FOCUS message whenever the user toggles focus mode
 * or modifies the blocked-sites list while focus is active.
 *
 * Message shape:
 *   { type: 'SET_FOCUS', focusActive: boolean, blockedSites: string[] }
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SET_FOCUS') {
    updateBlockingRules(message.focusActive, message.blockedSites)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error('[background] updateBlockingRules failed:', err)
        sendResponse({ ok: false, error: err.message })
      })
    return true // keep channel open for async sendResponse
  }
})

// ── On install / startup ──────────────────────────────────────────────────────

/**
 * Restore blocking rules on service-worker startup.
 * Dynamic rules persist across sessions, but this ensures they are
 * consistent with the stored focus state.
 */
async function restoreRulesFromStorage() {
  const { focusActive, blockedSites } = await chrome.storage.local.get([
    'focusActive',
    'blockedSites',
  ])
  await updateBlockingRules(
    focusActive === true,
    Array.isArray(blockedSites) ? blockedSites : []
  )
}

chrome.runtime.onInstalled.addListener(restoreRulesFromStorage)
chrome.runtime.onStartup.addListener(restoreRulesFromStorage)
