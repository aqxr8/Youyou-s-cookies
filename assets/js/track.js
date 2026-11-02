/* =========================================================
   track.js - "Track My Order" page.
   Reads ONE public document: order_tracking/<8-letter code>. It only holds the status, never the
   customer's name, phone or address. The page updates live when the bakery changes the status.
   ========================================================= */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCeiG19dex8wZ6TGSjSNe9U2JkqhP0Lbpk",
  authDomain: "youyous-cookies.firebaseapp.com",
  projectId: "youyous-cookies",
  storageBucket: "youyous-cookies.firebasestorage.app",
  messagingSenderId: "893318787156",
  appId: "1:893318787156:web:9780bb29b3eb597db97dc1",
  measurementId: "G-85M038ZLQ2"
};
const app = getApps().find((a) => a.name === "[DEFAULT]") || initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("track-form");
const input = document.getElementById("track-code");
const box = document.getElementById("track-result");
let stop = null;

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (ts) => {
  try {
    const lang = (window.YYLang && window.YYLang()) || "en";
    const locale = lang === "ar" ? "ar-MA-u-nu-latn" : lang === "fr" ? "fr-MA" : "en-GB";
    return ts.toDate().toLocaleString(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Casablanca" });
  } catch (e) { return ""; }
};
const cleanCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function message(kind, text) {
  box.innerHTML = `<div class="track-msg ${kind}">${esc(text)}</div>`;
}

function render(code, d) {
  const status = d.status || "Processing";
  if (status === "Cancelled") {
    box.innerHTML = `
      <div class="track-code">Order #${esc(code)}</div>
      <div class="track-msg error">This order was cancelled.</div>
      <p class="track-meta">Placed: ${esc(fmt(d.createdAt))}</p>
      <p class="track-meta">If this is a mistake, message us on Instagram @youyou_s_cookies.</p>`;
    return;
  }
  if (status === "Returned") {
    box.innerHTML = `
      <div class="track-code">Order #${esc(code)}</div>
      <div class="track-msg error">This order was returned.</div>
      <p class="track-meta">Placed: ${esc(fmt(d.createdAt))}</p>
      <p class="track-meta">If this is a mistake, message us on Instagram @youyou_s_cookies.</p>`;
    return;
  }
  const delivered = status === "Delivered";
  const steps = [
    { label: "Order received", state: "done" },
    { label: "Being prepared", state: delivered ? "done" : "active" },
    { label: "Delivered", state: delivered ? "done" : "todo" }
  ];
  box.innerHTML = `
    <div class="track-code">Order #${esc(code)}</div>
    <ol class="track-steps">
      ${steps.map((s, i) => `<li class="${s.state}"><span class="dot">${s.state === "done" ? "✓" : i + 1}</span><span class="lbl">${esc(s.label)}</span></li>`).join("")}
    </ol>
    <p class="track-status">${delivered ? "Delivered. Enjoy your cookies!" : "Aya is baking your order. We deliver between 15:00 and 20:00."}</p>
    <p class="track-meta">Placed: ${esc(fmt(d.createdAt))}${d.itemCount ? " · " + esc(d.itemCount) + " item(s)" : ""}</p>
    <p class="track-meta">Last update: ${esc(fmt(d.updatedAt))}</p>
    <p class="track-meta">Payment: cash on delivery.</p>`;
}

function track(raw) {
  if (stop) { stop(); stop = null; }
  const code = cleanCode(raw);
  if (!/^[A-Z0-9]{8}$/.test(code)) {
    message("error", "Please enter the 8-letter order number from your confirmation.");
    return;
  }
  input.value = code;
  message("info", "Looking for your order...");
  stop = onSnapshot(
    doc(db, "order_tracking", code),
    (snap) => {
      if (!snap.exists()) { message("error", "We couldn't find this order number. Check it and try again."); return; }
      render(code, snap.data());
    },
    (err) => {
      console.warn("Tracking failed:", err);
      message("error", "Order tracking is not available right now. Please try again later.");
    }
  );
  try { history.replaceState(null, "", "?code=" + code); } catch (e) { /* ignore */ }
}

if (form) {
  form.addEventListener("submit", (e) => { e.preventDefault(); track(input.value); });
  const fromUrl = new URLSearchParams(location.search).get("code");
  if (fromUrl) track(fromUrl);
}
