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

// --- CLOUD-SYNCED CART MECHANIC ---
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
  const cartOverlay = document.getElementById('cart-overlay');
  const cartItemsList = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const cartFooter = document.getElementById('cart-footer');
  const checkoutBtn = document.getElementById('checkout-btn');
  const clearBtn = document.getElementById('clear-cart-btn');
  
  window.openBoxModal = function() {
    if (cartPanel) {
      cartPanel.classList.add('open');
      if (cartOverlay) cartOverlay.classList.add('show');
    } else {
      window.location.href = "menu.html";
    }
  };

  window.closeCart = function() {
    if (cartPanel) cartPanel.classList.remove('open');
    if (cartOverlay) cartOverlay.classList.remove('show');
  };

  if (cartOverlay) {
    cartOverlay.addEventListener('click', window.closeCart);
  }

  window.addEventListener('cart-synced', () => {
    const syncedCartRaw = localStorage.getItem('youyou_cart');
    try {
      cart = syncedCartRaw ? JSON.parse(syncedCartRaw) : [];
      if (!Array.isArray(cart)) cart = [];
      updateCartUI();
    } catch(e) {
      cart = [];
      updateCartUI();
    }
  });

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

    const rect = button.getBoundingClientRect();
    flyCookie(rect.left + rect.width / 2, rect.top + rect.height / 2);

    const toast = document.createElement('div');
    toast.textContent = `Added ${name} to your box!`;
    toast.style.cssText = `
      position: fixed; bottom: 35px; left: 50%; transform: translate(-50%, 20px); 
      background: var(--caramel); color: white; padding: 12px 28px; border-radius: 999px; 
      box-shadow: 0 10px 30px rgba(0,0,0,0.25); font-weight: 600; z-index: 2000;
      transition: opacity 0.3s, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); opacity: 0;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translate(-50%, 0)';
      toast.style.opacity = '1';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 20px)';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  });

  function flyCookie(startX, startY) {
    const cookie = document.createElement('div');
    cookie.className = 'flying-cookie';
    cookie.textContent = '🍪';
    cookie.style.left = startX + 'px';
    cookie.style.top = startY + 'px';
    document.body.appendChild(cookie);

    const cartIcon = document.getElementById('nav-cart-icon');
    const cartRect = cartIcon ? cartIcon.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20 };

    void cookie.offsetWidth; 

    cookie.style.left = (cartRect.left + 5) + 'px';
    cookie.style.top = (cartRect.top + 5) + 'px';
    cookie.style.transform = 'scale(0.1) rotate(180deg)';
    cookie.style.opacity = '0';

    setTimeout(() => {
      cookie.remove();
      if(cartIcon) {
        cartIcon.classList.add('cart-pop'); 
        setTimeout(() => cartIcon.classList.remove('cart-pop'), 400);
      }
    }, 600);
  }

  async function saveCart() {
    localStorage.setItem('youyou_cart', JSON.stringify(cart));
    updateCartUI();

    if (window.currentUserObj) {
      try {
        const { getFirestore, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const db = getFirestore();
        await updateDoc(doc(db, "users", window.currentUserObj.uid), { cart: cart });
      } catch (err) {
        console.warn("Unable to sync cart to cloud:", err);
      }
    }
  }

  window.updateQuantity = function(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
  };

  function updateCartUI() {
    if (!cartItemsList) return;

    let subtotal = 0;
    cart.forEach(item => {
      subtotal += (item.price * item.quantity);
    });

    // Delivery fee logic: Free if subtotal >= 100 DH, otherwise 15 DH standard fee (or change as needed)
    const STANDARD_DELIVERY_FEE = 15;
    const FREE_SHIPPING_THRESHOLD = 100;
    const deliveryFee = subtotal === 0 ? 0 : (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE);
    const finalTotal = subtotal + deliveryFee;

    let tracker = document.getElementById('shipping-tracker');
    
    if (!tracker && cartItemsList.parentElement) {
      tracker = document.createElement('div');
      tracker.id = 'shipping-tracker';
      tracker.className = 'shipping-tracker';
      
      const cartBody = cartItemsList.parentElement;
      cartBody.parentNode.insertBefore(tracker, cartBody);
    }

    if (tracker) {
      if (cart.length === 0) {
        tracker.style.display = 'none';
      } else {
        tracker.style.display = 'flex';
        const progressPercentage = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
        const amountLeft = FREE_SHIPPING_THRESHOLD - subtotal;
        
        if (subtotal >= FREE_SHIPPING_THRESHOLD) {
          tracker.innerHTML = `
            <div class="shipping-text shipping-success">🎉 Congratulations! Free delivery unlocked.</div>
            <div class="shipping-bar-bg">
              <div class="shipping-bar-fill success" style="width: 100%;"></div>
            </div>
          `;
        } else {
          tracker.innerHTML = `
            <div class="shipping-text">Add <span>${amountLeft} DH</span> to get free delivery!</div>
            <div class="shipping-bar-bg">
              <div class="shipping-bar-fill" style="width: ${progressPercentage}%;"></div>
            </div>
          `;
        }
      }
    }

    cartItemsList.innerHTML = '';

    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🍪</div>
          <h4 style="color: var(--brown); font-size: 1.4rem; margin-bottom: 10px; font-family: 'Cormorant Garamond', serif; font-weight: 700;">Your box is empty!</h4>
          <p>It looks like you haven't added any sweet treats yet.</p>
          <button onclick="window.openBoxModal(); window.location.href='menu.html'" class="btn btn-dark" style="margin-top: 20px;">Explore Menu</button>
        </div>
      `;
      if(cartFooter) cartFooter.style.display = 'none';
    } else {
      if(cartFooter) cartFooter.style.display = 'block';
      
      cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        
        const li = document.createElement('li');
        li.className = 'cart-item-row';
        li.innerHTML = `
          <div class="cart-item-info">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-price">${itemTotal} DH <span style="font-size:0.8rem; opacity:0.7;">(${item.price} DH each)</span></div>
          </div>
          <div class="qty-controls">
            <button onclick="window.updateQuantity(${index}, -1)" class="qty-btn" title="Remove">&minus;</button>
            <span class="qty-val">${item.quantity}</span>
            <button onclick="window.updateQuantity(${index}, 1)" class="qty-btn" title="Add">&plus;</button>
          </div>
        `;
        cartItemsList.appendChild(li);
      });

      const existingFeeRow = document.getElementById('cart-delivery-fee-row');
      if (existingFeeRow) existingFeeRow.remove();

      const totalRowEl = document.querySelector('.cart-total-row');
      if (totalRowEl && totalRowEl.parentNode) {
        const feeRow = document.createElement('div');
        feeRow.id = 'cart-delivery-fee-row';
        feeRow.style.cssText = 'display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--brown-soft); margin-bottom: 8px;';
        feeRow.innerHTML = `<span>Delivery:</span><span>${deliveryFee === 0 ? '<strong style="color: #57a05f;">Free</strong>' : deliveryFee + ' DH'}</span>`;
        totalRowEl.parentNode.insertBefore(feeRow, totalRowEl);
      }
    }
    
    if (cartTotal) cartTotal.textContent = finalTotal;
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      cart = [];
      saveCart();
    });
  }

  let confirmModal = document.getElementById('checkout-confirm-modal');
  
  if (!confirmModal) {
    confirmModal = document.createElement('div');
    confirmModal.id = 'checkout-confirm-modal';
    confirmModal.className = 'confirm-modal-overlay';
    confirmModal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 3000; place-items: center; backdrop-filter: blur(4px);';
    confirmModal.innerHTML = `
      <div class="confirm-modal-content" style="background: var(--cream); padding: 25px; border-radius: 16px; width: 90%; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
        <div class="confirm-modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(74,55,40,0.1); padding-bottom: 15px; margin-bottom: 15px;">
          <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; color: var(--brown); margin: 0;">Confirm Order</h3>
          <button id="close-confirm-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--brown);">&times;</button>
        </div>
        <div class="confirm-order-summary">
          <strong style="color: var(--brown);">Items Summary:</strong>
          <pre id="confirm-items-summary" style="font-family: inherit; white-space: pre-wrap; margin: 8px 0; color: var(--brown); font-size: 0.95rem; line-height: 1.4;"></pre>
          <div id="confirm-delivery-summary" style="font-size: 0.85rem; color: var(--brown-soft); margin-top: 5px;"></div>
          <div style="text-align: right; font-weight: bold; color: var(--caramel); font-size: 1.1rem; border-top: 1px dashed rgba(74,55,40,0.2); padding-top: 10px; margin-top: 10px;">
            Total: <span id="confirm-total-price">0 DH</span>
          </div>
        </div>
        <div style="margin-top: 15px;">
          <label for="confirm-phone-input" style="display:block; margin-bottom:5px; color:var(--brown); font-weight:600; font-size: 0.9rem;">Phone Number (WhatsApp):</label>
          <input type="tel" id="confirm-phone-input" style="width:100%; padding:12px; border:1px solid rgba(74,55,40,0.2); border-radius:8px; font-family:inherit; background: #fff; color: var(--brown);" placeholder="+212 6XX-XXXXXX" required>
        </div>
        <div style="margin-top: 15px; margin-bottom: 20px;">
          <label for="confirm-address-input" style="display:block; margin-bottom:5px; color:var(--brown); font-weight:600; font-size: 0.9rem;">Delivery Address in Settat:</label>
          <textarea id="confirm-address-input" style="width:100%; padding:12px; border:1px solid rgba(74,55,40,0.2); border-radius:8px; font-family:inherit; background: #fff; color: var(--brown); min-height:80px; resize: vertical;" placeholder="Neighborhood, street, building..."></textarea>
        </div>
        <button id="confirm-submit-order" class="btn btn-dark" style="width:100%; padding: 14px; font-size: 1.1rem; background: var(--caramel); border-color: var(--caramel);">Confirm & Send via WhatsApp</button>
      </div>
    `;
    document.body.appendChild(confirmModal);
  }

  const confirmList = document.getElementById('confirm-items-summary');
  const confirmDeliverySummary = document.getElementById('confirm-delivery-summary');
  const confirmTotal = document.getElementById('confirm-total-price');
  const confirmCloseBtn = document.getElementById('close-confirm-modal');
  let confirmSubmitBtn = document.getElementById('confirm-submit-order');
  const confirmAddressInput = document.getElementById('confirm-address-input');

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;
      window.closeCart();

      let subtotal = 0;
      let summaryText = "";
      cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        summaryText += `• ${item.quantity}x ${item.name} (${itemTotal} DH)\n`;
        subtotal += itemTotal;
      });

      const deliveryFee = subtotal >= 100 ? 0 : 15;
      const finalTotal = subtotal + deliveryFee;

      if (confirmList) confirmList.textContent = summaryText;
      if (confirmDeliverySummary) {
        confirmDeliverySummary.textContent = deliveryFee === 0 ? "Delivery Fee: Free (Order ≥ 100 DH)" : `Delivery Fee: ${deliveryFee} DH`;
      }
      if (confirmTotal) confirmTotal.textContent = `${finalTotal} DH`;

      if (window.currentUserObj && window.userDataObj) {
         if (confirmAddressInput) confirmAddressInput.value = window.userDataObj.address || "";
         const phoneInp = document.getElementById('confirm-phone-input');
         if (phoneInp) phoneInp.value = window.userDataObj.phone || "";
      }

      confirmModal.style.display = 'grid'; 
    });
  }

  if (confirmCloseBtn) {
    confirmCloseBtn.addEventListener('click', () => {
      confirmModal.style.display = 'none';
      window.openBoxModal(); 
    });
  }

  if (confirmSubmitBtn) {
    const newSubmitBtn = confirmSubmitBtn.cloneNode(true);
    confirmSubmitBtn.parentNode.replaceChild(newSubmitBtn, confirmSubmitBtn);
    confirmSubmitBtn = newSubmitBtn;

    confirmSubmitBtn.addEventListener('click', async () => {
      const phone = document.getElementById('confirm-phone-input').value.trim();
      const address = document.getElementById('confirm-address-input').value.trim();

      if (!phone) {
        alert("Please enter a phone number to finalize your order.");
        return; 
      }

      confirmSubmitBtn.disabled = true;
      confirmSubmitBtn.textContent = "Processing...";

      await processFinalCheckout(phone, address);

      confirmSubmitBtn.disabled = false;
      confirmSubmitBtn.textContent = "Confirm & Send via WhatsApp";
      confirmModal.style.display = 'none';
    });
  }

  async function processFinalCheckout(phone = "", address = "") {
    let subtotal = 0;
    cart.forEach(i => subtotal += (i.price * i.quantity));
    const deliveryFee = subtotal >= 100 ? 0 : 15;
    const finalTotal = subtotal + deliveryFee;

    if (window.saveOrderToFirestore) {
      await window.saveOrderToFirestore({
        customerName: window.currentUserObj ? (window.currentUserObj.displayName || window.currentUserObj.email) : "Guest",
        phone: phone,
        address: address || "Settat",
        items: cart,
        totalAmount: finalTotal
      });
    }

    const moroccoTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" }));
    const currentHour = moroccoTime.getHours();
    let timeNote = currentHour >= 20 ? "🚨 *[PRE-ORDER FOR TOMORROW]*\n" : (currentHour < 15 ? "⏳ *[PRE-ORDER FOR TODAY (15:00 - 20:00)]*\n" : "");

    let message = `Hi YouYou's Cookies !\n${timeNote}New order:\n\n`;
    cart.forEach(item => {
      message += `- ${item.quantity}x ${item.name} (${item.price * item.quantity} DH)\n`;
    });
    
    message += `\nSubtotal : ${subtotal} DH\nDelivery : ${deliveryFee === 0 ? 'Free' : deliveryFee + ' DH'}\nTotal : ${finalTotal} DH\nPhone : ${phone}\nAddress : ${address || "Settat"}`;
    
    const targetPhone = "212789233029"; 
    window.location.href = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

    cart = [];
    saveCart();
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
}