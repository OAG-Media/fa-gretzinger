const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
Object.assign(process.env, env);

const { importInboundEmail, SUPABASE_URL } = require('../api/emailServerUtils');

const PORT = Number(env.EMAIL_DEV_PORT || 3002);

const DEFAULT_FROM = env.RESEND_FROM || 'Fa. Gretzinger <info@fa-gretzinger.de>';
const DEFAULT_REPLY_TO = env.RESEND_REPLY_TO || 'info@fa-gretzinger.de';

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(payload);
}

async function sendViaResend(payload) {
  const key = env.RESEND_API_KEY;
  if (!key) {
    const err = new Error('RESEND_API_KEY fehlt in .env.local');
    err.status = 500;
    throw err;
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
    const err = new Error(data?.message || data?.error || `Resend HTTP ${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  if (req.method === 'POST' && (req.url === '/api/send-email' || req.url === '/send-email')) {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 15_000_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(raw || '{}');
        if (!payload.to || !payload.subject || !payload.html) {
          return sendJson(res, 400, { error: 'to, subject und html sind Pflicht' });
        }
        const data = await sendViaResend(payload);
        return sendJson(res, 200, { ok: true, id: data.id, from: payload.from || DEFAULT_FROM });
      } catch (e) {
        return sendJson(res, e.status || 500, { error: e.message, details: e.data || null });
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      hasKey: Boolean(env.RESEND_API_KEY),
      hasServiceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      from: DEFAULT_FROM,
      replyTo: DEFAULT_REPLY_TO
    });
  }

  if (req.method === 'POST' && req.url === '/api/sync-inbound') {
    (async () => {
      try {
        const key = env.RESEND_API_KEY;
        const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
        if (!key || !sbKey) {
          return sendJson(res, 500, { error: 'RESEND_API_KEY oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local' });
        }

        const resp = await fetch('https://api.resend.com/emails/receiving?limit=50', {
          headers: { Authorization: `Bearer ${key}` }
        });
        const payload = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          return sendJson(res, resp.status, { error: payload?.message || 'Resend list failed' });
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

        return sendJson(res, 200, { ok: true, imported, skipped, total: items.length });
      } catch (e) {
        return sendJson(res, 500, { error: e.message || 'Sync fehlgeschlagen' });
      }
    })();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/resend-inbound') {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5_000_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const event = JSON.parse(raw || '{}');
        if (event.type !== 'email.received') {
          return sendJson(res, 200, { ok: true, ignored: event.type || 'unknown' });
        }
        const emailId = event.data?.email_id;
        if (!emailId) return sendJson(res, 400, { error: 'email_id fehlt im Webhook' });
        const result = await importInboundEmail(emailId, event.data || {});
        return sendJson(res, 200, { ok: true, emailId, duplicate: !!result?.duplicate, id: result?.id });
      } catch (e) {
        return sendJson(res, 500, { error: e.message || 'Webhook-Fehler' });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[email-dev] http://localhost:${PORT}`);
  console.log(`[email-dev] POST /api/send-email | /api/sync-inbound | /api/resend-inbound`);
  console.log(`[email-dev] From: ${DEFAULT_FROM} | Reply-To: ${DEFAULT_REPLY_TO}`);
});
