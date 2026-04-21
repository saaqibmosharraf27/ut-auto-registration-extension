# UT Auto Register

A Chrome extension that auto-registers UT Austin courses at maximum speed. Enter your 5-digit unique numbers, navigate to the registration page, and click one button — the extension handles everything instantly.

## How It Works

The extension uses two registration strategies, automatically choosing the fastest available:

1. **Fetch mode (primary)** — directly POSTs to UT's registration endpoint using your existing EID session cookie, bypassing the visual render cycle entirely. Handles UT's single-use `s_nonce` by parsing each response to extract the next nonce before firing the next request.
2. **DOM mode (fallback)** — fills and submits the form via direct DOM manipulation if the page params can't be extracted.

## Installation

No build step required.

1. Clone or download this repo
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `ut-auto-register/` folder

## Usage

1. Log in to [utdirect.utexas.edu](https://utdirect.utexas.edu) with your EID
2. Navigate to the registration page
3. Click the extension icon
4. Enter one 5-digit unique number per line
5. Click **Save** to persist your list, then **Register** to submit

The extension registers all courses sequentially as fast as the server allows. Results appear inline in the popup.

## Requirements

- Chrome (Manifest V3)
- Active UT EID session — you must be logged in before clicking Register

## File Structure

```
ut-auto-register/
  manifest.json
  popup/
    popup.html
    popup.js
    popup.css
  content/
    capture.js       # Captures page params at document_start
    register.js      # Drives registration (fetch + DOM fallback)
  background/
    service-worker.js
  styles.css
  icons/
```

## Notes

- Your course list is saved to `chrome.storage.local` — it persists across browser sessions
- The extension only has access to `utdirect.utexas.edu` — no data leaves your browser
- Registration timing depends on UT's server response speed, not the extension
