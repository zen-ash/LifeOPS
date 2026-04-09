# LifeOPS Distraction Blocker — Chrome Extension

Planned for **Phase 12**.

## Purpose
A minimal Chrome extension that blocks distracting websites during Focus Mode sessions in LifeOPS.

## Planned Features
- Block a customizable list of distracting domains
- Sync with LifeOPS: automatically activates when a Pomodoro session starts
- Show a friendly reminder page instead of the blocked site
- Allow-list for trusted sites

## Folder Structure (Phase 12)
```
extension/
  manifest.json         ← Chrome extension manifest v3
  background.js         ← Service worker (blocks requests)
  popup/
    popup.html
    popup.js            ← Toggle on/off, manage blocklist
  blocked.html          ← Page shown when a site is blocked
  icons/
    icon16.png
    icon48.png
    icon128.png
```

## How it will work
1. User starts a Focus session in LifeOPS
2. Extension polls Supabase (or uses a local flag) to detect active sessions
3. `background.js` uses `chrome.declarativeNetRequest` to redirect blocked domains to `blocked.html`
4. When the session ends, blocking is lifted automatically

## Development
Will be built with plain HTML/CSS/JS (no framework) to keep it minimal and reviewable.
