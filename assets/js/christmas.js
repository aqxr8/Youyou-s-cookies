/* =========================================================
   christmas.js - seasonal Christmas theme (temporary)
   - Switches itself ON at an exact moment (START: 12 Nov 2026, 00:30 Morocco time) and OFF after the last day (TO, until 23:59).
   - Open pages switch on by themselves when START arrives (no reload needed).
   - Change START / TO below.  Test any time with ?christmas=1 - force off with ?christmas=0
   - Header logo: while the theme is ON the Christmas logo (assets/images/logo-christmas.webp) replaces the default logo videos (see christmas.css).
   - The light / dark switch keeps working (a red & white look, and a pine-green night look).
   ========================================================= */
(function () {
  "use strict";

  // START is an exact moment. Morocco is UTC+1 all year except Ramadan, so +01:00 is right for Nov-Dec 2026.
  var START = "2026-11-12T00:30:00+01:00", TO = "2026-12-31";   // TO = last day it is shown (until 23:59 Morocco time)
  var startMs = Date.parse(START);
  var qs = new URLSearchParams(location.search).get("christmas");
  var today;
  try { today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date()); }
  catch (e) { today = new Date().toISOString().slice(0, 10); }
  var on = qs === "1" || (qs !== "0" && Date.now() >= startMs && today <= TO);
  var wait = startMs - Date.now();

  if (on) activate();
  else if (qs !== "0" && wait > 0 && wait < 2147483000 && today <= TO) setTimeout(activate, wait + 250);   // page already open at 00:30 -> switch on live

  function activate() {
  if (document.documentElement.hasAttribute("data-christmas")) return;
  var root = document.documentElement;
  root.setAttribute("data-christmas", "");

  var f = document.createElement("link");
  f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap";
  document.head.appendChild(f);

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn();
  }

  ready(function () {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#b3122a");

    /* falling snow */
    var snow = document.createElement("div");
    snow.id = "xm-snow";
    snow.setAttribute("aria-hidden", "true");
    var flakes = ["❄", "❅", "❆", "•", "❄"];
    for (var i = 0; i < 34; i++) {
      var s = document.createElement("span");
      s.textContent = flakes[i % flakes.length];
      s.style.left = Math.round(Math.random() * 100) + "vw";
      s.style.setProperty("--size", (8 + Math.round(Math.random() * 16)) + "px");
      s.style.setProperty("--dur", (9 + Math.round(Math.random() * 12)) + "s");
      s.style.setProperty("--delay", (-Math.round(Math.random() * 20)) + "s");
      s.style.setProperty("--drift", (-30 + Math.round(Math.random() * 60)) + "px");
      snow.appendChild(s);
    }
    document.body.appendChild(snow);

    /* string lights + swinging bells under the header */
    var header = document.querySelector(".site-header");
    if (header) {
      var lights = document.createElement("div");
      lights.className = "xm-lights";
      lights.setAttribute("aria-hidden", "true");
      lights.innerHTML = '<i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i>';
      header.appendChild(lights);

      ["left", "right"].forEach(function (side) {
        var b = document.createElement("div");
        b.className = "xm-bell xm-bell-" + side;
        b.setAttribute("aria-hidden", "true");
        b.innerHTML = '<i></i><span>' + (side === "left" ? "🔔" : "🎄") + "</span>";
        header.appendChild(b);
      });
    }

    /* ticker message */
    var track = document.querySelector(".ticker-track");
    if (track) {
      var li = document.createElement("li");
      li.innerHTML = 'Merry Christmas! Warm cookies for cozy nights 🎄<span class="ticker-sep" aria-hidden="true">✦</span>';
      track.insertBefore(li, track.firstChild);
    }

    /* footer strip */
    var footer = document.querySelector(".site-footer");
    if (footer) {
      var strip = document.createElement("div");
      strip.className = "xm-strip";
      strip.setAttribute("aria-hidden", "true");
      strip.textContent = "🎄 ⛄ 🎁 ❄️ 🎅 🎁 ⛄ 🎄";
      footer.insertBefore(strip, footer.firstChild);
    }
  });
  }
})();
