// Vercel Serverless Function — Resend Versand
// Env: RESEND_API_KEY, RESEND_FROM, RESEND_REPLY_TO

const DEFAULT_FROM = process.env.RESEND_FROM || 'Fa. Gretzinger <info@fa-gretzinger.de>';
const DEFAULT_REPLY_TO = process.env.RESEND_REPLY_TO || 'info@fa-gretzinger.de';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'RESEND_API_KEY nicht konfiguriert' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!payload.to || !payload.subject || !payload.html) {
      return res.status(400).json({ error: 'to, subject und html sind Pflicht' });
    }

    const body = {
      from: payload.from || DEFAULT_FROM,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.reply_to || DEFAULT_REPLY_TO
    };

    if (payload.cc) body.cc = Array.isArray(payload.cc) ? payload.cc : [payload.cc];
    if (payload.bcc) body.bcc = Array.isArray(payload.bcc) ? payload.bcc : [payload.bcc];

    if (payload.attachments?.length) {
      body.attachments = payload.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        content_type: a.contentType || a.content_type || 'application/pdf'
      }));
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data?.message || data?.error || 'Resend Fehler', details: data });
    }

    return res.status(200).json({ ok: true, id: data.id, from: body.from });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverfehler' });
  }
};
