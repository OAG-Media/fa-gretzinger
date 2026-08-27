import { supabase } from './supabaseClient';
import { buildKvPdfAttachment } from './kvEmailUtils';
import { buildInvoicePdfAttachment } from './invoiceEmailUtils';

function base64ToUint8Array(base64) {
  const clean = String(base64 || '').replace(/^data:application\/pdf;base64,/, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** base64 PDF → Blob + object URL (Caller muss URL.revokeObjectURL aufrufen). */
export function pdfBase64ToObjectUrl(base64) {
  const bytes = base64ToUint8Array(base64);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  return { blob, objectUrl: URL.createObjectURL(blob) };
}

/** Upload PDF bytes after email_logs insert; returns meta with storage_path. */
export async function storeEmailPdfAttachment({ logId, filename, pdfBase64, contentType = 'application/pdf' }) {
  if (!logId || !pdfBase64) return null;
  const safeName = (filename || 'Anhang.pdf').replace(/[\\/]/g, '_');
  const path = `${logId}/${safeName}`;
  const bytes = base64ToUint8Array(pdfBase64);
  const { error } = await supabase.storage
    .from('email-attachments')
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  return { filename: safeName, content_type: contentType, storage_path: path };
}

async function signedUrlForPath(path) {
  const { data, error } = await supabase.storage
    .from('email-attachments')
    .createSignedUrl(path, 60 * 30);
  if (error) throw error;
  return data?.signedUrl || null;
}

/** Resolve PDF blob URL for preview / download / open. */
export async function resolveAttachmentBlob(mail, att) {
  if (att?.storage_path) {
    const url = await signedUrlForPath(att.storage_path);
    if (url) {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Anhang konnte nicht geladen werden');
      const blob = await resp.blob();
      return { blob, filename: att.filename || 'Anhang.pdf', objectUrl: URL.createObjectURL(blob) };
    }
  }

  if (mail?.email_type === 'kv' && mail.repair_order_id) {
    const { base64, filename } = await buildKvPdfAttachment({ id: mail.repair_order_id });
    const bytes = base64ToUint8Array(base64);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return {
      blob,
      filename: att?.filename || filename || 'Kostenvoranschlag.pdf',
      objectUrl: URL.createObjectURL(blob)
    };
  }

  if (mail?.email_type === 'invoice' && mail.invoice_id) {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', mail.invoice_id)
      .single();
    if (error) throw error;
    const { base64, filename } = await buildInvoicePdfAttachment(invoice);
    const bytes = base64ToUint8Array(base64);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return {
      blob,
      filename: att?.filename || filename || 'Rechnung.pdf',
      objectUrl: URL.createObjectURL(blob)
    };
  }

  throw new Error('Für diesen Anhang liegt keine Vorschau-Datei vor.');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'Anhang.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function openBlob(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
