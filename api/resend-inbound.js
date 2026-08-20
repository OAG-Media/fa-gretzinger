// Resend Inbound Webhook — email.received → email_logs
// Env: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY
// Optional: WEBHOOK_SIGNING_SECRET / RESEND_WEBHOOK_SECRET (Svix-Verify später)

const { readRawBody, importInboundEmail } = require('./emailServerUtils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const raw = await readRawBody(req);
    const event = JSON.parse(raw || '{}');

    if (event.type !== 'email.received') {
      return res.status(200).json({ ok: true, ignored: event.type || 'unknown' });
    }

    const emailId = event.data?.email_id;
    if (!emailId) {
      return res.status(400).json({ error: 'email_id fehlt im Webhook' });
    }

    const result = await importInboundEmail(emailId, event.data || {});
    return res.status(200).json({ ok: true, emailId, duplicate: !!result?.duplicate, id: result?.id });
  } catch (e) {
    console.error('[resend-inbound]', e);
    return res.status(500).json({ error: e.message || 'Webhook-Fehler' });
  }
};
