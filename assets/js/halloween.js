/* =========================================================
   halloween.js - seasonal Halloween theme (temporary)
   - Switches itself ON only from 25 Oct to 31 Oct 2026 (Morocco time) and OFF automatically after.
   - Test any day with   ?halloween=1   - force it off with   ?halloween=0
   - To remove it for good: delete the 3 Halloween lines in each page <head> (or deploy v8.1.1 again).
   ========================================================= */
(function () {
  "use strict";

  var FROM = "2026-10-25", TO = "2026-10-31";
  var qs = new URLSearchParams(location.search).get("halloween");
  var today;
  try { today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date()); }
  catch (e) { today = new Date().toISOString().slice(0, 10); }
  var on = qs === "1" || (qs !== "0" && today >= FROM && today <= TO);
  if (!on) return;

  var root = document.documentElement;
  root.setAttribute("data-halloween", "");

  /* The theme is dark. Force it WITHOUT touching the customer's saved choice, so tomorrow it returns to normal. */
  function forceDark() { if (root.getAttribute("data-theme") !== "dark") root.setAttribute("data-theme", "dark"); }
  forceDark();
  new MutationObserver(forceDark).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* spooky display font */
  var f = document.createElement("link");
  f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Creepster&display=swap";
  document.head.appendChild(f);

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn();
  }

  var WEB = '<svg viewBox="0 0 120 120" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">' +
    '<path d="M0 0 L120 0 M0 0 L0 120 M0 0 L105 70 M0 0 L70 105 M0 0 L118 28 M0 0 L28 118"/>' +
    '<path d="M18 0 Q14 14 0 18 M38 0 Q30 30 0 38 M60 0 Q48 48 0 60 M84 0 Q66 66 0 84 M110 0 Q86 86 0 110"/></g></svg>';

  ready(function () {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#140b1f");

    /* flying bats */
    var bats = document.createElement("div");
    bats.id = "hw-bats";
    bats.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 7; i++) {
      var b = document.createElement("span");
      b.textContent = "🦇";
      b.style.setProperty("--y", (8 + Math.round(Math.random() * 55)) + "vh");
      b.style.setProperty("--dur", (14 + Math.round(Math.random() * 14)) + "s");
      b.style.setProperty("--delay", (-Math.round(Math.random() * 20)) + "s");
      b.style.setProperty("--size", (18 + Math.round(Math.random() * 16)) + "px");
      bats.appendChild(b);
    }
    document.body.appendChild(bats);

    /* cobwebs in the top corners of the page content */
    var host = document.querySelector("main section, .hero, main") || document.body;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    ["left", "right"].forEach(function (side) {
      var w = document.createElement("div");
      w.className = "hw-web hw-web-" + side;
      w.setAttribute("aria-hidden", "true");
      w.innerHTML = WEB;
      host.appendChild(w);
    });

    /* spider hanging from the header */
    var header = document.querySelector(".site-header");
    if (header) {
      var s = document.createElement("div");
      s.className = "hw-spider";
      s.setAttribute("aria-hidden", "true");
      s.innerHTML = '<i></i><span>🕷️</span>';
      header.appendChild(s);
    }

    /* ticker message */
    var track = document.querySelector(".ticker-track");
    if (track) {
      var li = document.createElement("li");
      li.innerHTML = 'Happy Halloween! Spooky-good cookies tonight 🎃<span class="ticker-sep" aria-hidden="true">✦</span>';
      track.insertBefore(li, track.firstChild);
    }

    /* footer strip */
    var footer = document.querySelector(".site-footer");
    if (footer) {
      var strip = document.createElement("div");
      strip.className = "hw-strip";
      strip.setAttribute("aria-hidden", "true");
      strip.textContent = "🎃 👻 🦇 🕸️ 🎃 🕷️ 👻 🦇 🎃";
      footer.insertBefore(strip, footer.firstChild);
    }
  });
})();
