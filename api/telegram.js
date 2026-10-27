// Vercel serverless function: sends a new-order alert to the bakery's Telegram chats.
// The recipients are fixed on the server so nobody can use this endpoint to message arbitrary chats.
// (Optional) set TELEGRAM_CHAT_IDS in Vercel as a comma-separated list to override the defaults.
const DEFAULT_CHAT_IDS = ['7932537222', '7523215470']; // Mohamed, Aya

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server missing TELEGRAM_BOT_TOKEN.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const message = String((body && body.message) || '').trim().slice(0, 3500);
  if (!message) {
    return res.status(400).json({ error: 'Empty message.' });
  }

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
        }).then((r) => r.ok)
      )
    );
    if (!results.some(Boolean)) {
      return res.status(502).json({ error: 'Telegram rejected the message.' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
