import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ PASTE YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "youyous-cookies.firebaseapp.com",
  projectId: "youyous-cookies",
  storageBucket: "youyous-cookies.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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

      // Fetch username from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        document.getElementById('profile-name').textContent = userDoc.data().username || "Cookie Lover";
      } else {
        document.getElementById('profile-name').textContent = user.displayName || "Cookie Lover";
      }

      // Fetch Orders
      const q = query(collection(db, "orders"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const ordersList = document.getElementById('order-history-list');
      
      if (!querySnapshot.empty) {
        ordersList.innerHTML = ""; // Clear placeholder
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
    // Not logged in: keep default SVG and point to login
    if (userIconLink) userIconLink.href = "login.html";
    if (window.location.pathname.includes('profile.html')) {
      window.location.href = "login.html"; // Kick out if trying to view profile logged out
    }
  }
});

// --- PROFILE PAGE LOGIC (Change Password & Logout) ---
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
    } catch (error) {
      msg.style.display = "block";
      msg.style.color = "#d9534f";
      msg.textContent = error.message.replace("Firebase: ", "");
    }
  });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
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