/* =========================================================
   christmas.js - seasonal Christmas theme (temporary)
   - Switches itself ON for the whole of December (1-31 Dec, Morocco time) and OFF automatically after.
   - Change the dates in FROM / TO below.  Test any day with ?christmas=1 - force off with ?christmas=0
   - The light / dark switch keeps working (a red & white look, and a pine-green night look).
   ========================================================= */
(function () {
  "use strict";

  var FROM = "2026-12-01", TO = "2026-12-31";
  var qs = new URLSearchParams(location.search).get("christmas");
  var today;
  try { today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date()); }
  catch (e) { today = new Date().toISOString().slice(0, 10); }
  var on = qs === "1" || (qs !== "0" && today >= FROM && today <= TO);
  if (!on) return;

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
})();
