# CLAUDE.md — UT Auto Register

## What This Is

A Chrome Extension (Manifest V3) that automatically inputs UT Austin course unique numbers into utdirect.utexas.edu at maximum speed. The user pre-loads a list of 5-digit unique numbers, opens the registration page, and clicks one button — the extension fills and submits everything instantly.

## Loading / Testing the Extension

No build step. Load unpacked directly in Chrome:

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `ut-auto-register/` folder
4. After any JS/HTML/CSS change, click the **↺ refresh** icon on the extension card

To inspect the popup: right-click the extension icon → **Inspect popup**.
To inspect the content script: Open DevTools on the registration page → Sources → Content scripts.
To inspect the service worker: `chrome://extensions/` → click **Service worker** link.

## Architecture

Three entry points communicating via `chrome.runtime.sendMessage`:

- **`popup/popup.js`** — UI for entering unique numbers and triggering registration. Saves/loads course lists from `chrome.storage.local`. Sends `REGISTER_COURSES` message to the content script via `chrome.tabs.sendMessage`.
- **`content/content.js`** — Injected on utdirect.utexas.edu registration pages. Receives the list of unique numbers and drives DOM interactions at maximum speed.
- **`background/service-worker.js`** — Handles any async coordination or tab management if needed.

## Target Page

`https://utdirect.utexas.edu/registration/` (and subpaths)

The user must already be logged in via UT EID before the extension acts. The content script should detect login state before proceeding.

## Storage Schema

```js
// chrome.storage.local
{
  courses: ["12345", "67890", "11223"],  // Array of 5-digit unique number strings
  lastUsed: "2026-04-14"                  // ISO date of last registration attempt
}
```

## Speed Principles (Critical)

Speed is the core feature. Every interaction must be as fast as the browser allows:

- **No `setTimeout` padding** — interact with elements immediately when ready
- **Direct DOM manipulation** — set `.value` directly, don't simulate typing
- **Always dispatch events** — after setting `.value`, dispatch `new Event('input', { bubbles: true })` and `new Event('change', { bubbles: true })`
- **Use `MutationObserver`** if waiting for dynamic elements — never `setInterval`
- **Batch operations** — fill all fields in a single synchronous loop before submitting

## Key Constraints

- The service worker must `return true` from `onMessage` listeners to keep channels open for async responses.
- Permissions: `storage`, `activeTab`, `scripting` — do not add broad host permissions.
- Content script declared in `manifest.json` with `matches: ["https://utdirect.utexas.edu/*"]`
- No frameworks, no bundler, no npm — vanilla JS only.
- `'use strict'` at top of all JS files.
- UI visibility toggled via `classList.add/remove('hidden')` — `.hidden` = `display: none !important`

## Coding Conventions

- Vanilla JS only — no frameworks, no bundler, no npm
- `'use strict'` at top of all JS files
- DOM refs declared as `const` at top of each file, grouped by section
- Error states shown inline in popup, never `alert()`
- Console logs only during development — strip before shipping

## File Structure

```
ut-auto-register/
  manifest.json
  popup/
    popup.html
    popup.js
    popup.css
  content/
    content.js
  background/
    service-worker.js
  styles.css          # Shared base styles
  icons/
    icon16.png
    icon48.png
    icon128.png
```
