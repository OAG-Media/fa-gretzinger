/** Shared helpers for Vercel email API routes (Node, no ESM). */

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL ||
  'https://gzurjjuhfjbcafmfdaog.supabase.co';

const DEFAULT_FROM = process.env.RESEND_FROM || 'Fa. Gretzinger <info@fa-gretzinger.de>';
const DEFAULT_REPLY_TO = process.env.RESEND_REPLY_TO || 'info@fa-gretzinger.de';

function detectMailboxKey(fromAddress, toAddress) {
  const blob = `${fromAddress || ''} ${toAddress || ''}`.toLowerCase();
  if (blob.includes('kv@fa-gretzinger.de') || blob.includes('kv@inbound.')) return 'kv';
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

async function importInboundEmail(emailId, eventMeta = {}) {
  const email = await fetchResendReceivedEmail(emailId);
  const toList = Array.isArray(email.to) ? email.to : email.to ? [email.to] : [];
  const ccList = Array.isArray(email.cc) ? email.cc : email.cc ? [email.cc] : [];
  const bccList = Array.isArray(email.bcc) ? email.bcc : email.bcc ? [email.bcc] : [];
  const html = email.html || (email.text ? `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(email.text)}</pre>` : '');
  const toJoined = toList.join(', ') || (eventMeta.to || []).join(', ');
  const fromJoined = email.from || eventMeta.from || '';
  const mailboxKey = detectMailboxKey(fromJoined, toJoined);

  const row = {
    direction: 'inbound',
    email_type: 'inbound',
    mailbox_key: mailboxKey,
    from_address: fromJoined,
    to_address: toJoined,
    cc_address: ccList.join(', ') || null,
    bcc_address: bccList.join(', ') || null,
    reply_to: null,
    subject: email.subject || eventMeta.subject || '(ohne Betreff)',
    body_html: html,
    body_text: email.text || null,
    resend_id: null,
    resend_received_id: emailId,
    message_id: email.message_id || eventMeta.message_id || null,
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
  importInboundEmail
};
