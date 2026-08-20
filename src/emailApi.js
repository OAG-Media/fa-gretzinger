function emailApiBase() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3002';
  }
  return '';
}

export async function sendEmailApi(payload) {
  const resp = await fetch(`${emailApiBase()}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error || data.message || `E-Mail-Versand fehlgeschlagen (${resp.status})`);
  }
  return data;
}

export function applyTemplatePlaceholders(text, vars = {}) {
  if (!text) return '';
  return String(text).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

export const TEMPLATE_TYPE_LABELS = {
  kv: 'Kostenvoranschlag / Reparaturauftrag',
  invoice: 'Rechnung',
  both: 'Beides (KV + Rechnung)',
  general: 'Standard / frei'
};
