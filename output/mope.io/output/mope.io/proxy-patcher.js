/**
 * WebSocket proxy patcher for mope.io archive.
 * Intercepts WebSocket connections to localhost game servers and
 * redirects them through the bun server's WebSocket proxy (/ws/:port).
 * This allows the game to work when accessed from a remote URL.
 *
 * Note: Only handles WebSocket interception. XHR/fetch/account server
 * API proxying is handled by auth-override.js.
 */
(function() {
  var OriginalWS = window.WebSocket;
  if (!OriginalWS) return;

  window.WebSocket = function(url, protocols) {
    var targetUrl = url;

    if (typeof url === 'string' || url instanceof String) {
      var hostname = '', port = '8080', pathname = '/', query = '';
      var parsed = null;

      // Try standard URL parsing first
      try {
        parsed = new URL(url);
        hostname = parsed.hostname;
        port = parsed.port || '8080';
        pathname = parsed.pathname;
        query = parsed.search;
      } catch(e) {}

      // If standard parsing failed, try regex-based extraction for "hostname:port" format
      if (!hostname) {
        var match = url.match(/^(localhost|127\.0\.0\.1)(?::(\d+))?(\/[^?]*)?(?:\?(.*))?$/i);
        if (match) {
          hostname = match[1];
          port = match[2] || '8080';
          pathname = match[3] || '/';
          query = match[4] ? '?' + match[4] : '';
        }
      }

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        var scheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        var wsHost = (typeof window.__WS_PROXY_HOST !== 'undefined') ? window.__WS_PROXY_HOST : window.location.host;
        var difficulty = (function() {
          try { return localStorage.getItem('difficulty') || 'normal'; } catch(e) { return 'normal'; }
        })();
        if (query.indexOf('difficulty=') === -1) {
          query = (query ? query + '&' : '?') + 'difficulty=' + difficulty;
        }
        targetUrl = scheme + wsHost + '/ws/' + port + pathname + query;
      }
    }

    return new OriginalWS(targetUrl, protocols);
  };

  window.WebSocket.prototype = OriginalWS.prototype;
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;
  window.WebSocket.prototype.CONNECTING = 0;
  window.WebSocket.prototype.OPEN = 1;
  window.WebSocket.prototype.CLOSING = 2;
  window.WebSocket.prototype.CLOSED = 3;
})();