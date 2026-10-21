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
