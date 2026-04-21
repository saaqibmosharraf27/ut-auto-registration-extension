'use strict';

// MV3 service workers are suspended and revived aggressively.
// Module-level variables are reset on revival — use chrome.storage.session
// for any state that must survive across suspension cycles.
// chrome.storage.session persists for the browser session (cleared on restart).

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'CAPTURE_REQUEST':
    case 'CAPTURE_XHR':
      chrome.storage.session.set({
        capturedRequest: {
          url:     message.url,
          method:  message.method,
          headers: message.headers ?? {},
          body:    message.body    ?? '',
        },
      });
      return; // no response needed

    case 'GET_CAPTURED_REQUEST':
      chrome.storage.session.get(['capturedRequest'], result => {
        sendResponse({ captured: result.capturedRequest ?? null });
      });
      return true; // async — must return true to keep channel open

    default:
      return;
  }
});
