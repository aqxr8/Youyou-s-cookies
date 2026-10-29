document.addEventListener("DOMContentLoaded", () => {
  initHeroCarousel();
  initQuiz();
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

// --- CLOUD-SYNCED CART MECHANIC ---

// Official prices (DH). KEEP IN SYNC with the data-price values in menu.html.
// Anything in the saved cart that is not on this list, or has a different price, is corrected/dropped.
const MENU_PRICES = {
  'Classic Cookie': 7, 'Extra Chocolate': 10, 'Red Velvet': 12, 'Oreo Cookie': 12,
  'Kinder Cookie': 13, 'Lemon Cookie': 13, 'Lotus Cookie': 15, 'Monster Cookie': 15,
  'KitKat Cookie': 15, 'Loaded Fudge Brownie': 15,
  '10 Mini Cookies Box': 15, '15 Mini Cookies Box': 20, '20 Mini Cookies Box': 27, '30 Mini Cookies Box': 40
};

function sanitizeCart(raw) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  raw.forEach((item) => {
    if (!item || typeof item.name !== 'string') return;
    if (!Object.prototype.hasOwnProperty.call(MENU_PRICES, item.name)) return;
    const qty = Math.min(99, Math.max(1, parseInt(item.quantity, 10) || 1));
    const existing = out.find((i) => i.name === item.name);
    if (existing) existing.quantity = Math.min(99, existing.quantity + qty);
    else out.push({ name: item.name, price: MENU_PRICES[item.name], quantity: qty });
  });
  return out;
}

function readStoredCart() {
  try {
    return sanitizeCart(JSON.parse(localStorage.getItem('youyou_cart') || '[]'));
  } catch (e) {
    return [];
  }
}

function initCart() {
  let cart = readStoredCart();
  window.cart = cart;

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
    cart = readStoredCart();
    window.cart = cart;
    updateCartUI();
  });

  document.addEventListener('click', (e) => {
    const button = e.target.closest('.add-to-cart');
    if (!button) return;

    const name = button.getAttribute('data-name');
    if (!name || !Object.prototype.hasOwnProperty.call(MENU_PRICES, name)) return;
    const price = MENU_PRICES[name];
    
    const existing = cart.find(i => i.name === name);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + 1);
    } else {
      cart.push({ name, price, quantity: 1 });
    }
    
    saveCart();

    const rect = button.getBoundingClientRect();
    flyCookie(rect.left + rect.width / 2, rect.top + rect.height / 2);

    const toast = document.createElement('div');
    toast.textContent = `Added ${name} to your box!`;
    toast.setAttribute('role', 'status');
    toast.style.cssText = `
      position: fixed; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translate(-50%, 20px); 
      width: max-content; max-width: calc(100vw - 32px); text-align: center; pointer-events: none; 
      background: var(--caramel); color: white; padding: 12px 24px; border-radius: 999px; 
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
    try { localStorage.setItem('youyou_cart', JSON.stringify(cart)); } catch (e) { /* storage unavailable */ }
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
    if (!cart[index]) return;
    cart[index].quantity = Math.min(99, cart[index].quantity + change);
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
  };

  window.updateCartUI = function() {
    const cartBadge = document.getElementById('cart-badge');
    let totalItemCount = 0;
    cart.forEach(item => {
      totalItemCount += item.quantity;
    });

    if (cartBadge) {
      if (totalItemCount > 0) {
        cartBadge.textContent = totalItemCount;
        cartBadge.style.display = 'flex';
      } else {
        cartBadge.style.display = 'none';
      }
    }

    if (!cartItemsList) return;

    let subtotal = 0;
    cart.forEach(item => {
      subtotal += (item.price * item.quantity);
    });

    const STANDARD_DELIVERY_FEE = 15;
    const FREE_SHIPPING_THRESHOLD = 100;
    const deliveryFee = subtotal === 0 ? 0 : (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE);
    
    // ====== PROMO CODE MATH INTEGRATION ======
    let totalDiscount = 0;
    let freeItemText = "";
    
    const discountRow = document.getElementById("cart-discount-row");
    const discountAmountEl = document.getElementById("cart-discount-amount");
    const appliedPromoNameEl = document.getElementById("applied-promo-name");

    if (window.activePromo) {
      if (window.activePromo.minAmount && subtotal < window.activePromo.minAmount) {
        window.activePromo = null;
        const promoMsg = document.getElementById('promo-message');
        if(promoMsg) {
            promoMsg.textContent = "Promo removed (minimum amount not met).";
            promoMsg.className = "promo-message error";
            promoMsg.style.display = "block";
            promoMsg.style.color = "#c62828";
        }
        if(discountRow) discountRow.style.display = "none";
      } else {
        if(discountRow) discountRow.style.display = "flex";
        if(appliedPromoNameEl) appliedPromoNameEl.textContent = window.activePromo.code;
        
        if (window.activePromo.type === 'discount_percent') {
          totalDiscount = subtotal * (parseFloat(window.activePromo.value) / 100);
          if(discountAmountEl) discountAmountEl.textContent = "-" + totalDiscount.toFixed(2) + " DH";
        } else if (window.activePromo.type === 'discount_fixed') {
          totalDiscount = parseFloat(window.activePromo.value);
          if (totalDiscount > subtotal) totalDiscount = subtotal; 
          if(discountAmountEl) discountAmountEl.textContent = "-" + totalDiscount.toFixed(2) + " DH";
        } else if (window.activePromo.type === 'free_item') {
          freeItemText = window.activePromo.value;
          if(discountAmountEl) discountAmountEl.textContent = "🎁 " + freeItemText;
        }
      }
    } else {
      if(discountRow) discountRow.style.display = "none";
    }

    let finalTotal = (subtotal - totalDiscount) + deliveryFee;
    if (finalTotal < 0) finalTotal = 0;

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
        const amountLeft = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
        
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
            <div class="cart-item-title"></div>
            <div class="cart-item-price">${itemTotal} DH <span style="font-size:0.8rem; opacity:0.7;">(${item.price} DH each)</span></div>
          </div>
          <div class="qty-controls">
            <button onclick="window.updateQuantity(${index}, -1)" class="qty-btn" title="Remove" aria-label="Remove one">&minus;</button>
            <span class="qty-val">${item.quantity}</span>
            <button onclick="window.updateQuantity(${index}, 1)" class="qty-btn" title="Add" aria-label="Add one">&plus;</button>
          </div>
        `;
        li.querySelector('.cart-item-title').textContent = item.name;
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
    
    if (cartTotal) cartTotal.textContent = finalTotal.toFixed(2);
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
          
          <div id="confirm-real-price-summary" style="font-size: 0.95rem; color: var(--brown-soft); text-decoration: line-through; display: none;"></div>
          <div id="confirm-promo-summary" style="font-size: 0.95rem; color: #57a05f; font-weight: bold; display: none;"></div>
          
          <div id="confirm-delivery-summary" style="font-size: 0.85rem; color: var(--brown-soft); margin-top: 5px;"></div>
          <div style="text-align: right; font-weight: bold; color: var(--caramel); font-size: 1.1rem; border-top: 1px dashed rgba(74,55,40,0.2); padding-top: 10px; margin-top: 10px;">
            New Price: <span id="confirm-total-price">0 DH</span>
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
  const confirmRealPriceSummary = document.getElementById('confirm-real-price-summary');
  const confirmPromoSummary = document.getElementById('confirm-promo-summary');
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

      let totalDiscount = 0;
      let freeItemText = "";
      if (window.activePromo && (!window.activePromo.minAmount || subtotal >= window.activePromo.minAmount)) {
         if (window.activePromo.type === 'discount_percent') {
            totalDiscount = subtotal * (parseFloat(window.activePromo.value) / 100);
         } else if (window.activePromo.type === 'discount_fixed') {
            totalDiscount = parseFloat(window.activePromo.value);
            if (totalDiscount > subtotal) totalDiscount = subtotal;
         } else if (window.activePromo.type === 'free_item') {
            freeItemText = window.activePromo.value;
         }
      }

      const deliveryFee = subtotal >= 100 ? 0 : 15;
      let finalTotal = (subtotal - totalDiscount) + deliveryFee;
      if (finalTotal < 0) finalTotal = 0;

      if (confirmList) confirmList.textContent = summaryText;
      
      if (confirmRealPriceSummary) {
        if (window.activePromo) {
          confirmRealPriceSummary.style.display = "block";
          confirmRealPriceSummary.textContent = `Real Price: ${subtotal.toFixed(2)} DH`;
        } else {
          confirmRealPriceSummary.style.display = "none";
        }
      }

      if (confirmPromoSummary) {
        if (window.activePromo) {
          confirmPromoSummary.style.display = "block";
          if(freeItemText) confirmPromoSummary.textContent = `Promo Code Used: ${window.activePromo.code} (🎁 Gift: ${freeItemText})`;
          else confirmPromoSummary.textContent = `Promo Code Used: ${window.activePromo.code} (-${totalDiscount.toFixed(2)} DH)`;
        } else {
          confirmPromoSummary.style.display = "block";
          confirmPromoSummary.style.color = "var(--brown-soft)";
          confirmPromoSummary.textContent = `Promo Code Used: None`;
        }
      }
      
      if (confirmDeliverySummary) {
        confirmDeliverySummary.textContent = deliveryFee === 0 ? "Delivery Fee: Free (Order ≥ 100 DH)" : `Delivery Fee: ${deliveryFee} DH`;
      }
      if (confirmTotal) confirmTotal.textContent = `${finalTotal.toFixed(2)} DH`;

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
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) confirmModal.style.display = 'none';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && confirmModal.style.display !== 'none') confirmModal.style.display = 'none';
  });

  if (confirmSubmitBtn) {
    const newSubmitBtn = confirmSubmitBtn.cloneNode(true);
    confirmSubmitBtn.parentNode.replaceChild(newSubmitBtn, confirmSubmitBtn);
    confirmSubmitBtn = newSubmitBtn;

    confirmSubmitBtn.addEventListener('click', async () => {
      const phone = document.getElementById('confirm-phone-input').value.trim();
      const address = document.getElementById('confirm-address-input').value.trim();

      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 9 || phoneDigits.length > 15) {
        alert("Please enter a valid phone number (9 to 15 digits) to finalize your order.");
        return; 
      }
      if (!address) {
        alert("Please enter your delivery address in Settat.");
        return;
      }

      confirmSubmitBtn.disabled = true;
      confirmSubmitBtn.textContent = "Processing...";

      try {
        await processFinalCheckout(phone, address);
      } catch (err) {
        console.error("Checkout error:", err);
        alert("Something went wrong while sending your order. Please try again.");
      } finally {
        confirmSubmitBtn.disabled = false;
        confirmSubmitBtn.textContent = "Confirm & Send via WhatsApp";
        confirmModal.style.display = 'none';
      }
    });
  }

  async function processFinalCheckout(phone = "", address = "") {
    cart = sanitizeCart(cart);
    window.cart = cart;
    if (cart.length === 0) return;
    let subtotal = 0;
    cart.forEach(i => subtotal += (i.price * i.quantity));
    
    let totalDiscount = 0;
    let freeItemText = "";
    if (window.activePromo && (!window.activePromo.minAmount || subtotal >= window.activePromo.minAmount)) {
       if (window.activePromo.type === 'discount_percent') {
          totalDiscount = subtotal * (parseFloat(window.activePromo.value) / 100);
       } else if (window.activePromo.type === 'discount_fixed') {
          totalDiscount = parseFloat(window.activePromo.value);
          if (totalDiscount > subtotal) totalDiscount = subtotal;
       } else if (window.activePromo.type === 'free_item') {
          freeItemText = window.activePromo.value;
       }
    }

    const deliveryFee = subtotal >= 100 ? 0 : 15;
    let finalTotal = (subtotal - totalDiscount) + deliveryFee;
    if (finalTotal < 0) finalTotal = 0;

    // 1) Save the order (never block the WhatsApp message for more than a few seconds)
    let orderId = null;
    if (window.saveOrderToFirestore) {
      try {
        orderId = await Promise.race([
          window.saveOrderToFirestore({
            customerName: window.currentUserObj ? (window.currentUserObj.displayName || window.currentUserObj.email) : "Guest",
            phone: phone,
            address: address || "Settat",
            items: cart,
            originalPrice: subtotal,
            totalAmount: finalTotal,
            promoCode: window.activePromo ? window.activePromo.code : null,
            discountAmount: totalDiscount
          }),
          new Promise((resolve) => setTimeout(() => resolve(null), 6000))
        ]);
      } catch (err) {
        console.warn("Order save failed:", err);
      }
    }

    // 2) Mark the promo as used only if the order really was saved
    if (orderId && window.activePromo && window.activePromo.id && window.currentUserObj) {
      try {
        const { db, firestore } = await getPromoFirebaseContext();
        const promoRef = firestore.doc(db, "promo_codes", window.activePromo.id);
        await firestore.updateDoc(promoRef, {
          usedBy: firestore.arrayUnion(window.currentUserObj.uid)
        });
      } catch (err) {
        console.warn("Unable to record promo code usage:", err);
      }
    }

    // 3) Time-of-day note, in Morocco time regardless of the visitor's device
    const mt = window.getMoroccoTime ? window.getMoroccoTime() : { hour: new Date().getHours(), minute: 0 };
    const hours = window.YOUYOU_HOURS || { open: 15, close: 20 };
    let timeNote = mt.hour >= hours.close ? "🚨 *[PRE-ORDER FOR TOMORROW]*\n" : (mt.hour < hours.open ? "⏳ *[PRE-ORDER FOR TODAY (15:00 - 20:00)]*\n" : "");

    let message = `Hi YouYou's Cookies !\n${timeNote}New order${orderId ? " (Order ref: #" + orderId.slice(-6).toUpperCase() + ")" : ""}:\n\n`;
    cart.forEach(item => {
      message += `- ${item.quantity}x ${item.name} (${item.price * item.quantity} DH)\n`;
    });
    
    message += `\n*Real Price:* ${subtotal.toFixed(2)} DH\n`;
    
    if (window.activePromo && (!window.activePromo.minAmount || subtotal >= window.activePromo.minAmount)) {
        message += `*Promo Code Used:* ${window.activePromo.code}\n`;
        if (window.activePromo.type === 'free_item') {
            message += `*🎁 Free Gift:* ${freeItemText}\n`;
        } else {
            message += `*Discount:* -${totalDiscount.toFixed(2)} DH\n`;
        }
    } else {
        message += `*Promo Code Used:* None\n`;
    }
    
    message += `*Delivery:* ${deliveryFee === 0 ? 'Free' : deliveryFee + ' DH'}\n*New Price:* ${finalTotal.toFixed(2)} DH\n*Phone:* ${phone}\n*Address:* ${address || "Settat"}`;
    
    const targetPhone = "212789233029"; 
    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

    // Clear the cart first, then hand over to WhatsApp
    cart = [];
    window.activePromo = null;
    saveCart();
    window.location.href = waUrl;
    return;
  }

  // ====== APPLY PROMO CODE ENGINE ======
  window.applyPromoCode = async function () {
    const input = document.getElementById("promo-code-input");
    const message = document.getElementById("promo-message");
    const button = document.getElementById("btn-apply-promo");

    const showMessage = (htmlText, isError = false) => {
      if (!message) return;
      message.innerHTML = htmlText;
      message.style.display = "block";
      message.style.color = isError ? "#c62828" : "#2e7d32";
      message.setAttribute("role", "status");
    };

    // 1. MUST BE LOGGED IN TO USE PROMO CODES
    const user = window.currentUserObj;
    if (!user) {
      showMessage('Please <a href="login.html" style="text-decoration: underline; font-weight: bold; color: inherit;">log in</a> to use promo codes.', true);
      return;
    }

    const code = String(input?.value || "").trim().toUpperCase();
    if (!code) {
      showMessage("Enter a promo code first.", true);
      input?.focus();
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    if (subtotal <= 0) {
      showMessage("Add something to your box before applying a coupon.", true);
      return;
    }

    const originalButtonText = button ? button.textContent : "Apply";
    if (button) {
      button.disabled = true;
      button.textContent = "Checking...";
    }

    try {
      const { db, firestore } = await getPromoFirebaseContext();
      const promoQuery = firestore.query(
        firestore.collection(db, "promo_codes"),
        firestore.where("code", "==", code)
      );
      const snapshot = await firestore.getDocs(promoQuery);

      // 2. RANDOM / NON-EXISTENT CODE
      if (snapshot.empty) {
        showMessage("That promo code does not exist.", true);
        return;
      }

      const matchingDoc = snapshot.docs[0];
      const data = matchingDoc.data();

      // 3. CHECK EXPIRED, DISABLED, OR ALREADY USED BY THIS USER
      const isExpired = data.expiresAt && new Date(data.expiresAt) <= new Date();
      const isUsedByUser = Array.isArray(data.usedBy) && data.usedBy.includes(user.uid);
      const isDisabled = data.active !== true;

      if (isDisabled || isExpired || isUsedByUser) {
        showMessage("This promo code is expired or already used.", true);
        return;
      }

      // 4. MIN AMOUNT CHECK
      const minAmount = Math.max(0, Number(data.minAmount) || 0);
      if (subtotal < minAmount) {
        showMessage(`This coupon requires an order of at least ${minAmount} DH.`, true);
        return;
      }

      // 5. VALIDATE REWARD TYPE
      if (data.type === "discount_percent") {
        const value = Number(data.value);
        if (!Number.isFinite(value) || value <= 0 || value > 100) {
          showMessage("This coupon has an invalid discount. Please contact the store.", true);
          return;
        }
      } else if (data.type === "discount_fixed") {
        const value = Number(data.value);
        if (!Number.isFinite(value) || value <= 0) {
          showMessage("This coupon has an invalid discount. Please contact the store.", true);
          return;
        }
      } else if (data.type === "free_item") {
        if (!String(data.value || "").trim()) {
          showMessage("This coupon has an invalid reward. Please contact the store.", true);
          return;
        }
      }

      window.activePromo = {
        id: matchingDoc.id,
        code: String(data.code || code).trim().toUpperCase(),
        minAmount,
        type: data.type,
        value: data.value,
        active: true
      };
      updateCartUI();
      showMessage(`Coupon ${window.activePromo.code} applied successfully!`);
    } catch (error) {
      console.error("Unable to apply promo code:", error);
      showMessage("Could not verify this coupon. Check your connection and try again.", true);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText;
      }
    }
  };

  const promoInput = document.getElementById("promo-code-input");
  if (promoInput) {
    promoInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        window.applyPromoCode();
      }
    });
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

/* =========================================================
   SHARED FIRESTORE PROMO CODE ENGINE
========================================================= */
const YOUYOU_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCeiG19dex8wZ6TGSjSNe9U2JkqhP0Lbpk",
  authDomain: "youyous-cookies.firebaseapp.com",
  projectId: "youyous-cookies",
  storageBucket: "youyous-cookies.firebasestorage.app",
  messagingSenderId: "893318787156",
  appId: "1:893318787156:web:9780bb29b3eb597db97dc1",
  measurementId: "G-85M038ZLQ2"
};

let youyouPromoFirebasePromise = null;

async function getPromoFirebaseContext() {
  if (!youyouPromoFirebasePromise) {
    youyouPromoFirebasePromise = (async () => {
      const appSdk = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      const firestore = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const authSdk = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      const app = appSdk.getApps().find((candidate) => candidate.name === "[DEFAULT]")
        || appSdk.initializeApp(YOUYOU_FIREBASE_CONFIG);
      return { db: firestore.getFirestore(app), firestore, auth: authSdk.getAuth(app), authSdk };
    })().catch((error) => {
      youyouPromoFirebasePromise = null;
      throw error;
    });
  }
  return youyouPromoFirebasePromise;
}

async function requirePromoAdmin(context) {
  let user = context.auth.currentUser;
  if (!user) {
    user = await new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      unsubscribe = context.authSdk.onAuthStateChanged(
        context.auth,
        (currentUser) => {
          unsubscribe();
          resolve(currentUser);
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });
  }
  if (!user || String(user.email || "").toLowerCase() !== "youyouscookies@gmail.com") {
    throw new Error("Please sign in with the store administrator account before managing coupons.");
  }
  return user;
}

document.addEventListener("DOMContentLoaded", () => {
  const addPromoForm = document.getElementById("add-promo-form");
  const promoTypeSelect = document.getElementById("new-promo-type");
  const adminPromoList = document.getElementById("admin-promo-list");
  if (!addPromoForm || !adminPromoList) return;

  const valPercent = document.getElementById("val-percent");
  const valFixed = document.getElementById("val-fixed");
  const valFree = document.getElementById("val-free");
  const expiresInput = document.getElementById("new-promo-expires");
  let promoSnapshotDocs = [];

  let feedback = document.getElementById("admin-promo-feedback");
  if (!feedback) {
    feedback = document.createElement("p");
    feedback.id = "admin-promo-feedback";
    feedback.setAttribute("role", "status");
    feedback.style.cssText = "display:none; margin:10px 0 16px; font-weight:600; font-size:.9rem;";
    addPromoForm.insertAdjacentElement("afterend", feedback);
  }

  const setFeedback = (text, isError = false) => {
    feedback.textContent = text;
    feedback.style.display = text ? "block" : "none";
    feedback.style.color = isError ? "#c62828" : "#2e7d32";
  };

  const formatReward = (promo) => {
    if (promo.type === "discount_percent") return `${Number(promo.value)}% OFF`;
    if (promo.type === "discount_fixed") return `${Number(promo.value)} DH OFF`;
    return `FREE GIFT: ${String(promo.value || "")}`;
  };

  const renderPromos = (docs) => {
    promoSnapshotDocs = docs;
    adminPromoList.replaceChildren();

    if (!docs.length) {
      const empty = document.createElement("p");
      empty.textContent = "No promo codes created yet.";
      empty.style.cssText = "color:var(--brown-soft); padding:10px;";
      adminPromoList.appendChild(empty);
      return;
    }

    docs.forEach((promoDoc) => {
      const promo = promoDoc.data();
      const usedBy = Array.isArray(promo.usedBy) ? promo.usedBy : [];
      const usedCount = usedBy.length;

      // Timer & Expiration Calculation
      let isExpired = false;
      let timerString = "";

      if (promo.expiresAt) {
        const expDate = new Date(promo.expiresAt);
        const now = new Date();
        if (expDate <= now) {
          isExpired = true;
          timerString = `Expired on ${expDate.toLocaleDateString()} ${expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
          const diffMs = expDate - now;
          const hrs = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
          timerString = `⏳ Timer: ${hrs}h ${mins}m ${secs}s remaining`;
        }
      }

      promoDoc._wasExpired = isExpired;
      const active = promo.active === true && !isExpired;
      const card = document.createElement("div");
      card.className = `admin-promo-item ${active ? "" : "disabled"}`;

      const info = document.createElement("div");
      info.className = "promo-info";
      
      const title = document.createElement("h3");
      title.appendChild(document.createTextNode(String(promo.code || "(missing code)")));
      
      const badge = document.createElement("span");
      if (isExpired) {
        badge.className = "promo-status-badge expired";
        badge.textContent = "Expired";
      } else {
        badge.className = `promo-status-badge ${active ? "active" : "disabled"}`;
        badge.textContent = active ? "Active" : "Disabled";
      }
      title.appendChild(badge);

      const details = document.createElement("p");
      const minAmount = Math.max(0, Number(promo.minAmount) || 0);
      let conditionText = minAmount > 0 ? `Orders over ${minAmount} DH` : "No minimum amount";
      let usageText = `👥 Used by: ${usedCount} ${usedCount === 1 ? 'user' : 'users'}`;

      details.textContent = `Reward: ${formatReward(promo)} | Condition: ${conditionText} | ${usageText}`;
      if (timerString) {
        details.appendChild(document.createTextNode(" | "));
        const timerEl = document.createElement("span");
        timerEl.textContent = timerString;
        if (!isExpired) timerEl.dataset.promoTimer = promo.expiresAt;
        details.appendChild(timerEl);
      }
      info.append(title, details);

      const actions = document.createElement("div");
      actions.className = "promo-actions";
      
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "btn-promo-action btn-toggle-promo";
      toggle.dataset.promoAction = "toggle";
      toggle.dataset.id = promoDoc.id;
      toggle.textContent = active ? "Disable" : "Enable";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn-promo-action btn-delete-promo";
      remove.dataset.promoAction = "delete";
      remove.dataset.id = promoDoc.id;
      remove.textContent = "Delete";
      actions.append(toggle, remove);
      
      card.append(info, actions);
      adminPromoList.appendChild(card);
    });
  };

  // Live countdown ticker: only re-render when a code actually expires; otherwise just refresh the text
  setInterval(() => {
    if (!promoSnapshotDocs.length) return;
    const now = Date.now();
    const expiredChanged = promoSnapshotDocs.some((d) => {
      const exp = d.data().expiresAt;
      if (!exp) return false;
      const isExp = new Date(exp).getTime() <= now;
      return isExp !== (d._wasExpired === true);
    });
    if (expiredChanged) {
      renderPromos(promoSnapshotDocs);
      return;
    }
    adminPromoList.querySelectorAll('[data-promo-timer]').forEach((el) => {
      const exp = new Date(el.dataset.promoTimer).getTime();
      const diff = exp - now;
      if (diff <= 0) return;
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      el.textContent = `⏳ Timer: ${hrs}h ${mins}m ${secs}s remaining`;
    });
  }, 1000);

  const startPromoListener = async () => {
    try {
      const context = await getPromoFirebaseContext();
      await requirePromoAdmin(context);
      const { db, firestore } = context;
      firestore.onSnapshot(
        firestore.collection(db, "promo_codes"),
        (snapshot) => {
          const docs = [...snapshot.docs].sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis?.() || 0;
            const bTime = b.data().createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          });
          renderPromos(docs);
        },
        (error) => {
          console.error("Error loading promo codes:", error);
          adminPromoList.textContent = "Could not load promo codes. Check Firestore permissions.";
          adminPromoList.style.color = "#c62828";
        }
      );
    } catch (error) {
      console.error("Unable to initialize promo manager:", error);
      adminPromoList.textContent = "Could not connect to Firebase. Check the browser console for details.";
      adminPromoList.style.color = "#c62828";
    }
  };

  addPromoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("");

    const codeInput = document.getElementById("new-promo-code");
    const minAmountInput = document.getElementById("new-promo-min-amount");
    const code = String(codeInput?.value || "").trim().toUpperCase();
    const minAmount = Number(minAmountInput?.value);
    const type = promoTypeSelect?.value;
    const expiresAt = expiresInput?.value ? expiresInput.value : null;
    let value;

    if (!code) {
      setFeedback("Please enter a promo code.", true);
      codeInput?.focus();
      return;
    }
    if (!Number.isFinite(minAmount) || minAmount < 0) {
      setFeedback("Please enter a valid minimum order amount.", true);
      return;
    }
    if (type === "discount_percent") {
      value = Number(valPercent?.value);
      if (!Number.isFinite(value) || value < 1 || value > 100) {
        setFeedback("Enter a percentage between 1 and 100.", true);
        valPercent?.focus();
        return;
      }
    } else if (type === "discount_fixed") {
      value = Number(valFixed?.value);
      if (!Number.isFinite(value) || value <= 0) {
        setFeedback("Enter a fixed discount greater than 0 DH.", true);
        valFixed?.focus();
        return;
      }
    } else if (type === "free_item") {
      value = String(valFree?.value || "").trim();
      if (!value) {
        setFeedback("Enter the name of the free gift.", true);
        valFree?.focus();
        return;
      }
    } else {
      setFeedback("Please select a valid reward type.", true);
      return;
    }

    const submitButton = addPromoForm.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || "Save Promo Code";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }

    try {
      const context = await getPromoFirebaseContext();
      await requirePromoAdmin(context);
      const { db, firestore } = context;
      const existing = await firestore.getDocs(firestore.collection(db, "promo_codes"));
      const duplicate = existing.docs.some((promoDoc) =>
        String(promoDoc.data().code || "").trim().toUpperCase() === code
      );
      if (duplicate) {
        setFeedback(`The promo code ${code} already exists. Choose a different code.`, true);
        return;
      }

      await firestore.addDoc(firestore.collection(db, "promo_codes"), {
        code,
        minAmount,
        type,
        value,
        expiresAt,
        usedBy: [],
        active: true,
        createdAt: firestore.serverTimestamp()
      });

      addPromoForm.reset();
      if (promoTypeSelect) promoTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      setFeedback(`Promo code ${code} saved successfully. It should now appear in the list below.`);
    } catch (error) {
      console.error("Error saving promo code:", error);
      setFeedback(`Failed to save promo code: ${error.message || "Unknown Firebase error"}`, true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });

  adminPromoList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-promo-action]");
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.promoAction;
    if (!id) return;
    if (action === "delete" && !window.confirm("Permanently delete this promo code?")) return;

    button.disabled = true;
    try {
      const context = await getPromoFirebaseContext();
      await requirePromoAdmin(context);
      const { db, firestore } = context;
      if (action === "toggle") {
        const record = promoSnapshotDocs.find((item) => item.id === id);
        if (!record) throw new Error("Promo code not found. Refresh the page and try again.");
        await firestore.updateDoc(firestore.doc(db, "promo_codes", id), {
          active: record.data().active !== true
        });
        setFeedback("Promo status updated.");
      } else if (action === "delete") {
        await firestore.deleteDoc(firestore.doc(db, "promo_codes", id));
        setFeedback("Promo code deleted.");
      }
    } catch (error) {
      console.error("Unable to update promo code:", error);
      setFeedback(`Promo action failed: ${error.message || "Unknown Firebase error"}`, true);
    } finally {
      button.disabled = false;
    }
  });

  startPromoListener();
});