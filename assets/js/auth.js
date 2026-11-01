import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
  onAuthStateChanged,
  updatePassword,
  updateProfile,
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
  writeBatch,
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

// Order statuses are stored as Processing / Delivered / Cancelled (the Firestore rules rely on these exact words).
// "Processing" is shown to people as "In Progress".
const STATUS_LABELS = { Processing: "In Progress", Delivered: "Delivered", Cancelled: "Cancelled" };
const statusLabel = (status) => STATUS_LABELS[status] || STATUS_LABELS.Processing;

// Customer-facing order number: an 8-letter tracking code (no 0/O/1/I so it is easy to read out loud).
// Old orders (before tracking existed) fall back to the last 6 characters of the database id.
const TRACK_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeTrackingCode() {
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => TRACK_ALPHABET[n % TRACK_ALPHABET.length]).join("");
}
const orderNumber = (id, data) =>
  data && /^[A-Z0-9]{8}$/.test(String(data.trackingCode || "")) ? data.trackingCode : String(id).slice(-6).toUpperCase();
// Keeps the public tracking document in step with the order (only when the order has a tracking code).
function addTrackingUpdate(batch, data, status) {
  if (data && /^[A-Z0-9]{8}$/.test(String(data.trackingCode || ""))) {
    batch.update(doc(db, "order_tracking", data.trackingCode), { status: status, updatedAt: serverTimestamp() });
  }
}

// Friendly "are you sure?" dialog. Resolves true (confirmed) or false (kept / closed / Esc / click outside).
function askConfirm({ title, message, confirmText = "Yes", cancelText = "No", danger = false }) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
      "position:fixed; inset:0; z-index:5000; display:grid; place-items:center; padding:16px; " +
      "background:rgba(0,0,0,.6); backdrop-filter:blur(4px);";

    const box = document.createElement("div");
    box.style.cssText =
      "background:var(--cream-light,#fff); color:inherit; width:100%; max-width:400px; padding:26px 24px 22px; " +
      "border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,.3); text-align:center;";

    const h = document.createElement("h3");
    h.textContent = title;
    h.style.cssText = "margin:0 0 10px; font-size:1.35rem;";
    const m = document.createElement("p");
    m.textContent = message;
    m.style.cssText = "margin:0 0 22px; line-height:1.5; opacity:.85; font-size:.95rem;";

    const row = document.createElement("div");
    row.style.cssText = "display:flex; gap:10px; flex-wrap:wrap; justify-content:center;";
    const keepBtn = document.createElement("button");
    keepBtn.type = "button";
    keepBtn.textContent = cancelText;
    keepBtn.style.cssText =
      "flex:1 1 140px; padding:12px 16px; border-radius:10px; font-weight:700; cursor:pointer; font-family:inherit; " +
      "background:transparent; color:inherit; border:1px solid rgba(128,128,128,.5);";
    const yesBtn = document.createElement("button");
    yesBtn.type = "button";
    yesBtn.textContent = confirmText;
    yesBtn.style.cssText =
      "flex:1 1 140px; padding:12px 16px; border-radius:10px; font-weight:700; cursor:pointer; font-family:inherit; color:#fff; " +
      "border:1px solid " + (danger ? "#d9534f" : "#57a05f") + "; background:" + (danger ? "#d9534f" : "#57a05f") + ";";
    row.append(keepBtn, yesBtn);
    box.append(h, m, row);
    overlay.appendChild(box);

    const finish = (result) => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(result);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); finish(false); } };
    const prevOverflow = document.body.style.overflow;
    keepBtn.addEventListener("click", () => finish(false));
    yesBtn.addEventListener("click", () => finish(true));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) finish(false); });
    document.addEventListener("keydown", onKey, true);

    document.body.style.overflow = "hidden";
    document.body.appendChild(overlay);
    keepBtn.focus(); // the safe choice is focused by default
  });
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
  legend: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>`,
  boss: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  lover: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/></svg>`,
  fan: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>`
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

    // Order + "this account used this promo code" are written TOGETHER (one atomic batch).
    // The promo_uses document id is <promoId>_<uid>, so Firestore itself refuses a second use of the same
    // code by the same account (the whole order is rejected), even from another tab or device.
    const promo = user && orderData.promo && orderData.promo.id && promoCode
      ? { id: String(orderData.promo.id) } : null;
    window.__orderSaveError = "";
    window.__promoFallback = false;
    window.__lastTrackingCode = "";
    let orderId = null;

    // ONE atomic batch: the order, its public tracking document and (if a promo was used) the promo-use record.
    const trackingCode = makeTrackingCode();
    const orderRef = doc(collection(db, "orders"));
    const batch = writeBatch(db);
    batch.set(orderRef, Object.assign({}, finalData, { trackingCode: trackingCode }));
    batch.set(doc(db, "order_tracking", trackingCode), {
      orderId: orderRef.id,
      status: "Processing",
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    let useRef = null;
    if (promo) {
      useRef = doc(db, "promo_uses", promo.id + "_" + user.uid);
      batch.set(useRef, {
        promoId: promo.id,
        code: promoCode,
        uid: user.uid,
        userEmail: String(user.email || "").slice(0, 120),
        userName: String(finalData.customerName || "").slice(0, 80),
        orderId: orderRef.id,
        discountAmount: discountAmount,
        createdAt: serverTimestamp()
      });
    }
    try {
      await batch.commit();
      orderId = orderRef.id;
      window.__lastTrackingCode = trackingCode;
    } catch (err) {
      if (!err || err.code !== "permission-denied") throw err;
      if (useRef) {
        try {
          if ((await getDoc(useRef)).exists()) { window.__orderSaveError = "promo_used"; return null; }
        } catch (e2) { /* rules not updated yet */ }
      }
      // The new Firestore rules are probably not published yet: keep the shop working the old way
      // (no tracking code, promo recorded in the old "usedBy" list).
      console.warn("New firestore.rules not published yet - saving the order the old way");
      orderId = (await addDoc(collection(db, "orders"), finalData)).id;
      window.__promoFallback = Boolean(promo);
    }
    const docRef = { id: orderId };

    const itemsText = items
      .map(i => `• ${i.quantity}x ${i.name} (${i.price * i.quantity} DH)`)
      .join("\n");

    const promoText = promoCode
      ? `• Promo Code Used: ${promoCode} (-${discountAmount.toFixed(2)} DH)`
      : `• Promo Code Used: None`;

    const telegramMsg = `NEW ORDER RECEIVED #${window.__lastTrackingCode || docRef.id.slice(-6).toUpperCase()}
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
      body: JSON.stringify({ message: telegramMsg })
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
          role: "customer",
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
        role: "customer",
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
              <strong style="color: var(--brown);">Order #${esc(orderNumber(orderId, data))}</strong>
              ${data.trackingCode ? `<a href="track.html?code=${esc(data.trackingCode)}" style="font-size:.78rem; margin-inline-start:8px; color: var(--caramel); font-weight:700;">Track</a>` : ""}
              <div style="font-size: 0.8rem; color: var(--brown-soft);">${esc(data.date || "Recently")}</div>
            </div>
            <span class="status-pill-badge ${statusClass}" id="customer-status-${orderId}" ${isCancelled ? 'style="background:#ffebee; color:#c62828;"' : ""}>
              ${esc(statusLabel(data.status))}
            </span>
          </div>
          <div style="font-size: 0.9rem; margin: 10px 0; color: var(--brown-soft);">${itemsList}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <div>
              ${priceDisplay}
            </div>
            ${isProcessing ? `<button class="btn-cancel-order" data-id="${esc(orderId)}" data-num="${esc(orderNumber(orderId, data))}" data-code="${esc(data.trackingCode || "")}" style="background: transparent; border: 1px solid #d9534f; color: #d9534f; padding: 7px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">Cancel Order</button>` : ""}
          </div>
        </div>
      `;
    });

    if (statOrders) statOrders.textContent = totalOrdersCount;
    if (statSpent) statSpent.textContent = `${totalSpent} DH`;
    if (statLevel) statLevel.textContent = getCookieRank(totalSpent).name;

    updateProfileRankBadge(totalSpent);

    document.querySelectorAll(".btn-cancel-order").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const orderId = btn.getAttribute("data-id");
        const sure = await askConfirm({
          title: "Cancel this order?",
          message: `Order #${btn.getAttribute("data-num") || orderId.slice(-6).toUpperCase()} will be cancelled and we won't prepare it. This can't be undone, but you're always welcome to place a new order.`,
          confirmText: "Yes, cancel order",
          cancelText: "No, keep my order",
          danger: true
        });
        if (!sure) return;

        btn.disabled = true;
        btn.textContent = "Cancelling...";
        try {
          const cancelBatch = writeBatch(db);
          cancelBatch.update(doc(db, "orders", orderId), { status: "Cancelled" });
          addTrackingUpdate(cancelBatch, { trackingCode: btn.getAttribute("data-code") }, "Cancelled");
          await cancelBatch.commit();
          btn.remove();
          const statusBadge = document.getElementById(`customer-status-${orderId}`);
          if (statusBadge) {
            statusBadge.textContent = "Cancelled";
            statusBadge.className = "status-pill-badge cancelled";
            statusBadge.style.cssText = "background:#ffebee; color:#c62828;";
          }
        } catch (err) {
          console.error("Cancellation failed", err);
          alert("Unable to cancel the order. If it was already prepared, please contact us on WhatsApp.");
          btn.disabled = false;
          btn.textContent = "Cancel Order";
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

// "Remember me": ticked (default) = stay signed in on this device; unticked = signed out when the browser closes
async function applyRememberMe() {
  const box = document.getElementById("remember-me");
  const remember = box ? box.checked : true;
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  } catch (e) {
    console.warn("Could not set login persistence:", e);
  }
}

const loginForm = document.getElementById("auth-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await applyRememberMe();
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
      const cleanName = String(username || "").trim().slice(0, 80);
      try { await updateProfile(cred.user, { displayName: cleanName }); } catch (e) { /* not critical */ }
      await setDoc(doc(db, "users", cred.user.uid), {
        username: cleanName,
        email: email,
        role: "customer",
        joinedAt: new Date(),
        cart: getGuestCart()
      }, { merge: true });
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
      await applyRememberMe();
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

// --- FORGOT PASSWORD ---

const forgotForm = document.getElementById("forgot-password-form");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email").value.trim();
    const msg = document.getElementById("reset-msg");
    const btn = forgotForm.querySelector("button[type='submit'], button:not([type])");
    const show = (text, isError) => {
      if (!msg) return;
      msg.style.display = "block";
      msg.style.color = isError ? "#c62828" : "#2e7d32";
      msg.textContent = text;
    };
    if (btn) btn.disabled = true;
    try {
      await sendPasswordResetEmail(auth, email);
      show("If an account exists for this email, a reset link is on its way. Check your inbox and spam folder.", false);
    } catch (err) {
      if (err && (err.code === "auth/user-not-found")) {
        // do not reveal whether an account exists
        show("If an account exists for this email, a reset link is on its way. Check your inbox and spam folder.", false);
      } else {
        show(authMessage(err, "Could not send the reset email. Please try again."), true);
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

// --- PROFILE PAGE: SAVE DETAILS, CHANGE PASSWORD, AVATAR ---

async function currentUserReady() {
  try { if (auth.authStateReady) await auth.authStateReady(); } catch (e) { /* ignore */ }
  return auth.currentUser;
}

function flashMsg(el, text, isError) {
  if (!el) return;
  el.style.display = "block";
  el.style.color = isError ? "#c62828" : "#2e7d32";
  el.textContent = text;
}

const profileForm = document.getElementById("profile-info-form");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("info-msg");
    const btn = document.getElementById("btn-save-profile");
    const user = await currentUserReady();
    if (!user) { flashMsg(msg, "Please log in again.", true); return; }

    const username = document.getElementById("profile-name").value.trim().slice(0, 80);
    const phone = document.getElementById("profile-phone").value.trim().slice(0, 30);
    const address = document.getElementById("profile-address").value.trim().slice(0, 400);
    const digits = phone.replace(/\D/g, "");

    if (!username) { flashMsg(msg, "Please enter your name.", true); return; }
    if (digits.length < 9 || digits.length > 15) { flashMsg(msg, "Please enter a valid phone number.", true); return; }

    const original = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }
    try {
      await updateDoc(doc(db, "users", user.uid), { username, phone, address });
      try { await updateProfile(user, { displayName: username }); } catch (err) { /* not critical */ }
      window.userDataObj = Object.assign({}, window.userDataObj, { username, phone, address });
      const nameDisplay = document.getElementById("profile-name-display");
      if (nameDisplay) nameDisplay.textContent = username;
      flashMsg(msg, "Profile saved.", false);
    } catch (err) {
      console.error("Profile save failed:", err);
      flashMsg(msg, "Could not save your profile. Please try again.", true);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
  });
}

const passwordBtn = document.getElementById("btn-update-password");
if (passwordBtn) {
  const doPasswordUpdate = async () => {
    const msg = document.getElementById("password-msg");
    const input = document.getElementById("profile-new-password");
    const user = await currentUserReady();
    if (!user) { flashMsg(msg, "Please log in again.", true); return; }
    const pw = input ? input.value : "";
    if (pw.length < 6) { flashMsg(msg, "The password must contain at least 6 characters.", true); return; }
    passwordBtn.disabled = true;
    try {
      await updatePassword(user, pw);
      if (input) input.value = "";
      flashMsg(msg, "Password updated.", false);
    } catch (err) {
      if (err && err.code === "auth/requires-recent-login") {
        flashMsg(msg, "For security, please log out, log in again, then change your password.", true);
      } else {
        flashMsg(msg, authMessage(err, "Could not update the password."), true);
      }
    } finally {
      passwordBtn.disabled = false;
    }
  };
  passwordBtn.addEventListener("click", doPasswordUpdate);
  const pwForm = document.getElementById("password-form");
  if (pwForm) pwForm.addEventListener("submit", (e) => { e.preventDefault(); doPasswordUpdate(); });
}

const avatarInput = document.getElementById("avatar-input");
if (avatarInput) {
  avatarInput.addEventListener("change", async () => {
    const file = avatarInput.files && avatarInput.files[0];
    const msg = document.getElementById("profile-msg");
    if (!file) return;
    if (!/^image\//.test(file.type)) { flashMsg(msg, "Please choose an image file.", true); return; }
    const user = await currentUserReady();
    if (!user) { flashMsg(msg, "Please log in again.", true); return; }
    try {
      // Resize to a small square so it fits comfortably inside the user document.
      const bitmapUrl = URL.createObjectURL(file);
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Could not read this image."));
        i.src = bitmapUrl;
      });
      const size = 160;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const side = Math.min(img.width, img.height);
      canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(bitmapUrl);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      await updateDoc(doc(db, "users", user.uid), { photoURL: dataUrl });
      window.userDataObj = Object.assign({}, window.userDataObj, { photoURL: dataUrl });
      const avatar = document.getElementById("profile-avatar");
      if (avatar) avatar.src = dataUrl;
      const headerIcon = document.querySelector("#user-icon-wrapper img");
      if (headerIcon) headerIcon.src = dataUrl;
      flashMsg(msg, "Profile picture updated.", false);
    } catch (err) {
      console.error("Avatar update failed:", err);
      flashMsg(msg, "Could not update your picture. Please try another image.", true);
    } finally {
      avatarInput.value = "";
    }
  });
}

// --- ADMIN DASHBOARD ---

let adminDashboardStarted = false;

function initAdminDashboard(db) {
  if (adminDashboardStarted) return;
  adminDashboardStarted = true;

  const ordersBox = document.getElementById("admin-orders");
  const usersBox = document.getElementById("admin-users");
  const reviewsBox = document.getElementById("admin-reviews");
  const statRevenue = document.getElementById("stat-total-revenue");
  const statOrders = document.getElementById("stat-total-orders");
  const statPending = document.getElementById("stat-pending-orders");
  const statUsers = document.getElementById("stat-total-users");

  const errorLine = (box, text) => {
    const u = auth.currentUser;
    const who = u
      ? `Signed in as ${u.email} - email verified: ${u.emailVerified ? "yes" : "NO (the rules need it, or the admin UID: ${u.uid})"}`
      : "Not signed in";
    if (box) box.innerHTML = `<p style="color:#c62828; font-weight:600;">${esc(text)}</p>` +
      `<p style="color: var(--brown-soft); font-size:.8rem; word-break:break-all;" data-i18n-skip>${esc(who.replace("${u.uid}", u ? u.uid : ""))}</p>`;
  };
  const emptyLine = (box, text) => {
    if (box) box.innerHTML = `<p style="color: var(--brown-soft); font-style: italic;">${esc(text)}</p>`;
  };

  let orderDocs = [];   // {id, data}
  let userDocs = [];

  const recomputeStats = () => {
    let revenue = 0, pending = 0;
    orderDocs.forEach((o) => {
      if (o.data.status === "Delivered") revenue += Number(o.data.totalAmount) || 0;
      if (o.data.status === "Processing") pending += 1;
    });
    if (statRevenue) statRevenue.textContent = `${Math.round(revenue * 100) / 100} DH`;
    if (statOrders) statOrders.textContent = String(orderDocs.length);
    if (statPending) statPending.textContent = String(pending);
    if (statUsers) statUsers.textContent = String(userDocs.length);
  };

  const activeOrderFilter = () => {
    const btn = document.querySelector("[data-order-filter].active");
    return btn ? btn.getAttribute("data-order-filter") : "all";
  };

  // ---------- DAILY SUMMARY / CSV / PRINT ----------
  const TZ = "Africa/Casablanca";
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
  const dayKey = (ts) => (ts && typeof ts.toDate === "function" ? dayFmt.format(ts.toDate()) : "");
  const timeOf = (ts) => (ts && typeof ts.toDate === "function"
    ? ts.toDate().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "");
  const dateInput = document.getElementById("os-date");
  if (dateInput && !dateInput.value) dateInput.value = dayFmt.format(new Date());
  const selectedDay = () => (dateInput && dateInput.value) || dayFmt.format(new Date());
  const ordersOfDay = () => orderDocs.filter((o) => dayKey(o.data.createdAt) === selectedDay());
  const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);

  const bakeTotals = (list) => {
    const map = {};
    list.filter((o) => o.data.status !== "Cancelled").forEach((o) => {
      (Array.isArray(o.data.items) ? o.data.items : []).forEach((i) => {
        const name = String(i.name || "Item");
        map[name] = (map[name] || 0) + (Number(i.quantity) || 0);
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const renderSummary = () => {
    const statsBox = document.getElementById("os-stats");
    const bakeBox = document.getElementById("os-bake");
    if (!statsBox || !bakeBox) return;
    const list = ordersOfDay();
    const count = (st) => list.filter((o) => (o.data.status || "Processing") === st).length;
    const delivered = list.filter((o) => o.data.status === "Delivered").reduce((s, o) => s + (Number(o.data.totalAmount) || 0), 0);
    const expected = list.filter((o) => o.data.status !== "Cancelled").reduce((s, o) => s + (Number(o.data.totalAmount) || 0), 0);
    const stat = (value, label) => `<div class="os-stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
    statsBox.innerHTML =
      stat(list.length, "Orders") + stat(count("Processing"), "In progress") + stat(count("Delivered"), "Delivered") +
      stat(count("Cancelled"), "Cancelled") + stat(money(expected) + " DH", "Expected (not cancelled)") +
      stat(money(delivered) + " DH", "Collected (delivered)");
    const totals = bakeTotals(list);
    bakeBox.innerHTML = totals.length
      ? `<h4>To bake (${esc(selectedDay())})</h4><ul>${totals.map(([n, q]) => `<li><b>${esc(q)}x</b> ${esc(n)}</li>`).join("")}</ul>`
      : `<p style="color: var(--brown-soft); font-style: italic; margin:0;">No orders on ${esc(selectedDay())}.</p>`;
  };
  if (dateInput) dateInput.addEventListener("change", renderSummary);

  const csvCell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;      // stop spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const downloadCsv = (list, filename) => {
    const head = ["Order number", "Date", "Time", "Status", "Customer", "Email", "Phone", "Address", "Items", "Promo code", "Discount (DH)", "Subtotal (DH)", "Total (DH)"];
    const rows = list.map(({ id, data }) => [
      orderNumber(id, data), dayKey(data.createdAt), timeOf(data.createdAt), statusLabel(data.status || "Processing"),
      data.customerName || "", data.userEmail || "", data.phone || "", data.address || "",
      (Array.isArray(data.items) ? data.items : []).map((i) => `${i.quantity}x ${i.name}`).join("; "),
      data.promoCode || "", money(data.discountAmount), money(data.subtotalAmount || data.originalPrice), money(data.totalAmount)
    ]);
    const text = "\ufeff" + [head].concat(rows).map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const slipHtml = ({ id, data }) => {
    const items = Array.isArray(data.items) ? data.items : [];
    const subtotal = Number(data.subtotalAmount || data.originalPrice) || items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = Number(data.discountAmount) || 0;
    const total = Number(data.totalAmount) || 0;
    const delivery = Math.max(0, Math.round((total - (subtotal - discount)) * 100) / 100);
    return `
      <section class="slip">
        <div class="c b big">YOUYOU'S COOKIES</div>
        <div class="c small">Made with love · Settat</div>
        <hr>
        <div class="c num">#${esc(orderNumber(id, data))}</div>
        <div class="c small">${esc(dayKey(data.createdAt))} ${esc(timeOf(data.createdAt))}</div>
        <hr>
        <div><b>${esc(data.customerName || "Guest")}</b></div>
        <div>Tel: ${esc(data.phone || "-")}</div>
        <div>Address: ${esc(data.address || "-")}</div>
        <hr>
        ${items.map((i) => `<div class="row"><span>${esc(i.quantity)}x ${esc(i.name)}</span><span>${money(i.price * i.quantity)}</span></div>`).join("")}
        <hr>
        <div class="row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
        ${discount > 0 ? `<div class="row"><span>Promo ${esc(data.promoCode || "")}</span><span>-${money(discount)}</span></div>` : ""}
        ${delivery > 0 ? `<div class="row"><span>Delivery</span><span>${money(delivery)}</span></div>` : ""}
        <div class="row b big"><span>TO COLLECT</span><span>${money(total)} DH</span></div>
        <div class="c small">Cash on delivery</div>
        ${data.status === "Cancelled" ? '<div class="c b" style="margin-top:6px">*** CANCELLED ***</div>' : ""}
      </section>`;
  };
  const openPrint = (title, bodyHtml) => {
    const w = window.open("", "_blank", "width=460,height=720");
    if (!w) { alert("Please allow pop-ups for this site to print."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page{size:80mm auto;margin:4mm}
      body{font-family:"Courier New",monospace;font-size:13px;width:72mm;margin:0 auto;color:#000}
      .slip{padding:6px 0;page-break-after:always}.slip:last-child{page-break-after:auto}
      .c{text-align:center}.b{font-weight:700}.big{font-size:16px}.small{font-size:11px}.num{font-size:26px;font-weight:700;letter-spacing:2px;text-align:center}
      hr{border:0;border-top:1px dashed #000;margin:7px 0}.row{display:flex;justify-content:space-between;gap:8px}
      .box{display:inline-block;width:11px;height:11px;border:1px solid #000;margin-right:6px}
    </style></head><body>${bodyHtml}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (e) { /* user can print manually */ } }, 350);
  };

  const bindSummaryButtons = () => {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    on("os-csv-day", () => {
      const list = ordersOfDay();
      if (!list.length) return alert("No orders on this day.");
      downloadCsv(list, `youyou-orders-${selectedDay()}.csv`);
    });
    on("os-csv-all", () => {
      if (!orderDocs.length) return alert("No orders yet.");
      downloadCsv(orderDocs, `youyou-orders-all-${dayFmt.format(new Date())}.csv`);
    });
    on("os-print-slips", () => {
      const list = ordersOfDay().filter((o) => o.data.status !== "Cancelled").slice().reverse();
      if (!list.length) return alert("No orders to print for this day.");
      openPrint("Order slips " + selectedDay(), list.map(slipHtml).join(""));
    });
    on("os-print-bake", () => {
      const list = ordersOfDay();
      const totals = bakeTotals(list);
      if (!totals.length) return alert("Nothing to bake on this day.");
      const active = list.filter((o) => o.data.status !== "Cancelled").length;
      openPrint("Baking list " + selectedDay(), `
        <section class="slip">
          <div class="c b big">BAKING LIST</div>
          <div class="c small">${esc(selectedDay())} · ${active} order(s)</div>
          <hr>
          ${totals.map(([n, q]) => `<div class="row"><span><span class="box"></span>${esc(n)}</span><span class="b">${esc(q)}</span></div>`).join("")}
        </section>`);
    });
  };
  bindSummaryButtons();

  // ---------- ORDERS ----------
  const renderOrders = () => {
    renderSummary();
    if (!ordersBox) return;
    if (!orderDocs.length) { emptyLine(ordersBox, "No orders yet."); return; }

    const filter = activeOrderFilter();
    ordersBox.innerHTML = orderDocs.map(({ id, data }) => {
      const status = data.status || "Processing";
      const cls = status === "Delivered" ? "is-delivered" : status === "Cancelled" ? "is-cancelled" : "is-pending";
      const items = Array.isArray(data.items)
        ? data.items.map((i) => `${esc(i.quantity)}x ${esc(i.name)}`).join("<br>")
        : "—";
      const phoneDigits = normalizePhone(data.phone);
      const phoneHtml = data.phone
        ? `<a class="btn-whatsapp-sm" href="https://wa.me/${esc(phoneDigits)}" target="_blank" rel="noopener">WhatsApp ${esc(data.phone)}</a>`
        : "<em>No phone</em>";
      const discount = Number(data.discountAmount) || 0;
      const promoLine = data.promoCode
        ? `<div style="font-size:.85rem; color:#57a05f; font-weight:600;">Promo ${esc(data.promoCode)} (-${discount.toFixed(2)} DH)</div>`
        : "";
      const total = Number(data.totalAmount) || 0;
      const statusBtn = (value, color) => {
        const active = status === value;
        return `<button type="button" class="admin-status-btn" data-set-status="${value}" data-id="${esc(id)}" ${active ? 'disabled aria-pressed="true"' : 'aria-pressed="false"'}
          style="padding:7px 13px; border-radius:8px; font-size:.82rem; font-weight:700; font-family:inherit; border:1px solid ${color};
                 cursor:${active ? "default" : "pointer"}; background:${active ? color : "transparent"}; color:${active ? "#fff" : color};">${esc(STATUS_LABELS[value])}</button>`;
      };
      return `
        <div class="admin-order-card ${cls}" data-id="${esc(id)}" data-status="${esc(status)}" style="${filter === "all" || filter === status ? "" : "display:none;"}">
          <div class="admin-order-header">
            <div>
              <strong>Order #${esc(orderNumber(id, data))}</strong>
              <div style="font-size:.8rem; color: var(--brown-soft);">${esc(data.date || "")}</div>
            </div>
            <span class="status-pill-badge ${status === "Delivered" ? "delivered" : status === "Cancelled" ? "cancelled" : "processing"}">${esc(statusLabel(status))}</span>
          </div>
          <div style="margin-bottom:8px;"><strong>${esc(data.customerName || "Guest")}</strong>
            <span style="color: var(--brown-soft); font-size:.85rem;"> · ${esc(data.userEmail || "Guest")}</span></div>
          <div style="margin-bottom:8px;">${phoneHtml}</div>
          <div style="margin-bottom:8px; font-size:.9rem;">📍 ${esc(data.address || "—")}</div>
          <div style="margin-bottom:10px; font-size:.9rem; color: var(--brown-soft);">${items}</div>
          ${promoLine}
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:8px;">
            <strong style="color: var(--caramel); font-size:1.1rem;">${total.toFixed(2)} DH</strong>
            <button type="button" class="admin-slip-btn" data-id="${esc(id)}" title="Print order slip">🖨 Slip</button>
            <div class="admin-status-group" role="group" aria-label="Order status" style="display:flex; gap:6px; flex-wrap:wrap;">
              ${statusBtn("Processing", "#f0ad4e")}
              ${statusBtn("Delivered", "#57a05f")}
              ${statusBtn("Cancelled", "#d9534f")}
            </div>
          </div>
        </div>`;
    }).join("");
  };

  if (ordersBox) {
    ordersBox.addEventListener("click", async (e) => {
      const slipBtn = e.target.closest(".admin-slip-btn");
      if (slipBtn) {
        const entry0 = orderDocs.find((o) => o.id === slipBtn.getAttribute("data-id"));
        if (entry0) openPrint("Order " + orderNumber(entry0.id, entry0.data), slipHtml(entry0));
        return;
      }
      const btn = e.target.closest(".admin-status-btn");
      if (!btn || btn.disabled) return;
      const id = btn.getAttribute("data-id");
      const next = btn.getAttribute("data-set-status");
      const entry = orderDocs.find((o) => o.id === id);
      if (!entry || !STATUS_LABELS[next] || entry.data.status === next) return;

      if (next === "Cancelled") {
        const sure = await askConfirm({
          title: "Cancel this order?",
          message: `Order #${orderNumber(id, entry.data)} for ${entry.data.customerName || "this customer"} will be marked as Cancelled and won't count as revenue. You can switch it back to In Progress later.`,
          confirmText: "Yes, cancel order",
          cancelText: "Keep order",
          danger: true
        });
        if (!sure) return;
      }

      const group = btn.closest(".admin-status-group");
      if (group) group.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        const statusBatch = writeBatch(db);
        statusBatch.update(doc(db, "orders", id), { status: next });
        addTrackingUpdate(statusBatch, entry.data, next);
        await statusBatch.commit();
        entry.data.status = next;
        recomputeStats();
        renderOrders();
        renderUsers();
      } catch (err) {
        console.error("Status update failed:", err);
        alert("Could not update the order status. Check Firestore rules and your connection.");
        renderOrders();
      }
    });
  }

  document.querySelectorAll("[data-order-filter]").forEach((btn) => {
    btn.addEventListener("click", () => setTimeout(renderOrders, 0));
  });

  // ---------- USERS ----------
  const avatarFor = (data) =>
    (data && data.photoURL) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent((data && (data.username || data.email)) || "User")}&background=c1771e&color=fff&size=128`;
  const renderUsers = () => {
    if (!usersBox) return;
    if (!userDocs.length) { emptyLine(usersBox, "No registered users yet."); return; }
    const spentByUser = {};
    const countByUser = {};
    orderDocs.forEach(({ data }) => {
      if (!data.userId || data.userId === "guest") return;
      countByUser[data.userId] = (countByUser[data.userId] || 0) + 1;
      if (data.status === "Delivered") spentByUser[data.userId] = (spentByUser[data.userId] || 0) + (Number(data.totalAmount) || 0);
    });
    usersBox.innerHTML = userDocs.map(({ id, data }) => {
      const spent = spentByUser[id] || 0;
      const rank = getCookieRank(spent);
      return `
        <div class="admin-order-card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:14px; min-width:0;">
            <img class="admin-user-avatar" src="${esc(avatarFor(data))}" alt="" loading="lazy" width="52" height="52"
                 style="width:52px; height:52px; border-radius:50%; object-fit:cover; flex:none; border:2px solid rgba(193,119,30,.35); background:#f4e6d4;"
                 onerror="this.onerror=null; this.src='assets/images/logo.webp'">
            <div style="min-width:0;">
              <strong>${esc(data.username || "—")}</strong>
              <div style="font-size:.85rem; color: var(--brown-soft); word-break:break-all;">${esc(data.email || "")}${data.phone ? " · " + esc(data.phone) : ""}</div>
              <div style="font-size:.8rem; color: var(--brown-soft);">${countByUser[id] || 0} order(s) · ${spent} DH delivered</div>
            </div>
          </div>
          <span class="status-pill-badge" style="background:${rank.bg}; color:${rank.color}; border:1px solid ${rank.color}40; display:inline-flex; gap:6px; align-items:center;">${rank.icon} ${esc(rank.name)}</span>
        </div>`;
    }).join("");
  };

  // ---------- REVIEWS ----------
  let reviewDocs = [];
  let reviewFilter = "all";

  const renderReviews = () => {
    if (!reviewsBox) return;
    const list = reviewDocs.filter((r) => reviewFilter === "all" || r.data.status === reviewFilter);
    if (!list.length) { emptyLine(reviewsBox, "No reviews in this view."); return; }
    reviewsBox.innerHTML = list.map(({ id, data }) => {
      const rating = Math.max(1, Math.min(5, Number(data.rating) || 5));
      const status = data.status || "pending";
      const color = status === "approved" ? "#57a05f" : status === "rejected" ? "#d9534f" : "#f0ad4e";
      return `
        <div class="admin-order-card" style="border-left:5px solid ${color};">
          <div class="admin-order-header">
            <div><strong>${esc(data.name || "Anonymous")}</strong>
              <span style="color:#d49a00; margin-left:8px;">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span></div>
            <span style="font-weight:700; text-transform:capitalize; color:${color};">${esc(status)}</span>
          </div>
          <p style="margin:0 0 12px;">“${esc(data.text || "")}”</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${status !== "approved" ? `<button class="btn-promo-action btn-toggle-promo" data-review-action="approved" data-id="${esc(id)}">Approve</button>` : ""}
            ${status !== "rejected" ? `<button class="btn-promo-action btn-toggle-promo" data-review-action="rejected" data-id="${esc(id)}">Reject</button>` : ""}
            <button class="btn-promo-action btn-delete-promo" data-review-action="delete" data-id="${esc(id)}">Delete</button>
          </div>
        </div>`;
    }).join("");
  };

  document.querySelectorAll(".filter-btn-review").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn-review").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      reviewFilter = btn.getAttribute("data-filter") || "all";
      renderReviews();
    });
  });

  if (reviewsBox) {
    reviewsBox.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-review-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-review-action");
      if (action === "delete" && !confirm("Permanently delete this review?")) return;
      btn.disabled = true;
      try {
        if (action === "delete") {
          await deleteDoc(doc(db, "reviews", id));
          reviewDocs = reviewDocs.filter((r) => r.id !== id);
        } else {
          await updateDoc(doc(db, "reviews", id), { status: action });
          const r = reviewDocs.find((x) => x.id === id);
          if (r) r.data.status = action;
        }
        renderReviews();
      } catch (err) {
        console.error("Review action failed:", err);
        alert("Could not update this review. Check Firestore rules.");
        btn.disabled = false;
      }
    });
  }

  // ---------- LOAD ----------
  (async () => {
    try {
      const snap = await getDocs(collection(db, "orders"));
      orderDocs = sortNewestFirst(snap.docs).map((d) => ({ id: d.id, data: d.data() }));
      renderOrders();
    } catch (err) {
      console.error("Orders load failed:", err);
      errorLine(ordersBox, "Could not load orders. Check that the Firestore rules are published.");
    }
    try {
      const snap = await getDocs(collection(db, "users"));
      userDocs = snap.docs.map((d) => ({ id: d.id, data: d.data() }))
        .filter((u) => u.data.role !== "admin" && u.data.email !== ADMIN_EMAIL);
      renderUsers();
    } catch (err) {
      console.error("Users load failed:", err);
      errorLine(usersBox, "Could not load users.");
    }
    recomputeStats();
    renderOrders();
    renderUsers();
    try {
      const snap = await getDocs(collection(db, "reviews"));
      reviewDocs = sortNewestFirst(snap.docs).map((d) => ({ id: d.id, data: d.data() }));
      renderReviews();
    } catch (err) {
      console.error("Reviews load failed:", err);
      errorLine(reviewsBox, "Could not load reviews.");
    }
  })();
}
