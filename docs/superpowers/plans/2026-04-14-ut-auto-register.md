# UT Auto Register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Extension (MV3) that auto-registers up to 5 UT Austin courses on utdirect.utexas.edu at maximum speed when the registration window opens.

**Architecture:** The popup lets users enter/save course unique numbers. A content script injected on utdirect pages handles registration via two modes: sequential DOM automation (reliable fallback) and parallel fetch replay (turbo mode, <0.2s). A network capture script intercepts the first manual submission to unlock turbo mode automatically.

**Tech Stack:** Vanilla JS (no frameworks), Manifest V3, chrome.storage.local, chrome.runtime messaging, MutationObserver, fetch API

---

## File Map

| File | Responsibility |
|------|---------------|
| `manifest.json` | Extension config, permissions, content script injection |
| `styles.css` | Shared `.hidden` utility |
| `popup/popup.html` | Textarea for unique numbers, Register + Save buttons, status area |
| `popup/popup.css` | Popup-specific styles (UT burnt orange theme) |
| `popup/popup.js` | Load/save courses from storage, send REGISTER_COURSES to content script |
| `content/capture.js` | Patch fetch + XHR at document_start to capture registration requests |
| `content/register.js` | Receive REGISTER_COURSES, run parallel fetch or sequential DOM automation |
| `background/service-worker.js` | Store captured request, answer GET_CAPTURED_REQUEST queries |
| `icons/icon.svg` | Placeholder icon (UT orange) |

---

## Task 1: Project Scaffold + Manifest

**Files:**
- Create: `manifest.json`
- Create: `styles.css`
- Create: `icons/` directory with placeholder

- [ ] **Step 1: Create the extension folder structure**

```
ut-auto-register/
  manifest.json
  styles.css
  popup/
  content/
  background/
  icons/
```

- [ ] **Step 2: Write manifest.json**

```json
{
  "manifest_version": 3,
  "name": "UT Auto Register",
  "version": "1.0",
  "description": "Auto-register UT Austin courses at maximum speed",
  "permissions": ["storage", "activeTab"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": { "48": "icons/icon48.png" }
  },
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["https://utdirect.utexas.edu/*"],
      "js": ["content/capture.js"],
      "run_at": "document_start"
    },
    {
      "matches": ["https://utdirect.utexas.edu/*"],
      "js": ["content/register.js"],
      "run_at": "document_idle"
    }
  ]
}
```

Note: `capture.js` uses `document_start` to patch `fetch`/XHR before page scripts run. `register.js` uses `document_idle` so the DOM is ready when it executes.

- [ ] **Step 3: Write styles.css**

```css
.hidden { display: none !important; }
```

- [ ] **Step 4: Create a placeholder icon**

Create `icons/icon48.png` — any 48×48 PNG. Can use a solid UT orange (#bf5700) square as placeholder until a real icon is made.

- [ ] **Step 5: Load unpacked in Chrome to verify manifest parses**

1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click Load unpacked → select the `ut-auto-register/` folder
4. Expected: extension card appears with no errors
5. If errors shown: fix manifest syntax

---

## Task 2: Popup HTML + CSS

**Files:**
- Create: `popup/popup.html`
- Create: `popup/popup.css`

- [ ] **Step 1: Write popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>UT Auto Register</h1>

    <label for="courseInput">Unique Numbers (one per line)</label>
    <textarea id="courseInput"
              placeholder="12345&#10;67890&#10;11223"
              rows="6"
              spellcheck="false"></textarea>

    <div class="actions">
      <button id="registerBtn" class="btn-primary">Register Now</button>
      <button id="saveBtn"     class="btn-secondary">Save</button>
    </div>

    <div id="status" class="status hidden"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write popup.css**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  width: 280px;
  background: #1a1a2e;
  color: #e0e0e0;
}

.container { padding: 16px; }

h1 {
  font-size: 16px;
  font-weight: 700;
  color: #bf5700;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #888;
  margin-bottom: 6px;
}

textarea {
  width: 100%;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  color: #e0e0e0;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  padding: 8px 10px;
  resize: vertical;
  line-height: 1.6;
}

textarea:focus {
  outline: none;
  border-color: #bf5700;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

button {
  flex: 1;
  padding: 9px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: opacity 0.15s;
}

button:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary  { background: #bf5700; color: #fff; }
.btn-primary:hover:not(:disabled)  { background: #d46200; }
.btn-secondary { background: #2a2a4a; color: #ccc; }
.btn-secondary:hover:not(:disabled) { background: #363660; }

.status {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.status.success { background: #0d2b0d; color: #66bb6a; }
.status.error   { background: #2b0d0d; color: #ef5350; }
.status.info    { background: #0d1b2b; color: #42a5f5; }
```

- [ ] **Step 3: Verify popup renders**

1. Click the extension icon in Chrome
2. Expected: 280px-wide popup with dark theme, textarea, two buttons
3. No console errors in popup DevTools

---

## Task 3: Popup JS (Storage + Messaging)

**Files:**
- Create: `popup/popup.js`

- [ ] **Step 1: Write popup.js**

```js
'use strict';

const courseInput = document.getElementById('courseInput');
const registerBtn = document.getElementById('registerBtn');
const saveBtn     = document.getElementById('saveBtn');
const statusEl    = document.getElementById('status');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCourseList() {
  return courseInput.value
    .split('\n')
    .map(s => s.trim())
    .filter(s => /^\d{5}$/.test(s));
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
}

function saveCourses() {
  chrome.storage.local.set({ courses: getCourseList() });
}

// ── Init: load saved courses ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['courses'], result => {
    if (result.courses?.length) {
      courseInput.value = result.courses.join('\n');
    }
  });
});

// ── Save button ───────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  saveCourses();
  showStatus('Saved!', 'success');
});

// ── Register button ───────────────────────────────────────────────────────────

registerBtn.addEventListener('click', async () => {
  const courses = getCourseList();

  if (courses.length === 0) {
    showStatus('Enter at least one valid 5-digit unique number.', 'error');
    return;
  }

  // Validate we're on the right page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('utdirect.utexas.edu')) {
    showStatus('Navigate to utdirect.utexas.edu first, then click Register.', 'error');
    return;
  }

  saveCourses();
  registerBtn.disabled = true;
  showStatus(`Registering ${courses.length} course(s)…`, 'info');

  chrome.tabs.sendMessage(tab.id, { type: 'REGISTER_COURSES', courses }, response => {
    registerBtn.disabled = false;

    if (chrome.runtime.lastError) {
      showStatus('Content script not ready — refresh the UT page and try again.', 'error');
      return;
    }

    if (response?.success) {
      const mode = response.mode === 'parallel' ? ' (turbo)' : '';
      showStatus(`Done${mode}! Registered ${response.count}/${courses.length} course(s).`, 'success');
    } else {
      showStatus(response?.error ?? 'Registration failed — check the UT page.', 'error');
    }
  });
});
```

- [ ] **Step 2: Verify storage round-trip**

1. Open popup → type `12345` in textarea → click Save
2. Close popup → reopen → confirm `12345` is still there
3. Open DevTools → Application → Storage → Local Storage → confirm `courses: ["12345"]`

---

## Task 4: Network Capture Content Script

**Files:**
- Create: `content/capture.js`

This script runs at `document_start` and patches `window.fetch` and `XMLHttpRequest` to intercept the registration form's AJAX call. Once captured, the service worker stores it so `register.js` can replay it for all courses at once.

- [ ] **Step 1: Write content/capture.js**

```js
'use strict';

// Patch fetch BEFORE page scripts execute (run_at: document_start)
const _fetch = window.fetch;

window.fetch = async function (...args) {
  const [resource, options] = args;
  const url = typeof resource === 'string' ? resource : resource?.url ?? '';

  if (url.includes('utdirect.utexas.edu') && options?.method?.toUpperCase() === 'POST') {
    let body = '';
    if (options.body instanceof URLSearchParams) body = options.body.toString();
    else if (typeof options.body === 'string')   body = options.body;

    const headers = {};
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => { headers[k] = v; });
    } else if (options.headers) {
      Object.assign(headers, options.headers);
    }

    chrome.runtime.sendMessage({ type: 'CAPTURE_REQUEST', url, method: 'POST', headers, body });
  }

  return _fetch.apply(this, args);
};

// XHR fallback — in case the page uses XMLHttpRequest instead of fetch
const _open = XMLHttpRequest.prototype.open;
const _send = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._capUrl    = url;
  this._capMethod = method?.toUpperCase();
  return _open.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.send = function (body) {
  if (this._capUrl?.includes('utdirect.utexas.edu') && this._capMethod === 'POST') {
    chrome.runtime.sendMessage({
      type: 'CAPTURE_XHR',
      url: this._capUrl,
      method: 'POST',
      headers: {},
      body: typeof body === 'string' ? body : '',
    });
  }
  return _send.call(this, body);
};
```

- [ ] **Step 2: Verify capture script loads**

1. Navigate to utdirect.utexas.edu
2. Open DevTools → Sources → Content Scripts
3. Expected: `capture.js` listed under the extension
4. No console errors

---

## Task 5: Service Worker (Request Storage + Relay)

**Files:**
- Create: `background/service-worker.js`

- [ ] **Step 1: Write background/service-worker.js**

```js
'use strict';

let capturedRequest = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'CAPTURE_REQUEST':
    case 'CAPTURE_XHR':
      capturedRequest = {
        url:     message.url,
        method:  message.method,
        headers: message.headers ?? {},
        body:    message.body    ?? '',
      };
      // No response needed
      return;

    case 'GET_CAPTURED_REQUEST':
      sendResponse({ captured: capturedRequest });
      return true; // keep channel open

    default:
      return;
  }
});
```

- [ ] **Step 2: Verify service worker registers**

1. Go to `chrome://extensions/` → click "Service worker" link
2. Expected: DevTools opens for the background script, no errors in console

---

## Task 6: Registration Content Script

**Files:**
- Create: `content/register.js`

This is the core logic. It listens for `REGISTER_COURSES`, tries turbo mode first (parallel fetch using captured request), falls back to sequential DOM automation.

- [ ] **Step 1: Write content/register.js**

```js
'use strict';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'REGISTER_COURSES') return;

  registerCourses(message.courses)
    .then(result  => sendResponse(result))
    .catch(err    => sendResponse({ success: false, error: err.message }));

  return true; // keep message channel open for async response
});

// ── Entry point ───────────────────────────────────────────────────────────────

async function registerCourses(courses) {
  const captured = await getCapturedRequest();
  if (captured?.body) {
    return registerParallel(captured, courses);
  }
  return registerSequential(courses);
}

// ── Turbo mode: parallel fetch ─────────────────────────────────────────────────

async function getCapturedRequest() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_CAPTURED_REQUEST' }, response => {
      resolve(chrome.runtime.lastError ? null : response?.captured);
    });
  });
}

async function registerParallel(captured, courses) {
  // Read fresh CSRF token from page DOM before firing
  const csrf = document.querySelector('input[name="_token"]')?.value
            || document.querySelector('meta[name="csrf-token"]')?.content
            || '';

  const requests = courses.map(uniqueNum => {
    // Swap only the unique number — preserve all other form fields
    let body = captured.body.replace(/unique_no=\d+/i, `unique_no=${uniqueNum}`);
    if (csrf) body = body.replace(/_token=[^&]*/i, `_token=${csrf}`);

    return fetch(captured.url, {
      method:      'POST',
      headers:     { ...captured.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      credentials: 'include', // sends session cookie for EID auth
    }).then(r => ({ uniqueNum, ok: r.ok, status: r.status }));
  });

  const results = await Promise.all(requests);
  const failed  = results.filter(r => !r.ok);

  return {
    success: failed.length === 0,
    count:   results.length - failed.length,
    error:   failed.length ? `Failed: ${failed.map(f => f.uniqueNum).join(', ')}` : null,
    mode:    'parallel',
  };
}

// ── Fallback mode: sequential DOM automation ──────────────────────────────────

async function registerSequential(courses) {
  const inputEl = findInput();
  const formEl  = inputEl?.closest('form');

  if (!inputEl || !formEl) {
    return { success: false, error: 'Registration form not found on page. Verify you are on the correct UT registration page.' };
  }

  let count = 0;
  for (const uniqueNum of courses) {
    fillInput(inputEl, uniqueNum);
    submitForm(formEl);
    await waitForUpdate();
    count++;
  }

  return { success: true, count, mode: 'sequential' };
}

function findInput() {
  // Try known selectors — MUST be verified against live utdirect page
  return document.querySelector('input[name="unique_no"]')
      || document.querySelector('input[name="uniqueNo"]')
      || document.querySelector('#unique_no')
      || document.querySelector('input[maxlength="5"][type="text"]');
}

function fillInput(el, value) {
  el.value = value;
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function submitForm(formEl) {
  formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function waitForUpdate() {
  return new Promise(resolve => {
    const target = document.querySelector('#main_body')
                || document.querySelector('[id*="content"]')
                || document.querySelector('main')
                || document.body;

    const observer = new MutationObserver(() => {
      observer.disconnect();
      resolve();
    });

    observer.observe(target, { childList: true, subtree: true });

    // Safety valve: resolve after 3s even with no DOM mutation
    setTimeout(resolve, 3000);
  });
}
```

- [ ] **Step 2: Reload extension**

```
chrome://extensions/ → click ↺ on the extension card
```

---

## Task 7: End-to-End Testing

Manual test checklist — run through each scenario in order.

- [ ] **Test A: Storage persistence**
  1. Open popup → enter `12345` → click Save
  2. Close → reopen popup → confirm `12345` still shows

- [ ] **Test B: Wrong page guard**
  1. Open any non-UT tab → open popup → click Register
  2. Expected: error "Navigate to utdirect.utexas.edu first"

- [ ] **Test C: Invalid input validation**
  1. Enter `abc` in textarea → click Register
  2. Expected: error "Enter at least one valid 5-digit unique number"

- [ ] **Test D: Content script loads on UT page**
  1. Navigate to utdirect.utexas.edu
  2. DevTools → Sources → Content Scripts
  3. Expected: `capture.js` and `register.js` listed

- [ ] **Test E: Sequential DOM mode (requires UT login)**
  1. Log in to utdirect.utexas.edu → navigate to registration page
  2. Open popup → enter a valid test unique number → click Register
  3. Expected: form fills and submits, status shows "Done"
  4. Note: if `findInput()` returns null, open DevTools on the UT page and run `document.querySelector('input[name="unique_no"]')` to find the correct selector — update `findInput()` accordingly

- [ ] **Test F: Turbo mode (requires UT login)**
  1. Manually submit one course on utdirect.utexas.edu (to trigger capture)
  2. Check service worker console for CAPTURE_REQUEST message
  3. Open popup → enter 2-3 unique numbers → click Register
  4. Expected: status shows "Done (turbo)!" — all courses submitted in parallel

---

## Task 8: Selector Verification (Live Page)

**Critical:** DOM selectors in `register.js` are guesses until verified against the live utdirect page.

- [ ] **Step 1: Navigate to the registration page on utdirect.utexas.edu**

- [ ] **Step 2: Open DevTools Console and run**

```js
// Find the unique number input
document.querySelectorAll('input[type="text"]').forEach((el, i) =>
  console.log(i, el.name, el.id, el.maxLength, el.placeholder)
);
```

- [ ] **Step 3: Identify the correct input and update findInput() in register.js**

Replace the `findInput()` body with the exact selector found, e.g.:
```js
function findInput() {
  return document.querySelector('input[name="THE_ACTUAL_NAME"]');
}
```

- [ ] **Step 4: Check what changes after a submission**

```js
// Run this, submit a course manually, then check what mutated
const observer = new MutationObserver(records =>
  records.forEach(r => console.log('mutated:', r.target.id || r.target.className))
);
observer.observe(document.body, { childList: true, subtree: true });
```

- [ ] **Step 5: Update waitForUpdate() target selector if needed**

If `#main_body` doesn't exist, replace with the element that actually changes.

- [ ] **Step 6: Reload extension and re-run Test E + F**

---
