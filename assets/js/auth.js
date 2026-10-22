import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  updatePassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCeiG19dex8wZ6TGSjSNe9U2JkqhP0Lbpk",
  authDomain: "youyous-cookies.firebaseapp.com",
  projectId: "youyous-cookies",
  storageBucket: "youyous-cookies.firebasestorage.app",
  messagingSenderId: "893318787156",
  appId: "1:893318787156:web:9780bb29b3eb597db97dc1",
  measurementId: "G-85M038ZLQ2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const ADMIN_EMAIL = "youyouscookies@gmail.com";
window.currentUserObj = null;
window.userDataObj = null;

// ---- helpers ----
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PAGE = (window.location.pathname.split("/").pop() || "index").replace(/\.html$/, "");
const createdMs = (d) => { const t = d.data().createdAt; return t && typeof t.toMillis === "function" ? t.toMillis() : 0; };
const sortNewestFirst = (docs) => [...docs].sort((a, b) => createdMs(b) - createdMs(a));

function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 10) d = "212" + d.slice(1);
  return d;
}

function authMessage(err, fallback) {
  const map = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/user-not-found": "Invalid email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/requires-recent-login": "For security, please log out and log back in, then change your password.",
    "auth/popup-closed-by-user": "The sign-in window was closed before finishing.",
    "auth/popup-blocked": "Your browser blocked the sign-in popup. Please allow popups and try again."
  };
  return map[err && err.code] || fallback || "Something went wrong. Please try again.";
}

// --- GLOBAL SAVE ORDER METHOD FOR FIRESTORE (WITH PROFILE PHONE/ADDRESS BACKUP) ---
window.saveOrderToFirestore = async function(orderData) {
  try {
    const user = auth.currentUser;

    // Bulletproof fallback: if orderData phone/address is empty, pull from global cached user doc data
    let finalPhone = orderData.phone;
    if (!finalPhone && window.userDataObj && window.userDataObj.phone) {
      finalPhone = window.userDataObj.phone;
    }

    let finalAddress = orderData.address;
    if ((!finalAddress || finalAddress === "Settat") && window.userDataObj && window.userDataObj.address) {
      finalAddress = window.userDataObj.address;
    }

    const items = (Array.isArray(orderData.items) ? orderData.items : []).slice(0, 50).map((i) => ({
      name: String((i && i.name) || "Item").slice(0, 60),
      price: Math.max(0, Number(i && i.price) || 0),
      quantity: Math.min(99, Math.max(1, parseInt(i && i.quantity, 10) || 1))
    }));
    if (items.length === 0) return null;
    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const finalData = {
      userId: user ? user.uid : "guest",
      userEmail: user ? user.email : "Guest",
      customerName: String(orderData.customerName || (user && user.displayName) || (window.userDataObj ? window.userDataObj.username : "") || "Guest").slice(0, 80),
      phone: String(finalPhone || "").slice(0, 30),
      address: String(finalAddress || "Settat").slice(0, 400),
      items: items,
      totalAmount: totalAmount,
      status: "Processing",
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' }),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "orders"), finalData);
    return docRef.id;
  } catch (error) {
    console.error("Firestore Order Saving Error:", error);
    return null;
  }
};

// --- GLOBAL AUTH STATE OBSERVER ---
onAuthStateChanged(auth, async (user) => {
  window.currentUserObj = user;
  const userIconLink = document.getElementById('user-icon-link');
  const userIconWrapper = document.getElementById('user-icon-wrapper');

  if (user) {
    if (userIconLink && userIconWrapper) {
      userIconLink.href = user.email === ADMIN_EMAIL ? "admin.html" : "profile.html";
      const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=c1771e&color=fff`;
      userIconWrapper.innerHTML = `<img src="${esc(photoUrl)}" alt="Account" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    }

    let userData = null;
    let userDocExists = false;

    try {
      const userDocSnap = await getDoc(doc(db, "users", user.uid));
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        window.userDataObj = userData; // Expose profile data globally for auto-filling & backups
        userDocExists = true;
        
        const cartAddressInput = document.getElementById('cart-address');
        if (cartAddressInput && userData.address) {
          cartAddressInput.value = userData.address;
        }
      }
    } catch (e) {
      console.warn("Could not fetch user profile:", e);
    }

    // PROFILE PAGE
    if (PAGE === 'profile') {
      if (user.email === ADMIN_EMAIL) {
        window.location.href = "admin.html"; 
        return;
      }

      const emailEl = document.getElementById('profile-email');
      if (emailEl) emailEl.textContent = user.email;

      const profilePic = document.getElementById('profile-picture');
      if (profilePic) {
        profilePic.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=c1771e&color=fff&size=128`;
        profilePic.style.display = "block";
      }

      if (userDocExists && userData) {
        const displayName = userData.username || user.displayName || "Cookie Lover";
        const nameEl = document.getElementById('profile-name');
        if (nameEl) nameEl.textContent = displayName;
        
        const editUsername = document.getElementById('edit-username');
        const editAddress = document.getElementById('edit-address');
        const editPhone = document.getElementById('edit-phone');

        if (editUsername) editUsername.value = displayName;
        if (editAddress) editAddress.value = userData.address || "";
        if (editPhone) editPhone.value = userData.phone || "";
      }

      syncAndRenderProfileCart(user, db, userData, userDocExists);
      loadCustomerOrderHistory(user, db);
    }

    // ADMIN PAGE
    if (PAGE === 'admin') {
      if (user.email !== ADMIN_EMAIL) {
        window.location.href = "profile.html"; 
        return;
      }
      initAdminDashboard(db);
    }

  } else {
    if (userIconLink) userIconLink.href = "login.html";
    if (PAGE === 'profile' || PAGE === 'admin') {
      window.location.href = "login.html"; 
    }
  }
});

// Sync Profile Cart
async function syncAndRenderProfileCart(user, db, userData, userDocExists) {
  let rawCartString = localStorage.getItem('youyou_cart');
  let localCart = [];
  const userRef = doc(db, "users", user.uid);

  try {
    if (rawCartString !== null) {
      localCart = JSON.parse(rawCartString);
      if (!Array.isArray(localCart)) localCart = Object.values(localCart);
      await updateDoc(userRef, { cart: localCart });
    } else if (userDocExists && userData.cart) {
      localCart = userData.cart;
      localStorage.setItem('youyou_cart', JSON.stringify(localCart));
    }
  } catch(err) {
    console.warn("Cart sync notice:", err);
  }

  const basketList = document.getElementById('profile-basket-list');
  if (!basketList) return;

  if (localCart.length === 0) {
    basketList.innerHTML = '<p style="color: var(--brown-soft); font-style: italic; text-align: center; padding: 20px 0;">Your cookie box is currently empty. Visit the menu to stock up!</p>';
    return;
  }

  basketList.innerHTML = "";
  let total = 0;
  
  localCart.forEach((item) => {
    const itemPrice = Number(item.price) || 0;
    const itemQty = Number(item.quantity) || 1;
    const itemTotal = itemPrice * itemQty;
    total += itemTotal;

    basketList.innerHTML += `
      <div class="basket-item-row">
        <div style="display: flex; align-items: center; gap: 15px;">
          <div class="basket-item-badge">${itemQty}x</div>
          <div>
            <strong style="color: var(--brown); font-size: 1.05rem;">${esc(item.name || 'Cookie Treat')}</strong><br>
            <span style="color: var(--brown-soft); font-size: 0.85rem;">${itemPrice} DH each</span>
          </div>
        </div>
        <div style="color: var(--caramel); font-weight: bold; font-size: 1.1rem;">
          ${itemTotal} DH
        </div>
      </div>
    `;
  });

  basketList.innerHTML += `
    <div style="padding-top: 20px; text-align: right;">
      <p style="font-size: 1.2rem; margin-bottom: 12px;">Total: <strong style="color: var(--caramel); font-size: 1.4rem;">${total} DH</strong></p>
      <button onclick="window.openBoxModal()" class="btn btn-dark">Open Box & Checkout</button>
    </div>
  `;
}

// Global Helper to trigger box panel
window.openBoxModal = function() {
  const panel = document.getElementById('cart-panel');
  if (panel) {
    panel.style.display = 'block';
  } else {
    window.location.href = "menu.html";
  }
};

// Customer Order History Loader (With Cancel Option)
async function loadCustomerOrderHistory(user, db) {
  const historyContainer = document.getElementById('profile-order-history');
  if (!historyContainer) return;

  try {
    const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(ordersQuery);

    if (querySnapshot.empty) {
      historyContainer.innerHTML = '<p style="color: var(--brown-soft); font-style: italic;">No previous orders found.</p>';
      return;
    }

    historyContainer.innerHTML = "";
    sortNewestFirst(querySnapshot.docs).forEach((docSnap) => {
      const data = docSnap.data();
      const orderId = docSnap.id;
      const isDelivered = data.status === 'Delivered';
      const isCancelled = data.status === 'Cancelled';
      const isProcessing = data.status === 'Processing';

      let statusClass = 'processing';
      if (isDelivered) statusClass = 'delivered';
      if (isCancelled) statusClass = 'cancelled';

      const itemsList = Array.isArray(data.items) 
        ? data.items.map(i => `${esc(i.quantity)}x ${esc(i.name)}`).join(', ') 
        : esc(data.itemsSummary || 'Cookie Box Order');

      historyContainer.innerHTML += `
        <div class="order-history-card">
          <div class="order-history-header">
            <div>
              <strong style="color: var(--brown);">Order #${orderId.slice(-6).toUpperCase()}</strong>
              <div style="font-size: 0.8rem; color: var(--brown-soft);">${esc(data.date || 'Recent Order')}</div>
            </div>
            <span class="status-pill-badge ${statusClass}" id="customer-status-${orderId}" ${isCancelled ? 'style="background:#ffebee; color:#c62828;"' : ''}>
              ${esc(data.status || 'Processing')}
            </span>
          </div>
          <div style="font-size: 0.9rem; margin: 10px 0; color: var(--brown-soft);">
            ${itemsList}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <div style="font-weight: bold; color: ${isCancelled ? '#888; text-decoration: line-through;' : 'var(--caramel);'}">
              ${Number(data.totalAmount) || 0} DH
            </div>
            ${isProcessing ? `<button class="btn-cancel-order" data-id="${orderId}" style="background: transparent; border: 1px solid #d9534f; color: #d9534f; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: 0.2s;">Cancel Order</button>` : ''}
          </div>
        </div>
      `;
    });

    // Attach Event Listeners for Customer Cancellation
    document.querySelectorAll('.btn-cancel-order').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const orderId = e.target.getAttribute('data-id');
        if (confirm("Are you sure you want to cancel this order?")) {
          try {
            e.target.disabled = true;
            e.target.textContent = "Cancelling...";
            await updateDoc(doc(db, "orders", orderId), { status: "Cancelled" });
            
            e.target.style.display = 'none';
            const statusBadge = document.getElementById(`customer-status-${orderId}`);
            if (statusBadge) {
              statusBadge.textContent = "Cancelled";
              statusBadge.className = "status-pill-badge cancelled";
              statusBadge.style = "background:#ffebee; color:#c62828;";
            }
          } catch(err) {
            console.error("Failed to cancel order", err);
            alert("Could not cancel order. Please try again.");
            e.target.disabled = false;
            e.target.textContent = "Cancel Order";
          }
        }
      });
    });

  } catch (err) {
    console.warn("Could not load order history:", err);
    historyContainer.innerHTML = '<p style="color: var(--brown-soft); font-style: italic;">Unable to load order history.</p>';
  }
}

// Admin Dashboard Loader
async function loadAdminDashboard(db) {
  const usersList = document.getElementById('admin-users');
  const ordersList = document.getElementById('admin-orders');

  const statRevenue = document.getElementById('stat-total-revenue');
  const statOrders = document.getElementById('stat-total-orders');
  const statPending = document.getElementById('stat-pending-orders');
  const statUsers = document.getElementById('stat-total-users');

  let totalRevenue = 0;
  let totalOrdersCount = 0;
  let pendingOrdersCount = 0;

  // Load Users
  if (usersList) {
    const usersSnapshot = await getDocs(collection(db, "users"));
    usersList.innerHTML = "";
    if (statUsers) statUsers.textContent = usersSnapshot.size;

    if (usersSnapshot.empty) {
      usersList.innerHTML = '<p style="color: var(--brown-soft); font-style: italic;">No registered users yet.</p>';
    } else {
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const card = document.createElement('div');
        card.className = "admin-user-card";

        const infoDiv = document.createElement('div');
        const nameEl = document.createElement('strong');
        nameEl.style.cssText = "font-size: 1rem; color: var(--brown); display: block;";
        nameEl.textContent = data.username || 'Anonymous User';

        const emailEl = document.createElement('span');
        emailEl.style.cssText = "font-size: 0.85rem; color: var(--brown-soft); display: block;";
        emailEl.textContent = data.email || 'No Email';

        infoDiv.appendChild(nameEl);
        infoDiv.appendChild(emailEl);

        const badge = document.createElement('span');
        badge.className = `role-badge ${data.role === 'admin' ? 'admin' : 'customer'}`;
        badge.textContent = data.role || 'customer';

        card.appendChild(infoDiv);
        card.appendChild(badge);
        usersList.appendChild(card);
      });
    }
  }

  // Load Orders
  if (ordersList) {
    const ordersSnapshot = await getDocs(collection(db, "orders"));
    ordersList.innerHTML = "";
    totalOrdersCount = ordersSnapshot.size;

    if (ordersSnapshot.empty) {
      ordersList.innerHTML = '<p style="color: var(--brown-soft); font-style: italic;">No orders placed yet.</p>';
    } else {
      sortNewestFirst(ordersSnapshot.docs).forEach((docSnap) => {
        const data = docSnap.data();
        const orderId = docSnap.id;
        const isDelivered = data.status === 'Delivered';
        const isCancelled = data.status === 'Cancelled';
        const isProcessing = data.status === 'Processing';
        const amount = Number(data.totalAmount) || 0;

        // Only count revenue if the order isn't cancelled
        if (!isCancelled) totalRevenue += amount;
        if (isProcessing) pendingOrdersCount++;

        const itemsSummary = Array.isArray(data.items) 
          ? data.items.map(i => `${esc(i.quantity)}x ${esc(i.name)}`).join(', ') 
          : esc(data.itemsSummary || 'Standard Box');

        let statusClass = 'processing';
        if (isDelivered) statusClass = 'delivered';
        if (isCancelled) statusClass = 'cancelled';

        const orderCard = document.createElement('div');
        orderCard.className = `admin-order-card ${isDelivered ? 'is-delivered' : (isCancelled ? 'is-cancelled' : 'is-pending')}`;
        orderCard.setAttribute('data-status', data.status || 'Processing');

        orderCard.innerHTML = `
          <div class="admin-order-header">
            <div>
              <strong style="font-size: 1.1rem; color: var(--brown);">Order #${orderId.slice(-6).toUpperCase()}</strong>
              <span style="font-size: 0.8rem; color: var(--brown-soft); margin-left: 8px;">(${esc(data.date || 'Today')})</span>
            </div>
            <span id="badge-status-${esc(orderId)}" class="status-pill-badge ${statusClass}" ${isCancelled ? 'style="background:#ffebee; color:#c62828;"' : ''}>
              ${esc(data.status || 'Processing')}
            </span>
          </div>

          <div style="margin: 10px 0; font-size: 0.9rem; line-height: 1.5; color: var(--brown-soft);">
            <strong>Items:</strong> ${itemsSummary}<br>
            <strong>Customer:</strong> ${esc(data.customerName || data.userEmail || 'Guest')}<br>
            <strong>Phone:</strong> <span style="color: ${data.phone ? 'inherit' : '#d9534f'}">${esc(data.phone || 'N/A')}</span><br>
            <strong>Address:</strong> ${esc(data.address || 'Settat')}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed rgba(74,55,40,0.15);">
            <div style="font-size: 1.2rem; font-weight: bold; color: ${isCancelled ? '#888; text-decoration: line-through;' : 'var(--caramel);'}">
              ${amount} DH
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              ${data.phone ? `<a href="https://wa.me/${esc(normalizePhone(data.phone))}" target="_blank" rel="noopener" class="btn-whatsapp-sm">WhatsApp</a>` : ''}
              
              <select class="admin-status-dropdown" data-id="${esc(orderId)}" style="padding:5px; border-radius:5px; border:1px solid #ccc; background:#fff; font-size:0.85rem; cursor:pointer;">
                <option value="Processing" ${isProcessing ? 'selected' : ''}>Processing</option>
                <option value="Delivered" ${isDelivered ? 'selected' : ''}>Delivered</option>
                <option value="Cancelled" ${isCancelled ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>
          </div>
        `;

        ordersList.appendChild(orderCard);
      });

      // Admin Status Dropdown Handler
      document.querySelectorAll('.admin-status-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', async (e) => {
          const orderId = e.target.getAttribute('data-id');
          const newStatus = e.target.value;
          const badge = document.getElementById(`badge-status-${orderId}`);
          
          try {
            await updateDoc(doc(db, "orders", orderId), { status: newStatus });
            if (badge) {
              badge.textContent = newStatus;
              if (newStatus === "Delivered") {
                badge.className = "status-pill-badge delivered";
                badge.style = "";
              } else if (newStatus === "Cancelled") {
                badge.className = "status-pill-badge cancelled";
                badge.style = "background:#ffebee; color:#c62828;";
              } else {
                badge.className = "status-pill-badge processing";
                badge.style = "";
              }
            }
          } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
          }
        });
      });
    }

    if (statRevenue) statRevenue.textContent = `${totalRevenue} DH`;
    if (statOrders) statOrders.textContent = totalOrdersCount;
    if (statPending) statPending.textContent = pendingOrdersCount;
  }
}

async function initAdminDashboard(db) {
  try {
    await loadAdminDashboard(db);
  } catch (err) {
    console.error("Admin dashboard error:", err);
    ["admin-orders", "admin-users"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "Could not load data. Check your connection and Firestore rules.";
    });
  }
}

// Password Reset Form
const forgotPasswordForm = document.getElementById('forgot-password-form');
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const resetEmail = document.getElementById('reset-email').value;
    const msg = document.getElementById('reset-msg');

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      msg.style.display = "block";
      msg.style.color = "#57a05f";
      msg.textContent = "Password reset email sent! Check your inbox.";
      forgotPasswordForm.reset();
    } catch (error) {
      msg.style.display = "block";
      msg.style.color = "#d9534f";
      msg.textContent = authMessage(error);
    }
  });
}

// Profile Info Form
const infoForm = document.getElementById('profile-info-form');
if (infoForm) {
  infoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('edit-username').value;
    const newAddress = document.getElementById('edit-address').value;
    const newPhone = document.getElementById('edit-phone') ? document.getElementById('edit-phone').value : "";
    const msg = document.getElementById('info-msg');
    
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          username: newUsername,
          address: newAddress,
          phone: newPhone
        });
        
        // Update cached data immediately
        if (window.userDataObj) {
          window.userDataObj.username = newUsername;
          window.userDataObj.address = newAddress;
          window.userDataObj.phone = newPhone;
        }

        const nameEl = document.getElementById('profile-name');
        if (nameEl) nameEl.textContent = newUsername;

        msg.style.display = "block";
        msg.style.color = "#57a05f";
        msg.textContent = "Profile details saved!";
        setTimeout(() => { msg.style.display = "none"; }, 4000);
      }
    } catch (error) {
      msg.style.display = "block";
      msg.style.color = "#d9534f";
      msg.textContent = "Error saving profile details.";
    }
  });
}

// Password Form
const passwordForm = document.getElementById('password-form');
if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const msg = document.getElementById('password-msg');
    try {
      await updatePassword(auth.currentUser, newPassword);
      msg.style.display = "block";
      msg.style.color = "#57a05f";
      msg.textContent = "Password updated successfully!";
      passwordForm.reset();
      setTimeout(() => { msg.style.display = "none"; }, 4000);
    } catch (error) {
      msg.style.display = "block";
      msg.style.color = "#d9534f";
      msg.textContent = authMessage(error);
    }
  });
}

function routeUser(user) {
  if (user.email === ADMIN_EMAIL) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "profile.html";
  }
}

// Login
const loginForm = document.getElementById('auth-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById('error-msg');
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = authMessage(error);
      }
    }
  });
}

// Signup
const signupForm = document.getElementById('auth-form-signup');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        username: username, 
        email: email, 
        role: "customer", 
        joinedAt: new Date()
      });
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById('error-msg');
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = authMessage(error);
      }
    }
  });
}

// Google Sign In
const googleBtn = document.getElementById('google-btn');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          username: cred.user.displayName, 
          email: cred.user.email, 
          role: "customer", 
          joinedAt: new Date()
        });
      }
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById('error-msg');
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = authMessage(error, "Google Sign-In failed.");
      }
    }
  });
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });
}