// Lädt fehlende Inbound-Anhänge nach (Resend und/oder IMAP) und speichert sie in Storage.
// Body: { id: email_logs.id }

const {
  SUPABASE_URL,
  ensureAttachmentsForLog,
  attachmentsNeedStorage,
  isInlineOrSignatureAttachment
} = require('./emailServerUtils');
const { ensureImapAttachmentsForLog } = require('./imapSyncInbox');

function realAttachments(list) {
  return (Array.isArray(list) ? list : []).filter((a) => !isInlineOrSignatureAttachment(a));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = body.id;
    if (!id) return res.status(400).json({ error: 'id fehlt' });

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY fehlt' });

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/email_logs?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await resp.json().catch(() => []);
    const log = Array.isArray(rows) ? rows[0] : null;
    if (!log) return res.status(404).json({ error: 'E-Mail nicht gefunden' });

    if (log.direction !== 'inbound') {
      return res.status(200).json({ ok: true, attachments: log.attachments || [], skipped: 'not_inbound' });
    }

    // Nur Signatur-Bilder in Meta → für UI leeren (bleiben im HTML-Body)
    const real = realAttachments(log.attachments);
    if (Array.isArray(log.attachments) && log.attachments.length && real.length === 0) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/email_logs?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ attachments: [] })
        }
      );
      return res.status(200).json({ ok: true, attachments: [], cleaned: 'signature_only' });
    }

    if (!attachmentsNeedStorage(log.attachments) && real.length > 0 && real.every((a) => a.storage_path)) {
      return res.status(200).json({ ok: true, attachments: real, skipped: 'already_stored' });
    }

    let updated = log;
    let source = null;

    if (log.resend_received_id) {
      updated = await ensureAttachmentsForLog(log, { force: true });
      source = 'resend';
    }

    const afterResend = realAttachments(updated?.attachments);
    const stillMissing = afterResend.length === 0 || afterResend.some((a) => !a.storage_path);

    if (stillMissing) {
      try {
        updated = await ensureImapAttachmentsForLog(log);
        source = source ? `${source}+imap` : 'imap';
      } catch (imapErr) {
        console.warn('[ensure-inbound-attachments] imap:', imapErr.message || imapErr);
        if (!afterResend.some((a) => a.storage_path)) {
          return res.status(200).json({
            ok: false,
            attachments: realAttachments(updated?.attachments || log.attachments),
            error: imapErr.message || 'Anhang konnte weder über Resend noch IMAP nachgeladen werden'
          });
        }
      }
    }

    const finalList = realAttachments(updated?.attachments || []);
    return res.status(200).json({
      ok: finalList.some((a) => a.storage_path),
      attachments: finalList,
      count: finalList.length,
      source
    });
  } catch (e) {
    console.error('[ensure-inbound-attachments]', e);
    return res.status(500).json({ error: e.message || 'Anhänge nachladen fehlgeschlagen' });
  }
};
