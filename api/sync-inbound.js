// Admin-Sync: Resend-Inbound + Hostinger IMAP Inbox → email_logs
// Env: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, IMAP_*

const { SUPABASE_URL, importInboundEmail, syncOutboundBounces } = require('./emailServerUtils');
const { syncImapInboxes } = require('./imapSyncInbox');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.RESEND_API_KEY;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY fehlt' });
  }

  try {
    let resendImported = 0;
    let resendSkipped = 0;
    let resendTotal = 0;
    let resendError = null;

    if (key) {
      try {
        const resp = await fetch('https://api.resend.com/emails/receiving?limit=50', {
          headers: { Authorization: `Bearer ${key}` }
        });
        const payload = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          resendError = payload?.message || 'Resend list failed';
        } else {
          const items = payload.data || [];
          resendTotal = items.length;
          for (const item of items) {
            const id = item.id;
            if (!id) continue;

            const existsResp = await fetch(
              `${SUPABASE_URL}/rest/v1/email_logs?resend_received_id=eq.${encodeURIComponent(id)}&select=id`,
              {
                headers: {
                  apikey: sbKey,
                  Authorization: `Bearer ${sbKey}`
                }
              }
            );
            const exists = await existsResp.json().catch(() => []);
            if (Array.isArray(exists) && exists.length > 0) {
              resendSkipped += 1;
              continue;
            }

            const result = await importInboundEmail(id, item);
            if (result?.duplicate) resendSkipped += 1;
            else resendImported += 1;
          }
        }
      } catch (e) {
        resendError = e.message || 'Resend Sync Fehler';
      }
    }

    const imap = await syncImapInboxes({ limit: 50, days: 21 });
    const bounces = await syncOutboundBounces({ days: 21, limit: 150 });

    return res.status(200).json({
      ok: true,
      imported: resendImported + (imap.imported || 0),
      skipped: resendSkipped + (imap.skipped || 0),
      resend: {
        imported: resendImported,
        skipped: resendSkipped,
        total: resendTotal,
        error: resendError
      },
      imap,
      bounces
    });
  } catch (e) {
    console.error('[sync-inbound]', e);
    return res.status(500).json({ error: e.message || 'Sync fehlgeschlagen' });
  }
};
