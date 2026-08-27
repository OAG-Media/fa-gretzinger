/** Shared helpers for Vercel email API routes (Node, no ESM). */

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL ||
  'https://gzurjjuhfjbcafmfdaog.supabase.co';

const DEFAULT_FROM = process.env.RESEND_FROM || 'Fa. Gretzinger <info@fa-gretzinger.de>';
const DEFAULT_REPLY_TO = process.env.RESEND_REPLY_TO || 'info@fa-gretzinger.de';

/** Resend-Empfangsadresse → echte Firmenadresse für Anzeige/Ablage. */
function normalizeAppAddresses(value) {
  if (!value) return value;
  return String(value).replace(/@inbound\.fa-gretzinger\.de/gi, '@fa-gretzinger.de');
}

function detectMailboxKey(fromAddress, toAddress, ccAddress) {
  const to = `${toAddress || ''}`.toLowerCase();
  if (to.includes('kv@')) return 'kv';
  if (to.includes('info@')) return 'info';
  const blob = `${fromAddress || ''} ${toAddress || ''} ${ccAddress || ''}`.toLowerCase();
  if (blob.includes('kv@fa-gretzinger.de') || blob.includes('kv@inbound.') || blob.includes('kv@')) {
    return 'kv';
  }
  return 'info';
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5_000_000) req.destroy(new Error('Body too large'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

async function supabaseInsertEmailLog(row) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert');

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(row)
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg = data?.message || data?.error || `Supabase ${resp.status}`;
    const err = new Error(msg);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return Array.isArray(data) ? data[0] : data;
}

async function fetchResendReceivedEmail(emailId) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY nicht konfiguriert');

  const resp = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.message || data?.error || `Resend ${resp.status}`);
  }
  return data;
}

async function findExistingByMessageId(messageId, mailboxKey) {
  if (!messageId || !mailboxKey) return null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const mid = String(messageId).trim();
  if (!mid) return null;

  // PostgREST: Sonderzeichen (=, <, >) → Wert in Anführungszeichen
  const quoted = `"${mid.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const url =
    `${SUPABASE_URL}/rest/v1/email_logs?select=id,read_at,resend_received_id,deleted_at,created_at` +
    `&mailbox_key=eq.${encodeURIComponent(mailboxKey)}` +
    `&message_id=eq.${encodeURIComponent(quoted)}` +
    `&order=created_at.asc&limit=10`;

  const resp = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const data = await resp.json().catch(() => []);
  if (!Array.isArray(data) || data.length === 0) return null;
  return data.find((r) => !r.deleted_at) || data[0];
}

async function importInboundEmail(emailId, eventMeta = {}) {
  const email = await fetchResendReceivedEmail(emailId);
  const toList = Array.isArray(email.to) ? email.to : email.to ? [email.to] : [];
  const ccList = Array.isArray(email.cc) ? email.cc : email.cc ? [email.cc] : [];
  const bccList = Array.isArray(email.bcc) ? email.bcc : email.bcc ? [email.bcc] : [];
  const html = email.html || (email.text ? `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(email.text)}</pre>` : '');
  const toJoined = normalizeAppAddresses(toList.join(', ') || (eventMeta.to || []).join(', '));
  const fromJoined = normalizeAppAddresses(email.from || eventMeta.from || '');
  const ccJoined = normalizeAppAddresses(ccList.join(', ') || null);
  const bccJoined = normalizeAppAddresses(bccList.join(', ') || null);
  const mailboxKey = detectMailboxKey(fromJoined, toJoined, ccJoined);
  const messageId = (email.message_id || eventMeta.message_id || '').trim() || null;

  if (messageId) {
    const existing = await findExistingByMessageId(messageId, mailboxKey);
    if (existing?.id) {
      // Schon per IMAP da → Resend-ID nachtragen, kein Duplikat
      if (!existing.resend_received_id) {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        await fetch(`${SUPABASE_URL}/rest/v1/email_logs?id=eq.${existing.id}`, {
          method: 'PATCH',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            resend_received_id: emailId
          })
        });
      }
      return { duplicate: true, id: existing.id };
    }
  }

  const row = {
    direction: 'inbound',
    email_type: 'inbound',
    mailbox_key: mailboxKey,
    from_address: fromJoined,
    to_address: toJoined,
    cc_address: ccJoined,
    bcc_address: bccJoined,
    reply_to: null,
    subject: email.subject || eventMeta.subject || '(ohne Betreff)',
    body_html: html,
    body_text: email.text || null,
    resend_id: null,
    resend_received_id: emailId,
    message_id: messageId,
    status: 'received',
    is_test: false
  };

  try {
    return await supabaseInsertEmailLog(row);
  } catch (e) {
    if (e.status === 409 || String(e.message).includes('duplicate')) return { duplicate: true };
    throw e;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  SUPABASE_URL,
  DEFAULT_FROM,
  DEFAULT_REPLY_TO,
  readRawBody,
  supabaseInsertEmailLog,
  fetchResendReceivedEmail,
  importInboundEmail,
  findExistingByMessageId,
  normalizeAppAddresses
};
