/**
 * Nach Resend-Versand: Kopie per IMAP APPEND in Hostinger „Gesendet“.
 *
 * Env (Vercel + .env.local):
 *   IMAP_HOST=imap.hostinger.com
 *   IMAP_PORT=993
 *   IMAP_INFO_USER=info@fa-gretzinger.de
 *   IMAP_INFO_PASSWORD=...
 *   IMAP_KV_USER=kv@fa-gretzinger.de
 *   IMAP_KV_PASSWORD=...
 *
 * Alias (optional): INFO_EMAIL_PASSWORD / KV_EMAIL_PASSWORD
 */

const { ImapFlow } = require('imapflow');

const DEFAULT_HOST = 'imap.hostinger.com';
const DEFAULT_PORT = 993;

function extractAddress(fromOrEmail) {
  const s = String(fromOrEmail || '');
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

function mailboxCredsForFrom(fromHeader) {
  const addr = extractAddress(fromHeader);
  const infoUser = process.env.IMAP_INFO_USER || 'info@fa-gretzinger.de';
  const kvUser = process.env.IMAP_KV_USER || 'kv@fa-gretzinger.de';
  const infoPass = process.env.IMAP_INFO_PASSWORD || process.env.INFO_EMAIL_PASSWORD;
  const kvPass = process.env.IMAP_KV_PASSWORD || process.env.KV_EMAIL_PASSWORD;

  if (addr.includes('kv@')) {
    return { user: kvUser, pass: kvPass, key: 'kv' };
  }
  return { user: infoUser, pass: infoPass, key: 'info' };
}

function encodeHeaderValue(value) {
  const s = String(value || '');
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
}

function listHeader(label, values) {
  if (!values) return null;
  const arr = Array.isArray(values) ? values : [values];
  const joined = arr.filter(Boolean).join(', ');
  if (!joined) return null;
  return `${label}: ${joined}`;
}

function buildRfc822({ from, to, cc, bcc, replyTo, subject, html, attachments = [] }) {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines = [
    `From: ${from}`,
    listHeader('To', to),
    listHeader('Cc', cc),
    listHeader('Bcc', bcc),
    replyTo ? `Reply-To: ${replyTo}` : null,
    `Subject: ${encodeHeaderValue(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(String(html || ''), 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
  ].filter((x) => x !== null);

  for (const att of attachments) {
    if (!att?.content) continue;
    const filename = String(att.filename || 'Anhang.pdf').replace(/"/g, '');
    const ctype = att.content_type || att.contentType || 'application/pdf';
    const b64 = String(att.content).replace(/^data:[^;]+;base64,/, '');
    lines.push(
      `--${boundary}`,
      `Content-Type: ${ctype}; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      b64.replace(/(.{76})/g, '$1\r\n')
    );
  }

  lines.push(`--${boundary}--`, '');
  return lines.join('\r\n');
}

function flagHas(flags, name) {
  if (!flags) return false;
  if (typeof flags.has === 'function') return flags.has(name);
  if (Array.isArray(flags)) return flags.includes(name);
  try {
    return Array.from(flags).includes(name);
  } catch (_) {
    return false;
  }
}

async function resolveSentPath(client) {
  const boxes = await client.list();
  const special = boxes.find((b) => b.specialUse === '\\Sent' || flagHas(b.flags, '\\Sent'));
  if (special?.path) return special.path;

  const preferred = ['INBOX.Sent', 'Sent', 'Gesendet', 'INBOX.Gesendet', 'Sent Items', 'Sent Messages'];
  for (const name of preferred) {
    const hit = boxes.find((b) => b.path === name || String(b.path || '').toLowerCase() === name.toLowerCase());
    if (hit) return hit.path;
  }
  for (const b of boxes) {
    const p = String(b.path || '').toLowerCase();
    if (p.includes('sent') || p.includes('gesendet')) return b.path;
  }
  return 'INBOX.Sent';
}

/**
 * @returns {{ ok: boolean, mailbox?: string, path?: string, skipped?: boolean, error?: string }}
 */
async function appendSentCopy(mail) {
  const creds = mailboxCredsForFrom(mail.from);
  if (!creds.pass) {
    return { ok: false, skipped: true, mailbox: creds.key, error: 'IMAP-Passwort fehlt' };
  }

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || DEFAULT_HOST,
    port: Number(process.env.IMAP_PORT || DEFAULT_PORT),
    secure: true,
    auth: { user: creds.user, pass: creds.pass },
    logger: false,
    connectionTimeout: 12_000,
    greetingTimeout: 12_000
  });

  try {
    await client.connect();
    const sentPath = await resolveSentPath(client);
    const raw = buildRfc822(mail);
    await client.append(sentPath, Buffer.from(raw, 'utf8'), ['\\Seen'], new Date());
    try {
      await client.logout();
    } catch (_) {
      /* ignore */
    }
    return { ok: true, mailbox: creds.key, path: sentPath };
  } catch (e) {
    try {
      client.close();
    } catch (_) {
      /* ignore */
    }
    return { ok: false, mailbox: creds.key, error: e.message || 'IMAP APPEND fehlgeschlagen' };
  }
}

module.exports = {
  appendSentCopy,
  buildRfc822,
  extractAddress
};
