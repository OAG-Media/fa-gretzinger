/**
 * Hostinger IMAP → App-Postfach (Inbox-Sync).
 * Umgeht unzuverlässige Weiterleitung an Resend (z. B. manche t-online-Mails).
 *
 * Env: IMAP_HOST, IMAP_PORT, IMAP_INFO_*, IMAP_KV_*
 */

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const {
  supabaseInsertEmailLog,
  supabasePatchEmailLog,
  findExistingByMessageId,
  normalizeAppAddresses,
  isSenderBlocked,
  storeInboundAttachmentItems
} = require('./emailServerUtils');

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

async function findAnyByMessageId(messageId, mailboxKey) {
  const hit = await findExistingByMessageId(messageId, mailboxKey);
  return hit?.id ? hit : null;
}

async function existsByMessageId(messageId, mailboxKey) {
  // Auch soft-gelöschte zählen → kein Re-Import derselben Message-ID
  const hit = await findAnyByMessageId(messageId, mailboxKey);
  return !!hit?.id;
}

async function existsByImapUid(imapUid, mailboxKey) {
  if (!imapUid) return false;
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
          const subject = parsed.subject || msg.envelope?.subject || '(ohne Betreff)';

          // Bounce-NDR: wird beim Versand direkt in email_logs geschrieben — nicht erneut per IMAP
          if (subject.startsWith('Nicht zustellbar:')) {
            skipped += 1;
            continue;
          }

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

          const fromJoined = normalizeAppAddresses(
            formatAddresses(parsed.from) || formatAddresses(msg.envelope?.from) || ''
          );
          const toJoined = normalizeAppAddresses(
            formatAddresses(parsed.to) || formatAddresses(msg.envelope?.to) || auth.user
          );
          const ccJoined = normalizeAppAddresses(formatAddresses(parsed.cc) || null);
          const html =
            parsed.html ||
            (parsed.textHtml ? parsed.textHtml : null) ||
            (parsed.text
              ? `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(parsed.text)}</pre>`
              : '<p><em>Kein Inhalt</em></p>');

          const attachmentItems = (parsed.attachments || [])
            .filter((a) => {
              if (!a?.content) return false;
              const disp = String(a.contentDisposition || '').toLowerCase();
              const isInline = disp.includes('inline');
              const isSmallImage = /^image\//i.test(a.contentType || '') && (a.size || Buffer.byteLength(a.content) || 0) < 40_000;
              // Signatur-Bilder überspringen, echte Anhänge behalten
              if (isInline && isSmallImage) return false;
              return true;
            })
            .map((a) => ({
              filename: a.filename || 'Anhang',
              contentType: a.contentType || 'application/octet-stream',
              content: a.content,
              size: a.size || null
            }));

          const createdAt = parsed.date || msg.envelope?.date || new Date();
          const blocked = await isSenderBlocked(mailboxKey, fromJoined);

          const inserted = await supabaseInsertEmailLog({
            direction: 'inbound',
            email_type: 'inbound',
            mailbox_key: mailboxKey,
            from_address: fromJoined,
            to_address: toJoined,
            cc_address: ccJoined,
            bcc_address: null,
            reply_to: formatAddresses(parsed.replyTo) || null,
            subject,
            body_html: html,
            body_text: parsed.text || null,
            attachments: [],
            resend_id: null,
            resend_received_id: null,
            message_id: syntheticId,
            status: 'received',
            is_test: false,
            spam_at: blocked ? new Date().toISOString() : null,
            created_at: new Date(createdAt).toISOString()
          });

          if (inserted?.id && attachmentItems.length) {
            const stored = await storeInboundAttachmentItems(inserted.id, attachmentItems);
            if (stored.length) {
              await supabasePatchEmailLog(`id=eq.${inserted.id}`, { attachments: stored });
            }
          }
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
