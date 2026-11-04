# v8.8.1 - SECURITY: /api/telegram and /api/send-receipt now require the tracking code of a real, recent order (checked in Firestore) so nobody can use them to spam you or send emails from your Gmail; telegram: one alert per order; strict single-address email check; admin newsletter requires a VERIFIED admin email; email links use SITE_URL instead of the Host header; internal error details no longer returned; CSP/HSTS headers (CSP full policy is Report-Only, check the browser console, then enforce it); Firestore order rule checks userEmail. Publish firestore.rules again. Optional env: SITE_URL.

# v8.8.0 - Based on v8.7.0 (the Simple email style of 8.7.1 is NOT included). Admin revenue now excludes delivery fees (top box, daily summary, CSV, user directory).

# v8.7.0 - Privacy Policy & Terms page (EN/FR/AR), required accept box at sign-up (newsletter tick removed), policy screen for existing users at login, newsletter to all accounts (opt-out via link/profile).

# v8.6.0 - Blacklist system (phone / email / account) enforced by Firestore rules + new "Returned" order status, Block buttons and warnings in the admin. Publish the new firestore.rules!

# v8.5.0 - Newsletter system: opt-in at sign-up + profile, unsubscribe page/link, admin Newsletter tab (EN/FR/AR, coupon box, test send, batch sending, history), api/send-campaign.js. Publish the new firestore.rules!

# v8.4.2 - Lemon Cookie removed from the menu and the cart price list.

# v8.4.1 - price fix: Classic Brownie now 10 DH everywhere (the Add button and cart charged 15 DH while the card showed 10). Console warning if a menu button price ever differs from the cart price table.

# v8.4.0 - Order tracking page + codes, admin daily summary / baking list / print slips / CSV export, Brevo removed (Gmail only). Publish the new firestore.rules!

