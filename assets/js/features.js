document.addEventListener("DOMContentLoaded", () => {
  initHeroCarousel();
  initQuiz();
  initNotesWall(); 
  initCart(); 
  init3DHoverEffect(); 
});

// --- 1. HERO SLIDER FUNCTION ---
function initHeroCarousel() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dots button');

  if (slides.length === 0 || dots.length === 0) return;

  dots.forEach(dot => {
    dot.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      slides.forEach(slide => slide.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      slides[index].classList.add('active');
      this.classList.add('active');
    });
  });
}

// --- 2. COOKIE QUIZ FUNCTION ---
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
    Lotus: { name: "Cookies Lotus", price: "15 dh", desc: "Caramelized and crunchy sweetness...", href: "#" },
    OreoKinder: { name: "Oreo or Kinder Cookies", price: "12-13 dh", desc: "You love indulgent treats!...", href: "#" },
    RedVelvet: { name: "Red Velvet Cookies", price: "12 dh", desc: "Soft, melt-in-your-mouth...", href: "#" },
    Classic: { name: "Classic Cookies", price: "7 dh", desc: "The authentic taste that everyone loves...", href: "#" },
    ExtraChoc: { name: "Extra Chocolate Cookies", price: "10 dh", desc: "For true chocolate lovers...", href: "#" }
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
    const pick = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
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

// --- 3. REVIEWS & NOTES WALL FUNCTION ---
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

// --- 4. STICKY CART FUNCTION (With Smart Time Logic) ---
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

  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', (e) => {
      const name = e.target.getAttribute('data-name');
      const price = parseInt(e.target.getAttribute('data-price'));
      
      const existing = cart.find(i => i.name === name);
      if (existing) {
        existing.quantity++;
      } else {
        cart.push({ name, price, quantity: 1 });
      }
      
      if (window.va) {
        window.va('track', 'AddToCart', { flavor: name, price: price });
      }
      
      saveCart();

      // --- NEW: TOAST NOTIFICATION ---
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

      // Animate in
      requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
      });
      // Animate out and remove
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 2000);
      // --- END TOAST NOTIFICATION ---

    });
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
        locateBtn.innerHTML = "⏳ Finding location...";
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
            
            if (addressInput.value.trim() !== "") {
               addressInput.value = addressInput.value.trim() + "\nLocation Pin: " + mapsLink;
            } else {
               addressInput.value = "Location Pin: " + mapsLink;
            }
            
            locateBtn.innerHTML = "✅ Location Added!";
            setTimeout(() => { locateBtn.innerHTML = "📍 Use My Current Location"; }, 3000);
          },
          (error) => {
            alert("Could not get location. Please ensure location services are enabled on your device, or simply type your address manually.");
            locateBtn.innerHTML = "📍 Use My Current Location";
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;
      
      // NEW: Smart Baking Schedule Logic
      const currentHour = new Date().getHours();
      let timeNote = "";
      
      // If it is 8:00 PM (20:00) or later, tag it for tomorrow
      if (currentHour >= 20) {
        timeNote = "🚨 *[PRE-ORDER FOR TOMORROW]*\n";
      } 
      // If it is before 3:00 PM (15:00), tag it for today's upcoming batch
      else if (currentHour < 15) {
        timeNote = "⏳ *[PRE-ORDER FOR TODAY'S BATCH (15:00 - 20:00)]*\n";
      }

      let message = `Hi Youyou's Cookies!\n${timeNote}I would like to order:\n\n`;
      let total = 0;
      
      cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        message += `- ${item.quantity}x ${item.name} (${itemTotal} DH)\n`;
        total += itemTotal;
      });
      
      message += `\nTotal: ${total} DH\nPayment: Cash on Delivery in Settat.`;
      
      const address = addressInput && addressInput.value.trim() !== "" ? addressInput.value.trim() : "[Customer will provide]";
      message += `\n\nDelivery Address:\n${address}`;
      
      if (window.va) {
        window.va('track', 'WhatsAppCheckout', { cartTotal: total, itemCount: cart.length });
      }

      const phone = "212789233029"; 
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
      
      cart = [];
      saveCart();
      if (addressInput) addressInput.value = ""; 
    });
  }

  updateCartUI();
}

// --- 5. INTERACTIVE 3D HOVER EFFECT ---
function init3DHoverEffect() {
  const cards = document.querySelectorAll('.new-menu-card, .product-card');
  
  if (window.innerWidth <= 900) return;

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; 
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -12;
      const rotateY = ((x - centerX) / centerX) * 12;
      
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
    
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'none'; 
    });
  });
}