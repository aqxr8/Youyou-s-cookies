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

## Email receipts (new)
After an order, the customer gets a receipt by email (logged-in customers automatically, guests when they type their email).
It uses `api/send-receipt.js` + Brevo (free, 300 emails/day):
1. Create a free account on brevo.com and verify `youyouscookies@gmail.com` as a sender (Senders & IP > Senders).
2. SMTP & API > API keys > create a key.
3. In Vercel > Settings > Environment Variables add `BREVO_API_KEY` (and optionally `RECEIPT_FROM_EMAIL`, `RECEIPT_FROM_NAME`), then redeploy.
