# LifeOPS Distraction Blocker — Chrome Extension

**Phase 8** — Manifest V3 Chrome extension that blocks distracting websites during Focus Mode.

## File Structure

```
extension/
├── manifest.json        ← Manifest V3 config
├── background.js        ← Service worker: manages declarativeNetRequest rules
├── blocked.html         ← Page shown when a blocked site is visited
├── popup/
│   ├── popup.html       ← Extension popup UI
│   └── popup.js        ← Popup logic: toggle focus, manage site list
└── icons/
    ├── icon16.svg
    ├── icon48.svg
    └── icon128.svg
```

## How It Works

1. **User adds sites** (e.g. `youtube.com`, `instagram.com`) via the popup
2. **User toggles Focus Mode on** via the toggle switch in the popup
3. **Service worker** (`background.js`) creates `declarativeNetRequest` dynamic rules — one per domain — that redirect matching `main_frame` requests to `blocked.html`
4. **User visits a blocked site** → sees the "You're in Focus Mode" page instead
5. **User toggles Focus Mode off** → all dynamic rules are removed; sites load normally

State is persisted in `chrome.storage.local`. Dynamic rules are restored on browser startup via `chrome.runtime.onStartup`.

## Why Manual Toggle (not Supabase sync)

Supabase sync would require bundling the Supabase anon key inside the extension — a security smell even for a public key, and it creates fragile coupling between the extension and the app. The manual toggle is simpler, more reliable, and puts the user in control.

## Loading as Unpacked Extension (Development)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository
5. The ⚡ icon will appear in your Chrome toolbar

To reload after code changes: click the refresh icon on the extension card in `chrome://extensions`.

## Permissions Used

| Permission | Reason |
|---|---|
| `declarativeNetRequest` | Create/remove URL-blocking rules |
| `storage` | Persist blocked-sites list and focus state |
| `host_permissions: <all_urls>` | Apply rules to any domain the user adds |

## Icon Note

Icons are SVG files. Chrome supports SVG for `action.default_icon` in development.
For a Chrome Web Store submission, convert to PNG using any SVG→PNG tool.

## Known MVP Limitations

- Manual toggle only (no automatic sync with the LifeOPS app's focus sessions)
- No whitelist / allow-list for specific paths
- No schedule/timer (blocking stays until manually turned off)
- Domain matching uses `||domain^` pattern (matches domain + subdomains, not path-specific)
