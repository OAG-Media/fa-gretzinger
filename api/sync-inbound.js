// Admin-Sync: fehlende Inbound-Mails von Resend nachladen
// Env: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY

const { SUPABASE_URL, importInboundEmail } = require('./emailServerUtils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.RESEND_API_KEY;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !sbKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY oder SUPABASE_SERVICE_ROLE_KEY fehlt' });
  }

  try {
    const resp = await fetch('https://api.resend.com/emails/receiving?limit=50', {
      headers: { Authorization: `Bearer ${key}` }
    });
    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json({ error: payload?.message || 'Resend list failed' });
    }

    const items = payload.data || [];
    let imported = 0;
    let skipped = 0;

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
        skipped += 1;
        continue;
      }

      const result = await importInboundEmail(id, item);
      if (result?.duplicate) skipped += 1;
      else imported += 1;
    }

    return res.status(200).json({ ok: true, imported, skipped, total: items.length });
  } catch (e) {
    console.error('[sync-inbound]', e);
    return res.status(500).json({ error: e.message || 'Sync fehlgeschlagen' });
  }
};
