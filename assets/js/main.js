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
    // Open the menu when hamburger is clicked
    navToggle.addEventListener("click", () => {
      mainNav.classList.add("open");
    });
    
    // Close the menu when a link OR the new 'X' button is clicked
    mainNav.addEventListener("click", (e) => {
      if (e.target.tagName === "A" || e.target.classList.contains("nav-close")) {
        mainNav.classList.remove("open");
      }
    });

    // Close the menu when tapping anywhere on the screen outside the menu
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
  
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();

  let open = false;
  
  // Closing time for the hover text (8 PM is 20:00 in 24hr format)
  const closingTime = "20:00";

  // Math: 3 PM is 15:00 (15 * 60) and 8 PM is 20:00 (20 * 60)
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
        // Find the parent container of the clicked button
        const faqItem = button.closest(".faq-item");
        
        // Toggle the 'open' class to show/hide the answer
        faqItem.classList.toggle("open");
        
        // Change the aria-expanded attribute for accessibility
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

    // Check memory for theme, default to dark now
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
  
  // Get the current page name from the URL (e.g., "menu.html")
  // If it's empty (just "/"), it defaults to "index.html"
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  navLinks.forEach(link => {
    // First, remove the active class from all links
    link.classList.remove("active");
    
    // If the link's href matches the current page, make it active
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
  const intervalTime = 4000; // Changes image every 4 seconds (4000ms)

  // Switch to a specific slide
  function goToSlide(index) {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    currentSlide = (index + slides.length) % slides.length; 
    
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  function nextSlide() { goToSlide(currentSlide + 1); }
  function prevSlide() { goToSlide(currentSlide - 1); }

  // Start the automatic timer
  function startSlide() {
    slideInterval = setInterval(nextSlide, intervalTime);
  }

  // Reset timer if the user manually clicks or swipes
  function resetSlide() {
    clearInterval(slideInterval);
    startSlide();
  }

  // Click dots to change images
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      goToSlide(index);
      resetSlide();
    });
  });

  // --- Mobile Touch Swipe Logic ---
  let startX = 0;
  let endX = 0;

  // Record where the finger starts touching
  hero.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  // Record where the finger moves to
  hero.addEventListener('touchmove', (e) => {
    endX = e.touches[0].clientX;
  }, { passive: true });

  // When the finger lets go, calculate if it was a swipe left or right
  hero.addEventListener('touchend', () => {
    if (startX === 0 || endX === 0) return;
    
    const diffX = startX - endX;
    
    // If the swipe was longer than 50 pixels
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        nextSlide(); // Swiped left -> next
      } else {
        prevSlide(); // Swiped right -> previous
      }
      resetSlide();
    }
    
    startX = 0;
    endX = 0;
  });

  // Start the slideshow when the page loads
  startSlide();
});
// 8. Google Translate Widget Initialization
window.googleTranslateElementInit = function() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,fr,ar', // Restricts dropdown to English, French, and Arabic
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
    autoDisplay: false
  }, 'google_translate_element');
};

// Load the Google Translate script automatically
const gtScript = document.createElement('script');
gtScript.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
document.body.appendChild(gtScript);