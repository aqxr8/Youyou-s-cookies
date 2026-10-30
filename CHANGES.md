# v4.2.4 - receipt email can be sent from your own Gmail (no Brevo needed) and now has a PDF receipt attached.

# v4.2 - French + Arabic, pen icon, user photos in admin

- **French and Arabic**: EN / FR / عربي switcher in the header (and in the phone menu). Hand-written translations (no Google Translate) in `assets/js/i18n-dict-1.js` and `i18n-dict-2.js`; engine in `assets/js/i18n.js`; styles in `assets/css/i18n.css`.
  Arabic switches the whole site to right-to-left. The choice is remembered; on a first visit the browser language is used if it is French or Arabic.
  Texts that appear later (cart, checkout, order history, admin lists, error messages) are translated too.
  To change a translation or add a new sentence, edit the rows `["English", "Français", "العربية"]` in the dict files (the English must match the page text exactly).
  The WhatsApp / Telegram order messages stay in English on purpose, so the bakery always reads the same format.
- **Profile picture**: the camera icon is now a pen.
- **Admin > User Directory**: each user now shows their profile picture (initials avatar if they have none).

---

# v2.4 - phone polish + WebP

- Home "Popular Cookies" cards now open that item on the menu (menu.html#cookie-classic / #cookie-kinder / #mini-boxes) and flash it. Fixed duplicated carousel dots.

- Footer text properly centred on phones; "From 15dh" badge is now a pill (was clipped by the flower shape); light/dark button has its own calm fade on phones, desktop animation unchanged.

- All images are WebP (HTML, CSS and JSON-LD references updated; no broken .png/.jpg links). Images resized for phones: 6.8 MB -> 1.65 MB.
  The only PNG is `assets/images/apple-touch-icon.png`, because iPhones ignore WebP for the home-screen icon.
- New `assets/css/mobile.css` (loaded last on every page): single-column footer, horizontal product cards on the home page,
  44px tap targets, 16px form fields (no iOS zoom-on-focus), safe-area cart drawer, phone-friendly admin stat cards.
- Pinch-to-zoom re-enabled on login/signup/forgot-password (removed maximum-scale / user-scalable=no).
- Cart toast no longer wraps into a tall bubble or blocks taps.
- Includes v2.3.1: In Progress / Delivered / Cancelled buttons in admin, and a "Cancel Order" confirmation dialog for customers.

---

# v2.3 - bug-fix release

IMPORTANT: publish the new `firestore.rules` in Firebase Console > Firestore > Rules, and redeploy to Vercel.

## Broken features that now work
- Admin dashboard: `initAdminDashboard` was called but never defined (page threw an error). Orders, stats, users, review moderation and the Delivered checkbox now work.
- Reviews page never loaded `reviews.js`, so reviews could not be posted or shown. Fixed (and removed the duplicate handler in features.js).
- Forgot-password form had no handler. Profile "Save", "Update password" and avatar upload had no handlers either. All added.
- Firestore rules blocked: orders (promo/subtotal fields were not allowed), promo codes, reviews, and customer order cancellation. Rules rewritten.
- Admin promo list was rebuilt every second, so Enable/Disable/Delete clicks were often lost.

## Security
- api/telegram.js: anyone could make your bot message any chat id. Recipients are now fixed on the server (optional env TELEGRAM_CHAT_IDS).
- Telegram messages no longer fail when a name contains _ or * (removed Markdown mode).
- Browser no longer tries to write role "admin".
- Cart prices come from MENU_PRICES in features.js (keep it in sync with menu.html). Tampered/unknown cart items are dropped.
- Cart item names are inserted as text, not HTML.

## Checkout
- Corrupt localStorage cart no longer crashes the whole site.
- Phone (9-15 digits) and address required; Esc / click outside closes the confirm modal.
- Promo is only marked as used if the order was actually saved. WhatsApp message includes the order ref.
- Morocco time now comes from main.js (Safari-safe).

## Small fixes
- Broken trash-icon SVG path (Empty Box button), avatar onerror infinite loop, "kinder cookie.jpg" path with a space, dark-theme flash for light-mode visitors.

## Still to do (not changed)
- Promo codes are validated in the browser; for real protection move promo + order pricing to a server function.
- Reviews on index/contact, image compression (13 MB), French/Arabic.

---
# v2.2 - bug-fix release (built on your latest files)

Drop these files over your project (same paths). Images/videos are untouched.

## Security
- Stored XSS: guest/customer-typed order data (name, phone, address, item names) was inserted into the admin page as raw HTML. Now escaped everywhere (admin, profile, order history, cart, reviews).
- Orders: total is recomputed in auth.js (never trusted from the page); text lengths and quantities are capped.
- Cart prices are checked against MENU_PRICES in features.js, so editing localStorage can't make cookies cheaper. (UPDATE MENU_PRICES when you change prices or add menu items.)
- Browser no longer writes role "admin" at signup.
- firestore.rules: PUBLISH THEM in Firebase Console. They allow guest + customer orders with strict validation, admin-only status changes, customers can read only their own orders.

## Checkout / cart
- WhatsApp is opened immediately on tap (iPhone Safari blocked it after the Firestore await); falls back to same-tab if blocked.
- If saving to Firestore fails, the WhatsApp order still goes out; button no longer gets stuck on "Processing Order...".
- WhatsApp message now includes "Order ref: #XXXXXX" matching the admin dashboard.
- Phone number validated (9-15 digits). Esc / click outside closes the confirm modal.
- Cart panel stays closed after you close it (per session). Item names built as text, not HTML.
- Time-of-day note uses Morocco time (Intl) instead of parsing toLocaleString (unreliable on Safari).

## Admin
- Orders sorted newest first. Phone links fixed for 06xxxxxxxx numbers (wa.me needs 212...).
- Ticking "Delivered" now updates the Pending KPI and the filter tabs.
- Filter buttons no longer use the implicit global `event`. Load errors are shown instead of a stuck "Loading...".

## Other fixes
- Reviews: no HTML injection, newest on top after reload, corrupt storage can't crash the page.
- Login: "Forgot password?" UI added (your handler existed but the form didn't). Friendly error messages.
- Admin/profile redirects work with or without ".html" in the URL.
- Status pill: Morocco time via Intl; only the visible logo video loads; dead Google Translate loader removed.
- Hours copy made consistent (FAQ, footer, contact, JSON-LD). Please confirm.
- Pinch-zoom re-enabled, focus outlines, reduced-motion support, form labels, canonical + absolute og:image, noindex on private pages, sitemap/robots/security headers.

## Not changed
- Image compression (13 MB), shared reviews (still per-browser), French/Arabic.
