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
    // 1. Change the Header Icon to the User's Profile Picture
    if (userIconLink && userIconWrapper) {
      userIconLink.href = user.email === ADMIN_EMAIL ? "admin.html" : "profile.html";
      
      // If user has a Google photo, use it. Otherwise, use a default colored circle
      const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=c1771e&color=fff`;
      userIconWrapper.innerHTML = `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }

// 2. Load Profile Data if on profile.html
    if (window.location.pathname.includes('profile.html')) {
      document.getElementById('profile-email').textContent = user.email;
      const profilePic = document.getElementById('profile-picture');
      
      profilePic.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=c1771e&color=fff&size=128`;
      profilePic.style.display = "block";

      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const displayName = userData.username || user.displayName || "Cookie Lover";
        document.getElementById('profile-name').textContent = displayName;
        
        // Auto-fill the new personal info forms
        const editUsername = document.getElementById('edit-username');
        const editAddress = document.getElementById('edit-address');
        if (editUsername) editUsername.value = displayName;
        if (editAddress) editAddress.value = userData.address || "";
      }

      // Fetch Orders
      const q = query(collection(db, "orders"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const ordersList = document.getElementById('order-history-list');
      
      if (querySnapshot.empty) {
        ordersList.innerHTML = '<p style="color: var(--brown-soft); font-size: 0.95rem; font-style: italic;">No orders found yet.</p>';
      } else {
        ordersList.innerHTML = "";
        querySnapshot.forEach((doc) => {
          const order = doc.data();
          ordersList.innerHTML += `
            <div style="border-bottom: 1px solid rgba(74,55,40,0.1); padding: 10px 0;">
              <strong>Order #${doc.id.slice(-6).toUpperCase()}</strong> - ${order.date || 'Recent'}<br>
              <span style="color: var(--caramel);">${order.status || 'Processing'}</span>
            </div>
          `;
        });
      }
    }
  } else {
    if (userIconLink) userIconLink.href = "login.html";
    if (window.location.pathname.includes('profile.html')) window.location.href = "login.html";
  }
});

// --- PROFILE PAGE LOGIC (Update Info, Change Password & Logout) ---

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
        // Save new info to Firestore
        await updateDoc(doc(db, "users", user.uid), {
          username: newUsername,
          address: newAddress
        });
        
        // Update the display name at the top of the profile instantly
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