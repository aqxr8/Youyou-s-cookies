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
    return {
      name: "Cookie Legend",
      icon: "👑",
      color: "#d49a00",
      bg: "#fff9e6"
    };
  }

  if (totalSpent >= 400) {
    return {
      name: "Sugar Boss",
      icon: "🧁",
      color: "#a85a3e",
      bg: "#fcedec"
    };
  }

  if (totalSpent >= 150) {
    return {
      name: "Cookie Lover",
      icon: "🤎",
      color: "#be5191",
      bg: "#fdf3f8"
    };
  }

  return {
    name: "Cookie Fan",
    icon: "🍪",
    color: "#7a5c46",
    bg: "#f5f0ec"
  };
}

function updateProfileRankBadge(totalSpent) {
  const rank = getCookieRank(totalSpent);

  const rankBadge = document.querySelector(
    ".profile-hero-card .status-pill-badge"
  );

  if (rankBadge) {
    rankBadge.innerHTML = `${rank.icon} ${rank.name}`;
    rankBadge.style.backgroundColor = rank.bg;
    rankBadge.style.color = rank.color;
    rankBadge.style.border = `1px solid ${rank.color}40`;
  }

  // --- PROGRESS BAR LOGIC ---

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
      nextRankName = "🤎 Cookie Lover";
    } else if (totalSpent < 400) {
      nextThreshold = 400;
      currentBase = 150;
      nextRankName = "🧁 Sugar Boss";
    } else if (totalSpent < 800) {
      nextThreshold = 800;
      currentBase = 400;
      nextRankName = "👑 Cookie Legend";
    }

    if (totalSpent >= 800) {
      progressFill.style.width = "100%";
      progressFill.style.background = "#d49a00";

      nextText.innerHTML = `
        <span style="color: #d49a00; font-weight: bold;">
          Maximum Level Reached! 👑
        </span>
      `;
    } else {
      const amountNeeded = nextThreshold - totalSpent;

      const percentage =
        ((totalSpent - currentBase) / (nextThreshold - currentBase)) * 100;

      progressFill.style.width =
        `${Math.min(100, Math.max(0, percentage))}%`;

      progressFill.style.background = rank.color;

      nextText.innerHTML =
        `Spend <strong>${amountNeeded} DH</strong> more to reach ${nextRankName}`;
    }
  }
}

// --- GLOBAL SAVE ORDER METHOD ---

window.saveOrderToFirestore = async function (orderData) {
  try {
    const user = auth.currentUser;

    let finalPhone = orderData.phone;

    if (
      !finalPhone &&
      window.userDataObj &&
      window.userDataObj.phone
    ) {
      finalPhone = window.userDataObj.phone;
    }

    let finalAddress = orderData.address;

    if (
      (!finalAddress || finalAddress === "Settat") &&
      window.userDataObj &&
      window.userDataObj.address
    ) {
      finalAddress = window.userDataObj.address;
    }

    // Prices are authoritative here; never trust browser/localStorage prices.
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

    const totalAmount = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

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
      userIconLink.href =
        user.email === ADMIN_EMAIL ? "admin.html" : "profile.html";

      const photoUrl =
        user.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=c1771e&color=fff`;

      userIconWrapper.innerHTML = `
        <img
          src="${esc(photoUrl)}"
          alt="Account"
          style="width:100%; height:100%; object-fit:cover; border-radius:50%;"
        >
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

        const cartAddressInput = document.getElementById("cart-address");

        if (cartAddressInput && userData.address) {
          cartAddressInput.value = userData.address;
        }
      }
    } catch (e) {
      console.warn("Unable to retrieve user profile:", e);
    }

    try {
      if (userDocExists && Array.isArray(userData.cart)) {
        localStorage.setItem(
          "youyou_cart",
          JSON.stringify(userData.cart)
        );

        window.dispatchEvent(new Event("cart-synced"));
      } else {
        const localCartRaw = localStorage.getItem("youyou_cart");
        const localCart = localCartRaw ? JSON.parse(localCartRaw) : [];

        if (localCart.length > 0 && userDocExists) {
          await updateDoc(doc(db, "users", user.uid), {
            cart: localCart
          });
        }
      }
    } catch (cartSyncErr) {
      console.warn("Cart sync error:", cartSyncErr);
    }

    if (PAGE === "profile") {
      if (user.email === ADMIN_EMAIL) {
        window.location.href = "admin.html";
        return;
      }

      const emailEl = document.getElementById("profile-email");

      if (emailEl) {
        emailEl.textContent = user.email;
      }

      const profilePic = document.getElementById("profile-picture");

      if (profilePic) {
        profilePic.src =
          user.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=c1771e&color=fff&size=128`;

        profilePic.style.display = "block";
      }

      if (userDocExists && userData) {
        const displayName =
          userData.username || user.displayName || "Cookie Lover";

        const nameEl = document.getElementById("profile-name");

        if (nameEl) {
          nameEl.textContent = displayName;
        }

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
      if (user.email !== ADMIN_EMAIL) {
        window.location.href = "profile.html";
        return;
      }

      initAdminDashboard(db);
    }
  } else {
    if (userIconLink) {
      userIconLink.href = "login.html";
    }

    if (PAGE === "profile" || PAGE === "admin") {
      window.location.href = "login.html";
    }
  }
});

// --- PROFILE CART ---

async function syncAndRenderProfileCart(user, db, userData, userDocExists) {
  let activeCart = [];

  try {
    if (userDocExists && Array.isArray(userData.cart)) {
      activeCart = userData.cart;

      localStorage.setItem(
        "youyou_cart",
        JSON.stringify(activeCart)
      );
    } else {
      const rawCartString = localStorage.getItem("youyou_cart");

      if (rawCartString !== null) {
        activeCart = JSON.parse(rawCartString);

        if (!Array.isArray(activeCart)) {
          activeCart = Object.values(activeCart);
        }
      }
    }
  } catch (err) {
    console.warn("Error displaying profile cart:", err);
  }

  const basketList = document.getElementById("profile-basket-list");

  if (!basketList) return;

  if (activeCart.length === 0) {
    basketList.innerHTML = `
      <p style="color: var(--brown-soft); font-style: italic; text-align: center; padding: 20px 0;">
        Your cookie box is currently empty.
      </p>
    `;

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
            <strong style="color: var(--brown); font-size: 1.05rem;">
              ${esc(item.name || "Cookie")}
            </strong>
            <br>

            <span style="color: var(--brown-soft); font-size: 0.85rem;">
              ${itemPrice} DH each
            </span>
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
      <p style="font-size: 1.2rem; margin-bottom: 12px;">
        Total:
        <strong style="color: var(--caramel); font-size: 1.4rem;">
          ${total} DH
        </strong>
      </p>

      <button onclick="window.openBoxModal()" class="btn btn-dark">
        Order
      </button>
    </div>
  `;
}

// --- CUSTOMER ORDER HISTORY ---

async function loadCustomerOrderHistory(user, db) {
  const historyContainer = document.getElementById("profile-order-history");

  if (!historyContainer) return;

  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", user.uid)
    );

    const querySnapshot = await getDocs(ordersQuery);

    let totalSpent = 0;

    if (querySnapshot.empty) {
      historyContainer.innerHTML = `
        <p style="color: var(--brown-soft); font-style: italic;">
          No previous order found.
        </p>
      `;

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

      if (isDelivered) {
        totalSpent += Number(data.totalAmount) || 0;
      }

      let statusClass = "processing";

      if (isDelivered) statusClass = "delivered";
      if (isCancelled) statusClass = "cancelled";

      const itemsList = Array.isArray(data.items)
        ? data.items
            .map((i) => `${esc(i.quantity)}x ${esc(i.name)}`)
            .join(", ")
        : esc(data.itemsSummary || "Cookie Order");

      historyContainer.innerHTML += `
        <div class="order-history-card">
          <div class="order-history-header">
            <div>
              <strong style="color: var(--brown);">
                Order #${orderId.slice(-6).toUpperCase()}
              </strong>

              <div style="font-size: 0.8rem; color: var(--brown-soft);">
                ${esc(data.date || "Recently")}
              </div>
            </div>

            <span
              class="status-pill-badge ${statusClass}"
              id="customer-status-${orderId}"
              ${isCancelled ? 'style="background:#ffebee; color:#c62828;"' : ""}
            >
              ${esc(data.status || "Processing")}
            </span>
          </div>

          <div style="font-size: 0.9rem; margin: 10px 0; color: var(--brown-soft);">
            ${itemsList}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <div style="font-weight: bold; color: ${isCancelled ? "#888; text-decoration: line-through;" : "var(--caramel);"}">
              ${Number(data.totalAmount) || 0} DH
            </div>

            ${
              isProcessing
                ? `<button class="btn-cancel-order" data-id="${orderId}" style="background: transparent; border: 1px solid #d9534f; color: #d9534f; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">Cancel</button>`
                : ""
            }
          </div>
        </div>
      `;
    });

    updateProfileRankBadge(totalSpent);

    document.querySelectorAll(".btn-cancel-order").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const orderId = e.target.getAttribute("data-id");

        if (confirm("Are you sure you want to cancel this order?")) {
          try {
            e.target.disabled = true;
            e.target.textContent = "Cancelling...";

            await updateDoc(doc(db, "orders", orderId), {
              status: "Cancelled"
            });

            e.target.style.display = "none";

            const statusBadge = document.getElementById(
              `customer-status-${orderId}`
            );

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

    historyContainer.innerHTML = `
      <p style="color: var(--brown-soft); font-style: italic;">
        Unable to load order history.
      </p>
    `;
  }
}

// --- ADMIN DASHBOARD ---

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
        userSpent[data.userId] =
          (userSpent[data.userId] || 0) +
          (Number(data.totalAmount) || 0);
      }
    });
  }

  // --- ADMIN USER DIRECTORY ---

  if (usersList) {
    usersList.innerHTML = "";

    if (statUsers) {
      statUsers.textContent = usersSnapshot.size;
    }

    if (usersSnapshot.empty) {
      usersList.innerHTML = `
        <p style="color: var(--brown-soft); font-style: italic;">
          No registered users.
        </p>
      `;
    } else {
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userId = docSnap.id;
        const spent = userSpent[userId] || 0;
        const rank = getCookieRank(spent);
        const isCustomer = data.role !== "admin";

        const card = document.createElement("div");

        card.style.cssText =
          "display: flex; align-items: center; gap: 15px; padding: 16px; border: 1px solid rgba(74, 55, 40, 0.1); border-radius: 12px; margin-bottom: 12px; background: transparent; flex-wrap: wrap;";

        // Premium Initial Avatar
        const initial = (data.username || "A").charAt(0).toUpperCase();

        const avatarHtml = `
          <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--caramel); color: white; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: bold; flex-shrink: 0; box-shadow: 0 4px 10px rgba(168, 90, 62, 0.3);">
            ${initial}
          </div>
        `;

        // User Information
        const infoHtml = `
          <div style="flex: 1; min-width: 180px;">
            <strong style="display: block; color: var(--brown); font-size: 1.05rem;">
              ${esc(data.username || "Anonymous")}
            </strong>

            <span style="display: block; color: var(--brown-soft); font-size: 0.85rem;">
              ${esc(data.email || "No email")}
            </span>
          </div>
        `;

        // Badges and Total Spent
        let badgesHtml = `
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-left: auto;">
        `;

        if (isCustomer) {
          badgesHtml += `
            <div style="text-align: right; min-width: 70px;">
              <span style="display: block; font-size: 0.7rem; color: var(--brown-soft); text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">
                Total Spent
              </span>

              <strong style="color: var(--caramel); font-size: 1.1rem; line-height: 1;">
                ${spent} DH
              </strong>
            </div>

            <div style="width: 1px; height: 30px; background: rgba(74, 55, 40, 0.1); margin: 0 5px;"></div>
          `;

          badgesHtml += `
            <span style="white-space: nowrap; font-size: 0.75rem; padding: 6px 14px; border-radius: 999px; font-weight: 700; background: ${rank.bg}; color: ${rank.color}; border: 1px solid ${rank.color}40; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              ${rank.icon} ${rank.name}
            </span>
          `;
        }

        const roleBg =
          data.role === "admin" ? "var(--brown)" : "var(--cream)";

        const roleColor =
          data.role === "admin" ? "white" : "var(--brown)";

        badgesHtml += `
          <span style="white-space: nowrap; font-size: 0.75rem; padding: 6px 12px; border-radius: 6px; font-weight: 600; background: ${roleBg}; color: ${roleColor};">
            ${data.role || "customer"}
          </span>
        </div>
        `;

        card.innerHTML = avatarHtml + infoHtml + badgesHtml;
        usersList.appendChild(card);
      });
    }
  }

  // --- ADMIN ORDER LIST ---

  if (ordersList) {
    ordersList.innerHTML = "";
    totalOrdersCount = ordersSnapshot.size;

    if (ordersSnapshot.empty) {
      ordersList.innerHTML = `
        <p style="color: var(--brown-soft); font-style: italic;">
          No orders placed yet.
        </p>
      `;
    } else {
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
          ? data.items
              .map((i) => `${esc(i.quantity)}x ${esc(i.name)}`)
              .join(", ")
          : esc(data.itemsSummary || "Standard Box");

        let statusClass = "processing";

        if (isDelivered) statusClass = "delivered";
        if (isCancelled) statusClass = "cancelled";

        const orderCard = document.createElement("div");

        orderCard.className =
          `admin-order-card ${
            isDelivered ? "is-delivered" :
            isCancelled ? "is-cancelled" : "is-pending"
          }`;

        orderCard.innerHTML = `
          <div class="admin-order-header">
            <div>
              <strong style="font-size: 1.1rem; color: var(--brown);">
                Order #${orderId.slice(-6).toUpperCase()}
              </strong>

              <span style="font-size: 0.8rem; color: var(--brown-soft); margin-left: 8px;">
                (${esc(data.date || "Today")})
              </span>
            </div>

            <span
              id="badge-status-${esc(orderId)}"
              class="status-pill-badge ${statusClass}"
              ${isCancelled ? 'style="background:#ffebee; color:#c62828;"' : ""}
            >
              ${esc(data.status || "Processing")}
            </span>
          </div>

          <div style="margin: 10px 0; font-size: 0.9rem; line-height: 1.5; color: var(--brown-soft);">
            <strong>Items:</strong> ${itemsSummary}<br>
            <strong>Customer:</strong> ${esc(data.customerName || data.userEmail || "Guest")}<br>
            <strong>Phone:</strong>
            <span style="color: ${data.phone ? "inherit" : "#d9534f"}">
              ${esc(data.phone || "N/A")}
            </span>
            <br>
            <strong>Address:</strong> ${esc(data.address || "Settat")}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed rgba(74,55,40,0.15);">
            <div style="font-size: 1.2rem; font-weight: bold; color: ${
              isCancelled ? "#888; text-decoration: line-through;" : "var(--caramel);"
            }">
              ${amount} DH
            </div>

            <div style="display: flex; gap: 10px; align-items: center;">
              ${
                data.phone
                  ? `<a href="https://wa.me/${esc(normalizePhone(data.phone))}" target="_blank" rel="noopener" class="btn-whatsapp-sm">WhatsApp</a>`
                  : ""
              }

              <select
                class="admin-status-dropdown"
                data-id="${esc(orderId)}"
                style="padding:5px; border-radius:5px; border:1px solid #ccc; background:#fff; font-size:0.85rem; cursor:pointer;"
              >
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

          const badge = document.getElementById(`badge-status-${orderId}`);

          try {
            await updateDoc(doc(db, "orders", orderId), {
              status: newStatus
            });

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
            console.error("Update error:", error);
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
    await loadAdminReviews(db);
    const refreshButton = document.getElementById("refresh-reviews-btn");
    if (refreshButton && !refreshButton.dataset.bound) {
      refreshButton.dataset.bound = "true";
      refreshButton.addEventListener("click", () => loadAdminReviews(db));
    }
  } catch (err) {
    console.error("Admin dashboard error:", err);
  }
}

async function loadAdminReviews(db) {
  const container = document.getElementById("admin-reviews");
  if (!container) return;
  container.textContent = "Loading reviews...";
  try {
    const snapshot = await getDocs(collection(db, "reviews"));
    const reviews = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    reviews.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    container.replaceChildren();
    if (!reviews.length) {
      container.textContent = "No reviews submitted yet.";
      return;
    }
    reviews.forEach((review) => {
      const card = document.createElement("article");
      card.style.cssText = "border:1px solid rgba(74,55,40,.16);border-radius:12px;padding:16px;margin:12px 0;background:var(--cream-light);";
      const title = document.createElement("div");
      title.style.cssText = "display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-weight:700;";
      const name = document.createElement("span");
      name.textContent = `${String(review.name || "Anonymous").slice(0,25)} · ${"★".repeat(Math.max(1, Math.min(5, Number(review.rating) || 5)))}${"☆".repeat(5-Math.max(1, Math.min(5, Number(review.rating) || 5)))}`;
      const status = document.createElement("span");
      status.textContent = String(review.status || "pending").toUpperCase();
      status.style.cssText = "font-size:.75rem;letter-spacing:.06em;color:var(--caramel);";
      title.append(name, status);
      const body = document.createElement("p");
      body.style.cssText = "margin:10px 0 14px;white-space:pre-wrap;overflow-wrap:anywhere;";
      body.textContent = String(review.text || "").slice(0, 200);
      card.append(title, body);
      if (review.status === "pending") {
        const actions = document.createElement("div");
        actions.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;";
        [["Approve", "approved", "btn btn-dark"], ["Reject", "rejected", "btn btn-outline"]].forEach(([label, nextStatus, className]) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = className;
          button.textContent = label;
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              await updateDoc(doc(db, "reviews", review.id), { status: nextStatus });
              await loadAdminReviews(db);
            } catch (error) {
              console.error("Review moderation failed:", error);
              alert("Could not update this review. Check Firestore rules and try again.");
              button.disabled = false;
            }
          });
          actions.appendChild(button);
        });
        card.appendChild(actions);
      }
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Could not load reviews:", error);
    container.textContent = "Unable to load reviews. Check that the updated Firestore rules are published.";
  }
}

// --- PASSWORD RESET ---

const forgotPasswordForm = document.getElementById("forgot-password-form");

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const resetEmail = document.getElementById("reset-email").value;
    const msg = document.getElementById("reset-msg");

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

// --- PROFILE INFORMATION UPDATE ---

const infoForm = document.getElementById("profile-info-form");

if (infoForm) {
  infoForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newUsername = document.getElementById("edit-username").value;
    const newAddress = document.getElementById("edit-address").value;

    const newPhone = document.getElementById("edit-phone")
      ? document.getElementById("edit-phone").value
      : "";

    const msg = document.getElementById("info-msg");

    try {
      const user = auth.currentUser;

      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          username: newUsername,
          address: newAddress,
          phone: newPhone
        });

        if (window.userDataObj) {
          window.userDataObj.username = newUsername;
          window.userDataObj.address = newAddress;
          window.userDataObj.phone = newPhone;
        }

        const nameEl = document.getElementById("profile-name");

        if (nameEl) {
          nameEl.textContent = newUsername;
        }

        msg.style.display = "block";
        msg.style.color = "#57a05f";
        msg.textContent = "Profile updated successfully!";

        setTimeout(() => {
          msg.style.display = "none";
        }, 4000);
      }
    } catch (error) {
      msg.style.display = "block";
      msg.style.color = "#d9534f";
      msg.textContent = "Error saving changes.";
    }
  });
}

// --- PASSWORD UPDATE ---

const passwordForm = document.getElementById("password-form");

if (passwordForm) {
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById("new-password").value;
    const msg = document.getElementById("password-msg");

    try {
      await updatePassword(auth.currentUser, newPassword);

      msg.style.display = "block";
      msg.style.color = "#57a05f";
      msg.textContent = "Password updated successfully!";

      passwordForm.reset();

      setTimeout(() => {
        msg.style.display = "none";
      }, 4000);
    } catch (error) {
      msg.style.display = "block";
      msg.style.color = "#d9534f";
      msg.textContent = authMessage(error);
    }
  });
}

// --- USER ROUTING ---

function routeUser(user) {
  if (user.email === ADMIN_EMAIL) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "profile.html";
  }
}

// --- LOGIN ---

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

// --- SIGN UP ---

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
        cart: []
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

// --- GOOGLE SIGN-IN ---

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
          cart: []
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

// --- LOGOUT ---

const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      localStorage.removeItem("youyou_cart");
      window.location.href = "index.html";
    });
  });
}