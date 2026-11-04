// Vercel serverless function: sends a new-order alert to the bakery's Telegram chats.
// SECURITY
//  - Recipients are fixed on the server (nobody can use this endpoint to message arbitrary chats).
//  - The request must carry the tracking code of a REAL order created in the last 10 minutes
//    (checked against the public order_tracking/<code> document), and each code can trigger ONE alert.
//  - Messages are length-limited and rate-limited per IP (best effort: in memory).
// Set TELEGRAM_BOT_TOKEN (required) and optionally TELEGRAM_CHAT_IDS (comma separated) in Vercel > Environment Variables.
import { fetchTracking, clientIp } from './_guard.js';

const DEFAULT_CHAT_IDS = [TELEGRAM_CHAT_IDS]; // Mohamed, Aya (better: set TELEGRAM_CHAT_IDS in Vercel and delete this line)
const hits = new Map();   // ip -> [timestamps]
const used = new Set();   // tracking codes that already triggered an alert

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return res.status(500).json({ error: 'Not configured.' });
  }

  const ip = clientIp(req);
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((ts) => now - ts < 10 * 60 * 1000);
  if (recent.length >= 10) return res.status(429).json({ error: 'Too many requests.' });
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  const message = String(body.message || '').trim().slice(0, 3500);
  if (!message) return res.status(400).json({ error: 'Empty message.' });

  const code = String(body.trackCode || '');
  let tracking = null;
  try { tracking = await fetchTracking(code, 10 * 60 * 1000); } catch (e) { tracking = null; }
  if (!tracking) return res.status(403).json({ error: 'Unknown order.' });
  if (used.has(code)) return res.status(409).json({ error: 'Already sent.' });
  used.add(code);
  if (used.size > 5000) used.clear();

  const chatIds = (process.env.TELEGRAM_CHAT_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const targets = chatIds.length ? chatIds : DEFAULT_CHAT_IDS;

  try {
    // No parse_mode on purpose: customer names with _ or * would make Telegram reject a Markdown message.
    const results = await Promise.all(
      targets.map((chatId) =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message })
        }).then((r) => r.ok).catch(() => false)
      )
    );
    if (!results.some(Boolean)) {
      used.delete(code);
      return res.status(502).json({ error: 'Telegram rejected the message.' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    used.delete(code);
    console.error('Telegram error:', error && error.message);
    return res.status(500).json({ error: 'Could not send.' });
  }
}
