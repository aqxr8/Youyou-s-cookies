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
- `christmas.js/css`: goes live 12 Nov 2026 at 00:30 (Morocco time) until 31 Dec 2026 (23:59). Open pages switch on by themselves at 00:30. While ON, the header shows `assets/images/logo-christmas.webp` instead of the default logo videos (default logos come back when it ends). Test: `?christmas=1`, force off: `?christmas=0`. Keeps the light/dark switch (red & white by day, pine green at night).
- Change the dates in the `FROM` / `TO` lines at the top of each .js file. To remove a theme for good, delete its 2 lines (`<link>` + `<script>`) in each page's `<head>`.
- After the event, bump `VERSION` in `sw.js` if you change dates, so phones refresh their saved files.

## Cookie cursors
`assets/css/cursors.css` (regular) + the cursor block at the end of `halloween.css` / `christmas.css`. Desktop with a mouse only (phones/tablets are untouched).
Each theme has a normal cursor and a "clickable" cursor (links, buttons, FAQ, toggles). Text fields keep the normal I-beam.
They are inline SVG (32x32) - to restyle, edit the `url("data:image/svg+xml,...")` in those files; the number pair after it is the click point.

## Newsletter: new flavors, new items, new coupons (Admin > Newsletter)
**Who gets it:** only customers who ticked "Email me about new flavors, new items and coupons" (at sign-up or in My Profile > Emails & News).
Nobody is added automatically. Every email has an Unsubscribe link (and Gmail's own Unsubscribe button); people who unsubscribe are skipped.
**How to send:** Admin > Newsletter > choose New flavor / New item / New coupon (fills a ready text in English, French and Arabic) > edit it >
optionally pick an active coupon (its code and discount are shown in a box) > **Send a test to me** > **Send to subscribers**.
Each customer gets the version in their language (English if you leave that language empty). `{name}` becomes their first name.
Sending is done in batches of 5 with a progress bar; every send is saved in "Sent newsletters".
**Setup:** same Gmail variables as the receipts (`GMAIL_APP_PASSWORD`, `GMAIL_USER`). Optional: `ADMIN_EMAIL` (default youyouscookies@gmail.com),
`ADMIN_UID` (only if your admin login is not that email). A normal Gmail account sends about 500 emails a day.
**Publish the new `firestore.rules`** (adds `unsubscribes` and `campaigns`). Customers who signed up before this update are not subscribed until they tick the box in their profile.
Files: `api/send-campaign.js`, `unsubscribe.html`, `assets/js/unsubscribe.js`, newsletter code in `assets/js/auth.js`.

## Blacklist (Admin > Blacklist) + "Returned" status
- New order status **Returned** (customer refused / sent the order back). It does not count as revenue; marking it offers to block the customer.
- **Block** button on every order (phone / account / email) and a manual form in the Blacklist tab (phone, email or account ID, with a reason and note).
- The block is enforced by **Firestore rules** (not just the website): each order stores `phoneKey` = last 9 digits of the phone, so `+212 6..`, `06..` and `212 6..` are the same person.
  A blocked customer's order is refused by the database; the website shows a neutral message ("We can't accept this order online right now...") and never says why. Customers cannot read the list.
- Orders from the same phone that were Returned before show a yellow "returned before" warning on the admin order card.
- Limits: a person can still use a different phone number (and a guest has no account/email to block). Orders placed before this update have no `phoneKey` but can still be matched in the admin list.
- **Publish the new `firestore.rules`.** Until you do, nothing is blocked (the website falls back to the old way so orders keep working).

## Privacy Policy, accept box and "email all accounts" (v8.7.0)
- **privacy.html**: Privacy Policy & Terms in English, French and Arabic (the page shows the visitor's language). Linked in every footer, in sign-up and in the checkout window. Written as a plain-language template: have it read by someone who knows Moroccan law (Law 09-08 / CNDP) and adjust it to what you really do.
- **Sign-up:** the "Email me about new flavors..." tick box is replaced by a REQUIRED box: "I have read and accept the Privacy Policy & Terms, including news emails ... (I can unsubscribe any time)". Works for email and Google sign-up.
- **Old accounts:** after logging in (or when an already-logged-in customer opens any page) a screen asks them to accept. They cannot use the site until they click "Accept and continue"; "Decline and log out" signs them out. Acceptance is saved on their account (`policyAccepted`, `policyVersion`, `policyAcceptedAt`). The admin and the policy page itself are not blocked.
- **Changing the policy:** edit privacy.html and change `POLICY_VERSION` in `assets/js/auth.js` - everybody is asked to accept again at next login.
- **Newsletter now goes to ALL accounts** with an email, except people who unsubscribed (link in the email) or switched it off in My Profile > Emails & News. A box "Only send to people who already accepted the Privacy Policy" lets you narrow it. Old accounts get their unsubscribe link automatically when you send.

## Revenue = products only, delivery fees excluded (v8.8.0)
Everywhere in the admin, "revenue" is now what the cookies earned: the items minus any discount, WITHOUT the delivery fee.
- Top box: "Revenue (delivered, no delivery fees)".
- Orders tab daily summary: Expected revenue, Revenue delivered, and a separate "Delivery fees (delivered)" box so you can still reconcile the cash you collect.
- User directory: "X DH delivered (no delivery fees)". The loyalty rank still uses what the customer paid (same as on their own profile).
- CSV export: new columns "Revenue without delivery", "Delivery fee" and "Total paid by customer".
The delivery fee is not stored on the order; it is worked out as total paid minus revenue, so it also works for old orders.

## Security notes (v8.8.1)
- The Firebase `apiKey` in the JS files is a public web key by design; real protection = `firestore.rules`. In Google Cloud Console > APIs & Services > Credentials, restrict that key to your site (HTTP referrers) and enable Firebase App Check if you can.
- Secrets live ONLY in Vercel env vars: `GMAIL_APP_PASSWORD`, `TELEGRAM_BOT_TOKEN`. `TELEGRAM_CHAT_IDS` (comma separated). Optional: `SITE_URL` (default https://youyouscookies.vercel.app).
- `/api/telegram` and `/api/send-receipt` only work for a real order created in the last 10 / 30 minutes.
- `Content-Security-Policy-Report-Only` in `vercel.json` shows what a full policy would block; once the console is clean, rename it to `Content-Security-Policy`.

## Menu (v8.9.0)
- Items live in Firestore `menu_items`; edit them in the admin dashboard > Menu tab. The list inside `assets/js/features.js` (`DEFAULT_MENU`) is only a first-paint/offline fallback and the data used by "Import current menu".
- Price lock: Menu tab > Turn lock ON/OFF (document `settings/menu_lock`). If customers ever cannot order, press OFF (or delete that document in the Firebase console).
