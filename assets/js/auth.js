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
  updateDoc 
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

// --- GLOBAL AUTH STATE observer ---
onAuthStateChanged(auth, async (user) => {
  const userIconLink = document.getElementById('user-icon-link');
  const userIconWrapper = document.getElementById('user-icon-wrapper');

  if (user) {
    if (userIconLink && userIconWrapper) {
      userIconLink.href = user.email === ADMIN_EMAIL ? "admin.html" : "profile.html";
      const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=c1771e&color=fff`;
      userIconWrapper.innerHTML = `<img src="${photoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    }

    let userData = null;
    let userDocExists = false;

    try {
      const userDocSnap = await getDoc(doc(db, "users", user.uid));
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        userDocExists = true;
        
        const cartAddressInput = document.getElementById('cart-address');
        if (cartAddressInput && userData.address) {
          cartAddressInput.value = userData.address;
        }
      }
    } catch (e) {
      console.warn("Could not fetch user data:", e);
    }

    // --- PROFILE PAGE LOGIC ---
    if (window.location.pathname.includes('profile.html')) {
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

      // Sync & Render Cart
      syncAndRenderProfileCart(user, db, userData, userDocExists);

      // Load Customer Order History
      loadCustomerOrderHistory(user, db);
    }

    // --- ADMIN PAGE LOGIC ---
    if (window.location.pathname.includes('admin.html')) {
      if (user.email !== ADMIN_EMAIL) {
        window.location.href = "profile.html"; 
        return;
      }
      initAdminDashboard(db);
    }

  } else {
    if (userIconLink) userIconLink.href = "login.html";
    if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('admin.html')) {
      window.location.href = "login.html"; 
    }
  }
});

// --- HELPER: Sync and Render Cart in Profile ---
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
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    total += itemTotal;

    basketList.innerHTML += `
      <div class="basket-item-row">
        <div style="display: flex; align-items: center; gap: 15px;">
          <div class="basket-item-badge">${item.quantity || 1}x</div>
          <div>
            <strong style="color: var(--brown); font-size: 1.05rem;">${item.name || 'Cookie Treat'}</strong><br>
            <span style="color: var(--brown-soft); font-size: 0.85rem;">${item.price || 0} DH each</span>
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
      <button onclick="document.getElementById('cart-panel').style.display='block'" class="btn btn-dark">Open Box & Checkout</button>
    </div>
  `;
}

// --- HELPER: Load Customer Order History ---
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
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const isDelivered = data.status === 'Delivered';
      const itemsList = Array.isArray(data.items) 
        ? data.items.map(i => `${i.quantity}x ${i.name}`).join(', ') 
        : (data.itemsSummary || 'Cookie Box Order');

      historyContainer.innerHTML += `
        <div class="order-history-card">
          <div class="order-history-header">
            <div>
              <strong>Order #${docSnap.id.slice(-6).toUpperCase()}</strong>
              <div style="font-size: 0.8rem; color: var(--brown-soft);">${data.date || 'Recent Order'}</div>
            </div>
            <span class="status-pill-badge ${isDelivered ? 'delivered' : 'processing'}">
              ${data.status || 'Processing'}
            </span>
          </div>
          <div style="font-size: 0.9rem; margin: 10px 0; color: var(--brown-soft);">
            ${itemsList}
          </div>
          <div style="text-align: right; font-weight: bold; color: var(--caramel);">
            ${data.totalAmount || 0} DH
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.warn("Could not load order history:", err);
    historyContainer.innerHTML = '<p style="color: var(--brown-soft); font-style: italic;">Unable to load order history.</p>';
  }
}

// --- HELPER: Admin Dashboard Initialization ---
async function initAdminDashboard(db) {
  const usersList = document.getElementById('admin-users');
  const ordersList = document.getElementById('admin-orders');

  // Stats Counters
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
      ordersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const orderId = docSnap.id;
        const isDelivered = data.status === 'Delivered';
        const amount = Number(data.totalAmount) || 0;

        totalRevenue += amount;
        if (!isDelivered) pendingOrdersCount++;

        const itemsSummary = Array.isArray(data.items) 
          ? data.items.map(i => `${i.quantity}x ${i.name}`).join(', ') 
          : (data.itemsSummary || 'Standard Box');

        const orderCard = document.createElement('div');
        orderCard.className = `admin-order-card ${isDelivered ? 'is-delivered' : 'is-pending'}`;
        orderCard.setAttribute('data-status', isDelivered ? 'Delivered' : 'Processing');

        orderCard.innerHTML = `
          <div class="admin-order-header">
            <div>
              <strong style="font-size: 1.1rem; color: var(--brown);">Order #${orderId.slice(-6).toUpperCase()}</strong>
              <span style="font-size: 0.8rem; color: var(--brown-soft); margin-left: 8px;">(${data.date || 'Today'})</span>
            </div>
            <span id="badge-status-${orderId}" class="status-pill-badge ${isDelivered ? 'delivered' : 'processing'}">
              ${data.status || 'Processing'}
            </span>
          </div>

          <div style="margin: 10px 0; font-size: 0.9rem; line-height: 1.5;">
            <strong>Items:</strong> ${itemsSummary}<br>
            <strong>Customer:</strong> ${data.customerName || data.userEmail || 'Guest'}<br>
            <strong>Phone:</strong> ${data.phone || 'N/A'}<br>
            <strong>Address:</strong> ${data.address || 'Cash on Delivery / Local pickup'}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed rgba(74,55,40,0.15);">
            <div style="font-size: 1.2rem; font-weight: bold; color: var(--caramel);">
              ${amount} DH
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              ${data.phone ? `<a href="https://wa.me/${data.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn-whatsapp-sm">WhatsApp</a>` : ''}
              <label class="delivery-toggle-label">
                <input type="checkbox" class="status-checkbox" data-id="${orderId}" ${isDelivered ? 'checked' : ''}>
                <span>Mark Delivered</span>
              </label>
            </div>
          </div>
        `;

        ordersList.appendChild(orderCard);
      });

      // Handle Checkbox Changes
      document.querySelectorAll('.status-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
          const orderId = e.target.getAttribute('data-id');
          const newStatus = e.target.checked ? 'Delivered' : 'Processing';
          const badge = document.getElementById(`badge-status-${orderId}`);
          
          try {
            await updateDoc(doc(db, "orders", orderId), { status: newStatus });
            if (badge) {
              badge.textContent = newStatus;
              badge.className = `status-pill-badge ${newStatus === 'Delivered' ? 'delivered' : 'processing'}`;
            }
          } catch (error) {
            console.error("Error updating order:", error);
            e.target.checked = !e.target.checked;
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

// --- FORGOT PASSWORD HANDLER ---
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
      msg.textContent = error.message.replace("Firebase: ", "");
    }
  });
}

// --- PROFILE FORM UPDATES ---
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
      msg.textContent = error.message.replace("Firebase: ", "");
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

// Auth forms (Login, Signup, Google, Logout)
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
        errEl.textContent = "Invalid email or password.";
      }
    }
  });
}

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
        role: email === ADMIN_EMAIL ? "admin" : "customer", 
        joinedAt: new Date()
      });
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById('error-msg');
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = error.message.replace("Firebase: ", "");
      }
    }
  });
}

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
          role: cred.user.email === ADMIN_EMAIL ? "admin" : "customer", 
          joinedAt: new Date()
        });
      }
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById('error-msg');
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = "Google Sign-In failed.";
      }
    }
  });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });
}