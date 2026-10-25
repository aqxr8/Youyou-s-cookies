import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCeiG19dex8wZ6TGSjSNe9U2JkqhP0Lbpk",
  authDomain: "youyous-cookies.firebaseapp.com",
  projectId: "youyous-cookies",
  storageBucket: "youyous-cookies.firebasestorage.app",
  messagingSenderId: "893318787156",
  appId: "1:893318787156:web:9780bb29b3eb597db97dc1",
  measurementId: "G-85M038ZLQ2"
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const form = document.getElementById('note-form');
const grid = document.getElementById('notes-grid');
const statusEl = document.getElementById('reviews-status');
const escText = (value) => String(value ?? '').slice(0, 500);

function showMessage(htmlText, isError = false) {
  if (!statusEl) return;
  statusEl.innerHTML = htmlText;
  statusEl.style.color = isError ? '#b42318' : 'var(--brown-soft)';
}

function renderReview(review) {
  const card = document.createElement('article');
  card.className = 'note-card reveal visible';
  card.style.setProperty('--rot', `${Math.random() * 4 - 2}deg`);
  const stars = document.createElement('div');
  stars.className = 'note-stars';
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
  stars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const text = document.createElement('p');
  text.className = 'note-text';
  text.textContent = `“${escText(review.text)}”`;
  const by = document.createElement('div');
  by.className = 'note-by';
  by.textContent = `— ${escText(review.name).slice(0, 25)}`;
  card.append(stars, text, by);
  grid.appendChild(card);
}

async function loadApprovedReviews() {
  if (!grid) return;
  grid.replaceChildren();
  try {
    const q = query(collection(db, 'reviews'), where('status', '==', 'approved'));
    const snap = await getDocs(q);
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    reviews.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    if (!reviews.length) {
      const empty = document.createElement('p');
      empty.className = 'press-src';
      empty.textContent = 'No approved customer reviews yet. Be the first to share your experience!';
      grid.appendChild(empty);
      return;
    }
    reviews.forEach(renderReview);
  } catch (error) {
    console.error('Could not load reviews:', error);
    showMessage('Reviews could not be loaded right now. Please try again later.', true);
  }
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // MUST BE LOGGED IN TO POST A REVIEW
    if (!auth.currentUser && !window.currentUserObj) {
      showMessage('Please <a href="login.html" style="text-decoration: underline; font-weight: bold; color: inherit;">log in</a> to post a review.', true);
      return;
    }

    const name = document.getElementById('note-name').value.trim().slice(0, 25);
    const rating = Number(document.getElementById('note-rating').value);
    const text = document.getElementById('note-text').value.trim().slice(0, 200);
    const button = form.querySelector('button[type="submit"]');

    if (!name || name.length > 25 || !Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 3 || text.length > 200) {
      showMessage('Please enter a name, choose a rating, and write a review (3–200 characters).', true);
      return;
    }

    button.disabled = true;
    button.textContent = 'Submitting…';
    showMessage('');
    try {
      await addDoc(collection(db, 'reviews'), {
        name, rating, text,
        status: 'pending',
        userId: auth.currentUser?.uid || window.currentUserObj?.uid || null,
        createdAt: serverTimestamp()
      });
      form.reset();
      showMessage('Thanks! Your review was submitted and will appear after admin approval.');
    } catch (error) {
      console.error('Review submission failed:', error);
      showMessage('Could not submit your review. Please try again in a moment.', true);
    } finally {
      button.disabled = false;
      button.textContent = 'Submit for Approval';
    }
  });
}

loadApprovedReviews();