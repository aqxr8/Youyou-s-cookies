/* =========================================================
   unsubscribe.js - one-click (button) unsubscribe from news emails.
   The link in every email carries ?t=<secret token>. Clicking the button creates the marker document
   unsubscribes/<token>; "Subscribe again" deletes it. A button is used (not auto-unsubscribe on page load)
   so mail scanners that open links cannot unsubscribe people by accident.
   ========================================================= */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: FIRE_BASE_API_KEY,
  authDomain: "youyous-cookies.firebaseapp.com",
  projectId: "youyous-cookies",
  storageBucket: "youyous-cookies.firebasestorage.app",
  messagingSenderId: "893318787156",
  appId: "1:893318787156:web:9780bb29b3eb597db97dc1",
  measurementId: "G-85M038ZLQ2"
};
const app = getApps().find((a) => a.name === "[DEFAULT]") || initializeApp(firebaseConfig);
const db = getFirestore(app);

const token = (new URLSearchParams(location.search).get("t") || "").replace(/[^A-Za-z0-9]/g, "");
const btn = document.getElementById("unsub-btn");
const again = document.getElementById("resub-btn");
const box = document.getElementById("unsub-msg");
const show = (kind, text) => { box.innerHTML = `<div class="track-msg ${kind}"></div>`; box.firstChild.textContent = text; };

if (token.length < 20) {
  btn.style.display = "none";
  show("error", "This unsubscribe link is not valid. Please use the link from the email.");
} else {
  getDoc(doc(db, "unsubscribes", token)).then((s) => {
    if (s.exists()) { btn.style.display = "none"; again.style.display = ""; show("info", "You are already unsubscribed."); }
  }).catch(() => { /* ignore */ });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await setDoc(doc(db, "unsubscribes", token), { at: serverTimestamp() });
      btn.style.display = "none"; again.style.display = "";
      show("info", "You are unsubscribed. You will not get news emails anymore.");
    } catch (e) {
      console.warn("Unsubscribe failed:", e);
      show("error", "Something went wrong. Please try again in a moment.");
    } finally { btn.disabled = false; }
  });
  again.addEventListener("click", async () => {
    again.disabled = true;
    try {
      await deleteDoc(doc(db, "unsubscribes", token));
      again.style.display = "none"; btn.style.display = "";
      show("info", "You are subscribed again. Welcome back!");
    } catch (e) {
      show("error", "Something went wrong. Please try again in a moment.");
    } finally { again.disabled = false; }
  });
}
