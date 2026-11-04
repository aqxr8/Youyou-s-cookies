// Shared helpers for the serverless functions (the leading underscore keeps Vercel from exposing this file as a route).
// Verifies that a request refers to a REAL, FRESH order by reading the public order_tracking/<code> document
// (the Firestore rules allow a single-document "get" by anyone who knows the 8-letter code).

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'youyous-cookies';
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCeiG19dex8wZ6TGSjSNe9U2JkqhP0Lbpk'; // public web key
export const SITE_URL = (process.env.SITE_URL || 'https://youyouscookies.vercel.app').replace(/\/+$/, '');

// Strict single-address check: no commas / semicolons / brackets, so one request can never mail several people.
export const EMAIL_RE = /^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,24}$/;

export function clientIp(req) {
  return String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

// Referer header is sent so the call also works if the API key is restricted to your website (HTTP referrers) in Google Cloud.
export async function fetchTracking(code, maxAgeMs) {
  if (!/^[A-Z0-9]{8}$/.test(String(code || ''))) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/order_tracking/${code}?key=${encodeURIComponent(API_KEY)}`;
  const r = await fetch(url, { headers: { Referer: SITE_URL + '/' } });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const f = j && j.fields;
  if (!f || !f.createdAt || !f.createdAt.timestampValue) return null;
  const age = Date.now() - Date.parse(f.createdAt.timestampValue);
  if (!(age >= -60000 && age <= maxAgeMs)) return null;
  return { status: f.status && f.status.stringValue, ageMs: age };
}
