import { supabase } from './supabaseClient';
import { buildKvPdfAttachment } from './kvEmailUtils';
import { buildInvoicePdfAttachment } from './invoiceEmailUtils';

/** Signatur-/Inline-Bilder ausblenden (Outlook image001.png etc.). */
export function isInlineOrSignatureAttachment(att = {}) {
  const filename = String(att.filename || att.name || '').trim();
  const contentType = String(att.content_type || att.contentType || '').toLowerCase();
  const disposition = String(att.content_disposition || att.contentDisposition || '').toLowerCase();
  const contentId = String(att.content_id || att.contentId || att.cid || '').trim();
  const size = Number(att.size) || 0;
  const isImage = contentType.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp)$/i.test(filename);
  const baseName = filename.toLowerCase();

  if (disposition.includes('inline')) return true;
  if (isImage && /^image(\d{2,4})?\.(png|jpe?g|gif|bmp|webp)$/i.test(filename)) return true;
  if (isImage && /^~wrd/i.test(filename)) return true;
  if (isImage && contentId) return true;
  if (isImage && size > 0 && size < 80_000 && (baseName === 'image.png' || baseName === 'image.jpg' || baseName === 'image.jpeg' || baseName === 'untitled.png')) {
    return true;
  }
  return false;
}

export function isImageAttachment(att = {}) {
  const filename = String(att.filename || '').toLowerCase();
  const contentType = String(att.content_type || att.contentType || '').toLowerCase();
  return contentType.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp)$/i.test(filename);
}

export function isPdfAttachment(att = {}) {
  const filename = String(att.filename || '').toLowerCase();
  const contentType = String(att.content_type || att.contentType || '').toLowerCase();
  return contentType.includes('pdf') || filename.endsWith('.pdf');
}

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
function storageSafeName(filename) {
  let raw = String(filename || 'Anhang.pdf')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[\\/]/g, '_');
  raw = raw.replace(/[^\w.\-!() ]+/g, '_').replace(/_+/g, '_').trim();
  return raw || 'Anhang.pdf';
}

export async function storeEmailPdfAttachment({ logId, filename, pdfBase64, contentType = 'application/pdf' }) {
  if (!logId || !pdfBase64) return null;
  const displayName = String(filename || 'Anhang.pdf').replace(/[\\/]/g, '_');
  const safeName = storageSafeName(filename);
  const path = `${logId}/${safeName}`;
  const bytes = base64ToUint8Array(pdfBase64);
  const { error } = await supabase.storage
    .from('email-attachments')
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  return { filename: displayName, content_type: contentType, storage_path: path };
}

async function signedUrlForPath(path) {
  const { data, error } = await supabase.storage
    .from('email-attachments')
    .createSignedUrl(path, 60 * 30);
  if (error) throw error;
  return data?.signedUrl || null;
}

function emailApiBase() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3002';
  }
  return '';
}

async function ensureInboundAttachmentsOnServer(mailId) {
  const resp = await fetch(`${emailApiBase()}/api/ensure-inbound-attachments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: mailId })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Anhänge nachladen fehlgeschlagen');
  return data;
}

/** Resolve PDF blob URL for preview / download / open. */
export async function resolveAttachmentBlob(mail, att) {
  let currentAtt = att;

  if (!currentAtt?.storage_path && mail?.direction === 'inbound' && mail?.id) {
    const ensured = await ensureInboundAttachmentsOnServer(mail.id);
    const list = Array.isArray(ensured?.attachments) ? ensured.attachments : [];
    if (mail) mail.attachments = list;
    if (list.length) {
      const match =
        list.find((a) => a.storage_path && a.filename && currentAtt?.filename && a.filename === currentAtt.filename) ||
        list.find((a) => a.storage_path) ||
        null;
      if (match?.storage_path) currentAtt = match;
    } else if (ensured?.error) {
      throw new Error(ensured.error);
    }
  }

  if (currentAtt?.storage_path) {
    const url = await signedUrlForPath(currentAtt.storage_path);
    if (url) {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Anhang konnte nicht geladen werden');
      const blob = await resp.blob();
      const type = currentAtt.content_type || blob.type || 'application/octet-stream';
      const typed = blob.type ? blob : new Blob([blob], { type });
      return {
        blob: typed,
        filename: currentAtt.filename || att?.filename || 'Anhang.pdf',
        objectUrl: URL.createObjectURL(typed)
      };
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
