/** Platzhalter für E-Mail-Vorlagen ({{schlüssel}}). */

export const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export function formatMonatJahr(dateInput) {
  if (!dateInput) return '';
  const raw = String(dateInput);
  const d = raw.includes('T') ? new Date(raw) : new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return `${GERMAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Europäisches Zahlenformat: 1.234,56 */
export function formatGermanNumber(value, decimals = 2) {
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatGermanCurrency(value) {
  const formatted = formatGermanNumber(value);
  return formatted ? `${formatted} €` : '';
}

export const EMAIL_TEMPLATE_VARIABLES = [
  { key: 'kunde_name', label: 'Akustikername', types: ['kv', 'invoice', 'both'] },
  { key: 'filiale', label: 'Filiale', types: ['kv', 'invoice', 'both'] },
  { key: 'kommission', label: 'Kommission', types: ['kv', 'both'] },
  { key: 'monat_jahr', label: 'Monat + Jahr', types: ['kv', 'invoice', 'both'] },
  { key: 'rechnungsnummer', label: 'Rechnungsnummer', types: ['invoice', 'both'] },
  { key: 'betrag', label: 'Betrag', types: ['invoice', 'both'] },
  { key: 'datum', label: 'Datum', types: ['kv', 'invoice', 'both', 'general'] },
  { key: 'auftrags_info', label: 'Auftrags-Info', types: ['kv', 'both'] }
];

export function getVariablesForType(type) {
  return EMAIL_TEMPLATE_VARIABLES.filter(
    (v) => v.types.includes(type) || type === 'both'
  );
}

export function buildInvoiceEmailVars(invoice, customer) {
  const periodDate = invoice?.period_end || invoice?.period_start || invoice?.invoice_date;
  return {
    kunde_name: customer?.company || '',
    filiale: customer?.branch || '',
    rechnungsnummer: invoice?.invoice_number || '',
    betrag: invoice?.total_amount != null ? formatGermanCurrency(invoice.total_amount) : '',
    datum: invoice?.invoice_date
      ? new Date(invoice.invoice_date).toLocaleDateString('de-DE')
      : '',
    monat_jahr: formatMonatJahr(periodDate),
    kommission: '',
    auftrags_info: ''
  };
}

export function buildKvEmailVars(repairOrder, customer) {
  const dateSource =
    repairOrder?.werkstattausgang || repairOrder?.kv_date || repairOrder?.werkstatteingang;
  return {
    kunde_name: customer?.company || '',
    filiale: customer?.branch || '',
    kommission: repairOrder?.kommission || '',
    auftrags_info: repairOrder?.kommission || '',
    datum: dateSource ? new Date(dateSource).toLocaleDateString('de-DE') : '',
    monat_jahr: formatMonatJahr(dateSource || new Date()),
    rechnungsnummer: '',
    betrag: repairOrder?.nettopreis != null ? formatGermanCurrency(repairOrder.nettopreis) : ''
  };
}

export function buildInvoicePdfFilename(invoiceNumber, periodDate) {
  const nr = invoiceNumber || 'ohne_Nr';
  const mj = formatMonatJahr(periodDate);
  return mj ? `Rechnung_${nr} für ${mj}.pdf` : `Rechnung_${nr}.pdf`;
}

export function buildKvPdfFilename(kommission) {
  const k = (kommission || '').trim();
  return k ? `KV für Komm ${k}.pdf` : 'KV.pdf';
}

/** Text an Cursor-Position in einem Input/Textarea einfügen. */
export function insertAtInputCursor(inputEl, currentValue, setValue, text) {
  if (!inputEl) {
    setValue((currentValue || '') + text);
    return;
  }
  const start = inputEl.selectionStart ?? currentValue.length;
  const end = inputEl.selectionEnd ?? start;
  const newVal = currentValue.slice(0, start) + text + currentValue.slice(end);
  setValue(newVal);
  requestAnimationFrame(() => {
    inputEl.focus();
    const pos = start + text.length;
    inputEl.setSelectionRange(pos, pos);
  });
}
