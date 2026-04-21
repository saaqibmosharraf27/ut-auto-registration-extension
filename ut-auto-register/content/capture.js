'use strict';

// Runs at document_start — patches fetch + XHR BEFORE page scripts execute.
// Captures POST requests to utdirect.utexas.edu for diagnostic/fallback use.
// Primary registration now uses direct fetch in register.js (no capture needed),
// but this remains useful for debugging and future enhancements.

const _fetch = window.fetch;

window.fetch = async function (...args) {
  const [resource, options] = args;

  // resource may be a string URL or a Request object
  const url    = typeof resource === 'string' ? resource : (resource?.url ?? '');
  const method = (options?.method ?? (resource instanceof Request ? resource.method : 'GET')).toUpperCase();

  if (url.includes('utdirect.utexas.edu') && method === 'POST') {
    // Body may be on options OR on the Request object
    const rawBody = options?.body ?? (resource instanceof Request ? resource.body : undefined);

    let body = '';
    if (rawBody instanceof URLSearchParams)  body = rawBody.toString();
    else if (rawBody instanceof FormData)    body = new URLSearchParams(rawBody).toString();
    else if (typeof rawBody === 'string')    body = rawBody;

    // Headers may be on options OR on the Request object
    const rawHeaders = options?.headers ?? (resource instanceof Request ? resource.headers : null);
    const headers = {};
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((v, k) => { headers[k] = v; });
    } else if (rawHeaders) {
      Object.assign(headers, rawHeaders);
    }

    try {
      chrome.runtime.sendMessage({ type: 'CAPTURE_REQUEST', url, method, headers, body });
    } catch (_) {
      // Extension context invalidated (e.g. reloaded mid-session) — ignore silently
    }
  }

  return _fetch.apply(this, args);
};

// ── XHR fallback — in case page uses XMLHttpRequest instead of fetch ──────────

const _open           = XMLHttpRequest.prototype.open;
const _send           = XMLHttpRequest.prototype.send;
const _setReqHeader   = XMLHttpRequest.prototype.setRequestHeader;

XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._capUrl    = url;
  this._capMethod = method?.toUpperCase();
  this._capHeaders = {};
  return _open.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
  if (this._capHeaders) this._capHeaders[name] = value;
  return _setReqHeader.call(this, name, value);
};

XMLHttpRequest.prototype.send = function (body) {
  if (this._capUrl?.includes('utdirect.utexas.edu') && this._capMethod === 'POST') {
    try {
      chrome.runtime.sendMessage({
        type:    'CAPTURE_XHR',
        url:     this._capUrl,
        method:  'POST',
        headers: this._capHeaders ?? {},
        body:    typeof body === 'string' ? body : '',
      });
    } catch (_) {
      // Extension context invalidated — ignore
    }
  }
  return _send.call(this, body);
};
