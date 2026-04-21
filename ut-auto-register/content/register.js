'use strict';

// Real UT registration endpoint — verified from open-source UT automation projects.
const REGISTRATION_URL = 'https://utdirect.utexas.edu/registration/registration.WBX';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'REGISTER_COURSES') return;

  registerCourses(message.courses)
    .then(result => {
      sendResponse(result);
      // Fetch mode bypasses the page's own form handler, so the tab DOM never updates.
      // Reload after delivering the response so the user sees the new enrollment state.
      if (result.mode === 'fetch') {
        setTimeout(() => window.location.reload(), 300);
      }
    })
    .catch(err => sendResponse({ success: false, error: err.message }));

  return true; // keep channel open for async response
});

// ── Entry point ───────────────────────────────────────────────────────────────

async function registerCourses(courses) {
  // Primary: direct fetch using real UT form params (fast, no DOM dependency)
  const params = extractPageParams();
  if (params) {
    return registerWithFetch(params, courses);
  }
  // Fallback: DOM click automation
  return registerWithDom(courses);
}

// ── Extract form params from current page ─────────────────────────────────────

function extractPageParams() {
  const nonce = document.querySelector('input[name="s_nonce"]')?.value;
  const ccyys = document.querySelector('input[name="s_ccyys"]')?.value;
  if (!nonce || !ccyys) return null;
  return { nonce, ccyys };
}

// ── Primary mode: sequential fetch with nonce refresh ────────────────────────
//
// UT's s_nonce is single-use — each response contains the next nonce.
// We parse every response to extract the next nonce before firing the next request.
// This is faster than DOM automation because it skips the visual render cycle.

async function registerWithFetch(initial, courses) {
  let nonce = initial.nonce;
  const ccyys = initial.ccyys;
  let successCount = 0;
  const errors = [];

  for (const uniqueNum of courses) {
    const body = new URLSearchParams({
      s_ccyys:          ccyys,
      s_nonce:          nonce,
      s_request:        'STADD',
      s_student_eid:    '',
      s_unique_add:     uniqueNum,
      s_unique_drop:    '+',
      s_swap_unique_drop: '+',
      s_swap_unique_add:  '',
    });

    let html;
    try {
      const response = await fetch(REGISTRATION_URL, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:        body.toString(),
        credentials: 'include', // sends EID session cookie — required
      });
      html = await response.text();
    } catch (err) {
      errors.push(`${uniqueNum}: network error (${err.message})`);
      continue;
    }

    // Parse response to extract next nonce and check for errors
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const errorText = doc.querySelector('span.error')?.textContent?.trim();
    if (errorText) {
      errors.push(`${uniqueNum}: ${errorText}`);
    } else {
      successCount++;
    }

    // Refresh nonce from response — it is single-use, new one is in every response
    const nextNonce = doc.querySelector('input[name="s_nonce"]')?.value;
    if (nextNonce) nonce = nextNonce;
  }

  return {
    success:  errors.length === 0,
    count:    successCount,
    error:    errors.length ? errors.join(' | ') : null,
    mode:     'fetch',
  };
}

// ── Fallback mode: DOM click automation ──────────────────────────────────────
//
// Used when s_nonce or s_ccyys are not found in the page (wrong page, not logged in).
// Uses the real UT selectors verified from open-source UT automation projects.

async function registerWithDom(courses) {
  const inputEl   = document.getElementById('s_unique_add')
                 || document.querySelector('input[name="s_unique_add"]');
  const submitBtn = document.querySelector('[name="s_submit"]');

  if (!inputEl || !submitBtn) {
    return {
      success: false,
      error:   'Registration form not found — make sure you are logged in and on utdirect.utexas.edu/registration/registration.WBX',
    };
  }

  let count = 0;
  const errors = [];

  for (const uniqueNum of courses) {
    inputEl.value = uniqueNum;
    inputEl.dispatchEvent(new Event('input',  { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    // IMPORTANT: attach observer BEFORE clicking to avoid missing immediate mutations
    const updatePromise = waitForMessage();
    submitBtn.click();
    await updatePromise;

    // Check for server-side error after DOM updates
    const errorText = document.querySelector('span.error')?.textContent?.trim();
    if (errorText) {
      errors.push(`${uniqueNum}: ${errorText}`);
    } else {
      count++;
    }
  }

  return {
    success: errors.length === 0,
    count,
    error:   errors.length ? errors.join(' | ') : null,
    mode:    'dom',
  };
}

// ── Wait for #n_message to update (real UT result container) ─────────────────

function waitForMessage() {
  return new Promise(resolve => {
    let settled = false;

    const done = () => {
      if (settled) return;
      settled = true;
      observer.disconnect(); // always disconnect before resolving — no orphaned observers
      resolve();
    };

    const target = document.getElementById('n_message')
                || document.querySelector('[id*="message"]')
                || document.body;

    const observer = new MutationObserver(done);
    observer.observe(target, {
      childList:     true,
      subtree:       true,
      characterData: true, // catches text-only mutations in result containers
    });

    setTimeout(done, 5000); // safety valve — always resolves
  });
}
