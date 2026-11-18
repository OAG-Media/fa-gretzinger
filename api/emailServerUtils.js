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

/** Erste E-Mail-Adresse aus "Name <addr@x.de>" / freiem Text. */
function extractEmailAddress(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  const angle = s.match(/<([^>]+@[^>]+)>/);
  if (angle) return angle[1].trim().toLowerCase();
  const bare = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return bare ? bare[0].toLowerCase() : '';
}

async function isSenderBlocked(mailboxKey, fromAddress) {
  const email = extractEmailAddress(fromAddress);
  if (!email || !mailboxKey) return false;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/email_blocked_senders?select=id` +
      `&mailbox_key=eq.${encodeURIComponent(mailboxKey)}` +
      `&email_address=eq.${encodeURIComponent(email)}` +
      `&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const data = await resp.json().catch(() => []);
  return Array.isArray(data) && data.length > 0;
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

function safeAttachmentFilename(name, index = 0) {
  const raw = String(name || `Anhang-${index + 1}`).replace(/[\\/]/g, '_').trim();
  return raw || `Anhang-${index + 1}`;
}

/**
 * Signatur-/Inline-Bilder (Outlook image001.png …) vs. echte Anhänge.
 * Echte hochgeladene PDFs/Bilder bleiben sichtbar.
 */
function isInlineOrSignatureAttachment(att = {}) {
  const filename = String(att.filename || att.name || '').trim();
  const contentType = String(att.content_type || att.contentType || '').toLowerCase();
  const disposition = String(att.content_disposition || att.contentDisposition || '').toLowerCase();
  const contentId = String(att.content_id || att.contentId || att.cid || '').trim();
  const size = Number(att.size) || 0;
  const isImage = contentType.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp)$/i.test(filename);

  if (disposition.includes('inline')) return true;
  // Outlook/Word Signatur-Muster
  if (isImage && /^image\d{2,4}\./i.test(filename)) return true;
  if (isImage && /^~wrd/i.test(filename)) return true;
  if (isImage && contentId && size > 0 && size < 50_000) return true;
  // Winmail / winmail.dat oft unbrauchbar — trotzdem behalten wenn nicht image
  return false;
}

function attachmentsNeedStorage(atts) {
  const real = (Array.isArray(atts) ? atts : []).filter((a) => !isInlineOrSignatureAttachment(a));
  if (real.length === 0) {
    // Nur Signatur-Bilder oder gar nichts → nichts nachladen nötig,
    // außer die Liste ist komplett leer (könnte echte Anhänge noch fehlen)
    if (!Array.isArray(atts) || atts.length === 0) return true;
    return false;
  }
  return real.some((a) => !a?.storage_path);
}

async function uploadBytesToEmailAttachments(logId, filename, bytes, contentType) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert');
  const safeName = safeAttachmentFilename(filename);
  const path = `${logId}/${safeName}`;
  const resp = await fetch(
    `${SUPABASE_URL}/storage/v1/object/email-attachments/${encodeURIComponent(logId)}/${encodeURIComponent(safeName)}`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': contentType || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: bytes
    }
  );
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Storage-Upload fehlgeschlagen (${resp.status}): ${errText || safeName}`);
  }
  return {
    filename: safeName,
    content_type: contentType || 'application/octet-stream',
    size: bytes?.byteLength || bytes?.length || null,
    storage_path: path
  };
}

/** items: [{ filename, contentType, content, contentDisposition?, contentId?, size? }] */
async function storeInboundAttachmentItems(logId, items = []) {
  const stored = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item?.content) continue;
    if (isInlineOrSignatureAttachment(item)) continue;
    const buf = Buffer.isBuffer(item.content)
      ? item.content
      : Buffer.from(item.content);
    if (!buf.length) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const meta = await uploadBytesToEmailAttachments(
        logId,
        item.filename || `Anhang-${i + 1}`,
        buf,
        item.contentType || item.content_type || 'application/octet-stream'
      );
      stored.push({
        ...meta,
        content_disposition: item.contentDisposition || item.content_disposition || 'attachment',
        content_id: item.contentId || item.content_id || null
      });
    } catch (e) {
      console.warn('[inbound-att upload]', e.message || e);
      stored.push({
        filename: safeAttachmentFilename(item.filename, i),
        content_type: item.contentType || item.content_type || 'application/octet-stream',
        size: buf.length,
        error: e.message || 'upload_failed'
      });
    }
  }
  return stored;
}

async function listResendReceivedAttachments(emailId) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !emailId) return [];
  const resp = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.warn('[resend-atts list]', data?.message || resp.status);
    return [];
  }
  return Array.isArray(data?.data) ? data.data : [];
}

async function fetchResendAttachmentItems(emailId) {
  const list = await listResendReceivedAttachments(emailId);
  const items = [];
  for (const att of list) {
    if (!att?.download_url) continue;
    const meta = {
      filename: att.filename || 'Anhang',
      contentType: att.content_type || 'application/octet-stream',
      content_type: att.content_type || 'application/octet-stream',
      contentDisposition: att.content_disposition || null,
      content_disposition: att.content_disposition || null,
      contentId: att.content_id || null,
      content_id: att.content_id || null,
      size: att.size || 0
    };
    if (isInlineOrSignatureAttachment(meta)) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const resp = await fetch(att.download_url);
      if (!resp.ok) continue;
      // eslint-disable-next-line no-await-in-loop
      const ab = await resp.arrayBuffer();
      items.push({
        ...meta,
        content: Buffer.from(ab),
        size: att.size || ab.byteLength
      });
    } catch (e) {
      console.warn('[resend-atts download]', att.filename, e.message || e);
    }
  }
  return items;
}

async function ensureAttachmentsForLog(log, { force = false } = {}) {
  if (!log?.id) return log;
  const existing = Array.isArray(log.attachments) ? log.attachments : [];
  if (!force && existing.length > 0 && !attachmentsNeedStorage(existing)) {
    return log;
  }

  let items = [];
  if (log.resend_received_id) {
    items = await fetchResendAttachmentItems(log.resend_received_id);
  }
  if (!items.length) {
    return log;
  }

  const stored = await storeInboundAttachmentItems(log.id, items);
  if (!stored.length) return log;

  await supabasePatchEmailLog(`id=eq.${log.id}`, { attachments: stored });
  return { ...log, attachments: stored };
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

  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/email_logs?select=id,read_at,resend_received_id,deleted_at,created_at,attachments` +
    `&mailbox_key=eq.${encodeURIComponent(mailboxKey)}` +
    `&message_id=eq.${encodeURIComponent(mid)}` +
    `&order=created_at.asc&limit=10`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
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
      // Schon per IMAP da → Resend-ID nachtragen, Anhänge nachziehen, kein Duplikat
      const patch = {};
      if (!existing.resend_received_id) patch.resend_received_id = emailId;
      if (Object.keys(patch).length) {
        await supabasePatchEmailLog(`id=eq.${existing.id}`, patch);
      }
      const full = { ...existing, ...patch, resend_received_id: emailId };
      await ensureAttachmentsForLog(full, { force: attachmentsNeedStorage(existing.attachments) });
      return { duplicate: true, id: existing.id };
    }
  }

  const blocked = await isSenderBlocked(mailboxKey, fromJoined);
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
    attachments: [],
    resend_id: null,
    resend_received_id: emailId,
    message_id: messageId,
    status: 'received',
    is_test: false,
    spam_at: blocked ? new Date().toISOString() : null
  };

  try {
    const inserted = await supabaseInsertEmailLog(row);
    if (inserted?.id) {
      await ensureAttachmentsForLog(
        { ...inserted, resend_received_id: emailId },
        { force: true }
      );
    }
    return inserted;
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

async function supabasePatchEmailLog(filterQuery, patch) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert');

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?${filterQuery}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(patch)
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg = data?.message || data?.error || `Supabase ${resp.status}`;
    throw new Error(msg);
  }
  return Array.isArray(data) ? data : [];
}

async function findEmailLogByResendId(resendId) {
  if (!resendId) return null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/email_logs?resend_id=eq.${encodeURIComponent(resendId)}&select=*&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const data = await resp.json().catch(() => []);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function fetchResendSentEmail(emailId) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY nicht konfiguriert');
  const resp = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.message || data?.error || `Resend ${resp.status}`);
  }
  return data;
}

function formatBounceReasonDe(bounce = {}) {
  const type = String(bounce.type || 'Undetermined');
  const subType = String(bounce.subType || '');
  const message = String(bounce.message || '').trim();
  const diagnostic = Array.isArray(bounce.diagnosticCode)
    ? bounce.diagnosticCode.filter(Boolean).join(' · ')
    : '';

  const typeLabels = {
    Permanent: 'Dauerhaft abgelehnt (Hard Bounce)',
    Transient: 'Vorübergehend abgelehnt (Soft Bounce)',
    Undetermined: 'Zustellung fehlgeschlagen (Grund unbekannt)'
  };

  const subLabels = {
    Suppressed: 'Adresse steht auf einer Sperrliste',
    NoEmail: 'E-Mail-Adresse existiert nicht',
    MailboxFull: 'Postfach voll',
    MessageTooLarge: 'Nachricht zu groß',
    ContentRejected: 'Inhalt vom Empfänger-Server abgelehnt',
    AttachmentRejected: 'Anhang abgelehnt',
    General: 'Allgemeine Ablehnung durch den Empfänger-Server'
  };

  const lines = [
    typeLabels[type] || typeLabels.Undetermined,
    subType && subLabels[subType] ? subLabels[subType] : (subType && subType !== 'Undetermined' ? subType : ''),
    message && /didn't contain enough information/i.test(message)
      ? 'Der Mailserver des Empfängers hat die Zustellung abgelehnt, aber keine genaue Begründung mitgeteilt (häufig bei strengen Spam-Filtern oder Sperrlisten).'
      : message,
    diagnostic
  ].filter(Boolean);

  return lines.join('\n');
}

function bounceNotifyMailbox(log) {
  if (log?.mailbox_key === 'kv') return 'kv@fa-gretzinger.de';
  return 'info@fa-gretzinger.de';
}

function buildBounceNdrHtml({ log, bounce, reasonDe }) {
  const to = log?.to_address || '—';
  const subject = log?.subject || '(ohne Betreff)';
  const sentAt = log?.created_at
    ? new Date(log.created_at).toLocaleString('de-DE')
    : '—';

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;line-height:1.55;max-width:640px">
      <h2 style="color:#b91c1c;margin:0 0 12px;font-size:18px">Zustellung fehlgeschlagen</h2>
      <p>Ihre E-Mail konnte <strong>nicht zugestellt</strong> werden.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
        <tr><td style="padding:6px 10px;background:#f8fafc;border:1px solid #e5e7eb;width:130px"><strong>Empfänger</strong></td><td style="padding:6px 10px;border:1px solid #e5e7eb">${escapeHtml(to)}</td></tr>
        <tr><td style="padding:6px 10px;background:#f8fafc;border:1px solid #e5e7eb"><strong>Betreff</strong></td><td style="padding:6px 10px;border:1px solid #e5e7eb">${escapeHtml(subject)}</td></tr>
        <tr><td style="padding:6px 10px;background:#f8fafc;border:1px solid #e5e7eb"><strong>Gesendet am</strong></td><td style="padding:6px 10px;border:1px solid #e5e7eb">${escapeHtml(sentAt)}</td></tr>
      </table>
      <p style="margin:0 0 8px"><strong>Grund:</strong></p>
      <pre style="white-space:pre-wrap;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;color:#7f1d1d;font-family:inherit;font-size:13px">${escapeHtml(reasonDe)}</pre>
      <p style="color:#555;font-size:13px;margin-top:16px">
        <strong>Was Sie tun können:</strong><br/>
        • Empfänger-Adresse prüfen (Tippfehler?)<br/>
        • Alternativ eine andere Adresse des Akustikers verwenden<br/>
        • Bei wiederholten Problemen den Empfänger bitten, <code>fa-gretzinger.de</code> bzw. <code>info@fa-gretzinger.de</code> auf die Erlaubnisliste zu setzen<br/>
        • Als Notlösung: Versand über <code>fa-gretzinger@t-online.de</code> (wie bei Optik Bauer erfolgreich)
      </p>
      <p style="color:#888;font-size:12px;margin-top:20px">Automatische Zustellbenachrichtigung — Fa. Gretzinger Hörgeräteservice</p>
    </div>
  `;
}

async function sendBounceNotification({ log, bounce, reasonDe }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !log) return { skipped: true, reason: 'no_key_or_log' };

  const notifyTo = bounceNotifyMailbox(log);
  const mailboxKey = log.mailbox_key === 'kv' ? 'kv' : 'info';
  const from = mailboxKey === 'kv'
    ? 'Fa. Gretzinger KV <kv@fa-gretzinger.de>'
    : (process.env.RESEND_FROM || DEFAULT_FROM);
  const subject = `Nicht zustellbar: ${log.subject || 'E-Mail'}`;
  const html = buildBounceNdrHtml({ log, bounce, reasonDe });
  const ndrMessageId = `ndr:${log.id || 'unknown'}`;

  const existingNdr = await findExistingByMessageId(ndrMessageId, mailboxKey);
  if (existingNdr?.id && !existingNdr.deleted_at) {
    return { ok: true, skipped: true, reason: 'ndr_already_logged', to: notifyTo };
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [notifyTo],
      subject,
      html,
      reply_to: notifyTo
    })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.warn('[bounce-notify] send failed:', data?.message || resp.status);
    return { ok: false, error: data?.message || `HTTP ${resp.status}` };
  }

  try {
    await supabaseInsertEmailLog({
      direction: 'inbound',
      email_type: 'other',
      mailbox_key: mailboxKey,
      from_address: from,
      to_address: notifyTo,
      cc_address: null,
      bcc_address: null,
      reply_to: notifyTo,
      subject,
      body_html: html,
      body_text: null,
      attachments: [],
      resend_id: data.id || null,
      resend_received_id: null,
      message_id: ndrMessageId,
      status: 'received',
      is_test: false
    });
  } catch (e) {
    if (!String(e.message).includes('duplicate')) {
      console.warn('[bounce-notify] log insert:', e.message);
    }
  }

  return { ok: true, id: data.id, to: notifyTo, logged: true };
}

async function handleResendBounceEvent(eventData = {}) {
  const emailId = eventData.email_id || eventData.id;
  if (!emailId) return { ok: false, error: 'email_id fehlt' };

  let log = await findEmailLogByResendId(emailId);
  let bounce = eventData.bounce || {};

  if (!bounce.message && !bounce.type) {
    try {
      const remote = await fetchResendSentEmail(emailId);
      bounce = remote.bounce || bounce;
    } catch (e) {
      console.warn('[bounce] Resend fetch:', e.message);
    }
  }

  const reasonDe = formatBounceReasonDe(bounce);
  const patch = {
    status: 'bounced',
    error_message: reasonDe
  };

  const wasBounced = log?.status === 'bounced';

  if (log?.id) {
    await supabasePatchEmailLog(`id=eq.${log.id}`, patch);
  } else if (emailId) {
    const updated = await supabasePatchEmailLog(`resend_id=eq.${encodeURIComponent(emailId)}`, patch);
    log = updated[0] || log;
  }

  if (!log) {
    log = {
      to_address: Array.isArray(eventData.to) ? eventData.to.join(', ') : (eventData.to || ''),
      subject: eventData.subject || '',
      from_address: eventData.from || '',
      mailbox_key: detectMailboxKey(eventData.from, eventData.to),
      created_at: eventData.created_at || new Date().toISOString()
    };
  }

  if (wasBounced) {
    return { ok: true, emailId, logId: log?.id || null, reasonDe, notify: { skipped: true, reason: 'already_bounced' } };
  }

  const notify = await sendBounceNotification({ log, bounce, reasonDe });
  return { ok: true, emailId, logId: log?.id || null, reasonDe, notify };
}

/** Prüft kürzlich gesendete Mails bei Resend auf Bounces (Fallback wenn Webhook fehlt). */
async function syncOutboundBounces({ days = 14, limit = 80 } = {}) {
  const key = process.env.RESEND_API_KEY;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !sbKey) return { checked: 0, bounced: 0, error: 'keys_missing' };

  const since = new Date(Date.now() - days * 86400000).toISOString();
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/email_logs?select=id,resend_id,status,created_at` +
    `&direction=eq.outbound&status=eq.sent&resend_id=not.is.null` +
    `&created_at=gte.${encodeURIComponent(since)}` +
    `&order=created_at.desc&limit=${limit}`,
    { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
  );
  const rows = await resp.json().catch(() => []);
  if (!Array.isArray(rows)) return { checked: 0, bounced: 0, error: 'db_read_failed' };

  let bounced = 0;
  for (const row of rows) {
    if (!row.resend_id) continue;
    try {
      const remote = await fetchResendSentEmail(row.resend_id);
      if (remote.last_event !== 'bounced') continue;
      await handleResendBounceEvent({
        email_id: row.resend_id,
        to: remote.to,
        from: remote.from,
        subject: remote.subject,
        created_at: remote.created_at,
        bounce: remote.bounce || {}
      });
      bounced += 1;
    } catch (e) {
      console.warn('[sync-bounces]', row.resend_id, e.message);
    }
  }
  return { checked: rows.length, bounced };
}

module.exports = {
  SUPABASE_URL,
  DEFAULT_FROM,
  DEFAULT_REPLY_TO,
  readRawBody,
  supabaseInsertEmailLog,
  supabasePatchEmailLog,
  fetchResendReceivedEmail,
  fetchResendSentEmail,
  importInboundEmail,
  findExistingByMessageId,
  findEmailLogByResendId,
  normalizeAppAddresses,
  extractEmailAddress,
  isSenderBlocked,
  storeInboundAttachmentItems,
  fetchResendAttachmentItems,
  ensureAttachmentsForLog,
  attachmentsNeedStorage,
  isInlineOrSignatureAttachment,
  formatBounceReasonDe,
  handleResendBounceEvent,
  syncOutboundBounces,
  sendBounceNotification
};
