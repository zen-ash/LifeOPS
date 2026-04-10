// Show the blocked domain if passed as a query parameter
const params = new URLSearchParams(location.search)
const site = params.get('site')
if (site) {
  document.getElementById('blocked-site').textContent = site
  document.title = `${site} blocked — LifeOPS Focus Mode`
}

// Back button — close tab if there's no history to go back to
document.getElementById('back-btn').addEventListener('click', () => {
  if (window.history.length > 1) {
    history.back()
  } else {
    // No history: try to close the tab, fall back to blank page
    window.close()
    // window.close() may be ignored if the tab wasn't opened by script
    location.href = 'about:blank'
  }
})
