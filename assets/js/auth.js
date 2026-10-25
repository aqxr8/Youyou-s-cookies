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
  deleteDoc,
  arrayUnion,
  increment,
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

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const PAGE = (window.location.pathname.split("/").pop() || "index")
  .replace(/\.html$/, "");

const createdMs = (d) => {
  const t = d.data().createdAt;
  return t && typeof t.toMillis === "function" ? t.toMillis() : 0;
};

const sortNewestFirst = (docs) =>
  [...docs].sort((a, b) => createdMs(b) - createdMs(a));

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
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "The password must contain at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later."
  };

  return map[err && err.code] || fallback || "An error occurred.";
}

// --- RANKING SYSTEM HELPERS ---

function getCookieRank(totalSpent) {
  if (totalSpent >= 800) {
    return { name: "Cookie Legend", icon: "👑", color: "#d49a00", bg: "#fff9e6" };
  }
  if (totalSpent >= 400) {
    return { name: "Sugar Boss", icon: "🧁", color: "#a85a3e", bg: "#fcedec" };
  }
  if (totalSpent >= 150) {
    return { name: "Cookie Lover", icon: "🤎", color: "#be5191", bg: "#fdf3f8" };
  }
  return { name: "Cookie Fan", icon: "🍪", color: "#7a5c46", bg: "#f5f0ec" };
}

function updateProfileRankBadge(totalSpent) {
  const rank = getCookieRank(totalSpent);
  const rankBadge = document.querySelector(".profile-hero-card .status-pill-badge");

  if (rankBadge) {
    rankBadge.innerHTML = `${rank.icon} ${rank.name}`;
    rankBadge.style.backgroundColor = rank.bg;
    rankBadge.style.color = rank.color;
    rankBadge.style.border = `1px solid ${rank.color}40`;
  }

  const progressContainer = document.getElementById("rank-progress-container");
  const progressFill = document.getElementById("rank-progress-fill");
  const currentText = document.getElementById("rank-current-text");
  const nextText = document.getElementById("rank-next-text");

  if (progressContainer && progressFill && nextText && currentText) {
    progressContainer.style.display = "block";
    currentText.textContent = `${totalSpent} DH spent`;

    let nextThreshold = 0;
    let currentBase = 0;
    let nextRankName = "";

    if (totalSpent < 150) {
      nextThreshold = 150; currentBase = 0; nextRankName = "🤎 Cookie Lover";
    } else if (totalSpent < 400) {
      nextThreshold = 400; currentBase = 150; nextRankName = "🧁 Sugar Boss";
    } else if (totalSpent < 800) {
      nextThreshold = 800; currentBase = 400; nextRankName = "👑 Cookie Legend";
    }

    if (totalSpent >= 800) {
      progressFill.style.width = "100%";
      progressFill.style.background = "#d49a00";
      nextText.innerHTML = `<span style="color: #d49a00; font-weight: bold;">Maximum Level Reached! 👑</span>`;
    } else {
      const amountNeeded = nextThreshold - totalSpent;
      const percentage = ((totalSpent - currentBase) / (nextThreshold - currentBase)) * 100;
      progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
      progressFill.style.background = rank.color;
      nextText.innerHTML = `Spend <strong>${amountNeeded} DH</strong> more to reach ${nextRankName}`;
    }
  }
}

// --- GLOBAL SAVE ORDER METHOD & PROMO CODE USAGE RECORDING ---

window.saveOrderToFirestore = async function (orderData) {
  try {
    const user = auth.currentUser;

    let finalPhone = orderData.phone;
    if (!finalPhone && window.userDataObj && window.userDataObj.phone) {
      finalPhone = window.userDataObj.phone;
    }

    let finalAddress = orderData.address;
    if ((!finalAddress || finalAddress === "Settat") && window.userDataObj && window.userDataObj.address) {
      finalAddress = window.userDataObj.address;
    }

    const MENU_PRICES = {
      "10 Mini Cookies Box": 15, "15 Mini Cookies Box": 20, "20 Mini Cookies Box": 27, "30 Mini Cookies Box": 40,
      "Classic Cookie": 7, "Extra Chocolate": 10, "Kinder Cookie": 13, "KitKat Cookie": 15,
      "Lemon Cookie": 13, "Loaded Fudge Brownie": 15, "Lotus Cookie": 15, "Monster Cookie": 15,
      "Oreo Cookie": 12, "Red Velvet": 12
    };

    const items = (Array.isArray(orderData.items) ? orderData.items : [])
      .slice(0, 50)
      .filter(i => i && typeof i.name === "string" && Object.prototype.hasOwnProperty.call(MENU_PRICES, i.name))
      .map(i => ({
        name: i.name,
        price: MENU_PRICES[i.name],
        quantity: Math.min(99, Math.max(1, parseInt(i.quantity, 10) || 1))
      }));

    if (items.length === 0) return null;

    const finalData = {
      userId: user ? user.uid : "guest",
      userEmail: user ? user.email : "Guest",
      customerName: String(
        orderData.customerName ||
        (user && user.displayName) ||
        (window.userDataObj ? window.userDataObj.username : "") ||
        "Guest"
      ).slice(0, 80),
      phone: String(finalPhone || "").slice(0, 30),
      address: String(finalAddress || "Settat").slice(0, 400),
      items: items,
      totalAmount: Number(orderData.totalAmount) || 0,
      promoCode: orderData.promoCode || null,
      status: "Processing",
      date: new Date().toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca"
      }),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "orders"), finalData);

    // If a promo code was applied and user is logged in, record usage
    if (orderData.promoCode && user) {
      try {
        const promoRef = doc(db, "promoCodes", orderData.promoCode);
        await updateDoc(promoRef, {
          usedBy: arrayUnion(user.uid),
          usageCount: increment(1)
        });
      } catch (err) {
        console.warn("Could not record promo code usage on Firestore:", err);
      }
    }

    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cart: [] });
    }

    localStorage.removeItem("youyou_cart");

    return docRef.id;
  } catch (error) {
    console.error("Order saving error:", error);
    return null;
  }
};

// --- AUTHENTICATION STATE ---

onAuthStateChanged(auth, async (user) => {
  window.currentUserObj = user;

  const userIconLink = document.getElementById("user-icon-link");
  const userIconWrapper = document.getElementById("user-icon-wrapper");

  if (user) {
    if (userIconLink && userIconWrapper) {
      userIconLink.href = user.email === ADMIN_EMAIL ? "admin.html" : "profile.html";
      const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=c1771e&color=fff`;

      userIconWrapper.innerHTML = `
        <img src="${esc(photoUrl)}" alt="Account" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
      `;
    }

    let userData = null;
    let userDocExists = false;

    try {
      const userDocSnap = await getDoc(doc(db, "users", user.uid));
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        window.userDataObj = userData;
        userDocExists = true;
      }
    } catch (e) { console.warn("Unable to retrieve user profile:", e); }

    if (PAGE === "profile") {
      if (user.email === ADMIN_EMAIL) { window.location.href = "admin.html"; return; }

      const emailEl = document.getElementById("profile-email");
      if (emailEl) emailEl.textContent = user.email;

      const profilePic = document.getElementById("profile-picture");
      if (profilePic) {
        profilePic.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=c1771e&color=fff&size=128`;
        profilePic.style.display = "block";
      }

      if (userDocExists && userData) {
        const displayName = userData.username || user.displayName || "Cookie Lover";
        const nameEl = document.getElementById("profile-name");
        if (nameEl) nameEl.textContent = displayName;

        const editUsername = document.getElementById("edit-username");
        const editAddress = document.getElementById("edit-address");
        const editPhone = document.getElementById("edit-phone");

        if (editUsername) editUsername.value = displayName;
        if (editAddress) editAddress.value = userData.address || "";
        if (editPhone) editPhone.value = userData.phone || "";
      }

      syncAndRenderProfileCart(user, db, userData, userDocExists);
      loadCustomerOrderHistory(user, db);
    }

    if (PAGE === "admin") {
      if (user.email !== ADMIN_EMAIL) { window.location.href = "profile.html"; return; }
      initAdminDashboard(db);
    }
  } else {
    if (userIconLink) userIconLink.href = "login.html";
    if (PAGE === "profile" || PAGE === "admin") window.location.href = "login.html";
  }
});

// --- PROFILE CART ---

async function syncAndRenderProfileCart(user, db, userData, userDocExists) {
  let activeCart = [];
  try {
    if (userDocExists && Array.isArray(userData.cart)) {
      activeCart = userData.cart;
      localStorage.setItem("youyou_cart", JSON.stringify(activeCart));
    } else {
      const rawCartString = localStorage.getItem("youyou_cart");
      if (rawCartString !== null) {
        activeCart = JSON.parse(rawCartString);
        if (!Array.isArray(activeCart)) activeCart = Object.values(activeCart);
      }
    }
  } catch (err) { console.warn("Error displaying profile cart:", err); }

  const basketList = document.getElementById("profile-basket-list");
  if (!basketList) return;

  if (activeCart.length === 0) {
    basketList.innerHTML = `<p style="color: var(--brown-soft); font-style: italic; text-align: center; padding: 20px 0;">Your cookie box is currently empty.</p>`;
    return;
  }

  basketList.innerHTML = "";
  let total = 0;

  activeCart.forEach((item) => {
    const itemPrice = Number(item.price) || 0;
    const itemQty = Number(item.quantity) || 1;
    const itemTotal = itemPrice * itemQty;
    total += itemTotal;

    basketList.innerHTML += `
      <div class="basket-item-row">
        <div style="display: flex; align-items: center; gap: 15px;">
          <div class="basket-item-badge">${itemQty}x</div>
          <div>
            <strong style="color: var(--brown); font-size: 1.05rem;">${esc(item.name || "Cookie")}</strong><br>
            <span style="color: var(--brown-soft); font-size: 0.85rem;">${itemPrice} DH each</span>
          </div>
        </div>
        <div style="color: var(--caramel); font-weight: bold; font-size: 1.1rem;">${itemTotal} DH</div>
      </div>
    `;
  });

  basketList.innerHTML += `
    <div style="padding-top: 20px; text-align: right;">
      <p style="font-size: 1.2rem; margin-bottom: 12px;">Total: <strong style="color: var(--caramel); font-size: 1.4rem;">${total} DH</strong></p>
      <button onclick="window.openBoxModal()" class="btn btn-dark">Order</button>
    </div>
  `;
}

// --- CUSTOMER ORDER HISTORY ---

async function loadCustomerOrderHistory(user, db) {
  const historyContainer = document.getElementById("profile-order-history");
  if (!historyContainer) return;

  try {
    const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(ordersQuery);

    let totalSpent = 0;

    if (querySnapshot.empty) {
      historyContainer.innerHTML = `<p style="color: var(--brown-soft); font-style: italic;">No previous order found.</p>`;
      updateProfileRankBadge(0);
      return;
    }

    historyContainer.innerHTML = "";

    sortNewestFirst(querySnapshot.docs).forEach((docSnap) => {
      const data = docSnap.data();
      const orderId = docSnap.id;

      const isDelivered = data.status === "Delivered";
      const isCancelled = data.status === "Cancelled";
      const isProcessing = data.status === "Processing";

      if (isDelivered) totalSpent += Number(data.totalAmount) || 0;

      let statusClass = "processing";
      if (isDelivered) statusClass = "delivered";
      if (isCancelled) statusClass = "cancelled";

      const itemsList = Array.isArray(data.items)
        ? data.items.map((i) => `${esc(i.quantity)}x ${esc(i.name)}`).join(", ")
        : esc(data.itemsSummary || "Cookie Order");

      historyContainer.innerHTML += `
        <div class="order-history-card">
          <div class="order-history-header">
            <div>
              <strong style="color: var(--brown);">Order #${orderId.slice(-6).toUpperCase()}</strong>
              <div style="font-size: 0.8rem; color: var(--brown-soft);">${esc(data.date || "Recently")}</div>
            </div>
            <span class="status-pill-badge ${statusClass}" id="customer-status-${orderId}">
              ${esc(data.status || "Processing")}
            </span>
          </div>

          <div style="font-size: 0.9rem; margin: 10px 0; color: var(--brown-soft);">${itemsList}</div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <div style="font-weight: bold; color: ${isCancelled ? "#888; text-decoration: line-through;" : "var(--caramel);"}">
              ${Number(data.totalAmount) || 0} DH
            </div>
            ${isProcessing ? `<button class="btn-cancel-order" data-id="${orderId}">Cancel</button>` : ""}
          </div>
        </div>
      `;
    });

    updateProfileRankBadge(totalSpent);

  } catch (err) {
    console.warn("Unable to load order history:", err);
    historyContainer.innerHTML = `<p style="color: var(--brown-soft); font-style: italic;">Unable to load order history.</p>`;
  }
}

// --- ADMIN DASHBOARD & PROMO CODE MANAGEMENT ---

let promoTimerInterval = null;

async function loadAdminPromoCodes(db) {
  const promosContainer = document.getElementById("admin-promos-list");
  const statActivePromos = document.getElementById("stat-active-promos");
  if (!promosContainer) return;

  try {
    const promoSnap = await getDocs(collection(db, "promoCodes"));
    if (promoSnap.empty) {
      promosContainer.innerHTML = `<p style="color: var(--brown-soft); font-style: italic;">No promo codes created yet.</p>`;
      if (statActivePromos) statActivePromos.textContent = "0";
      return;
    }

    let activeCount = 0;
    promosContainer.innerHTML = "";

    promoSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const codeId = docSnap.id;
      const isExpired = data.expiresAt && Date.now() > data.expiresAt;
      const isActive = data.status === "active" && !isExpired;

      if (isActive) activeCount++;

      const usedCount = Array.isArray(data.usedBy) ? data.usedBy.length : (data.usageCount || 0);

      const card = document.createElement("div");
      card.className = `admin-promo-card ${isActive ? "" : "disabled"}`;

      let timerText = "No Expiry";
      if (data.expiresAt) {
        if (isExpired) {
          timerText = "EXPIRED";
        } else {
          const diff = data.expiresAt - Date.now();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          timerText = `${hours}h ${mins}m ${secs}s left`;
        }
      }

      card.innerHTML = `
        <div>
          <strong style="font-size: 1.1rem; color: var(--brown);">${esc(data.code || codeId)}</strong>
          <span class="promo-badge ${isActive ? 'active' : (isExpired ? 'expired' : 'disabled')}">
            ${isActive ? 'Active' : (isExpired ? 'Expired' : 'Disabled')}
          </span>
          <div style="font-size: 0.85rem; color: var(--brown-soft); margin-top: 4px;">
            Discount: <strong>${data.discountValue} ${data.discountType === 'percent' ? '%' : 'DH'}</strong> |
            Timer: <span class="timer-tag">${timerText}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--caramel); margin-top: 2px;">
            👥 Used by: <strong>${usedCount} user(s)</strong>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn-toggle-promo" data-id="${codeId}" data-status="${data.status}" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; border: 1px solid var(--brown); background: transparent; cursor: pointer;">
            ${data.status === 'active' ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-delete-promo" data-id="${codeId}" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; border: none; background: #d9534f; color: white; cursor: pointer;">
            Delete
          </button>
        </div>
      `;

      promosContainer.appendChild(card);
    });

    if (statActivePromos) statActivePromos.textContent = activeCount;

    // Toggle Status listener
    document.querySelectorAll(".btn-toggle-promo").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        const current = e.target.getAttribute("data-status");
        const nextStatus = current === "active" ? "disabled" : "active";
        await updateDoc(doc(db, "promoCodes", id), { status: nextStatus });
        loadAdminPromoCodes(db);
      });
    });

    // Delete listener
    document.querySelectorAll(".btn-delete-promo").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        if (confirm(`Delete promo code "${id}" permanently?`)) {
          await deleteDoc(doc(db, "promoCodes", id));
          loadAdminPromoCodes(db);
        }
      });
    });

  } catch (err) {
    console.error("Error loading promo codes:", err);
  }
}

async function loadAdminDashboard(db) {
  const usersList = document.getElementById("admin-users");
  const ordersList = document.getElementById("admin-orders");
  const statRevenue = document.getElementById("stat-total-revenue");
  const statOrders = document.getElementById("stat-total-orders");
  const statPending = document.getElementById("stat-pending-orders");
  const statUsers = document.getElementById("stat-total-users");

  let totalRevenue = 0;
  let totalOrdersCount = 0;
  let pendingOrdersCount = 0;

  const [usersSnapshot, ordersSnapshot] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "orders"))
  ]);

  const userSpent = {};

  if (!ordersSnapshot.empty) {
    ordersSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === "Delivered" && data.userId) {
        userSpent[data.userId] = (userSpent[data.userId] || 0) + (Number(data.totalAmount) || 0);
      }
    });
  }

  // Admin User Directory
  if (usersList) {
    usersList.innerHTML = "";
    if (statUsers) statUsers.textContent = usersSnapshot.size;

    if (!usersSnapshot.empty) {
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userId = docSnap.id;
        const spent = userSpent[userId] || 0;
        const rank = getCookieRank(spent);
        const isCustomer = data.role !== "admin";

        const card = document.createElement("div");
        card.style.cssText = "display: flex; align-items: center; gap: 15px; padding: 16px; border: 1px solid rgba(74, 55, 40, 0.1); border-radius: 12px; margin-bottom: 12px; background: transparent; flex-wrap: wrap;";

        const initial = (data.username || "A").charAt(0).toUpperCase();

        card.innerHTML = `
          <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--caramel); color: white; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: bold; flex-shrink: 0;">
            ${initial}
          </div>
          <div style="flex: 1; min-width: 180px;">
            <strong style="display: block; color: var(--brown); font-size: 1.05rem;">${esc(data.username || "Anonymous")}</strong>
            <span style="display: block; color: var(--brown-soft); font-size: 0.85rem;">${esc(data.email || "No email")}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-left: auto;">
            ${isCustomer ? `
              <div style="text-align: right;">
                <span style="display: block; font-size: 0.7rem; color: var(--brown-soft); font-weight: bold;">SPENT</span>
                <strong style="color: var(--caramel); font-size: 1.1rem;">${spent} DH</strong>
              </div>
              <span style="font-size: 0.75rem; padding: 6px 14px; border-radius: 999px; font-weight: 700; background: ${rank.bg}; color: ${rank.color};">
                ${rank.icon} ${rank.name}
              </span>
            ` : ""}
            <span class="role-badge ${data.role || 'customer'}">${data.role || "customer"}</span>
          </div>
        `;
        usersList.appendChild(card);
      });
    }
  }

  // Admin Orders List
  if (ordersList) {
    ordersList.innerHTML = "";
    totalOrdersCount = ordersSnapshot.size;

    if (!ordersSnapshot.empty) {
      sortNewestFirst(ordersSnapshot.docs).forEach((docSnap) => {
        const data = docSnap.data();
        const orderId = docSnap.id;

        const isDelivered = data.status === "Delivered";
        const isCancelled = data.status === "Cancelled";
        const isProcessing = data.status === "Processing";

        const amount = Number(data.totalAmount) || 0;
        if (!isCancelled) totalRevenue += amount;
        if (isProcessing) pendingOrdersCount++;

        const itemsSummary = Array.isArray(data.items)
          ? data.items.map((i) => `${esc(i.quantity)}x ${esc(i.name)}`).join(", ")
          : esc(data.itemsSummary || "Standard Box");

        let statusClass = "processing";
        if (isDelivered) statusClass = "delivered";
        if (isCancelled) statusClass = "cancelled";

        const orderCard = document.createElement("div");
        orderCard.className = `admin-order-card ${isDelivered ? "is-delivered" : isCancelled ? "is-cancelled" : "is-pending"}`;

        orderCard.innerHTML = `
          <div class="admin-order-header">
            <div>
              <strong style="font-size: 1.1rem; color: var(--brown);">Order #${orderId.slice(-6).toUpperCase()}</strong>
              <span style="font-size: 0.8rem; color: var(--brown-soft); margin-left: 8px;">(${esc(data.date || "Today")})</span>
            </div>
            <span id="badge-status-${esc(orderId)}" class="status-pill-badge ${statusClass}">
              ${esc(data.status || "Processing")}
            </span>
          </div>

          <div style="margin: 10px 0; font-size: 0.9rem; line-height: 1.5; color: var(--brown-soft);">
            <strong>Items:</strong> ${itemsSummary}<br>
            ${data.promoCode ? `<strong>Promo Code Used:</strong> <span style="color:var(--caramel); font-weight:bold;">${esc(data.promoCode)}</span><br>` : ""}
            <strong>Customer:</strong> ${esc(data.customerName || data.userEmail || "Guest")}<br>
            <strong>Phone:</strong> ${esc(data.phone || "N/A")}<br>
            <strong>Address:</strong> ${esc(data.address || "Settat")}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed rgba(74,55,40,0.15);">
            <div style="font-size: 1.2rem; font-weight: bold; color: ${isCancelled ? "#888; text-decoration: line-through;" : "var(--caramel);"}" >
              ${amount} DH
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              ${data.phone ? `<a href="https://wa.me/${esc(normalizePhone(data.phone))}" target="_blank" rel="noopener" class="btn-whatsapp-sm">WhatsApp</a>` : ""}
              <select class="admin-status-dropdown" data-id="${esc(orderId)}" style="padding:5px; border-radius:5px;">
                <option value="Processing" ${isProcessing ? "selected" : ""}>Processing</option>
                <option value="Delivered" ${isDelivered ? "selected" : ""}>Delivered</option>
                <option value="Cancelled" ${isCancelled ? "selected" : ""}>Cancelled</option>
              </select>
            </div>
          </div>
        `;

        ordersList.appendChild(orderCard);
      });

      document.querySelectorAll(".admin-status-dropdown").forEach((dropdown) => {
        dropdown.addEventListener("change", async (e) => {
          const orderId = e.target.getAttribute("data-id");
          const newStatus = e.target.value;
          await updateDoc(doc(db, "orders", orderId), { status: newStatus });
          loadAdminDashboard(db);
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
    await loadAdminPromoCodes(db);

    // Live countdown timer for promo codes in Admin section
    if (promoTimerInterval) clearInterval(promoTimerInterval);
    promoTimerInterval = setInterval(() => {
      loadAdminPromoCodes(db);
    }, 1000);

    // Form Listener to Create Promo Code
    const createPromoForm = document.getElementById("admin-create-promo-form");
    if (createPromoForm) {
      createPromoForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById("promo-code-input").value.trim().toUpperCase();
        const typeInput = document.getElementById("promo-type-select").value;
        const valInput = Number(document.getElementById("promo-value-input").value) || 0;
        const timerVal = document.getElementById("promo-timer-select").value;
        const msg = document.getElementById("admin-promo-msg");

        if (!codeInput || valInput <= 0) return;

        let expiresAt = null;
        if (timerVal !== "none") {
          const now = Date.now();
          const msMap = {
            "15m": 15 * 60 * 1000,
            "1h": 60 * 60 * 1000,
            "3h": 3 * 60 * 60 * 1000,
            "6h": 6 * 60 * 60 * 1000,
            "12h": 12 * 60 * 60 * 1000,
            "24h": 24 * 60 * 60 * 1000,
            "48h": 48 * 60 * 60 * 1000
          };
          expiresAt = now + (msMap[timerVal] || 0);
        }

        try {
          await setDoc(doc(db, "promoCodes", codeInput), {
            code: codeInput,
            discountType: typeInput,
            discountValue: valInput,
            status: "active",
            expiresAt: expiresAt,
            usedBy: [],
            usageCount: 0,
            createdAt: serverTimestamp()
          });

          msg.style.display = "block";
          msg.style.color = "#2e7d32";
          msg.textContent = `✓ Promo Code "${codeInput}" created successfully!`;
          createPromoForm.reset();

          loadAdminPromoCodes(db);

          setTimeout(() => { msg.style.display = "none"; }, 3000);
        } catch (err) {
          msg.style.display = "block";
          msg.style.color = "#d9534f";
          msg.textContent = "Failed to create promo code.";
        }
      });
    }

  } catch (err) {
    console.error("Admin dashboard error:", err);
  }
}

// --- USER ROUTING & AUTH HANDLERS ---

function routeUser(user) {
  if (user.email === ADMIN_EMAIL) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "profile.html";
  }
}

const loginForm = document.getElementById("auth-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById("error-msg");
      if (errEl) { errEl.style.display = "block"; errEl.textContent = authMessage(error); }
    }
  });
}

const signupForm = document.getElementById("auth-form-signup");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        username: username, email: email, role: "customer", joinedAt: new Date(), cart: []
      });
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById("error-msg");
      if (errEl) { errEl.style.display = "block"; errEl.textContent = authMessage(error); }
    }
  });
}

const googleBtn = document.getElementById("google-btn");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          username: cred.user.displayName, email: cred.user.email, role: "customer", joinedAt: new Date(), cart: []
        });
      }
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById("error-msg");
      if (errEl) { errEl.style.display = "block"; errEl.textContent = authMessage(error, "Google sign-in failed."); }
    }
  });
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      localStorage.removeItem("youyou_cart");
      window.location.href = "index.html";
    });
  });
}