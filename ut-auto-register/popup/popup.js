'use strict';

const courseInput = document.getElementById('courseInput');
const registerBtn = document.getElementById('registerBtn');
const saveBtn     = document.getElementById('saveBtn');
const statusEl    = document.getElementById('status');

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Init: load saved courses on popup open ────────────────────────────────────

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
