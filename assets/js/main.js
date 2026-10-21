document.addEventListener("DOMContentLoaded", () => {
  // 1. Header Scroll Effect
  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const mainNav = document.querySelector(".main-nav");

  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

// 2. Mobile Navigation Toggle
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      mainNav.classList.add("open");
    });
    
    mainNav.addEventListener("click", (e) => {
      if (e.target.tagName === "A" || e.target.classList.contains("nav-close")) {
        mainNav.classList.remove("open");
      }
    });

    document.addEventListener("click", (e) => {
      if (mainNav.classList.contains("open") && !mainNav.contains(e.target) && !navToggle.contains(e.target)) {
        mainNav.classList.remove("open");
      }
    });
  }

  // 3. Scroll Reveal Animation
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

  // 4. Auto-Update Copyright Year
  const yearEl = document.querySelector(".year-now");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 5. Initialize the Open/Closed Status Pill
  initOpenStatus();
});

function initOpenStatus() {
  const pill = document.querySelector("[data-status-pill]");
  if (!pill) return;

  const text = pill.querySelector(".status-text");
  
  // Standardize time to Morocco
  const moroccoTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Casablanca"}));
  const currentHour = moroccoTime.getHours();
  const mins = currentHour * 60 + moroccoTime.getMinutes();

  let open = false;
  const closingTime = "20:00";

  // Delivery Hours: 15:00 - 20:00
  if (mins >= 15 * 60 && mins < 20 * 60 ) {
    open = true;
  }

  pill.classList.toggle("is-open", open);
  text.textContent = open ? "Taking Orders" : "Closed";
  
  pill.setAttribute("aria-label", open ? "We are currently taking orders until " + closingTime : "We are currently closed");
  pill.title = open ? "Open until " + closingTime : "Opens at 3:00 PM all week";
}

// 6. FAQ Accordion Toggle
const faqQuestions = document.querySelectorAll(".faq-q");

if (faqQuestions.length > 0) {
  faqQuestions.forEach(button => {
    button.addEventListener("click", () => {
      const faqItem = button.closest(".faq-item");
      faqItem.classList.toggle("open");
      
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", !isExpanded);
    });
  });
}

// 7. Dark Mode Toggle
const themeToggle = document.getElementById('theme-toggle');

if (themeToggle) {
  const moon = themeToggle.querySelector('.moon-icon');
  const sun = themeToggle.querySelector('.sun-icon');

  const currentTheme = localStorage.getItem('youyou_theme') || 'dark';
  
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    moon.style.display = 'none';
    sun.style.display = 'inline';
  } else {
    document.documentElement.removeAttribute('data-theme');
    moon.style.display = 'inline';
    sun.style.display = 'none';
  }

  themeToggle.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('youyou_theme', 'light');
      moon.style.display = 'inline';
      sun.style.display = 'none';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('youyou_theme', 'dark');
      moon.style.display = 'none';
      sun.style.display = 'inline';
    }
  });
}

// 8. Auto-Highlight Active Menu Link
const navLinks = document.querySelectorAll(".main-nav a");
const currentPath = window.location.pathname.split("/").pop() || "index.html";

navLinks.forEach(link => {
  link.classList.remove("active");
  if (link.getAttribute("href") === currentPath) {
    link.classList.add("active");
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dots button');
  const hero = document.querySelector('.hero-carousel');
  
  if (!hero || slides.length === 0) return;

  let currentSlide = 0;
  let slideInterval;
  const intervalTime = 4000;

  function goToSlide(index) {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    currentSlide = (index + slides.length) % slides.length; 
    
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  function nextSlide() { goToSlide(currentSlide + 1); }
  function prevSlide() { goToSlide(currentSlide - 1); }

  function startSlide() {
    slideInterval = setInterval(nextSlide, intervalTime);
  }

  function resetSlide() {
    clearInterval(slideInterval);
    startSlide();
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      goToSlide(index);
      resetSlide();
    });
  });

  let startX = 0;
  let endX = 0;

  hero.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  hero.addEventListener('touchmove', (e) => {
    endX = e.touches[0].clientX;
  }, { passive: true });

  hero.addEventListener('touchend', () => {
    if (startX === 0 || endX === 0) return;
    
    const diffX = startX - endX;
    
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
      resetSlide();
    }
    
    startX = 0;
    endX = 0;
  });

  startSlide();
});

// 9. Google Translate Widget Initialization
window.googleTranslateElementInit = function() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,fr,ar', 
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
    autoDisplay: false
  }, 'google_translate_element');
};

const gtScript = document.createElement('script');
gtScript.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
document.body.appendChild(gtScript);