/** Zentrale E-Mail-Konfiguration — Domain / Postfächer nur hier tauschen. */

export const EMAIL_DOMAIN = 'fa-gretzinger.de';

export const MAILBOXES = {
  kv: {
    key: 'kv',
    address: `kv@${EMAIL_DOMAIN}`,
    from: `Fa. Gretzinger KV <kv@${EMAIL_DOMAIN}>`,
    label: 'E-Mail',
    sublabel: `kv@${EMAIL_DOMAIN}`,
    navPath: '/postfach/kv',
    settingsPath: '/postfach/kv/einstellungen',
    uses: ['kv']
  },
  info: {
    key: 'info',
    address: `info@${EMAIL_DOMAIN}`,
    from: `Fa. Gretzinger <info@${EMAIL_DOMAIN}>`,
    label: 'E-Mail',
    sublabel: `info@${EMAIL_DOMAIN}`,
    navPath: '/postfach/info',
    settingsPath: '/postfach/info/einstellungen',
    uses: ['invoice', 'free', 'reply', 'general']
  }
};

/** @deprecated Prefer getMailbox() — bleibt für kurze Übergänge */
export const EMAIL_FROM_ADDRESS = MAILBOXES.info.address;
export const EMAIL_FROM = MAILBOXES.info.from;
export const EMAIL_REPLY_TO = MAILBOXES.info.address;

export function getMailbox(key = 'info') {
  return MAILBOXES[key] || MAILBOXES.info;
}

export function mailboxForEmailType(emailType) {
  return emailType === 'kv' ? MAILBOXES.kv : MAILBOXES.info;
}

export function detectMailboxKey({ from_address, to_address, email_type, mailbox_key } = {}) {
  if (mailbox_key && MAILBOXES[mailbox_key]) return mailbox_key;
  if (email_type === 'kv') return 'kv';
  const blob = `${from_address || ''} ${to_address || ''}`.toLowerCase();
  if (blob.includes(MAILBOXES.kv.address.toLowerCase()) || blob.includes('kv@')) return 'kv';
  return 'info';
}

export function mailboxesForRole(role) {
  if (role === 'admin') return [MAILBOXES.kv, MAILBOXES.info];
  return [MAILBOXES.kv];
}

export function canAccessMailbox(role, key) {
  return mailboxesForRole(role).some((m) => m.key === key);
}

export const EMAIL_TYPE_LABELS = {
  kv: 'KV / Auftrag',
  invoice: 'Rechnung',
  free: 'E-Mail',
  reply: 'Antwort',
  inbound: 'Eingang',
  general: 'Standard'
};
