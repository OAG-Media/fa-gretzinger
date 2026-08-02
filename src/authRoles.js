/** Auth helpers — keine Passwörter im Frontend (nur in Supabase Auth). */

export const ROLE_KEY = 'gretzinger_user_role';

/** Admin tippt „A-Gretz“ → interne Auth-E-Mail */
export const ADMIN_AUTH_EMAIL = 'a-gretz@fa-gretzinger.internal';
export const ADMIN_DISPLAY_LOGIN = 'A-Gretz';

/** Mitarbeiter tippt „Fa-Gretzinger“ → interne Auth-E-Mail */
export const STAFF_AUTH_EMAIL = 'fa-gretzinger@fa-gretzinger.internal';
export const STAFF_DISPLAY_LOGIN = 'Fa-Gretzinger';

function normalizeUser(user) {
  return (user || '').trim().toLowerCase();
}

/**
 * Mappt die gewohnte Login-Eingabe auf die Supabase-Auth-E-Mail.
 * Mitarbeiter: „Fa-Gretzinger“
 * Admin: „A-Gretz“
 */
export function toAuthEmail(user) {
  const u = normalizeUser(user);
  if (!u) return '';
  if (u === normalizeUser(ADMIN_DISPLAY_LOGIN) || u === normalizeUser(ADMIN_AUTH_EMAIL)) {
    return ADMIN_AUTH_EMAIL;
  }
  if (u === normalizeUser(STAFF_DISPLAY_LOGIN) || u === normalizeUser(STAFF_AUTH_EMAIL)) {
    return STAFF_AUTH_EMAIL;
  }
  // Legacy: alte Mitarbeiter-E-Mail noch akzeptieren und auf neuen Account mappen
  if (u === 'fa.gretzinger@t-online.de') {
    return STAFF_AUTH_EMAIL;
  }
  return (user || '').trim();
}

export function roleFromSessionUser(user) {
  const role =
    user?.app_metadata?.role ||
    user?.user_metadata?.role ||
    null;
  return role === 'admin' || role === 'mitarbeiter' ? role : 'mitarbeiter';
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
