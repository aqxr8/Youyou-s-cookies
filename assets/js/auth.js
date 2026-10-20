import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ PASTE YOUR FIREBASE CONFIG HERE IN STEP 3
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

// Define your Admin email here
const ADMIN_EMAIL = "youyouscookies@gmail.com";

function routeUser(user) {
  if (user.email === ADMIN_EMAIL) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "index.html"; // Or a dashboard.html if you make one!
  }
}

// --- SIGN IN LOGIC (login.html) ---
const loginForm = document.getElementById('auth-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById('error-msg');
    errorMsg.style.display = "none";
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      routeUser(cred.user);
    } catch (error) {
      errorMsg.style.display = "block";
      errorMsg.textContent = "Invalid email or password.";
    }
  });
}

// --- SIGN UP LOGIC (signup.html) ---
const signupForm = document.getElementById('auth-form-signup');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById('error-msg');
    errorMsg.style.display = "none";
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Save user to Database
      await setDoc(doc(db, "users", cred.user.uid), {
        username: username,
        email: email,
        role: email === ADMIN_EMAIL ? "admin" : "customer",
        joinedAt: new Date()
      });
      routeUser(cred.user);
    } catch (error) {
      errorMsg.style.display = "block";
      errorMsg.textContent = error.message.replace("Firebase: ", "");
    }
  });
}

// --- GOOGLE BUTTON LOGIC (Both Pages) ---
const googleBtn = document.getElementById('google-btn');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    const errorMsg = document.getElementById('error-msg');
    if(errorMsg) errorMsg.style.display = "none";
    
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);
      
      // If it's a new user, save them to the database
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
      if(errorMsg) {
        errorMsg.style.display = "block";
        errorMsg.textContent = "Google Sign-In failed.";
      }
    }
  });
}

// --- LOGOUT LOGIC (admin.html) ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
  });
}