// Resend Webhook — email.bounced / email.delivery_delayed → Status + NDR an Absender
// Env: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY
// Resend Dashboard → Webhooks → https://fa-gretzinger.vercel.app/api/resend-events
// Events: email.bounced (Pflicht), optional email.delivery_delayed

const { readRawBody, handleResendBounceEvent } = require('./emailServerUtils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const raw = await readRawBody(req);
    const event = JSON.parse(raw || '{}');
    const type = event.type || '';
    const data = event.data || {};

    if (type === 'email.bounced') {
      const result = await handleResendBounceEvent(data);
      return res.status(200).json({ ok: true, ...result });
    }

    if (type === 'email.delivery_delayed') {
      const emailId = data.email_id;
      if (emailId) {
        const { supabasePatchEmailLog } = require('./emailServerUtils');
        await supabasePatchEmailLog(
          `resend_id=eq.${encodeURIComponent(emailId)}&status=eq.sent`,
          { error_message: 'Zustellung verzögert — Empfänger-Server antwortet noch nicht.' }
        );
      }
      return res.status(200).json({ ok: true, delayed: true, emailId });
    }

    return res.status(200).json({ ok: true, ignored: type || 'unknown' });
  } catch (e) {
    console.error('[resend-events]', e);
    return res.status(500).json({ error: e.message || 'Webhook-Fehler' });
  }
};
