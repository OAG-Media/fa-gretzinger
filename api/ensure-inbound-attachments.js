// Lädt fehlende Inbound-Anhänge aus Resend nach und speichert sie in Storage.
// Body: { id: email_logs.id }

const {
  SUPABASE_URL,
  ensureAttachmentsForLog,
  attachmentsNeedStorage
} = require('./emailServerUtils');

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

    if (!attachmentsNeedStorage(log.attachments) && Array.isArray(log.attachments) && log.attachments.length) {
      return res.status(200).json({ ok: true, attachments: log.attachments, skipped: 'already_stored' });
    }

    if (!log.resend_received_id) {
      return res.status(200).json({
        ok: false,
        attachments: log.attachments || [],
        error: 'Kein Resend-Empfang für Nachladen (nur Metadaten vorhanden)'
      });
    }

    const updated = await ensureAttachmentsForLog(log, { force: true });
    return res.status(200).json({
      ok: true,
      attachments: updated?.attachments || [],
      count: Array.isArray(updated?.attachments) ? updated.attachments.length : 0
    });
  } catch (e) {
    console.error('[ensure-inbound-attachments]', e);
    return res.status(500).json({ error: e.message || 'Anhänge nachladen fehlgeschlagen' });
  }
};
