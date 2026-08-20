import { supabase } from './supabaseClient';
import { generateInvoicePDF } from './invoicePdfExport';

/** Builds invoice PDF as base64 attachment for Resend. */
export async function buildInvoicePdfAttachment(invoice) {
  if (!invoice?.id) throw new Error('Rechnung fehlt');

  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', invoice.customer_id)
    .single();
  if (customerError) throw customerError;

  const { data: invoiceItems, error: itemsError } = await supabase
    .from('invoice_items')
    .select(`
      *,
      repair_order:repair_orders(
        *,
        customers(*)
      )
    `)
    .eq('invoice_id', invoice.id)
    .order('position');
  if (itemsError) throw itemsError;

  const invoiceData = {
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    customer: customerData,
    taxRate: Number(invoice.tax_rate),
    forceReverseCharge:
      Number(invoice.tax_rate) === 0
      || customerData?.country === 'Österreich'
      || (customerData?.company || '').toLowerCase().includes('optik bauer'),
    manualItems: (invoiceItems || [])
      .filter((item) => !item.repair_order_id)
      .map((item) => ({
        description: item.description,
        amount: item.line_total ?? item.repair_amount ?? 0,
        line_total: item.line_total ?? item.repair_amount ?? 0,
        type: Number(item.line_total ?? item.repair_amount ?? 0) < 0 ? 'negative' : 'positive'
      }))
  };

  const selectedOrdersForPDF = (invoiceItems || [])
    .filter((item) => item.repair_order)
    .map((item) => ({
      ...item.repair_order,
      nettopreis: item.repair_amount,
      repair_amount: item.repair_amount,
      porto: item.porto,
      werkstattausgang: item.date_performed,
      kommission: item.kommission,
      freigabe: item.repair_order.freigabe,
      kv_repair: item.repair_order.kv_repair,
      bottom: item.repair_order.kulanz
    }));

  return generateInvoicePDF(invoiceData, selectedOrdersForPDF, { returnBase64: true });
}
