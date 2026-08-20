/**
 * Hostinger IMAP → App-Postfach (Inbox-Sync).
 * Umgeht unzuverlässige Weiterleitung an Resend (z. B. manche t-online-Mails).
 *
 * Env: IMAP_HOST, IMAP_PORT, IMAP_INFO_*, IMAP_KV_*
 */

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { supabaseInsertEmailLog, SUPABASE_URL } = require('./emailServerUtils');

const DEFAULT_HOST = 'imap.hostinger.com';
const DEFAULT_PORT = 993;

function mailboxAuth(mailboxKey) {
  if (mailboxKey === 'kv') {
    return {
      key: 'kv',
      user: process.env.IMAP_KV_USER || 'kv@fa-gretzinger.de',
      pass: process.env.IMAP_KV_PASSWORD || process.env.KV_EMAIL_PASSWORD
    };
  }
  return {
    key: 'info',
    user: process.env.IMAP_INFO_USER || 'info@fa-gretzinger.de',
    pass: process.env.IMAP_INFO_PASSWORD || process.env.INFO_EMAIL_PASSWORD
  };
}

function formatAddresses(value) {
  if (!value) return '';
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((a) => {
      if (!a) return '';
      if (typeof a === 'string') return a;
      const email = a.address || a.email || '';
      const name = a.name || '';
      return name ? `${name} <${email}>` : email;
    })
    .filter(Boolean)
    .join(', ');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function existsByMessageId(messageId, mailboxKey) {
  if (!messageId) return false;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  const url =
    `${SUPABASE_URL}/rest/v1/email_logs?message_id=eq.${encodeURIComponent(messageId)}` +
    `&mailbox_key=eq.${encodeURIComponent(mailboxKey)}&select=id&limit=1`;
  const resp = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const data = await resp.json().catch(() => []);
  return Array.isArray(data) && data.length > 0;
}

async function existsByImapUid(imapUid, mailboxKey) {
  if (!imapUid) return false;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  // message_id speichert auch imap:<mailbox>:<uid> als Fallback
  const synthetic = `imap:${mailboxKey}:${imapUid}`;
  return existsByMessageId(synthetic, mailboxKey);
}

async function syncOneMailbox(mailboxKey, { limit = 40, days = 14 } = {}) {
  const auth = mailboxAuth(mailboxKey);
  if (!auth.pass) {
    return { mailbox: mailboxKey, imported: 0, skipped: 0, error: 'IMAP-Passwort fehlt' };
  }

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || DEFAULT_HOST,
    port: Number(process.env.IMAP_PORT || DEFAULT_PORT),
    secure: true,
    auth: { user: auth.user, pass: auth.pass },
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000
  });

  let imported = 0;
  let skipped = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      let uids = await client.search({ since }, { uid: true });
      if (!Array.isArray(uids)) uids = [];
      if (uids.length > limit) uids = uids.slice(-limit);

      for await (const msg of client.fetch(uids, { uid: true, envelope: true, source: true })) {
        try {
          const parsed = await simpleParser(msg.source);
          const messageId = (parsed.messageId || msg.envelope?.messageId || '').trim();
          const syntheticId = messageId || `imap:${mailboxKey}:${msg.uid}`;

          if (await existsByMessageId(syntheticId, mailboxKey)) {
            skipped += 1;
            continue;
          }
          if (messageId && (await existsByMessageId(messageId, mailboxKey))) {
            skipped += 1;
            continue;
          }
          if (await existsByImapUid(msg.uid, mailboxKey)) {
            skipped += 1;
            continue;
          }

          const fromJoined = formatAddresses(parsed.from) || formatAddresses(msg.envelope?.from) || '';
          const toJoined = formatAddresses(parsed.to) || formatAddresses(msg.envelope?.to) || auth.user;
          const ccJoined = formatAddresses(parsed.cc) || null;
          const html =
            parsed.html ||
            (parsed.textHtml ? parsed.textHtml : null) ||
            (parsed.text
              ? `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(parsed.text)}</pre>`
              : '<p><em>Kein Inhalt</em></p>');

          const attachments = (parsed.attachments || []).map((a) => ({
            filename: a.filename || 'Anhang',
            content_type: a.contentType || 'application/octet-stream',
            size: a.size || null
          }));

          const createdAt = parsed.date || msg.envelope?.date || new Date();

          await supabaseInsertEmailLog({
            direction: 'inbound',
            email_type: 'inbound',
            mailbox_key: mailboxKey,
            from_address: fromJoined,
            to_address: toJoined,
            cc_address: ccJoined,
            bcc_address: null,
            reply_to: formatAddresses(parsed.replyTo) || null,
            subject: parsed.subject || msg.envelope?.subject || '(ohne Betreff)',
            body_html: html,
            body_text: parsed.text || null,
            attachments,
            resend_id: null,
            resend_received_id: null,
            message_id: syntheticId,
            status: 'received',
            is_test: false,
            created_at: new Date(createdAt).toISOString()
          });
          imported += 1;
        } catch (inner) {
          console.warn(`[imap-sync ${mailboxKey}] msg skip:`, inner.message);
          skipped += 1;
        }
      }
    } finally {
      lock.release();
    }
    try {
      await client.logout();
    } catch (_) {
      /* ignore */
    }
    return { mailbox: mailboxKey, imported, skipped, ok: true };
  } catch (e) {
    try {
      client.close();
    } catch (_) {
      /* ignore */
    }
    return { mailbox: mailboxKey, imported, skipped, ok: false, error: e.message || 'IMAP Sync fehlgeschlagen' };
  }
}

/** Sync kv + info Inbox von Hostinger. */
async function syncImapInboxes(options = {}) {
  const keys = options.mailboxes || ['kv', 'info'];
  const results = [];
  for (const key of keys) {
    // sequentiell — Hostinger mag parallele Logins weniger
    // eslint-disable-next-line no-await-in-loop
    results.push(await syncOneMailbox(key, options));
  }
  const imported = results.reduce((s, r) => s + (r.imported || 0), 0);
  const skipped = results.reduce((s, r) => s + (r.skipped || 0), 0);
  return { ok: true, imported, skipped, results };
}

module.exports = {
  syncImapInboxes,
  syncOneMailbox
};
