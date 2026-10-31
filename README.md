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

## Email receipts (PDF attached)
After an order the customer gets a receipt email with a PDF attached (logged-in customers automatically, guests when they type their email).
Sending is done by `api/send-receipt.js`. Pick ONE way and add the variables in Vercel > Settings > Environment Variables, then redeploy:

**A) Gmail - recommended (free, no domain, ~500 emails/day)**
1. In the Google account youyouscookies@gmail.com turn on 2-Step Verification.
2. Open myaccount.google.com/apppasswords, create an App password (name it "website"), copy the 16 letters.
3. In Vercel add `GMAIL_APP_PASSWORD` = those 16 letters (spaces don't matter). Optional: `GMAIL_USER` if you use another Gmail address.

**B) Brevo (free, 300/day)** - used only when `GMAIL_APP_PASSWORD` is not set: `BREVO_API_KEY`, and the sender verified in Brevo.

To force one: set `EMAIL_PROVIDER` = `brevo` (or `gmail`) in Vercel. Without it, Gmail is used when `GMAIL_APP_PASSWORD` exists, otherwise Brevo.

Check it: open `https://YOUR-SITE/api/send-receipt` - it shows which provider is active.
The project now has a `package.json` (needed for `nodemailer`), so Vercel installs it automatically on deploy.

## Phone app (PWA)
The site is now an installable app: `manifest.webmanifest`, `sw.js` (service worker), `offline.html`, `assets/icons/`, `assets/js/pwa.js`, `assets/css/pwa.css`.
- **Android (Chrome):** open the site, tap the "Install" bar (or menu > Install app). It appears on the home screen with the Youyou's Cookies icon and opens full screen.
- **iPhone (Safari):** tap Share > Add to Home Screen.
- Orders, login, Firebase and `/api` calls are never cached; they always use the internet. Without internet the app shows a friendly "No internet connection" screen.
- Needs HTTPS (Vercel provides it). After changing site files, bump `VERSION` in `sw.js` so phones refresh their saved copies.
- To publish in Google Play / App Store later, wrap this same site with Capacitor (`npx cap init`, server URL = your site) or use PWABuilder.com, which turns the live site into an Android package for free.
