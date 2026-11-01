// Vercel serverless function: the admin sends a news email (new flavor / new item / new coupon) to subscribers.
//
// SAFETY
//  - Only the admin can call it: the browser sends the admin's Firebase login token, and this function checks it
//    with Google (identitytoolkit "accounts:lookup") and compares the account with the admin email / UID.
//  - Max 8 recipients per request (the admin page sends big lists in small batches, with a progress bar).
//  - Every email carries a personal unsubscribe link + the List-Unsubscribe header (Gmail shows its own "Unsubscribe").
//  - Mail goes out through Gmail (same variables as the receipts):
//      GMAIL_APP_PASSWORD  (required)    GMAIL_USER (default youyouscookies@gmail.com)
//      ADMIN_EMAIL (default youyouscookies@gmail.com)   ADMIN_UID (optional, if the admin login is not a verified email)
//      FIREBASE_API_KEY (optional - defaults to the public web key already used by the site)
//  - A normal Gmail account can send about 500 emails a day (Google Workspace: 2000).

const DEFAULT_KEY = 'AIzaSyCeiG19dex8wZ6TGSjSNe9U2JkqhP0Lbpk';
const MAX_BATCH = 8;

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const T = {
  en: { dir: 'ltr', hi: (n) => `Hi ${n},`, coupon: 'Your coupon code', cta: 'Order now',
        why: "You are receiving this because you asked for news from Youyou's Cookies.", unsub: 'Unsubscribe',
        there: 'there', bye: "Made with love, Youyou's Cookies" },
  fr: { dir: 'ltr', hi: (n) => `Bonjour ${n},`, coupon: 'Votre code promo', cta: 'Commander',
        why: "Vous recevez ce message car vous avez demandé des nouvelles de Youyou's Cookies.", unsub: 'Se désabonner',
        there: 'cher client', bye: "Fait avec amour, Youyou's Cookies" },
  ar: { dir: 'rtl', hi: (n) => `مرحباً ${n}،`, coupon: 'رمز الخصم الخاص بك', cta: 'اطلب الآن',
        why: "تصلك هذه الرسالة لأنك طلبت أخبار Youyou's Cookies.", unsub: 'إلغاء الاشتراك',
        there: 'عزيزي الزبون', bye: "صُنع بحب، Youyou's Cookies" }
};

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
const fill = (s, name) => String(s || '').replace(/\{name\}/gi, name);

function pickContent(content, lang) {
  const en = content.en || {};
  const l = content[lang] || {};
  const use = (k) => (l[k] && String(l[k]).trim()) ? l[k] : en[k];
  return { subject: use('subject'), title: use('title'), body: use('body'), cta: use('cta') };
}

function buildEmail({ lang, c, couponCode, couponText, name, unsubUrl, ctaUrl }) {
  const t = T[lang];
  const align = t.dir === 'rtl' ? 'right' : 'left';
  const paragraphs = esc(c.body).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6;">${p.replace(/\n/g, '<br>')}</p>`).join('');
  const couponBlock = couponCode ? `
        <tr><td style="padding:6px 28px 6px;text-align:center;">
          <div style="border:2px dashed #c0716a;border-radius:14px;padding:16px 10px;background:#fff7f4;">
            <div style="font-size:13px;color:#7a5a52;margin-bottom:6px;">${esc(t.coupon)}</div>
            <div style="font-size:28px;font-weight:800;letter-spacing:3px;color:#c0716a;direction:ltr;">${esc(couponCode)}</div>
            ${couponText ? `<div style="font-size:14px;color:#4a2b24;margin-top:8px;">${esc(couponText)}</div>` : ''}
          </div>
        </td></tr>` : '';
  const html = `<!doctype html>
<html lang="${lang}" dir="${t.dir}"><body style="margin:0;background:#fbeeea;font-family:Arial,Helvetica,sans-serif;color:#4a2b24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbeeea;padding:24px 10px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#c0716a;color:#ffffff;text-align:center;padding:24px 16px;">
          <div style="font-size:26px;font-weight:700;">Youyou's Cookies</div>
          <div style="font-size:13px;letter-spacing:1px;margin-top:4px;">MADE WITH LOVE</div>
        </td></tr>
        <tr><td style="padding:26px 28px 8px;text-align:${align};">
          <div style="font-size:22px;font-weight:700;margin-bottom:12px;">${esc(c.title)}</div>
          <div style="margin-bottom:12px;color:#7a5a52;">${esc(t.hi(name))}</div>
          ${paragraphs}
        </td></tr>${couponBlock}
        <tr><td style="padding:14px 28px 26px;text-align:center;">
          <a href="${esc(ctaUrl)}" style="display:inline-block;background:#c0716a;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 30px;border-radius:999px;">${esc(c.cta || t.cta)}</a>
        </td></tr>
        <tr><td style="padding:0 28px 22px;text-align:${align};font-size:13px;color:#7a5a52;line-height:1.5;">
          <strong style="color:#c0716a;">${esc(t.bye)}</strong>
        </td></tr>
        <tr><td style="background:#faf3ef;padding:14px 28px;text-align:center;font-size:12px;color:#8a7a74;line-height:1.5;">
          ${esc(t.why)}<br><a href="${esc(unsubUrl)}" style="color:#8a7a74;">${esc(t.unsub)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const text = [c.title, '', t.hi(name), '', c.body, '',
    couponCode ? `${t.coupon}: ${couponCode}${couponText ? ' - ' + couponText : ''}` : '',
    `${c.cta || t.cta}: ${ctaUrl}`, '', t.bye, '', `${t.why}`, `${t.unsub}: ${unsubUrl}`].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n');
  return { html, text };
}

async function verifyAdmin(idToken) {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 4000) return null;
  const key = process.env.FIREBASE_API_KEY || DEFAULT_KEY;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken })
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  const u = j && j.users && j.users[0];
  if (!u) return null;
  const adminEmail = String(process.env.ADMIN_EMAIL || 'youyouscookies@gmail.com').toLowerCase();
  const okEmail = String(u.email || '').toLowerCase() === adminEmail;
  const okUid = process.env.ADMIN_UID && u.localId === process.env.ADMIN_UID;
  return okEmail || okUid ? u : null;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, gmailConfigured: Boolean(process.env.GMAIL_APP_PASSWORD), maxBatch: MAX_BATCH });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPass) return res.status(500).json({ error: 'GMAIL_APP_PASSWORD is not set in Vercel.', code: 'no_key' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  let admin = null;
  try { admin = await verifyAdmin(body.idToken); } catch (e) { admin = null; }
  if (!admin) return res.status(403).json({ error: 'Admin login required.', code: 'not_admin' });

  const recipients = (Array.isArray(body.recipients) ? body.recipients : []).slice(0, MAX_BATCH).map((r) => ({
    email: clip(r && r.email, 200).trim(),
    name: clip(r && r.name, 60).trim(),
    lang: ['en', 'fr', 'ar'].includes(r && r.lang) ? r.lang : 'en',
    token: String((r && r.token) || '').replace(/[^A-Za-z0-9]/g, '')
  })).filter((r) => /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(r.email) && r.token.length >= 20 && r.token.length <= 64);
  if (!recipients.length) return res.status(400).json({ error: 'No valid recipients.', code: 'no_recipients' });

  const content = {};
  ['en', 'fr', 'ar'].forEach((l) => {
    const c = (body.content && body.content[l]) || {};
    content[l] = { subject: clip(c.subject, 150), title: clip(c.title, 150), body: clip(c.body, 5000), cta: clip(c.cta, 40) };
  });
  if (!content.en.subject.trim() || !content.en.title.trim() || !content.en.body.trim()) {
    return res.status(400).json({ error: 'The English subject, title and message are required.', code: 'no_content' });
  }

  const coupon = body.coupon && /^[A-Za-z0-9_-]{2,30}$/.test(String(body.coupon.code || '')) ? body.coupon : null;
  const couponText = (l) => clip(coupon && coupon.text && (coupon.text[l] || coupon.text.en), 120);

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').replace(/[^a-zA-Z0-9.\-:]/g, '');
  if (!host) return res.status(400).json({ error: 'Unknown host.' });
  let path = String(body.ctaPath || '/menu');
  if (!/^\/[A-Za-z0-9/_\-.?=&#%]*$/.test(path) || path.startsWith('//') || path.length > 120) path = '/menu';
  const ctaUrl = `https://${host}${path}`;

  const user = process.env.GMAIL_USER || 'youyouscookies@gmail.com';
  const fromName = process.env.RECEIPT_FROM_NAME || "Youyou's Cookies";
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user, pass: String(gmailPass).replace(/\s+/g, '') }
  });

  const results = [];
  for (const r of recipients) {
    const t = T[r.lang];
    const firstName = (r.name.split(/\s+/)[0] || '').trim() || t.there;
    const c = pickContent(content, r.lang);
    const filled = { subject: fill(c.subject, firstName), title: fill(c.title, firstName), body: fill(c.body, firstName), cta: c.cta };
    const unsubUrl = `https://${host}/unsubscribe?t=${r.token}`;
    const { html, text } = buildEmail({
      lang: r.lang, c: filled, couponCode: coupon ? String(coupon.code).toUpperCase() : '',
      couponText: coupon ? couponText(r.lang) : '', name: firstName, unsubUrl, ctaUrl
    });
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${user}>`,
        to: r.email,
        replyTo: user,
        subject: filled.subject,
        html,
        text,
        list: { unsubscribe: { url: unsubUrl, comment: 'Unsubscribe' } }
      });
      results.push({ email: r.email, ok: true });
    } catch (err) {
      console.error('Campaign send error:', r.email, err && err.message);
      results.push({ email: r.email, ok: false, error: String(err && err.message || err).slice(0, 120) });
    }
  }
  const sent = results.filter((x) => x.ok).length;
  return res.status(200).json({ sent, failed: results.length - sent, results });
}
