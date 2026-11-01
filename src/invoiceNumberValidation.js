/** Rechnungsnummer: Duplikat (rot) + unterbrochene Nummernfolge (gelb). */

export async function getExpectedNextInvoiceNumber(supabase, { excludeInvoiceId = null } = {}) {
  const { data, error } = await supabase.from('invoices').select('id, invoice_number');
  if (error) throw error;

  let max = 0;
  for (const row of data || []) {
    if (excludeInvoiceId != null && String(row.id) === String(excludeInvoiceId)) continue;
    const n = parseInt(String(row.invoice_number), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max > 0 ? String(max + 1) : '8125';
}

/**
 * @returns {{ level: 'ok'|'warn'|'error', isValid: boolean, message: string, expectedNext: string|null }}
 */
export async function evaluateInvoiceNumber(
  supabase,
  number,
  { excludeInvoiceId = null, originalNumber = null } = {}
) {
  const trimmed = String(number || '').trim();
  if (!trimmed) {
    return {
      level: 'error',
      isValid: false,
      message: 'Rechnungsnummer ist erforderlich.',
      expectedNext: null
    };
  }

  let query = supabase
    .from('invoices')
    .select('id')
    .eq('invoice_number', trimmed);

  if (excludeInvoiceId != null) {
    query = query.neq('id', excludeInvoiceId);
  }

  const { data, error } = await query.limit(1);
  if (error) {
    return {
      level: 'error',
      isValid: false,
      message: 'Fehler bei der Prüfung der Rechnungsnummer.',
      expectedNext: null
    };
  }

  if (Array.isArray(data) && data.length > 0) {
    return {
      level: 'error',
      isValid: false,
      message: `Die Rechnungsnummer ${trimmed} ist bereits vergeben. Bitte wählen Sie eine freie Nummer.`,
      expectedNext: null
    };
  }

  let expectedNext = null;
  try {
    expectedNext = await getExpectedNextInvoiceNumber(supabase, { excludeInvoiceId });
  } catch (_) {
    expectedNext = null;
  }

  const original = originalNumber != null ? String(originalNumber).trim() : '';
  if (original && trimmed === original) {
    return { level: 'ok', isValid: true, message: '', expectedNext };
  }
  if (expectedNext && trimmed === expectedNext) {
    return { level: 'ok', isValid: true, message: '', expectedNext };
  }
  if (expectedNext) {
    return {
      level: 'warn',
      isValid: true,
      expectedNext,
      message:
        `Achtung: Die nächste fortlaufende Rechnungsnummer wäre ${expectedNext}. ` +
        `Mit der Nummer ${trimmed} wird die Nummernfolge unterbrochen. ` +
        `Das kann in der Buchhaltung zu Unklarheiten oder Fehlbuchungen führen.`
    };
  }

  return { level: 'ok', isValid: true, message: '', expectedNext };
}

export function invoiceNumberBorderColor(validation) {
  if (!validation) return '#ddd';
  if (validation.level === 'error' || validation.isValid === false) return '#dc3545';
  if (validation.level === 'warn') return '#d97706';
  return '#ddd';
}
