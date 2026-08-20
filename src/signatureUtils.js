/** Signatur-Block in HTML ein-/ausblenden (Checkbox toggelt sichtbar im Editor). */

export const SIGNATURE_ATTR = 'data-email-signature';

export function stripSignature(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll(`[${SIGNATURE_ATTR}]`).forEach((el) => el.remove());
  return div.innerHTML.trim();
}

export function hasSignature(html) {
  if (!html) return false;
  const div = document.createElement('div');
  div.innerHTML = html;
  return !!div.querySelector(`[${SIGNATURE_ATTR}]`);
}

export function withSignature(html, signatureHtml) {
  const base = stripSignature(html);
  if (!signatureHtml?.trim()) return base;
  const spacer = base ? '<br/>' : '';
  return `${base}${spacer}<div ${SIGNATURE_ATTR}="true">${signatureHtml}</div>`;
}

export function toggleSignatureInHtml(html, signatureHtml, enabled) {
  return enabled ? withSignature(html, signatureHtml) : stripSignature(html);
}
