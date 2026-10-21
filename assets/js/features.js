document.addEventListener("DOMContentLoaded", () => {
  initHeroCarousel();
  initQuiz();
  initNotesWall(); 
  initCart(); 
  init3DHoverEffect(); 
});

// ---------- shared helpers ----------
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full / blocked */ }
}


function initHeroCarousel() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dots button');
  const hero = document.querySelector('.hero-carousel');
  
  if (!hero || slides.length === 0) return;

  let currentSlide = 0;
  let slideInterval;
  const intervalTime = 4000;

  function goToSlide(index) {
    slides[currentSlide].classList.remove('active');
    if (dots[currentSlide]) dots[currentSlide].classList.remove('active');
    
    currentSlide = (index + slides.length) % slides.length; 
    
    slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) dots[currentSlide].classList.add('active');
  }

  function nextSlide() { goToSlide(currentSlide + 1); }
  function prevSlide() { goToSlide(currentSlide - 1); }

  function startSlide() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
      if (diffX > 0) nextSlide();
      else prevSlide();
      resetSlide();
    }
    
    startX = 0;
    endX = 0;
  });

  startSlide();
}

function initQuiz() {
  const root = document.getElementById("quiz");
  if (!root) return;

  const startView = document.getElementById("quiz-start");
  const stepView = document.getElementById("quiz-step");
  const resultView = document.getElementById("quiz-result");
  const beginBtn = document.getElementById("quiz-begin");
  const restartBtn = document.getElementById("quiz-restart");
  const progress = document.getElementById("quiz-progress");
  const question = document.getElementById("quiz-q");
  const optionsBox = document.getElementById("quiz-options");
  const resultName = document.getElementById("quiz-name");
  const resultDesc = document.getElementById("quiz-desc");
  const resultLink = document.getElementById("quiz-link");

  const QUIZ = [
    {
      q: "What's your go-to weekend mood?",
      opts: [
        { t: "Cozy vibes with a warm drink", p: "Lotus" },
        { t: "All out indulgence, treating myself!", p: "ExtraChoc" },
        { t: "Keeping it simple and nostalgic", p: "Classic" },
        { t: "A touch of color and elegance", p: "RedVelvet" }
      ]
    },
    {
      q: "If you had to pick a texture, you'd go for:",
      opts: [
        { t: "Caramelized and crunchy", p: "Lotus" },
        { t: "Soft, melt-in-your-mouth", p: "RedVelvet" },
        { t: "Chunky and rich", p: "ExtraChoc" },
        { t: "Perfectly balanced, comforting chew", p: "Classic" }
      ]
    },
    {
      q: "Which treat calls your name?",
      opts: [
        { t: "Something packed with familiar favorites", p: "OreoKinder" },
        { t: "Pure, intense chocolate", p: "ExtraChoc" },
        { t: "Something spiced and sweet", p: "Lotus" },
        { t: "The classic chocolate chip", p: "Classic" }
      ]
    }
  ];

  const RESULTS = {
    Lotus: { name: "Cookies Lotus", price: "15 dh", desc: "Caramelized and crunchy sweetness...", href: "menu.html#cookie-lotus" },
    OreoKinder: { name: "Oreo or Kinder Cookies", price: "12-13 dh", desc: "You love indulgent treats!...", href: "menu.html#cookie-kinder" },
    RedVelvet: { name: "Red Velvet Cookies", price: "12 dh", desc: "Soft, melt-in-your-mouth...", href: "menu.html#cookie-redvelvet" },
    Classic: { name: "Classic Cookies", price: "7 dh", desc: "The authentic taste that everyone loves...", href: "menu.html#cookie-classic" },
    ExtraChoc: { name: "Extra Chocolate Cookies", price: "10 dh", desc: "For true chocolate lovers...", href: "menu.html#cookie-extra" }
  };

  let step = 0;
  const score = { Lotus: 0, OreoKinder: 0, RedVelvet: 0, Classic: 0, ExtraChoc: 0 };

  const showView = (view) => {
    [startView, stepView, resultView].forEach((v) => (v.hidden = true));
    view.hidden = false;
  };

  const drawStep = () => {
    const q = QUIZ[step];
    progress.textContent = "Question " + (step + 1) + " / " + QUIZ.length;
    question.textContent = q.q;
    optionsBox.innerHTML = "";
    q.opts.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";
      btn.textContent = opt.t;
      btn.addEventListener("click", () => {
        score[opt.p] += 1;
        step += 1;
        if (step < QUIZ.length) drawStep();
        else showResult();
      });
      optionsBox.appendChild(btn);
    });
  };

  const showResult = () => {
    const maxScore = Math.max(...Object.values(score));
    const topFlavors = Object.keys(score).filter(flavor => score[flavor] === maxScore);
    const pick = topFlavors[Math.floor(Math.random() * topFlavors.length)];
    
    const r = RESULTS[pick];
    resultName.textContent = r.name;
    resultDesc.textContent = r.desc;
    resultLink.textContent = "Check out '" + r.name + "' on the menu for " + r.price + " →";
    resultLink.href = r.href;
    showView(resultView);
  };

  beginBtn.addEventListener("click", () => {
    step = 0;
    Object.keys(score).forEach((k) => (score[k] = 0));
    showView(stepView);
    drawStep();
  });

  restartBtn.addEventListener("click", () => {
    step = 0;
    Object.keys(score).forEach((k) => (score[k] = 0));
    showView(startView);
  });

  showView(startView);
}

function initNotesWall() {
  const form = document.getElementById("note-form");
  const grid = document.getElementById("notes-grid");

  if (!form || !grid) return;

  let savedNotes = readJSON("youyou_notes", []);
  if (!Array.isArray(savedNotes)) savedNotes = [];

  // saved list is newest-first; insert oldest-first so the newest ends up on top
  [...savedNotes].reverse().forEach((n) => {
    if (n && n.name && n.text) createNoteCard(String(n.name), n.rating, String(n.text), n.rot, false);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("note-name").value.trim();
    const rating = Math.min(5, Math.max(1, parseInt(document.getElementById("note-rating").value, 10) || 5));
    const text = document.getElementById("note-text").value.trim();

    if (!name || !text) return;
    const rot = (Math.random() * 6 - 3).toFixed(1);
    createNoteCard(name, rating, text, rot, true);

    savedNotes.unshift({ name, rating, text, rot });
    savedNotes = savedNotes.slice(0, 50);
    writeJSON("youyou_notes", savedNotes);

    form.reset();

    const submitBtn = form.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "✓ Posted!";
    submitBtn.style.backgroundColor = "#57a05f";
    submitBtn.style.borderColor = "#57a05f";
    submitBtn.style.color = "#ffffff";

    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.style.backgroundColor = "";
      submitBtn.style.borderColor = "";
      submitBtn.style.color = "";
    }, 2000);
  });

  // Built with DOM nodes + textContent, so visitor text can never run as HTML.
  function createNoteCard(name, rating, text, rot, isNew) {
    const r = Math.min(5, Math.max(0, parseInt(rating, 10) || 0));

    const card = document.createElement("div");
    card.className = isNew ? "note-card reveal visible" : "note-card";
    card.style.setProperty("--rot", (parseFloat(rot) || 0) + "deg");

    const stars = document.createElement("div");
    stars.className = "note-stars";
    stars.textContent = "★".repeat(r) + "☆".repeat(5 - r);

    const p = document.createElement("p");
    p.className = "note-text";
    p.textContent = "\u201C" + text + "\u201D";

    const by = document.createElement("div");
    by.className = "note-by";
    by.textContent = "\u2014 " + name;

    card.append(stars, p, by);
    grid.insertBefore(card, grid.firstChild);
  }
}

// --- STICKY CART & FIRESTORE CHECKOUT MECHANIC ---
function initCart() {
  const CART_KEY = 'youyou_cart';
  const DISMISS_KEY = 'youyou_cart_dismissed';

  // Official prices (DH). Keep in sync with menu.html.
  // Used so nobody can edit localStorage to change what an order costs.
  const MENU_PRICES = {
    'Classic Cookie': 7,
    'Loaded Fudge Brownie': 15,
    'Monster Cookie': 15,
    'Lemon Cookie': 13,
    'KitKat Cookie': 15,
    'Extra Chocolate': 10,
    'Oreo Cookie': 12,
    'Red Velvet': 12,
    'Kinder Cookie': 13,
    'Lotus Cookie': 15,
    '10 Mini Cookies Box': 15,
    '15 Mini Cookies Box': 20,
    '20 Mini Cookies Box': 27,
    '30 Mini Cookies Box': 40
  };

  function officialPrice(name, fallbackPrice) {
    return Object.prototype.hasOwnProperty.call(MENU_PRICES, name) ? MENU_PRICES[name] : fallbackPrice;
  }

  // Load + clean the stored cart (old formats, corrupt or tampered data)
  function loadCart() {
    let raw = readJSON(CART_KEY, []);
    if (!Array.isArray(raw)) raw = raw && typeof raw === 'object' ? Object.values(raw) : [];
    const clean = [];
    raw.forEach((item) => {
      if (!item || typeof item.name !== 'string') return;
      const name = item.name.slice(0, 60);
      const price = officialPrice(name, Number(item.price));
      if (!Number.isFinite(price) || price < 0 || price > 1000) return;
      const qty = Math.min(99, Math.max(1, parseInt(item.quantity, 10) || 1));
      const existing = clean.find((i) => i.name === name);
      if (existing) existing.quantity = Math.min(99, existing.quantity + qty);
      else clean.push({ name, price, quantity: qty });
    });
    return clean;
  }

  let cart = loadCart();

  const cartPanel = document.getElementById('cart-panel');
  const cartItemsList = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');
  const clearBtn = document.getElementById('clear-cart-btn');
  const countEl = document.getElementById('cart-count');

  const addressInput = document.getElementById('cart-address');
  const locateBtn = document.getElementById('locate-me-btn');

  // Confirmation Modal Elements
  const confirmModal = document.getElementById('checkout-confirm-modal');
  const confirmList = document.getElementById('confirm-items-summary');
  const confirmTotal = document.getElementById('confirm-total-price');
  const confirmPhoneInput = document.getElementById('confirm-phone-input');
  const confirmAddressInput = document.getElementById('confirm-address-input');
  const confirmSubmitBtn = document.getElementById('confirm-submit-order');
  const confirmCloseBtn = document.getElementById('close-confirm-modal');

  const setDismissed = (on) => {
    try {
      if (on) sessionStorage.setItem(DISMISS_KEY, '1');
      else sessionStorage.removeItem(DISMISS_KEY);
    } catch (e) { /* ignore */ }
  };
  const isDismissed = () => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  };

  if (cartPanel) {
    cartPanel.setAttribute('role', 'dialog');
    cartPanel.setAttribute('aria-label', 'Your box');
    // remember that the visitor closed the panel, so it doesn't re-open on every page
    cartPanel.querySelectorAll('.close-cart').forEach((btn) => {
      btn.setAttribute('aria-label', 'Close cart');
      btn.addEventListener('click', () => setDismissed(true));
    });
  }
  if (confirmModal) {
    confirmModal.setAttribute('role', 'dialog');
    confirmModal.setAttribute('aria-modal', 'true');
    confirmModal.setAttribute('aria-label', 'Confirm order');
    // click on the dark background closes it
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) confirmModal.style.display = 'none';
    });
  }
  if (confirmCloseBtn) confirmCloseBtn.setAttribute('aria-label', 'Close');

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (confirmModal && confirmModal.style.display === 'grid') {
      confirmModal.style.display = 'none';
    } else if (cartPanel && cartPanel.style.display === 'block') {
      cartPanel.style.display = 'none';
      setDismissed(true);
    }
  });

  // --- Add to cart (delegated; works when clicking the icon inside the button) ---
  document.addEventListener('click', (e) => {
    const button = e.target.closest('.add-to-cart');
    if (!button) return;

    const name = button.getAttribute('data-name');
    const price = officialPrice(name, parseInt(button.getAttribute('data-price'), 10));
    if (!name || !Number.isFinite(price)) return;

    const existing = cart.find((i) => i.name === name);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + 1);
    } else {
      cart.push({ name, price, quantity: 1 });
    }

    if (window.va) window.va('track', 'AddToCart', { flavor: name, price: price });

    setDismissed(false);
    saveCart(true);
    showToast(`Added ${name} to your box!`);
  });

  function showToast(message) {
    const toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 85px; right: 20px;
      background: var(--caramel); color: white;
      padding: 10px 20px; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-weight: 600; z-index: 1001;
      transition: opacity 0.3s, transform 0.3s;
      transform: translateY(20px); opacity: 0;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  function saveCart(openPanel) {
    writeJSON(CART_KEY, cart);
    updateCartUI(openPanel);
  }

  function updateCartUI(openPanel) {
    if (!cartPanel) return;

    if (cart.length === 0) {
      cartPanel.style.display = 'none';
      return;
    }

    if (openPanel || !isDismissed()) cartPanel.style.display = 'block';

    if (!cartItemsList) return;
    cartItemsList.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    cart.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      itemCount += item.quantity;

      // DOM nodes + textContent: item names can never run as HTML
      const li = document.createElement('li');

      const info = document.createElement('span');
      info.className = 'item-info';
      const qty = document.createElement('b');
      qty.textContent = item.quantity + 'x';
      info.append(qty, ' ' + item.name);

      const price = document.createElement('span');
      price.className = 'item-price';
      price.textContent = itemTotal + ' DH';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-btn';
      remove.title = 'Remove one';
      remove.setAttribute('aria-label', 'Remove one ' + item.name);
      remove.textContent = '\u2212';
      remove.addEventListener('click', () => window.removeItem(index));

      li.append(info, ' ', price, remove);
      cartItemsList.appendChild(li);
    });

    if (cartTotal) cartTotal.textContent = total;
    if (countEl) countEl.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
  }

  window.removeItem = function (index) {
    if (!cart[index]) return;
    if (cart[index].quantity > 1) {
      cart[index].quantity--;
    } else {
      cart.splice(index, 1);
    }
    saveCart(false);
  };

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      cart = [];
      saveCart(false);
    });
  }

  if (locateBtn && addressInput) {
    locateBtn.addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        alert('Location is not supported by your browser. Please type your address instead.');
        return;
      }
      locateBtn.innerHTML = '⏳ Locating...';
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const mapsLink = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
          addressInput.value = (addressInput.value.trim() ? addressInput.value.trim() + '\n' : '') + 'Pin: ' + mapsLink;
          locateBtn.innerHTML = '✅ Location Added!';
          setTimeout(() => { locateBtn.innerHTML = '📍 Use My Location'; }, 3000);
        },
        () => {
          alert('Could not retrieve your location. Please allow location access or type your address manually.');
          locateBtn.innerHTML = '📍 Use My Location';
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // CHECKOUT CONFIRMATION POPUP MECHANIC
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;

      if (confirmModal) {
        let summaryText = '';
        let total = 0;
        cart.forEach((item) => {
          const itemTotal = item.price * item.quantity;
          summaryText += `• ${item.quantity}x ${item.name} (${itemTotal} DH)\n`;
          total += itemTotal;
        });

        if (confirmList) confirmList.textContent = summaryText;
        if (confirmTotal) confirmTotal.textContent = `${total} DH`;
        if (confirmAddressInput && addressInput) confirmAddressInput.value = addressInput.value;

        confirmModal.style.display = 'grid';
        if (confirmPhoneInput) confirmPhoneInput.focus();
      } else {
        processFinalCheckout();
      }
    });
  }

  if (confirmCloseBtn) {
    confirmCloseBtn.addEventListener('click', () => {
      confirmModal.style.display = 'none';
    });
  }

  if (confirmSubmitBtn) {
    confirmSubmitBtn.addEventListener('click', async () => {
      const phone = confirmPhoneInput ? confirmPhoneInput.value.trim() : '';
      const address = confirmAddressInput ? confirmAddressInput.value.trim() : '';

      const digits = phone.replace(/\D/g, '');
      if (digits.length < 9 || digits.length > 15) {
        alert('Please enter a valid phone number (for example 06 12 34 56 78) so we can reach you about your order.');
        if (confirmPhoneInput) confirmPhoneInput.focus();
        return;
      }

      confirmSubmitBtn.disabled = true;
      confirmSubmitBtn.textContent = 'Processing Order...';

      try {
        await processFinalCheckout(phone, address);
      } finally {
        // always restore the button, even if something failed
        confirmSubmitBtn.disabled = false;
        confirmSubmitBtn.textContent = 'Confirm & Send via WhatsApp';
        confirmModal.style.display = 'none';
      }
    });
  }

  async function processFinalCheckout(phone = '', address = '') {
    if (cart.length === 0) return;

    // Open the WhatsApp tab NOW, while the tap is still "fresh". Browsers (especially
    // iPhone Safari) block popups that are opened after an await, so we fill it in later.
    const waWindow = window.open('', '_blank');

    const items = cart.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }));
    let total = 0;
    items.forEach((i) => { total += i.price * i.quantity; });

    // 1. Save to Firebase Firestore (never block the WhatsApp order if this fails)
    let orderId = null;
    try {
      if (window.saveOrderToFirestore) {
        orderId = await window.saveOrderToFirestore({
          customerName: window.currentUserObj ? (window.currentUserObj.displayName || window.currentUserObj.email) : 'Guest',
          phone: phone,
          address: address || (addressInput ? addressInput.value : 'Settat'),
          items: items,
          totalAmount: total
        });
      }
    } catch (err) {
      console.warn('Order could not be saved online:', err);
    }

    // 2. Generate WhatsApp Message (Morocco time, same delivery window as the status pill)
    const hours = window.YOUYOU_HOURS || { open: 15, close: 20 };
    const currentHour = window.getMoroccoTime ? window.getMoroccoTime().hour : new Date().getHours();
    let timeNote = '';
    if (currentHour >= hours.close) {
      timeNote = '🚨 *[PRE-ORDER FOR TOMORROW]*\n';
    } else if (currentHour < hours.open) {
      timeNote = `⏳ *[PRE-ORDER FOR TODAY (${hours.open}:00 - ${hours.close}:00)]*\n`;
    }

    let message = `Hi YouYou's Cookies!\n${timeNote}New Order Confirmation:\n\n`;
    items.forEach((item) => {
      message += `- ${item.quantity}x ${item.name} (${item.price * item.quantity} DH)\n`;
    });

    message += `\nTotal: ${total} DH\nPhone: ${phone}\nAddress: ${address || 'Settat'}`;
    if (orderId) message += `\nOrder ref: #${String(orderId).slice(-6).toUpperCase()}`;

    if (window.va) window.va('track', 'WhatsAppCheckout', { cartTotal: total, itemCount: items.length });

    const targetPhone = '212789233029';
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

    // If the popup was blocked, open WhatsApp in this tab instead of losing the order.
    if (waWindow) waWindow.location.href = url;
    else window.location.href = url;

    cart = [];
    saveCart(false);
    if (addressInput) addressInput.value = '';
  }

  updateCartUI(false);
}

function init3DHoverEffect() {
  const cards = document.querySelectorAll('.new-menu-card, .product-card');
  if (window.innerWidth <= 900) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; 
      const y = e.clientY - rect.top;
      
      const rotateX = ((y - (rect.height / 2)) / (rect.height / 2)) * -12;
      const rotateY = ((x - (rect.width / 2)) / (rect.width / 2)) * 12;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
      card.style.transition = 'none'; 
      card.style.zIndex = '10';
      card.style.boxShadow = `0 25px 50px rgba(74, 55, 40, 0.25)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.5s ease';
      card.style.zIndex = '1';
      card.style.boxShadow = '';
    });
  });
}