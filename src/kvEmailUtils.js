import { supabase } from './supabaseClient';
import { generateRepairOrderPDF, mapRepairOrderToPdfData } from './repairOrderPdfExport';

/** Builds KV / Reparaturauftrag PDF as base64 — same layout as PDF-Download. */
export async function buildKvPdfAttachment(repairOrder) {
  if (!repairOrder?.id && !repairOrder?.kommission) {
    throw new Error('Reparaturauftrag fehlt');
  }

  let order = repairOrder;
  // Always load full order + customer so PDF matches the form download
  if (repairOrder.id) {
    const { data, error } = await supabase
      .from('repair_orders')
      .select('*, customers(*)')
      .eq('id', repairOrder.id)
      .single();
    if (error) throw error;
    order = data;
  }

  const data = mapRepairOrderToPdfData(order);
  return generateRepairOrderPDF(data, { returnBase64: true });
}
