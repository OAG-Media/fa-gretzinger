export const ROLE_KEY = 'gretzinger_user_role';

/** Existing shared login → Mitarbeiter (bleibt unverändert) */
export const STAFF_CREDENTIALS = {
  user: 'Fa.Gretzinger@t-online.de',
  password: 'GretBrunn2025!',
  role: 'mitarbeiter'
};

/** Papa / Admin */
export const ADMIN_CREDENTIALS = {
  user: 'A-Gretz',
  password: 'Loefish2026!',
  role: 'admin'
};

function normalizeUser(user) {
  return (user || '').trim().toLowerCase();
}

export function resolveLogin(user, password) {
  const u = normalizeUser(user);
  const p = password || '';

  // Mitarbeiter: E-Mail case-insensitive, Passwort exakt
  if (u === normalizeUser(STAFF_CREDENTIALS.user) && p === STAFF_CREDENTIALS.password) {
    return STAFF_CREDENTIALS.role;
  }

  // Admin: Benutzer case-insensitive, Passwort exakt
  if (u === normalizeUser(ADMIN_CREDENTIALS.user) && p === ADMIN_CREDENTIALS.password) {
    return ADMIN_CREDENTIALS.role;
  }

  return null;
}

export function getStoredRole() {
  try {
    const role = localStorage.getItem(ROLE_KEY);
    return role === 'admin' || role === 'mitarbeiter' ? role : null;
  } catch {
    return null;
  }
}

export function setStoredRole(role) {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch (_) { /* ignore */ }
}

export function clearStoredRole() {
  try {
    localStorage.removeItem(ROLE_KEY);
  } catch (_) { /* ignore */ }
}

export function isAdminRole(role) {
  return role === 'admin';
}

export function canAccessInvoices(role) {
  return isAdminRole(role);
}
