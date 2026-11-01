# Youyou-s-cookies
The official website for The YouYou Cookies. Features an interactive flavor quiz and an integrated WhatsApp ordering system. Deployed on Vercel.
# 🍪 The YouYou Cookies

Welcome to the official repository for **The YouYou Cookies** website! This project is a modern, responsive web storefront designed to showcase our premium cookie lineup, engage customers with a custom interactive quiz, and streamline the checkout process using direct WhatsApp ordering.

## 🚀 Live Demo
[View the live website here](https://youyouscookies.vercel.app/)

## ✨ Key Features
* **Integrated WhatsApp Ordering:** Customers can browse the menu, build their cart, and send their final order seamlessly to our business WhatsApp.
* **Interactive "Find Your Match" Quiz:** A custom-built logic quiz that recommends the perfect cookie based on user preferences.
* **Premium Flavor Showcase:** High-quality menu displays featuring our signature lineup: Lotus, Red Velvet, Extra Chocolate, Classic, Kinder, and Oreo.
* **Responsive UI:** Fully optimized for a smooth experience across mobile, tablet, and desktop.

## 🛠️ Tech Stack
* **Frontend:** HTML, CSS, JavaScript 
* **Deployment & Hosting:** Vercel

## 💻 Local Development

To run this project locally on your machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aqxr8/Youyou-s-cookies.git

## Email receipts (PDF attached) - Gmail only
After an order the customer gets a receipt email with a PDF attached and a "Track your order" button
(logged-in customers automatically, guests when they type their email). Sent by `api/send-receipt.js` through Gmail.
Vercel > Settings > Environment Variables, then redeploy:
- `GMAIL_APP_PASSWORD` = the 16-letter App Password (Google Account > Security > 2-Step Verification ON > App passwords)
- `GMAIL_USER` = the Gmail address that App Password belongs to (default youyouscookies@gmail.com)
- optional `RECEIPT_FROM_NAME`
Check: open `https://YOUR-SITE/api/send-receipt` - it shows `gmailConfigured: true`. (Brevo was removed.)
Receipts from a Gmail address can land in spam - that is why customers also get the Track My Order page and number.

## Order tracking (track.html)
Each order gets an 8-letter tracking code (shown in the confirmation, receipt, profile, admin and Telegram).
`track.html?code=XXXXXXXX` shows live status (In progress / Delivered / Cancelled) from one public document
`order_tracking/<code>` (status only - no name, phone or address; nobody can list/search them). The admin's status buttons and the
customer's Cancel button keep it in sync. **Publish the new `firestore.rules`** - until then orders still work (old way) but have no tracking code.

## Admin extras (Orders tab)
Daily summary for any day (orders, in progress, delivered, cancelled, expected and collected money), "To bake" totals,
`Baking list` and `All slips` print buttons, a `Slip` button on every order (80 mm receipt-printer layout) and CSV export
(this day / all orders - opens in Excel, UTF-8).

## Phone app (PWA)
The site is now an installable app: `manifest.webmanifest`, `sw.js` (service worker), `offline.html`, `assets/icons/`, `assets/js/pwa.js`, `assets/css/pwa.css`.
- **Android (Chrome):** open the site, tap the "Install" bar (or menu > Install app). It appears on the home screen with the Youyou's Cookies icon and opens full screen.
- **iPhone (Safari):** tap Share > Add to Home Screen.
- Orders, login, Firebase and `/api` calls are never cached; they always use the internet. Without internet the app shows a friendly "No internet connection" screen.
- Needs HTTPS (Vercel provides it). After changing site files, bump `VERSION` in `sw.js` so phones refresh their saved copies.
- To publish in Google Play / App Store later, wrap this same site with Capacitor (`npx cap init`, server URL = your site) or use PWABuilder.com, which turns the live site into an Android package for free.

## Promo codes: one use per account (server-enforced)
Each use is stored in the `promo_uses` collection (document id = `<promoId>_<uid>`) in the SAME batch as the order.
Firestore refuses a second use by the same account, so it cannot be bypassed with two tabs or devices.
**You must publish the new `firestore.rules`** (Firebase Console > Firestore Database > Rules > paste > Publish) - until then the site
falls back to the old, weaker method. Admin > Promo Codes shows how many users used each code and a "Who used it" list (name, email, date, order).

## Seasonal themes (automatic)
- `halloween.js/css`: 25 Oct - 1 Nov 2026 (until 23:59 Morocco time). Test: `?halloween=1`, force off: `?halloween=0`.
- `christmas.js/css`: 1 - 31 Dec 2026. Test: `?christmas=1`, force off: `?christmas=0`. Keeps the light/dark switch (red & white by day, pine green at night).
- Change the dates in the `FROM` / `TO` lines at the top of each .js file. To remove a theme for good, delete its 2 lines (`<link>` + `<script>`) in each page's `<head>`.
- After the event, bump `VERSION` in `sw.js` if you change dates, so phones refresh their saved files.

## Cookie cursors
`assets/css/cursors.css` (regular) + the cursor block at the end of `halloween.css` / `christmas.css`. Desktop with a mouse only (phones/tablets are untouched).
Each theme has a normal cursor and a "clickable" cursor (links, buttons, FAQ, toggles). Text fields keep the normal I-beam.
They are inline SVG (32x32) - to restyle, edit the `url("data:image/svg+xml,...")` in those files; the number pair after it is the click point.
