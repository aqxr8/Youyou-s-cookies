/* =========================================================
   pwa.js - makes the site behave like an app on phones
   - registers the service worker (sw.js)
   - shows a small "Install app" bar on phones (Android: real install button, iPhone: how-to)
   ========================================================= */
(function () {
  "use strict";

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function (e) { console.warn("Service worker failed:", e); });
    });
  }

  var KEY = "youyou_install_dismissed";
  var DAYS = 14;
  var deferred = null;

  function standalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }
  function dismissedRecently() {
    try { var t = parseInt(localStorage.getItem(KEY) || "0", 10); return t && Date.now() - t < DAYS * 864e5; } catch (e) { return false; }
  }
  function dismiss() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ }
    var b = document.getElementById("install-bar");
    if (b) b.remove();
  }
  function isPhone() { return window.matchMedia && window.matchMedia("(max-width: 860px)").matches; }
  function isIOS() {
    var ua = navigator.userAgent || "";
    return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function showBar(mode) {
    if (document.getElementById("install-bar") || standalone() || dismissedRecently() || !isPhone()) return;
    var bar = document.createElement("div");
    bar.id = "install-bar";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Install app");
    bar.innerHTML =
      '<img src="assets/icons/icon-192.png" alt="" width="44" height="44">' +
      '<div class="ib-text"><strong>Install the app</strong>' +
      (mode === "ios"
        ? '<span>Tap Share, then Add to Home Screen.</span>'
        : '<span>Order faster from your home screen.</span>') + "</div>" +
      (mode === "ios" ? "" : '<button type="button" class="ib-install">Install</button>') +
      '<button type="button" class="ib-close" aria-label="Close">&times;</button>';
    document.body.appendChild(bar);
    bar.querySelector(".ib-close").addEventListener("click", dismiss);
    var inst = bar.querySelector(".ib-install");
    if (inst) inst.addEventListener("click", function () {
      if (!deferred) return dismiss();
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; var b = document.getElementById("install-bar"); if (b) b.remove(); });
    });
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    setTimeout(function () { showBar("android"); }, 4000);
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    var b = document.getElementById("install-bar"); if (b) b.remove();
  });

  if (isIOS() && !standalone()) {
    window.addEventListener("load", function () { setTimeout(function () { showBar("ios"); }, 5000); });
  }
})();
