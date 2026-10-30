// Vercel serverless function: emails the customer a receipt for their order.
//
// Uses Brevo's HTTP API (free: 300 emails/day, no domain needed - you only verify ONE sender address).
// Set these in Vercel > Project > Settings > Environment Variables:
//   BREVO_API_KEY       (required)  Brevo > SMTP & API > API keys
//   RECEIPT_FROM_EMAIL  (optional)  must be a verified sender in Brevo. Default: youyouscookies@gmail.com
//   RECEIPT_FROM_NAME   (optional)  Default: Youyou's Cookies
//
// Abuse protection (best effort, in memory): max 5 requests per IP per 10 min and max 3 emails per order number.

const hits = new Map();       // ip -> [timestamps]
const perOrder = new Map();   // order ref -> count

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
const clampNum = (n, max = 100000) => Math.min(Math.max(Number(n) || 0, 0), max);

const TEXT = {
  en: {
    dir: 'ltr', subject: (ref) => `Your Youyou's Cookies receipt ${ref}`,
    title: 'Thank you for your order!', hello: (n) => `Hi ${n},`,
    intro: 'Aya has received your order and will bake it fresh. Here is your receipt.',
    order: 'Order', date: 'Date', item: 'Item', qty: 'Qty', price: 'Price',
    subtotal: 'Subtotal', promo: 'Promo code', delivery: 'Delivery', free: 'Free', total: 'Total to pay',
    address: 'Delivery address', phone: 'Phone',
    pay: 'Payment: cash on delivery. Delivery every day between 15:00 and 20:00 (Morocco time).',
    help: 'Questions? Reply to this email or message us on Instagram @youyou_s_cookies.',
    bye: 'Made with love, Youyou\'s Cookies'
  },
  fr: {
    dir: 'ltr', subject: (ref) => `Votre reçu Youyou's Cookies ${ref}`,
    title: 'Merci pour votre commande !', hello: (n) => `Bonjour ${n},`,
    intro: 'Aya a bien reçu votre commande et la préparera toute fraîche. Voici votre reçu.',
    order: 'Commande', date: 'Date', item: 'Article', qty: 'Qté', price: 'Prix',
    subtotal: 'Sous-total', promo: 'Code promo', delivery: 'Livraison', free: 'Gratuite', total: 'Total à payer',
    address: 'Adresse de livraison', phone: 'Téléphone',
    pay: 'Paiement : à la livraison. Livraison tous les jours entre 15h00 et 20h00 (heure du Maroc).',
    help: 'Une question ? Répondez à cet e-mail ou écrivez-nous sur Instagram @youyou_s_cookies.',
    bye: 'Fait avec amour, Youyou\'s Cookies'
  },
  ar: {
    dir: 'rtl', subject: (ref) => `إيصال طلبك من Youyou's Cookies ${ref}`,
    title: 'شكراً على طلبك!', hello: (n) => `مرحباً ${n}،`,
    intro: 'وصل طلبك إلى آية وستخبزه طازجاً. هذا هو إيصالك.',
    order: 'الطلب', date: 'التاريخ', item: 'المنتج', qty: 'الكمية', price: 'السعر',
    subtotal: 'المجموع الفرعي', promo: 'رمز الخصم', delivery: 'التوصيل', free: 'مجاني', total: 'المبلغ المستحق',
    address: 'عنوان التوصيل', phone: 'الهاتف',
    pay: 'الدفع: نقداً عند الاستلام. التوصيل كل يوم بين 15:00 و20:00 (بتوقيت المغرب).',
    help: 'عندك سؤال؟ ردّ على هذا البريد أو راسلنا على إنستغرام @youyou_s_cookies.',
    bye: 'صُنع بحب، Youyou\'s Cookies'
  }
};

function buildHtml(t, d) {
  const align = t.dir === 'rtl' ? 'right' : 'left';
  const opp = t.dir === 'rtl' ? 'left' : 'right';
  const rows = d.items.map((i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0d9d3;text-align:${align};">${esc(i.name)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0d9d3;text-align:center;">${i.quantity}</td>
        <td dir="ltr" style="padding:10px 0;border-bottom:1px solid #f0d9d3;text-align:${opp};white-space:nowrap;">${money(i.price * i.quantity)} DH</td>
      </tr>`).join('');
  const line = (label, value, bold) => `
      <tr>
        <td colspan="2" style="padding:5px 0;text-align:${align};${bold ? 'font-weight:700;font-size:17px;color:#c0716a;' : 'color:#7a5a52;'}">${label}</td>
        <td dir="ltr" style="padding:5px 0;text-align:${opp};white-space:nowrap;${bold ? 'font-weight:700;font-size:17px;color:#c0716a;' : ''}">${value}</td>
      </tr>`;
  const promoLine = d.promoCode && d.discount > 0 ? line(`${t.promo}: ${esc(d.promoCode)}`, `-${money(d.discount)} DH`) : '';
  return `<!doctype html>
<html lang="${d.lang}" dir="${t.dir}"><body style="margin:0;background:#fbeeea;font-family:Arial,Helvetica,sans-serif;color:#4a2b24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbeeea;padding:24px 10px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#c0716a;color:#ffffff;text-align:center;padding:24px 16px;">
          <div style="font-size:26px;font-weight:700;">Youyou's Cookies</div>
          <div style="font-size:13px;letter-spacing:1px;margin-top:4px;">MADE WITH LOVE</div>
        </td></tr>
        <tr><td style="padding:26px 24px 8px;text-align:${align};">
          <div style="font-size:22px;font-weight:700;margin-bottom:10px;">${t.title}</div>
          <div style="margin-bottom:6px;">${t.hello(esc(d.name))}</div>
          <div style="color:#7a5a52;line-height:1.5;">${t.intro}</div>
        </td></tr>
        <tr><td style="padding:12px 24px;text-align:${align};font-size:14px;">
          <strong>${t.order}:</strong> <span dir="ltr">${esc(d.orderRef)}</span><br>
          <strong>${t.date}:</strong> ${esc(d.date)}
        </td></tr>
        <tr><td style="padding:0 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr>
              <th style="padding:8px 0;border-bottom:2px solid #c0716a;text-align:${align};">${t.item}</th>
              <th style="padding:8px;border-bottom:2px solid #c0716a;text-align:center;">${t.qty}</th>
              <th style="padding:8px 0;border-bottom:2px solid #c0716a;text-align:${opp};">${t.price}</th>
            </tr>${rows}
            ${line(t.subtotal, money(d.subtotal) + ' DH')}
            ${promoLine}
            ${line(t.delivery, d.deliveryFee > 0 ? money(d.deliveryFee) + ' DH' : t.free)}
            ${line(t.total, money(d.total) + ' DH', true)}
          </table>
        </td></tr>
        <tr><td style="padding:18px 24px 4px;text-align:${align};font-size:14px;line-height:1.6;">
          ${d.address ? `<strong>${t.address}:</strong> ${esc(d.address)}<br>` : ''}
          ${d.phone ? `<strong>${t.phone}:</strong> ${esc(d.phone)}` : ''}
        </td></tr>
        <tr><td style="padding:14px 24px 26px;text-align:${align};font-size:13px;color:#7a5a52;line-height:1.5;">
          ${t.pay}<br><br>${t.help}<br><br><strong style="color:#c0716a;">${t.bye}</strong>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server missing BREVO_API_KEY.' });

  // --- rate limit (best effort) ---
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((ts) => now - ts < 10 * 60 * 1000);
  if (recent.length >= 5) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  recent.push(now); hits.set(ip, recent);

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const email = String(body.email || '').trim().slice(0, 200);
  if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  const orderRef = String(body.orderRef || '').replace(/[^#A-Za-z0-9]/g, '').slice(0, 12);
  if (!orderRef) return res.status(400).json({ error: 'Missing order number.' });

  const sent = perOrder.get(orderRef) || 0;
  if (sent >= 3) return res.status(429).json({ error: 'Receipt already sent for this order.' });

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
  const items = rawItems.map((i) => ({
    name: String((i && i.name) || '').slice(0, 80),
    quantity: Math.min(Math.max(parseInt(i && i.quantity, 10) || 0, 0), 99),
    price: clampNum(i && i.price, 5000)
  })).filter((i) => i.name && i.quantity > 0);
  if (!items.length) return res.status(400).json({ error: 'No items.' });

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = Math.min(clampNum(body.discount, subtotal), subtotal);
  const deliveryFee = Math.min(clampNum(body.deliveryFee, 100), 100);
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  const lang = ['en', 'fr', 'ar'].includes(body.lang) ? body.lang : 'en';
  const t = TEXT[lang];
  const date = new Date().toLocaleString(lang === 'ar' ? 'ar-MA-u-nu-latn' : lang === 'fr' ? 'fr-MA' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca'
  });
  const name = String(body.name || '').slice(0, 60) || (lang === 'ar' ? 'عزيزي الزبون' : lang === 'fr' ? 'cher client' : 'there');

  const html = buildHtml(t, {
    lang, name, orderRef: '#' + orderRef.replace(/^#/, ''), date, items, subtotal, discount, deliveryFee, total,
    promoCode: String(body.promoCode || '').slice(0, 40),
    address: String(body.address || '').slice(0, 300),
    phone: String(body.phone || '').slice(0, 30)
  });

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: {
          name: process.env.RECEIPT_FROM_NAME || "Youyou's Cookies",
          email: process.env.RECEIPT_FROM_EMAIL || 'youyouscookies@gmail.com'
        },
        to: [{ email }],
        replyTo: { email: process.env.RECEIPT_FROM_EMAIL || 'youyouscookies@gmail.com' },
        subject: t.subject('#' + orderRef.replace(/^#/, '')),
        htmlContent: html
      })
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('Brevo error:', r.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Email provider rejected the message.' });
    }
    perOrder.set(orderRef, sent + 1);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
