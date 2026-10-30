/* =========================================================
   Youyou's Cookies - main.js
   Header / Navigation / Theme / Status Pill / Mobile Drawer
   ========================================================= */

// Delivery window in Morocco time (24h). All week from 15:00 to 20:00.
window.YOUYOU_HOURS = { open: 15, close: 20 };

// Current time in Morocco, independent of visitor device timezone.
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

// --- GLOBAL SHOW / HIDE PASSWORD TOGGLE ---
document.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest(".toggle-password-btn");
  if (!toggleBtn) return;
  const targetId = toggleBtn.getAttribute("data-target");
  const input = document.getElementById(targetId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
    `;
    toggleBtn.setAttribute("aria-label", "Hide password");
  } else {
    input.type = "password";
    toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
    `;
    toggleBtn.setAttribute("aria-label", "Show password");
  }
});

function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function initMobileNav() {
  const navToggle = document.getElementById("nav-toggle") || document.querySelector(".nav-toggle");
  const mainNav = document.getElementById("main-nav") || document.querySelector(".main-nav");
  const closeBtn = document.getElementById("nav-close") || document.querySelector(".nav-close");
  let backdrop = document.getElementById("nav-overlay");

  if (!navToggle || !mainNav) return;

  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "nav-overlay";
    document.body.appendChild(backdrop);
  }

  const open = () => {
    mainNav.classList.add("open");
    backdrop.classList.add("show");
    navToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    mainNav.classList.remove("open");
    backdrop.classList.remove("show");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  navToggle.addEventListener("click", () => {
    if (mainNav.classList.contains("open")) close();
    else open();
  });

  if (closeBtn) closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  mainNav.addEventListener("click", (e) => {
    if (e.target.closest("a")) close();
  });
}

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

function initYear() {
  const yearEl = document.querySelector(".year-now");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

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

function initTheme() {
  const themeToggles = document.querySelectorAll(".theme-toggle");
  
  const apply = (theme) => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      document.querySelectorAll(".moon-icon").forEach(m => m.style.display = "none");
      document.querySelectorAll(".sun-icon").forEach(s => s.style.display = "inline");
    } else {
      document.documentElement.removeAttribute("data-theme");
      document.querySelectorAll(".moon-icon").forEach(m => m.style.display = "inline");
      document.querySelectorAll(".sun-icon").forEach(s => s.style.display = "none");
    }
    loadBrandLogos();
  };

  apply(window.safeStorage.get("youyou_theme_v2") || "light");

  themeToggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      window.safeStorage.set("youyou_theme_v2", next);
      // phones: pause every colour transition for one frame so the swap is clean (see mobile.css)
      const root = document.documentElement;
      root.classList.add("theme-switching");
      apply(next);
      void root.offsetHeight;
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
      // small fade-in of the new label (phone drawer button)
      toggle.classList.remove("theme-pop");
      void toggle.offsetWidth;
      toggle.classList.add("theme-pop");
      setTimeout(() => toggle.classList.remove("theme-pop"), 400);
    });
  });
}

function initActiveLink() {
  const here = (window.location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.classList.remove("active");
    const href = (link.getAttribute("href") || "").split("#")[0].replace(/\.html$/, "");
    if (href && href === here) link.classList.add("active");
  });
}

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

// Home page: tapping anywhere on a "Popular Cookies" card opens that item on the menu
document.addEventListener("click", (e) => {
  const card = e.target.closest && e.target.closest(".product-card[data-href]");
  if (!card || e.target.closest("a")) return; // real links navigate by themselves
  window.location.href = card.getAttribute("data-href");
});

