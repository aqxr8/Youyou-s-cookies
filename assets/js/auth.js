import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
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

const existingDefaultApp = getApps().find((item) => item.name === "[DEFAULT]");
const app = existingDefaultApp || initializeApp(firebaseConfig);
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
  .replace(/\.html$/i, "")
  .toLowerCase();

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

function getGuestCart() {
  try {
    const raw = localStorage.getItem("youyou_cart");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// --- SVG ICON HELPERS FOR TIER RANKS ---
const RANK_ICONS = {
  legend: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0l2.5 5 5 .75-3.6 3.5.85 5L8 11.75 3.25 14.25l.85-5L.5 5.75 5.5 5 8 0z"/></svg>`,
  boss: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.743 3.007 1.39.779.646 1.142 1.482 1.058 2.45-.14 1.631-.926 4.673-2.61 7.228-1.616 2.45-3.682 3.993-4.383 4.37a1 1 0 0 1-.99 0c-.701-.377-2.767-1.92-4.384-4.37C1.002 9.075.216 6.033.076 4.401-.008 3.433.355 2.597 1.134 1.95 1.912 1.303 3.031.86 4.142.56z"/></svg>`,
  lover: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748z"/></svg>`,
  fan: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>`
};

function getCookieRank(totalSpent) {
  if (totalSpent >= 800) {
    return { name: "Cookie Legend", icon: RANK_ICONS.legend, color: "#d49a00", bg: "#fff9e6" };
  }
  if (totalSpent >= 400) {
    return { name: "Sugar Boss", icon: RANK_ICONS.boss, color: "#a85a3e", bg: "#fcedec" };
  }
  if (totalSpent >= 150) {
    return { name: "Cookie Lover", icon: RANK_ICONS.lover, color: "#be5191", bg: "#fdf3f8" };
  }
  return { name: "Cookie Fan", icon: RANK_ICONS.fan, color: "#7a5c46", bg: "#f5f0ec" };
}

function updateProfileRankBadge(totalSpent) {
  const rank = getCookieRank(totalSpent);
  const rankBadge = document.querySelector(".cookie-rank-pill, .profile-hero-card .status-pill-badge, #profile-rank-badge");

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
      nextThreshold = 150;
      currentBase = 0;
      nextRankName = "Cookie Lover";
    } else if (totalSpent < 400) {
      nextThreshold = 400;
      currentBase = 150;
      nextRankName = "Sugar Boss";
    } else if (totalSpent < 800) {
      nextThreshold = 800;
      currentBase = 400;
      nextRankName = "Cookie Legend";
    }

    if (totalSpent >= 800) {
      progressFill.style.width = "100%";
      progressFill.style.background = "#d49a00";
      nextText.innerHTML = `<span style="color: #d49a00; font-weight: bold;">Maximum Tier Reached!</span>`;
    } else {
      const amountNeeded = nextThreshold - totalSpent;
      const percentage = ((totalSpent - currentBase) / (nextThreshold - currentBase)) * 100;
      progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
      progressFill.style.background = rank.color;
      nextText.innerHTML = `Spend <strong>${amountNeeded} DH</strong> more to unlock ${nextRankName}`;
    }
  }
}

// --- GLOBAL SAVE ORDER METHOD ---

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

    const items = (Array.isArray(orderData.items) ? orderData.items : [])
      .slice(0, 50)
      .map((i) => ({
        name: String((i && i.name) || "Item").slice(0, 60),
        price: Math.max(0, Number(i && i.price) || 0),
        quantity: Math.min(99, Math.max(1, parseInt(i && i.quantity, 10) || 1))
      }));

    if (items.length === 0) return null;

    const subtotalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const requestedTotal = Number(orderData.totalAmount);
    const totalAmount = orderData.totalAmount !== undefined && orderData.totalAmount !== null && Number.isFinite(requestedTotal)
      ? Math.max(0, requestedTotal)
      : subtotalAmount;
    const originalPrice = Number(orderData.originalPrice) || subtotalAmount;
    const promoCode = String(orderData.promoCode || "").trim().toUpperCase() || null;
    const discountAmount = Math.max(0, Number(orderData.discountAmount) || 0);

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
      subtotalAmount: subtotalAmount,
      originalPrice: originalPrice,
      discountAmount: discountAmount,
      promoCode: promoCode,
      totalAmount: totalAmount,
      status: "Processing",
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Casablanca"
      }),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "orders"), finalData);

    const ADMIN_CHAT_IDS = [
      "7932537222", // Mohamed
      "7523215470"  // Aya
    ];

    const itemsText = items
      .map(i => `• ${i.quantity}x ${i.name} (${i.price * i.quantity} DH)`)
      .join("\n");

    const promoText = promoCode
      ? `• Promo Code Used: ${promoCode} (-${discountAmount.toFixed(2)} DH)`
      : `• Promo Code Used: None`;

    const telegramMsg = `NEW ORDER RECEIVED
───────────────────
Customer: ${finalData.customerName}
Phone: ${finalData.phone || "N/A"}
Address: ${finalData.address}

Order Items:
${itemsText}

───────────────────
Real Price: ${subtotalAmount.toFixed(2)} DH
${promoText}
Total Price: ${totalAmount.toFixed(2)} DH
───────────────────`;

    fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: telegramMsg,
        chatIds: ADMIN_CHAT_IDS
      })
    }).catch(err => console.warn("Telegram alert failed:", err));

    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cart: [] });
    }

    localStorage.removeItem("youyou_cart");
    localStorage.removeItem("has_unmerged_guest_cart");
    return docRef.id;
  } catch (error) {
    console.error("Order saving error:", error);
    return null;
  }
};

// --- AUTHENTICATION STATE & SMART CART MERGING ---

onAuthStateChanged(auth, async (user) => {
  window.currentUserObj = user;
  const userIconLink = document.getElementById("user-icon-link");
  const userIconWrapper = document.getElementById("user-icon-wrapper");

  if (user) {
    let userData = null;
    let userDocExists = false;

    const userDocRef = doc(db, "users", user.uid);
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        userData = userDocSnap.data() || {};
        userDocExists = true;
      } else {
        userData = {
          username: user.displayName || (user.email ? user.email.split("@")[0] : "Cookie Lover"),
          email: user.email || "",
          role: user.email === ADMIN_EMAIL ? "admin" : "customer",
          joinedAt: new Date(),
          cart: getGuestCart()
        };
        try {
          await setDoc(userDocRef, userData, { merge: true });
          userDocExists = true;
        } catch (createErr) {
          console.warn("Unable to initialize missing user profile document:", createErr);
        }
      }
      window.userDataObj = userData;
      const cartAddressInput = document.getElementById("cart-address");
      if (cartAddressInput && userData.address) {
        cartAddressInput.value = userData.address;
      }
    } catch (e) {
      console.warn("Unable to retrieve user profile:", e);
      userData = {
        username: user.displayName || (user.email ? user.email.split("@")[0] : "Cookie Lover"),
        email: user.email || "",
        role: user.email === ADMIN_EMAIL ? "admin" : "customer",
        cart: getGuestCart()
      };
      window.userDataObj = userData;
    }

    const mobileUserLink = document.getElementById("mobile-user-link");

    if (userIconLink && userIconWrapper) {
      userIconLink.href = user.email === ADMIN_EMAIL ? "admin.html" : "profile.html";
      
      if (mobileUserLink) {
        mobileUserLink.href = user.email === ADMIN_EMAIL ? "admin.html" : "profile.html";
        mobileUserLink.innerHTML = `<span class="nav-icon" style="display:inline-flex; align-items:center;"><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/></svg></span> My Profile`;
      }
      const photoUrl =
        (userData && userData.photoURL) ||
        user.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=c1771e&color=fff`;

      userIconWrapper.innerHTML = `
        <img src="${esc(photoUrl)}" alt="Account" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
      `;
    }

    // ====== ONE-TIME GUEST CART MERGE ENGINE ======
    try {
      const cloudCart = Array.isArray(userData.cart) ? userData.cart : [];
      const isUnmergedGuestCart = localStorage.getItem("has_unmerged_guest_cart") === "true";

      if (isUnmergedGuestCart) {
        const guestCart = getGuestCart();
        if (guestCart.length > 0) {
          const mergedCart = [...cloudCart];
          guestCart.forEach((guestItem) => {
            const existing = mergedCart.find((item) => item.name === guestItem.name);
            if (existing) {
              existing.quantity = (Number(existing.quantity) || 1) + (Number(guestItem.quantity) || 1);
            } else {
              mergedCart.push(guestItem);
            }
          });

          userData.cart = mergedCart;
          localStorage.setItem("youyou_cart", JSON.stringify(mergedCart));
          if (userDocExists) {
            await updateDoc(doc(db, "users", user.uid), { cart: mergedCart });
          }
        }
        localStorage.removeItem("has_unmerged_guest_cart");
      } else {
        localStorage.setItem("youyou_cart", JSON.stringify(cloudCart));
      }
      window.dispatchEvent(new Event("cart-synced"));
    } catch (cartSyncErr) {
      console.warn("Cart merge error:", cartSyncErr);
    }

    if (PAGE === "profile") {
      if (user.email === ADMIN_EMAIL) {
        window.location.href = "admin.html";
        return;
      }

      const emailText = user.email || "";
      ["profile-email-display", "profile-email"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = emailText;
      });

      const displayName = (userData && userData.username) || user.displayName || (user.email ? user.email.split("@")[0] : "Cookie Lover");
      const avatar =
        (userData && userData.photoURL) ||
        user.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=c1771e&color=fff&size=128`;
      ["profile-avatar", "profile-picture"].forEach((id) => {
        const img = document.getElementById(id);
        if (img) {
          img.src = avatar;
          img.style.display = "block";
        }
      });

      ["profile-name-display", "profile-name"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if ("value" in el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) el.value = displayName;
        else el.textContent = displayName;
      });

      const addressInput = document.getElementById("profile-address") || document.getElementById("edit-address");
      const phoneInput = document.getElementById("profile-phone") || document.getElementById("edit-phone");
      if (addressInput) addressInput.value = (userData && userData.address) || "";
      if (phoneInput) phoneInput.value = (userData && userData.phone) || "";

      loadCustomerOrderHistory(user, db);
    }

    if (PAGE === "admin") {
      if (user.email !== ADMIN_EMAIL) {
        window.location.href = "profile.html";
        return;
      }
      initAdminDashboard(db);
    }
  } else {
    if (getGuestCart().length > 0) {
      localStorage.setItem("has_unmerged_guest_cart", "true");
    }
    if (userIconLink) userIconLink.href = "login.html";
    const mobileUserLink = document.getElementById("mobile-user-link");
    if (mobileUserLink) {
      mobileUserLink.href = "login.html";
      mobileUserLink.innerHTML = `<span class="nav-icon" style="display:inline-flex; align-items:center;"><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/></svg></span> Account / Login`;
    }
    if (PAGE === "profile" || PAGE === "admin") {
      window.location.href = "login.html";
    }
  }
});

// --- CUSTOMER ORDER HISTORY ---

async function loadCustomerOrderHistory(user, db) {
  const historyContainer = document.getElementById("profile-order-history") || document.getElementById("user-orders-list");
  if (!historyContainer) return;

  try {
    const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(ordersQuery);
    let totalSpent = 0;
    let totalOrdersCount = querySnapshot.size || 0;

    const statOrders = document.getElementById("stat-user-orders") || document.getElementById("stat-orders-count");
    const statSpent = document.getElementById("stat-user-spent");
    const statLevel = document.getElementById("stat-user-level");

    if (querySnapshot.empty) {
      historyContainer.innerHTML = `<p style="color: var(--brown-soft); font-style: italic;">No orders found yet. Your cookie orders will appear here.</p>`;
      if (statOrders) statOrders.textContent = "0";
      if (statSpent) statSpent.textContent = "0 DH";
      if (statLevel) statLevel.textContent = "Cookie Fan";
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

      const origPrice = Number(data.originalPrice || data.subtotalAmount) || Number(data.totalAmount) || 0;
      const discount = Number(data.discountAmount) || 0;
      const hasPromo = Boolean(data.promoCode);

      let priceDisplay = '';
      if (hasPromo || discount > 0) {
        priceDisplay = `
          <div style="font-size: 0.82rem; color: var(--brown-soft); text-decoration: line-through;">Real Price: ${origPrice.toFixed(2)} DH</div>
          <div style="font-size: 0.82rem; color: #57a05f; font-weight: 600;">Promo: ${esc(data.promoCode)} (-${discount.toFixed(2)} DH)</div>
          <div style="font-weight: bold; color: ${isCancelled ? "#888; text-decoration: line-through;" : "var(--caramel);"}; font-size: 1.1rem;">
            New Price: ${Number(data.totalAmount).toFixed(2)} DH
          </div>
        `;
      } else {
        priceDisplay = `
          <div style="font-weight: bold; color: ${isCancelled ? "#888; text-decoration: line-through;" : "var(--caramel);"}; font-size: 1.1rem;">
            Total: ${Number(data.totalAmount).toFixed(2)} DH
          </div>
        `;
      }

      historyContainer.innerHTML += `
        <div class="order-history-card">
          <div class="order-history-header">
            <div>
              <strong style="color: var(--brown);">Order #${orderId.slice(-6).toUpperCase()}</strong>
              <div style="font-size: 0.8rem; color: var(--brown-soft);">${esc(data.date || "Recently")}</div>
            </div>
            <span class="status-pill-badge ${statusClass}" id="customer-status-${orderId}" ${isCancelled ? 'style="background:#ffebee; color:#c62828;"' : ""}>
              ${esc(data.status || "Processing")}
            </span>
          </div>
          <div style="font-size: 0.9rem; margin: 10px 0; color: var(--brown-soft);">${itemsList}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <div>
              ${priceDisplay}
            </div>
            ${isProcessing ? `<button class="btn-cancel-order" data-id="${orderId}" style="background: transparent; border: 1px solid #d9534f; color: #d9534f; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">Cancel</button>` : ""}
          </div>
        </div>
      `;
    });

    if (statOrders) statOrders.textContent = totalOrdersCount;
    if (statSpent) statSpent.textContent = `${totalSpent} DH`;
    if (statLevel) statLevel.textContent = getCookieRank(totalSpent).name;

    updateProfileRankBadge(totalSpent);

    document.querySelectorAll(".btn-cancel-order").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const orderId = e.target.getAttribute("data-id");
        if (confirm("Are you sure you want to cancel this order?")) {
          try {
            e.target.disabled = true;
            e.target.textContent = "Cancelling...";
            await updateDoc(doc(db, "orders", orderId), { status: "Cancelled" });
            e.target.style.display = "none";
            const statusBadge = document.getElementById(`customer-status-${orderId}`);
            if (statusBadge) {
              statusBadge.textContent = "Cancelled";
              statusBadge.className = "status-pill-badge cancelled";
              statusBadge.style = "background:#ffebee; color:#c62828;";
            }
          } catch (err) {
            console.error("Cancellation failed", err);
            alert("Unable to cancel the order.");
            e.target.disabled = false;
            e.target.textContent = "Cancel";
          }
        }
      });
    });
  } catch (err) {
    console.warn("Unable to load order history:", err);
    historyContainer.innerHTML = `<p style="color: var(--brown-soft); font-style: italic;">Unable to load order history.</p>`;
  }
}

// --- LOGIN & SIGNUP HANDLERS ---

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
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = authMessage(error);
      }
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
        username: username,
        email: email,
        role: "customer",
        joinedAt: new Date(),
        cart: getGuestCart()
      });
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById("error-msg");
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = authMessage(error);
      }
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
          username: cred.user.displayName,
          email: cred.user.email,
          role: "customer",
          joinedAt: new Date(),
          cart: getGuestCart()
        });
      }
      routeUser(cred.user);
    } catch (error) {
      const errEl = document.getElementById("error-msg");
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = authMessage(error, "Google sign-in failed.");
      }
    }
  });
}

const logoutBtn = document.getElementById("logout-btn") || document.getElementById("btn-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      localStorage.removeItem("youyou_cart");
      localStorage.removeItem("has_unmerged_guest_cart");
      window.location.href = "index.html";
    });
  });
}