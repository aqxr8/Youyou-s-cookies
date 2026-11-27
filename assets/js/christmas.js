/* =========================================================
   christmas.js - seasonal Christmas theme (temporary)
   - Switches itself ON at an exact moment (START: 12 Nov 2026, 00:30 Morocco time) and OFF after the last day (TO, until 23:59).
   - Open pages switch on by themselves when START arrives (no reload needed).
   - Change START / TO below.  Test any time with ?christmas=1 - force off with ?christmas=0
   - Header logo: while the theme is ON the Christmas logo (assets/images/logo-christmas.webp) replaces the default logo videos (see christmas.css).
   - Decorations (snow, string lights, ornaments, footer row) are drawn shapes: no emoji, no gradients.
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

    var SVG = {
      bell: '<svg viewBox="0 0 24 28" width="30" height="34" aria-hidden="true"><path d="M12 2a2 2 0 0 1 2 2v1.1A7 7 0 0 1 19 12v5l2 3H3l2-3v-5a7 7 0 0 1 5-6.9V4a2 2 0 0 1 2-2z" fill="#f2b632" stroke="#b9831b" stroke-width="1"/><circle cx="12" cy="23.5" r="2.5" fill="#b9831b"/></svg>',
      tree: '<svg viewBox="0 0 24 30" width="30" height="36" aria-hidden="true"><path d="M12 2l6 8h-3l5 7h-4l5 7H3l5-7H4l5-7H6z" fill="#1f7a3d"/><rect x="10.5" y="24" width="3" height="4" fill="#6b4423"/><circle cx="12" cy="3" r="1.6" fill="#ffd23b"/></svg>',
      gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="18" height="12" rx="1.5" fill="#c8102e"/><rect x="2" y="6" width="20" height="4" rx="1" fill="#e03a52"/><rect x="11" y="6" width="2" height="15" fill="#ffd23b"/><path d="M12 6C9 1 5 4 8 6zM12 6c3-5 7-2 4 0z" fill="#ffd23b"/></svg>',
      flake: '<svg viewBox="0 0 24 24" fill="none" stroke="#7fb4e6" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2M4 9.5l3.2.5.6-3.2M20 14.5l-3.2-.5-.6 3.2M4 14.5l3.2-.5.6 3.2M20 9.5l-3.2.5-.6-3.2"/></svg>'
    };

    /* falling snow: drawn snowflakes and soft dots (see christmas.css) */
    var snow = document.createElement("div");
    snow.id = "xm-snow";
    snow.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 34; i++) {
      var sp = document.createElement("span");
      sp.className = (i % 3 === 2) ? "dot" : "fl";
      sp.style.left = Math.round(Math.random() * 100) + "vw";
      sp.style.setProperty("--size", (9 + Math.round(Math.random() * 15)) + "px");
      sp.style.setProperty("--dur", (9 + Math.round(Math.random() * 12)) + "s");
      sp.style.setProperty("--delay", (-Math.round(Math.random() * 20)) + "s");
      sp.style.setProperty("--drift", (-30 + Math.round(Math.random() * 60)) + "px");
      snow.appendChild(sp);
    }
    document.body.appendChild(snow);

    /* string lights + swinging ornaments on the header */
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
        b.innerHTML = "<i></i><span>" + (side === "left" ? SVG.bell : SVG.tree) + "</span>";
        header.appendChild(b);
      });
    }

    /* footer row of little icons */
    var footer = document.querySelector(".site-footer");
    if (footer) {
      var strip = document.createElement("div");
      strip.className = "xm-strip";
      strip.setAttribute("aria-hidden", "true");
      strip.innerHTML = [SVG.tree, SVG.gift, SVG.flake, SVG.gift, SVG.tree].join("");
      footer.insertBefore(strip, footer.firstChild);
    }

  });
  }
})();
