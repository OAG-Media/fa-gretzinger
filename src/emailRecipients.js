import { EMAIL_DOMAIN, MAILBOXES, detectMailboxKey } from './emailConfig';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function extractEmail(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const angled = s.match(/<([^>]+)>/);
  const candidate = (angled ? angled[1] : s).trim();
  const m = candidate.match(EMAIL_RE);
  return m ? m[0].toLowerCase() : '';
}

export function displayAddress(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const email = extractEmail(s);
  const name = s.replace(/<[^>]+>/, '').replace(/["']/g, '').trim();
  if (name && email && name.toLowerCase() !== email) return name;
  return email || s;
}

export function parseAddressList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return uniqueAddresses(raw.flatMap(parseAddressList));
  const parts = String(raw)
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = [];
  for (const part of parts) {
    const email = extractEmail(part);
    if (email && !out.some((x) => extractEmail(x) === email)) out.push(email);
  }
  return out;
}

export function uniqueAddresses(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const email = extractEmail(item);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function formatAddressList(list) {
  return uniqueAddresses(list).join(', ') || null;
}

export function isOwnMailboxAddress(raw) {
  const email = extractEmail(raw);
  if (!email) return false;
  const own = Object.values(MAILBOXES).map((m) => m.address.toLowerCase());
  if (own.includes(email)) return true;
  return email.endsWith(`@${EMAIL_DOMAIN}`) || email.includes('@inbound.');
}

export function addressesFromDraft(text) {
  const tokens = String(text || '').split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  return uniqueAddresses(tokens.filter((t) => EMAIL_RE.test(t)));
}

/** Antworten nur an Absender — kein automatisches Cc ans andere Postfach. */
export function buildReplyRecipients(mail, mode = 'reply') {
  const from = extractEmail(mail?.from_address);
  const to = parseAddressList(mail?.to_address);
  const cc = parseAddressList(mail?.cc_address);
  if (mode !== 'replyAll') {
    return { to: from ? [from] : [], cc: [], bcc: [] };
  }
  const others = uniqueAddresses([...to, ...cc]).filter(
    (addr) => addr !== from && !isOwnMailboxAddress(addr)
  );
  return { to: from ? [from] : [], cc: others, bcc: [] };
}

export function mailBelongsToMailbox(mail, mailboxKey) {
  return detectMailboxKey(mail) === mailboxKey;
}
