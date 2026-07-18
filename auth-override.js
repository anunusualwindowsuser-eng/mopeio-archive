/**
 * auth-override.js
 * Replaces social login (Google/Facebook/Apple/Discord) with email/password authentication.
 * Handles everything client-side without needing the real account server.
 * Gives emerytillberg0@gmail.com infinite coins/gems + dev mode access.
 *
 * The email/password form is already in index.html (inside notLoggedInDiv).
 * This script wires up the handlers and intercepts account server calls.
 */
(function () {
  "use strict";

  const DEV_EMAIL = "emerytillberg0@gmail.com";

  // ── Redirect Blocker ────────────────────────────────────────────────
  // Prevents the game client from redirecting to about:blank or app stores
  (function() {
    var _blockedPrefixes = ['about:blank', 'itunes.apple.com', 'play.google.com'];

    // 1) Intercept location.href assignments via Location.prototype
    try {
      var _locProto = window.Location && window.Location.prototype;
      if (!_locProto) { try { _locProto = Object.getPrototypeOf(window.location); } catch(e) {} }
      if (_locProto) {
        var _hrefDesc = Object.getOwnPropertyDescriptor(_locProto, 'href');
        if (_hrefDesc && _hrefDesc.configurable) {
          Object.defineProperty(_locProto, 'href', {
            set: function(v) {
              if (v && typeof v === 'string') {
                for (var i = 0; i < _blockedPrefixes.length; i++) {
                  if (v.indexOf(_blockedPrefixes[i]) !== -1) {
                    console.log('[AuthOverride] Blocked location.href set to:', v);
                    return;
                  }
                }
              }
              return _hrefDesc.set.call(this, v);
            },
            get: function() { return _hrefDesc.get.call(this); },
            configurable: true
          });
        }
      }
    } catch(e) { console.log('[AuthOverride] Location.prototype patch failed:', e); }

    // 2) Fallback: poll for unwanted redirects every 200ms for 30 seconds
    var _origUrl = window.location.href;
    var _redirectWatch = setInterval(function() {
      var cur = window.location.href;
      for (var i = 0; i < _blockedPrefixes.length; i++) {
        if (cur.indexOf(_blockedPrefixes[i]) !== -1) {
          console.log('[AuthOverride] Detected redirect to', cur, '- going back');
          window.location.replace(_origUrl);
          clearInterval(_redirectWatch);
          return;
        }
      }
    }, 200);
    setTimeout(function() { clearInterval(_redirectWatch); }, 30000);
  })();

  // ── Utility ─────────────────────────────────────────────────────────
  function getUsers() {
    try { return JSON.parse(localStorage.getItem("auth_users") || "{}"); } catch (_) { return {}; }
  }
  function saveUsers(u) { localStorage.setItem("auth_users", JSON.stringify(u)); }

  function genUserId(email) { return btoa(email).replace(/=/g, ""); }

  function loginUser(email, name) {
    const userId = genUserId(email);
    const token = "local_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    localStorage.setItem("login_userId", userId);
    localStorage.setItem("login_passwordToken", token);
    localStorage.setItem("login_name", name || email);
    localStorage.setItem("login_profilePicURL", "");
    localStorage.setItem("login_socialNetworkName", "email");
    if (email === DEV_EMAIL) localStorage.setItem("isDevUser", "true");
    return { userId, token };
  }

  function isLoggedIn() { return localStorage.getItem("login_userId") !== null; }

  function logoutUser() {
    ["login_userId","login_passwordToken","login_name","login_profilePicURL",
     "login_socialNetworkName","isDevUser"].forEach(function(k){localStorage.removeItem(k);});
  }

  // ── Intercept account-server AJAX calls ─────────────────────────────
  function setupAjaxInterceptor() {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      this._requestUrl = typeof url === "string" ? url : (url ? url.toString() : "");
      return origOpen.apply(this, arguments);
    };

    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(data) {
      var url = this._requestUrl || "";
      var self = this;
      var isDev = localStorage.getItem("isDevUser") === "true" || localStorage.getItem("login_name") === DEV_EMAIL;

      if (url.indexOf("playerSettings") !== -1 || url.indexOf("getCoins") !== -1 ||
          url.indexOf("/auth/@me") !== -1 || url.indexOf("resetAccount") !== -1) {
        Object.defineProperty(self, "readyState", { get: function() { return 4; } });
        Object.defineProperty(self, "status", { get: function() { return 200; } });
        Object.defineProperty(self, "responseText", {
          get: function() {
            return JSON.stringify({ success: true, coins: isDev ? 999999999 : 0, gems: isDev ? 999999999 : 0 });
          }
        });
        if (typeof self.onreadystatechange === "function") self.onreadystatechange();
        if (typeof self.onload === "function") self.onload();
        return;
      }

      if (url.indexOf("/servers/get") !== -1) {
        var servers = (typeof $config !== "undefined" && $config.gameServers) || [];
        // Build proxied server URLs using the current page's hostname
        var host = (typeof window.__WS_PROXY_HOST !== 'undefined') ? window.__WS_PROXY_HOST : window.location.host;
        var wsScheme = window.location.protocol === "https:" ? "wss://" : "ws://";
        // Map each server port to a proxied WebSocket URL through the static server
        var portIndex = 8080;
        var mappedServers = servers.map(function(s) {
          var entry = {
            id: s.id,
            name: s.name,
            url: wsScheme + host + "/ws/" + portIndex,
            region: s.region,
            gm: s.gm || 0,
            maxPlayers: s.maxPlayers || 2000,
          };
          portIndex++;
          return entry;
        });
        Object.defineProperty(self, "readyState", { get: function() { return 4; } });
        Object.defineProperty(self, "status", { get: function() { return 200; } });
        Object.defineProperty(self, "responseText", {
          get: function() {
            return JSON.stringify(mappedServers.map(function(s) {
              return { id: s.id, name: s.name, url: s.url, playersCount: Math.floor(Math.random() * 500) + 50, maxPlayers: s.maxPlayers || 2000 };
            }));
          }
        });
        if (typeof self.onreadystatechange === "function") self.onreadystatechange();
        if (typeof self.onload === "function") self.onload();
        try { self.dispatchEvent(new Event("readystatechange")); } catch(e) {}
        try { self.dispatchEvent(new Event("load")); } catch(e) {}
        return;
      }

      return origSend.apply(this, arguments);
    };

    // Also intercept fetch
    var origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function(input, init) {
        var url = typeof input === "string" ? input : (input && input.url ? input.url : "");
        var isDev = localStorage.getItem("isDevUser") === "true" || localStorage.getItem("login_name") === DEV_EMAIL;
        if (url.indexOf("/auth/@me") !== -1 || url.indexOf("playerSettings") !== -1 ||
            url.indexOf("resetAccount") !== -1 || url.indexOf("getCoins") !== -1) {
          return Promise.resolve(new Response(JSON.stringify({
            success: true, coins: isDev ? 999999999 : 0, gems: isDev ? 999999999 : 0
          }), { status: 200, headers: { "Content-Type": "application/json" } }));
        }
        if (url.indexOf("/servers/get") !== -1) {
          var servers = (typeof $config !== "undefined" && $config.gameServers) || [];
          var host = (typeof window.__WS_PROXY_HOST !== 'undefined') ? window.__WS_PROXY_HOST : window.location.host;
          var wsScheme = window.location.protocol === "https:" ? "wss://" : "ws://";
          var portIndex = 8080;
          var mappedServers = servers.map(function(s) {
            var entry = {
              id: s.id,
              name: s.name,
              url: wsScheme + host + "/ws/" + portIndex,
              region: s.region,
              gm: s.gm || 0,
              maxPlayers: s.maxPlayers || 2000,
            };
            portIndex++;
            return entry;
          });
          return Promise.resolve(new Response(JSON.stringify(mappedServers.map(function(s) {
            return { id: s.id, name: s.name, url: s.url, playersCount: Math.floor(Math.random() * 500) + 50, maxPlayers: s.maxPlayers || 2000 };
          })), { status: 200, headers: { "Content-Type": "application/json" } }));
        }
        return origFetch.call(window, input, init);
      };
    }
  }

  // ── Show logged-in UI ─────────────────────────────────────────────
  function showLoggedInUI(email) {
    var loggedInDiv = document.getElementById("onloggedInDiv");
    var notLoggedDiv = document.getElementById("notLoggedInDiv");
    var nameTxt = document.getElementById("loggedInNameTxt");
    var userImg = document.getElementById("loggedInUserImg");

    if (loggedInDiv) loggedInDiv.style.display = "block";
    if (notLoggedDiv) notLoggedDiv.style.display = "none";
    if (nameTxt) nameTxt.innerHTML = email;
    if (userImg) userImg.src = "";
  }

  function showLoggedOutUI() {
    var loggedInDiv = document.getElementById("onloggedInDiv");
    var notLoggedDiv = document.getElementById("notLoggedInDiv");

    if (loggedInDiv) loggedInDiv.style.display = "none";
    if (notLoggedDiv) notLoggedDiv.style.display = "block";
  }

  // ── Wire up login/register buttons ─────────────────────────────────
  function wireAuth() {
    var loginBtn = document.getElementById("emailLoginBtn");
    var registerBtn = document.getElementById("emailRegisterBtn");
    if (!loginBtn || !registerBtn) return;

    // Login handler
    loginBtn.onclick = function() {
      var email = document.getElementById("authEmail").value.trim();
      var pwd = document.getElementById("authPassword").value;
      var msg = document.getElementById("authMessage");
      if (!email || !pwd) { msg.textContent = "Enter email and password"; return; }

      var users = getUsers();
      var user = users[email];
      if (!user) { msg.textContent = "Email not found. Register first."; return; }
      if (user.password !== pwd) { msg.textContent = "Incorrect password"; return; }

      loginUser(email, user.name);
      msg.textContent = "Logged in!";
      msg.style.color = "#4CAF50";
      showLoggedInUI(email);
      if (email === DEV_EMAIL || localStorage.getItem("isDevUser")) enableDevFeatures();
    };

    // Register handler
    registerBtn.onclick = function() {
      var email = document.getElementById("authEmail").value.trim();
      var pwd = document.getElementById("authPassword").value;
      var msg = document.getElementById("authMessage");
      if (!email || !pwd) { msg.textContent = "Enter email and password"; return; }
      if (pwd.length < 4) { msg.textContent = "Password must be 4+ characters"; return; }

      var users = getUsers();
      if (users[email]) { msg.textContent = "Email already registered"; return; }
      users[email] = { password: pwd, name: email, created: Date.now() };
      saveUsers(users);
      loginUser(email, email);
      msg.textContent = "Registered!";
      msg.style.color = "#4CAF50";
      showLoggedInUI(email);
      if (email === DEV_EMAIL || localStorage.getItem("isDevUser")) enableDevFeatures();
    };
  }

  // ── Wire up logout button ──────────────────────────────────────────
  function wireLogout() {
    var logoutBtn = document.getElementById("btnLogout2");
    if (!logoutBtn) return;
    logoutBtn.onclick = function() {
      logoutUser();
      showLoggedOutUI();
    };
  }

  // ── Dev mode features ──────────────────────────────────────────────
  function enableDevFeatures() {
    window.__isDevUser = true;
    window.__infiniteCoins = true;

    // Override coin/gem display
    setInterval(function() {
      var coinsEl = document.getElementById("loginCoins");
      var gemsEl = document.getElementById("loginGems");
      if (coinsEl) coinsEl.textContent = "999,999,999";
      if (gemsEl) gemsEl.textContent = "999,999,999";
    }, 300);

    // Patch flag_isDevMode on game objects
    setInterval(function() {
      if (typeof window.player !== "undefined" && window.player && !window.player.__devPatched) {
        try {
          Object.defineProperty(window.player, "flag_isDevMode", {
            get: function() { return true; }, set: function() {}, configurable: true, enumerable: true
          });
          window.player.__devPatched = true;
        } catch(_) {}
      }
    }, 500);
  }

  // ── Initialize ─────────────────────────────────────────────────────
  // Setup AJAX interceptors immediately before client.js loads
  setupAjaxInterceptor();

  function init() {
    // $config is pre-defined with correct proxy URLs - no patching needed

    // Check login state from localStorage
    var email = localStorage.getItem("login_name");
    if (email && isLoggedIn()) {
      showLoggedInUI(email);
      if (email === DEV_EMAIL || localStorage.getItem("isDevUser")) {
        setTimeout(enableDevFeatures, 2000);
      }
    }

    // Wire up buttons after DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        wireAuth();
        wireLogout();
      });
    } else {
      wireAuth();
      wireLogout();
    }

    // Retry wiring after client.js loads (it may replace elements)
    setTimeout(function() { wireAuth(); wireLogout(); }, 2000);
    setTimeout(function() { wireAuth(); wireLogout(); }, 4000);
  }

  // $config is pre-defined before this script runs, so init immediately
  init();
})();