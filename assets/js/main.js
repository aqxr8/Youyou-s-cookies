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
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.536 3.536 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
        <path d="M3.35 5.47c-.18.158-.353.321-.518.487C1.402 7.21 1 8 1 8s3 5.5 8 5.5c1.026 0 1.996-.23 2.868-.619l.72.72c-.173.102-.348.2-.524.29C10.74 14.49 9.38 15 8 15c-5 0-8-5.5-8-5.5a13.165 13.135 0 0 1 2.408-3.085l.942.942zM13.646 14.354l-12-12 .708-.708 12 12-.708.708z"/>
      </svg>
    `;
    toggleBtn.setAttribute("aria-label", "Hide password");
  } else {
    input.type = "password";
    toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
      </svg>
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

  if (!navToggle || !mainNav) return;

  let backdrop = document.querySelector(".nav-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
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

  navToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (mainNav.classList.contains("open")) close();
    else open();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
  }

  backdrop.addEventListener("click", (e) => {
    e.preventDefault();
    close();
  });

  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      close();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mainNav.classList.contains("open")) {
      close();
      navToggle.focus();
    }
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
// =======================================================
// AUTO-INJECT PROFILE LINK INTO MOBILE MENU
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
  const mainNav = document.querySelector('.main-nav');
  
  // Find the profile button in the top header
  const headerProfileBtn = document.querySelector('.header-actions a.header-action-btn:not(.cart-btn)');
  
  // If both exist, clone the link into the mobile menu
  if (mainNav && headerProfileBtn) {
    const mobileProfileLink = document.createElement('a');
    mobileProfileLink.href = headerProfileBtn.getAttribute('href') || 'login.html';
    mobileProfileLink.className = 'mobile-profile-link';
    mobileProfileLink.innerHTML = '👤 Profile / Login';
    
    // Add it to the very bottom of the mobile menu links
    mainNav.appendChild(mobileProfileLink);
  }
});