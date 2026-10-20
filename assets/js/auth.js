import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// --- GLOBAL AUTH LISTENER (RUNS ON EVERY PAGE) ---
onAuthStateChanged(auth, async (user) => {
  const userIconLink = document.getElementById('user-icon-link');
  const userIconWrapper = document.getElementById('user-icon-wrapper');

  if (user) {
    // 1. Change the Header Icon
    if (userIconLink && userIconWrapper) {
      userIconLink.href = user.email === ADMIN_EMAIL ? "admin.html" : "profile.html";
      const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=c1771e&color=fff`;
      userIconWrapper.innerHTML = `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }

    // --- 2. PROFILE PAGE LOGIC ---
    if (window.location.pathname.includes('profile.html')) {
      if (user.email === ADMIN_EMAIL) {
        window.location.href = "admin.html"; // Admin shouldn't be on profile page
        return;
      }
      
      document.getElementById('profile-email').textContent = user.email;
      const profilePic = document.getElementById('profile-picture');
      profilePic.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=c1771e&color=fff&size=128`;
      profilePic.style.display = "block";

      // Fetch user data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const displayName = userData.username || user.displayName || "Cookie Lover";
        document.getElementById('profile-name').textContent = displayName;
        
        const editUsername = document.getElementById('edit-username');
        const editAddress = document.getElementById('edit-address');
        if (editUsername) editUsername.value = displayName;
        if (editAddress) editAddress.value = userData.address || "";
      }

      // --- SYNC & RENDER BASKET (CART) ---
      let localCart = JSON.parse(localStorage.getItem('cart')) || [];
      const userRef = doc(db, "users", user.uid);
      
      // Save local cart to Firebase or restore from Firebase
      if (localCart.length > 0) {
        await updateDoc(userRef, { cart: localCart });
      } else if (userDoc.exists() && userDoc.data().cart) {
        localCart = userDoc.data().cart;
        localStorage.setItem('cart', JSON.stringify(localCart));
      }

      // Render the basket on the profile page
      const basketList = document.getElementById('profile-basket-list');
      if (basketList) {
        if (localCart.length === 0) {
          basketList.innerHTML = '<p style="color: var(--brown-soft); font-size: 0.95rem; font-style: italic;">Your basket is currently empty. Go to the menu to add some sweet treats!</p>';
        } else {
          basketList.innerHTML = "";
          let total = 0;
          
          localCart.forEach((item) => {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            total += itemTotal;
            
            // Smart Image Matcher: Automatically finds the right picture based on the cookie name
            let imgPath = "assets/images/logo.png"; // Default fallback
            const nameLow = item.name.toLowerCase();
            
            if(nameLow.includes('classic') && !nameLow.includes('brownie')) imgPath = "assets/images/classic-cookie.png";
            else if(nameLow.includes('brownie')) imgPath = "assets/images/classic-brownie.png";
            else if(nameLow.includes('monster')) imgPath = "assets/images/monster-cookie.png";
            else if(nameLow.includes('lemon')) imgPath = "assets/images/lemon-cookie.png";
            else if(nameLow.includes('kitkat')) imgPath = "assets/images/kitkat-cookie.png";
            else if(nameLow.includes('extra')) imgPath = "assets/images/extra-chocolate.png";
            else if(nameLow.includes('oreo')) imgPath = "assets/images/oreo-cookie.png";
            else if(nameLow.includes('red velvet')) imgPath = "assets/images/red-velvet.png";
            else if(nameLow.includes('kinder')) imgPath = "assets/images/kinder-cookie.png";
            else if(nameLow.includes('lotus')) imgPath = "assets/images/lotus-cookie.png";
            else if(nameLow.includes('mini')) imgPath = "assets/images/mini-box.png";

            // Draw the item with the Picture, Name, and Quantity
            basketList.innerHTML += `
              <div style="border-bottom: 1px solid rgba(74,55,40,0.1); padding: 15px 0; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <img src="${imgPath}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(193, 119, 30, 0.2);">
                  <div>
                    <strong style="color: var(--brown); font-size: 1.1rem;">${item.name}</strong><br>
                    <span style="color: var(--brown-soft); font-size: 0.9rem;">Qty: <b>${item.quantity || 1}</b> &nbsp;|&nbsp; ${item.price} DH each</span>
                  </div>
                </div>
                <div style="color: var(--caramel); font-weight: bold; font-size: 1.1rem;">
                  ${itemTotal} DH
                </div>
              </div>
            `;
          });
          
          basketList.innerHTML += `
            <div style="padding-top: 20px; text-align: right; font-size: 1.2rem;">
              <strong>Total: <span style="color: var(--caramel); font-size: 1.4rem;">${total} DH</span></strong>
              <br>
              <button onclick="document.getElementById('cart-panel').style.display='block'" class="btn btn-dark" style="margin-top: 15px; padding: 12px 24px; font-size: 1rem;">View Box & Checkout</button>
            </div>
          `;
        }
      }
    }

    // --- 3. ADMIN PAGE LOGIC ---
    if (window.location.pathname.includes('admin.html')) {
      if (user.email !== ADMIN_EMAIL) {
        window.location.href = "profile.html"; 
        return;
      }

      // Fetch all users
      const usersList = document.getElementById('admin-users');
      if (usersList) {
        const usersSnapshot = await getDocs(collection(db, "users"));
        usersList.innerHTML = ""; 
        if (usersSnapshot.empty) {
          usersList.innerHTML = '<p style="color: var(--brown-soft); font-style: italic;">No users registered yet.</p>';
        } else {
          usersSnapshot.forEach((doc) => {
            const data = doc.data();
            usersList.innerHTML += `
              <div style="border-bottom: 1px solid rgba(193, 119, 30, 0.2); padding: 12px 0;">
                <strong style="font-size: 1.1rem; color: var(--brown);">${data.username || 'No Name'}</strong><br>
                <span style="font-size: 0.9rem; color: var(--brown-soft);">${data.email}</span><br>
                <span style="font-size: 0.75rem; background: var(--caramel); color: white; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 5px;">Role: ${data.role || 'customer'}</span>
              </div>
            `;
          });
        }
      }

      // Fetch all orders with checkboxes
      const ordersList = document.getElementById('admin-orders');
      if (ordersList) {
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        ordersList.innerHTML = ""; 
        if (ordersSnapshot.empty) {
          ordersList.innerHTML = '<p style="color: var(--brown-soft); font-style: italic;">No orders placed yet.</p>';
        } else {
          ordersSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const orderId = docSnap.id;
            const isDelivered = data.status === 'Delivered';
            
            ordersList.innerHTML += `
              <div style="border-bottom: 1px solid rgba(193, 119, 30, 0.2); padding: 12px 0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: var(--brown);">Order #${orderId.slice(-6).toUpperCase()}</strong> 
                  <span style="font-size: 0.85rem; color: var(--brown-soft);">(${data.date || 'Recent'})</span><br>
                  <span style="font-size: 0.9rem;">Status: <b id="status-text-${orderId}" style="color: ${isDelivered ? '#4CAF50' : 'var(--caramel)'};">${data.status || 'Processing'}</b></span>
                </div>
                <div>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; color: var(--brown);">
                    <input type="checkbox" class="status-checkbox" data-id="${orderId}" ${isDelivered ? 'checked' : ''} style="transform: scale(1.3); accent-color: var(--caramel); cursor: pointer;">
                    Delivered
                  </label>
                </div>
              </div>
            `;
          });

          // Add click listeners to all the checkboxes
          document.querySelectorAll('.status-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
              const orderId = e.target.getAttribute('data-id');
              const newStatus = e.target.checked ? 'Delivered' : 'Processing';
              const statusText = document.getElementById(`status-text-${orderId}`);
              
              try {
                await updateDoc(doc(db, "orders", orderId), {
                  status: newStatus
                });
                statusText.textContent = newStatus;
                statusText.style.color = newStatus === 'Delivered' ? '#4CAF50' : 'var(--caramel)';
              } catch (error) {
                console.error("Error updating order:", error);
                e.target.checked = !e.target.checked; 
                alert("Failed to update the order status.");
              }
            });
          });
        }
      }
    }

  } else {
    // Not logged in
    if (userIconLink) userIconLink.href = "login.html";
    if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('admin.html')) {
      window.location.href = "login.html"; 
    }
  }
}); // <-- THIS MISSING PARENTHESIS WAS CAUSING THE ERROR!

// --- PROFILE PAGE SETTINGS ---
const infoForm = document.getElementById('profile-info-form');
if (infoForm) {
  infoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('edit-username').value;
    const newAddress = document.getElementById('edit-address').value;
    const msg = document.getElementById('info-msg');
    
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          username: newUsername,
          address: newAddress
        });
        document.getElementById('profile-name').textContent = newUsername;
        msg.style.display = "block";
        msg.style.color = "#4CAF50";
        msg.textContent = "Profile updated successfully!";
        setTimeout(() => { msg.style.display = "none"; }, 4000);
      }
    } catch (error) {
      msg.style.display = "block";
      msg.style.color = "#d9534f";
      msg.textContent = "Error saving profile.";
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
      msg.style.color = "#4CAF50";
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

// --- LOGIN / SIGNUP LOGIC ---
function routeUser(user) {
  if (user.email === ADMIN_EMAIL) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "profile.html";
  }
}

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
      document.getElementById('error-msg').style.display = "block";
      document.getElementById('error-msg').textContent = "Invalid email or password.";
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
        username: username, email: email, role: email === ADMIN_EMAIL ? "admin" : "customer", joinedAt: new Date()
      });
      routeUser(cred.user);
    } catch (error) {
      document.getElementById('error-msg').style.display = "block";
      document.getElementById('error-msg').textContent = error.message.replace("Firebase: ", "");
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
          username: cred.user.displayName, email: cred.user.email, role: cred.user.email === ADMIN_EMAIL ? "admin" : "customer", joinedAt: new Date()
        });
      }
      routeUser(cred.user);
    } catch (error) {
      document.getElementById('error-msg').style.display = "block";
      document.getElementById('error-msg').textContent = "Google Sign-In failed.";
    }
  });
}

// --- LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    }).catch((error) => {
      console.error("Logout error:", error);
    });
  });
}