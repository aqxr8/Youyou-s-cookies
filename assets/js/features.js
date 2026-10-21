<<<<<<< HEAD
document.addEventListener("DOMContentLoaded", () => {
  initHeroCarousel();
  initQuiz();
  initNotesWall(); 
  initCart(); 
  init3DHoverEffect(); 
});

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

  const savedNotes = JSON.parse(localStorage.getItem("youyou_notes")) || [];
  savedNotes.forEach(note => createNoteCard(note.name, note.rating, note.text, note.rot, false));

  form.addEventListener("submit", function (e) {
    e.preventDefault(); 
    const name = document.getElementById("note-name").value.trim();
    const rating = parseInt(document.getElementById("note-rating").value);
    const text = document.getElementById("note-text").value.trim();

    if (!name || !text) return;
    const rot = (Math.random() * 6 - 3).toFixed(1);
    createNoteCard(name, rating, text, rot, true);

    savedNotes.unshift({ name, rating, text, rot });
    localStorage.setItem("youyou_notes", JSON.stringify(savedNotes));

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

  function createNoteCard(name, rating, text, rot, isNew) {
    const fullStar = "★";
    const emptyStar = "☆";
    const stars = fullStar.repeat(rating) + emptyStar.repeat(5 - rating);

    const card = document.createElement("div");
    card.className = isNew ? "note-card reveal visible" : "note-card";
    card.style.setProperty("--rot", `${rot}deg`);

    card.innerHTML = `
      <div class="note-stars">${stars}</div>
      <p class="note-text">"${text}"</p>
      <div class="note-by">— ${name}</div>
    `;
    grid.insertBefore(card, grid.firstChild);
  }
}

// --- STICKY CART & FIRESTORE CHECKOUT MECHANIC ---
function initCart() {
  let rawCart = JSON.parse(localStorage.getItem('youyou_cart')) || [];
  let cart = [];
  
  rawCart.forEach(item => {
    if (item.quantity) {
      cart.push(item);
    } else {
      const existing = cart.find(i => i.name === item.name);
      if (existing) existing.quantity++;
      else cart.push({ name: item.name, price: item.price, quantity: 1 });
    }
  });

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

  document.addEventListener('click', (e) => {
    const button = e.target.closest('.add-to-cart');
    if (!button) return;

    const name = button.getAttribute('data-name');
    const price = parseInt(button.getAttribute('data-price'));
    if (!name || isNaN(price)) return;
    
    const existing = cart.find(i => i.name === name);
    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ name, price, quantity: 1 });
    }
    
    saveCart();

    const toast = document.createElement('div');
    toast.textContent = `Added ${name} to your box!`;
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
  });

  function saveCart() {
    localStorage.setItem('youyou_cart', JSON.stringify(cart));
    updateCartUI();
  }

  function updateCartUI() {
    if (!cartPanel) return;

    if (cart.length > 0) {
      cartPanel.style.display = 'block';
      cartItemsList.innerHTML = '';
      let total = 0;
      let itemCount = 0;
      
      cart.forEach((item, index) => {
        const li = document.createElement('li');
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemCount += item.quantity;
        
        li.innerHTML = `
          <span class="item-info"><b>${item.quantity}x</b> ${item.name}</span> 
          <span class="item-price">${itemTotal} DH</span>
          <button onclick="window.removeItem(${index})" class="remove-btn" title="Remove one">&minus;</button>
        `;
        cartItemsList.appendChild(li);
      });
      
      cartTotal.textContent = total;
      if (countEl) countEl.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
    } else {
      cartPanel.style.display = 'none';
    }
  }

  window.removeItem = function(index) {
    if (cart[index].quantity > 1) {
      cart[index].quantity--;
    } else {
      cart.splice(index, 1);
    }
    saveCart();
  };

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      cart = [];
      saveCart();
    });
  }

  if (locateBtn && addressInput) {
    locateBtn.addEventListener('click', () => {
      if ("geolocation" in navigator) {
        locateBtn.innerHTML = "⏳ Locating...";
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const mapsLink = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
            addressInput.value = (addressInput.value.trim() ? addressInput.value.trim() + "\n" : "") + "Pin: " + mapsLink;
            locateBtn.innerHTML = "✅ Location Added!";
            setTimeout(() => { locateBtn.innerHTML = "📍 Use My Location"; }, 3000);
          },
          () => {
            alert("Could not retrieve location.");
            locateBtn.innerHTML = "📍 Use My Location";
          }
        );
      }
    });
  }

  // CHECKOUT CONFIRMATION POPUP MECHANIC
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;

      if (confirmModal) {
        let summaryText = "";
        let total = 0;
        cart.forEach(item => {
          const itemTotal = item.price * item.quantity;
          summaryText += `• ${item.quantity}x ${item.name} (${itemTotal} DH)\n`;
          total += itemTotal;
        });

        if (confirmList) confirmList.textContent = summaryText;
        if (confirmTotal) confirmTotal.textContent = `${total} DH`;
        if (confirmAddressInput && addressInput) confirmAddressInput.value = addressInput.value;

        confirmModal.style.display = 'grid';
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
      const phone = confirmPhoneInput ? confirmPhoneInput.value.trim() : "";
      const address = confirmAddressInput ? confirmAddressInput.value.trim() : "";

      if (!phone) {
        alert("Please enter a contact phone number so we can fulfill your order.");
        return;
      }

      confirmSubmitBtn.disabled = true;
      confirmSubmitBtn.textContent = "Processing Order...";

      await processFinalCheckout(phone, address);

      confirmSubmitBtn.disabled = false;
      confirmSubmitBtn.textContent = "Confirm & Send via WhatsApp";
      confirmModal.style.display = 'none';
    });
  }

  async function processFinalCheckout(phone = "", address = "") {
    let total = 0;
    cart.forEach(i => total += (i.price * i.quantity));

    // 1. Save to Firebase Firestore
    if (window.saveOrderToFirestore) {
      await window.saveOrderToFirestore({
        customerName: window.currentUserObj ? (window.currentUserObj.displayName || window.currentUserObj.email) : "Guest",
        phone: phone,
        address: address || (addressInput ? addressInput.value : "Settat"),
        items: cart,
        totalAmount: total
      });
    }

    // 2. Generate WhatsApp Message
    const moroccoTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" }));
    const currentHour = moroccoTime.getHours();
    let timeNote = currentHour >= 20 ? "🚨 *[PRE-ORDER FOR TOMORROW]*\n" : (currentHour < 15 ? "⏳ *[PRE-ORDER FOR TODAY (15:00 - 20:00)]*\n" : "");

    let message = `Hi YouYou's Cookies!\n${timeNote}New Order Confirmation:\n\n`;
    cart.forEach(item => {
      message += `- ${item.quantity}x ${item.name} (${item.price * item.quantity} DH)\n`;
    });
    
    message += `\nTotal: ${total} DH\nPhone: ${phone}\nAddress: ${address || "Settat"}`;
    
    const targetPhone = "212789233029"; 
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank');

    cart = [];
    saveCart();
    if (addressInput) addressInput.value = "";
  }

  updateCartUI();
}

function init3DHoverEffect() {
  const cards = document.querySelectorAll('.new-menu-card, .product-card');
  if (window.innerWidth <= 900) return;

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
=======
document.addEventListener("DOMContentLoaded", () => {
  initHeroCarousel();
  initQuiz();
  initNotesWall(); 
  initCart(); 
  init3DHoverEffect(); 
});

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

  const savedNotes = JSON.parse(localStorage.getItem("youyou_notes")) || [];
  savedNotes.forEach(note => createNoteCard(note.name, note.rating, note.text, note.rot, false));

  form.addEventListener("submit", function (e) {
    e.preventDefault(); 
    const name = document.getElementById("note-name").value.trim();
    const rating = parseInt(document.getElementById("note-rating").value);
    const text = document.getElementById("note-text").value.trim();

    if (!name || !text) return;
    const rot = (Math.random() * 6 - 3).toFixed(1);
    createNoteCard(name, rating, text, rot, true);

    savedNotes.unshift({ name, rating, text, rot });
    localStorage.setItem("youyou_notes", JSON.stringify(savedNotes));

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

  function createNoteCard(name, rating, text, rot, isNew) {
    const fullStar = "★";
    const emptyStar = "☆";
    const stars = fullStar.repeat(rating) + emptyStar.repeat(5 - rating);

    const card = document.createElement("div");
    card.className = isNew ? "note-card reveal visible" : "note-card";
    card.style.setProperty("--rot", `${rot}deg`);

    card.innerHTML = `
      <div class="note-stars">${stars}</div>
      <p class="note-text">"${text}"</p>
      <div class="note-by">— ${name}</div>
    `;
    grid.insertBefore(card, grid.firstChild);
  }
}

// --- STICKY CART & FIRESTORE CHECKOUT MECHANIC ---
function initCart() {
  let rawCart = JSON.parse(localStorage.getItem('youyou_cart')) || [];
  let cart = [];
  
  rawCart.forEach(item => {
    if (item.quantity) {
      cart.push(item);
    } else {
      const existing = cart.find(i => i.name === item.name);
      if (existing) existing.quantity++;
      else cart.push({ name: item.name, price: item.price, quantity: 1 });
    }
  });

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

  document.addEventListener('click', (e) => {
    const button = e.target.closest('.add-to-cart');
    if (!button) return;

    const name = button.getAttribute('data-name');
    const price = parseInt(button.getAttribute('data-price'));
    if (!name || isNaN(price)) return;
    
    const existing = cart.find(i => i.name === name);
    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ name, price, quantity: 1 });
    }
    
    saveCart();

    const toast = document.createElement('div');
    toast.textContent = `Added ${name} to your box!`;
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
  });

  function saveCart() {
    localStorage.setItem('youyou_cart', JSON.stringify(cart));
    updateCartUI();
  }

  function updateCartUI() {
    if (!cartPanel) return;

    if (cart.length > 0) {
      cartPanel.style.display = 'block';
      cartItemsList.innerHTML = '';
      let total = 0;
      let itemCount = 0;
      
      cart.forEach((item, index) => {
        const li = document.createElement('li');
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemCount += item.quantity;
        
        li.innerHTML = `
          <span class="item-info"><b>${item.quantity}x</b> ${item.name}</span> 
          <span class="item-price">${itemTotal} DH</span>
          <button onclick="window.removeItem(${index})" class="remove-btn" title="Remove one">&minus;</button>
        `;
        cartItemsList.appendChild(li);
      });
      
      cartTotal.textContent = total;
      if (countEl) countEl.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
    } else {
      cartPanel.style.display = 'none';
    }
  }

  window.removeItem = function(index) {
    if (cart[index].quantity > 1) {
      cart[index].quantity--;
    } else {
      cart.splice(index, 1);
    }
    saveCart();
  };

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      cart = [];
      saveCart();
    });
  }

  if (locateBtn && addressInput) {
    locateBtn.addEventListener('click', () => {
      if ("geolocation" in navigator) {
        locateBtn.innerHTML = "⏳ Locating...";
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const mapsLink = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
            addressInput.value = (addressInput.value.trim() ? addressInput.value.trim() + "\n" : "") + "Pin: " + mapsLink;
            locateBtn.innerHTML = "✅ Location Added!";
            setTimeout(() => { locateBtn.innerHTML = "📍 Use My Location"; }, 3000);
          },
          () => {
            alert("Could not retrieve location.");
            locateBtn.innerHTML = "📍 Use My Location";
          }
        );
      }
    });
  }

  // CHECKOUT CONFIRMATION POPUP MECHANIC
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;

      if (confirmModal) {
        let summaryText = "";
        let total = 0;
        cart.forEach(item => {
          const itemTotal = item.price * item.quantity;
          summaryText += `• ${item.quantity}x ${item.name} (${itemTotal} DH)\n`;
          total += itemTotal;
        });

        if (confirmList) confirmList.textContent = summaryText;
        if (confirmTotal) confirmTotal.textContent = `${total} DH`;
        if (confirmAddressInput && addressInput) confirmAddressInput.value = addressInput.value;

        confirmModal.style.display = 'grid';
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
      const phone = confirmPhoneInput ? confirmPhoneInput.value.trim() : "";
      const address = confirmAddressInput ? confirmAddressInput.value.trim() : "";

      if (!phone) {
        alert("Please enter a contact phone number so we can fulfill your order.");
        return;
      }

      confirmSubmitBtn.disabled = true;
      confirmSubmitBtn.textContent = "Processing Order...";

      await processFinalCheckout(phone, address);

      confirmSubmitBtn.disabled = false;
      confirmSubmitBtn.textContent = "Confirm & Send via WhatsApp";
      confirmModal.style.display = 'none';
    });
  }

  async function processFinalCheckout(phone = "", address = "") {
    let total = 0;
    cart.forEach(i => total += (i.price * i.quantity));

    // 1. Save to Firebase Firestore
    if (window.saveOrderToFirestore) {
      await window.saveOrderToFirestore({
        customerName: window.currentUserObj ? (window.currentUserObj.displayName || window.currentUserObj.email) : "Guest",
        phone: phone,
        address: address || (addressInput ? addressInput.value : "Settat"),
        items: cart,
        totalAmount: total
      });
    }

    // 2. Generate WhatsApp Message
    const moroccoTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" }));
    const currentHour = moroccoTime.getHours();
    let timeNote = currentHour >= 20 ? "🚨 *[PRE-ORDER FOR TOMORROW]*\n" : (currentHour < 15 ? "⏳ *[PRE-ORDER FOR TODAY (15:00 - 20:00)]*\n" : "");

    let message = `Hi YouYou's Cookies!\n${timeNote}New Order Confirmation:\n\n`;
    cart.forEach(item => {
      message += `- ${item.quantity}x ${item.name} (${item.price * item.quantity} DH)\n`;
    });
    
    message += `\nTotal: ${total} DH\nPhone: ${phone}\nAddress: ${address || "Settat"}`;
    
    const targetPhone = "212789233029"; 
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank');

    cart = [];
    saveCart();
    if (addressInput) addressInput.value = "";
  }

  updateCartUI();
}

function init3DHoverEffect() {
  const cards = document.querySelectorAll('.new-menu-card, .product-card');
  if (window.innerWidth <= 900) return;

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
>>>>>>> origin/main
}