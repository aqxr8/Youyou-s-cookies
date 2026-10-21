/* =========================================================
   Youyou's Cookies - main.js
   Shared helpers + header / nav / theme / status pill
   (hero carousel lives in features.js)
   ========================================================= */

// Delivery window in Morocco time (24h). Change here and everything updates.
window.YOUYOU_HOURS = { open: 15, close: 20 };

// Current time in Morocco, independent of the visitor's device timezone.
// (Uses Intl parts - parsing toLocaleString() output is unreliable on Safari.)
window.getMoroccoTime = function () {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Casablanca",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(new Date());
    const hour = parseInt(parts.find((p) => p.type === "hour").value, 10) % 24;
    const minute = parseInt(parts.find((p) => p.type === "minute").value, 10);
    return { hour, minute };
  } catch (e) {
    const d = new Date();
    return { hour: d.getHours(), minute: d.getMinutes() };
  }
};

// localStorage can throw (private mode / blocked storage) - never crash on it.
window.safeStorage = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
};

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initMobileNav();
  initReveal();
  initYear();
  initOpenStatus();
  setInterval(initOpenStatus, 60 * 1000);
  initFaq();
  initTheme();
  initActiveLink();
  loadBrandLogos();
});

// 1. Header scroll effect
function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// 2. Mobile navigation
function initMobileNav() {
  const navToggle = document.querySelector(".nav-toggle");
  const mainNav = document.querySelector(".main-nav");
  if (!navToggle || !mainNav) return;

  const close = () => {
    mainNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  navToggle.setAttribute("aria-expanded", "false");
  navToggle.addEventListener("click", () => {
    mainNav.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
  });

  mainNav.addEventListener("click", (e) => {
    if (e.target.closest("a") || e.target.classList.contains("nav-close")) close();
  });

  document.addEventListener("click", (e) => {
    if (mainNav.classList.contains("open") && !mainNav.contains(e.target) && !navToggle.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mainNav.classList.contains("open")) {
      close();
      navToggle.focus();
    }
  });
}

// 3. Scroll reveal
function initReveal() {
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }
}

// 4. Copyright year
function initYear() {
  const yearEl = document.querySelector(".year-now");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// 5. Open / Closed status pill (Morocco time)
function initOpenStatus() {
  const pill = document.querySelector("[data-status-pill]");
  if (!pill) return;
  const text = pill.querySelector(".status-text");

  const { open: openH, close: closeH } = window.YOUYOU_HOURS;
  const { hour, minute } = window.getMoroccoTime();
  const mins = hour * 60 + minute;
  const isOpen = mins >= openH * 60 && mins < closeH * 60;

  const fmt = (h) => (h % 12 || 12) + ":00 " + (h < 12 ? "AM" : "PM");

  pill.classList.toggle("is-open", isOpen);
  if (text) text.textContent = isOpen ? "Taking Orders" : "Closed";
  pill.setAttribute(
    "aria-label",
    isOpen ? "We are currently taking orders until " + fmt(closeH) : "We are currently closed"
  );
  pill.title = isOpen
    ? "Open until " + fmt(closeH) + " (Morocco time)"
    : "Opens at " + fmt(openH) + " (Morocco time)";
}

// 6. FAQ accordion
function initFaq() {
  document.querySelectorAll(".faq-q").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      if (!item) return;
      const nowOpen = item.classList.toggle("open");
      button.setAttribute("aria-expanded", String(nowOpen));
    });
  });
}

// 7. Dark mode toggle
function initTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;
  const moon = themeToggle.querySelector(".moon-icon");
  const sun = themeToggle.querySelector(".sun-icon");

  const apply = (theme) => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      if (moon) moon.style.display = "none";
      if (sun) sun.style.display = "inline";
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (moon) moon.style.display = "inline";
      if (sun) sun.style.display = "none";
    }
    loadBrandLogos();
  };

  apply(window.safeStorage.get("youyou_theme") || "dark");

  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    window.safeStorage.set("youyou_theme", next);
    apply(next);
  });
}

// 8. Highlight the active nav link (works with or without ".html")
function initActiveLink() {
  const here = (window.location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.classList.remove("active");
    const href = (link.getAttribute("href") || "").split("#")[0].replace(/\.html$/, "");
    if (href && href === here) link.classList.add("active");
  });
}

// 9. Load only the logo video that is actually visible (saves ~2 MB per page)
function loadBrandLogos() {
  document.querySelectorAll("video.brand-logo").forEach((video) => {
    if (window.getComputedStyle(video).display === "none") return;
    if (video.dataset.ready) return;
    const source = video.querySelector("source[data-src]");
    if (!source) return;
    source.src = source.dataset.src;
    video.dataset.ready = "1";
    video.load();
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  });
}
