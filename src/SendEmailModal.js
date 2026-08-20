import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { sendEmailApi, applyTemplatePlaceholders, TEMPLATE_TYPE_LABELS } from './emailApi';
import { buildInvoicePdfAttachment } from './invoiceEmailUtils';
import { buildKvPdfAttachment } from './kvEmailUtils';
import RichTextEditor from './RichTextEditor';
import { hasSignature, toggleSignatureInHtml, stripSignature } from './signatureUtils';
import { mailboxForEmailType } from './emailConfig';
import { useNotice } from './AppNotice';
import { storeEmailPdfAttachment } from './emailAttachmentUtils';

function normalizeCustomer(customer) {
  if (!customer) return null;
  if (Array.isArray(customer)) return customer[0] || null;
  return customer;
}

function recipientForType(customer, emailType, fallback = '') {
  const c = normalizeCustomer(customer);
  if (!c) return fallback || '';
  if (emailType === 'invoice') return (c.invoice_email || fallback || '').trim();
  return (c.email || fallback || '').trim();
}

/**
 * Modal to send KV or invoice email via Resend.
 */
export default function SendEmailModal({
  open,
  onClose,
  emailType,
  customer,
  invoice,
  repairOrder,
  defaultTo,
  vars = {},
  pdfBase64: pdfBase64Prop,
  pdfFilename: pdfFilenameProp,
  repairOrderId,
  invoiceId,
  onSent,
  onCustomerUpdated
}) {
  const notice = useNotice();
  const mailbox = mailboxForEmailType(emailType);
  const emailFieldLabel = emailType === 'invoice' ? 'Rechnungs-E-Mail' : 'Filial-E-Mail';
  const [templates, setTemplates] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [customerData, setCustomerData] = useState(customer || null);
  const [templateId, setTemplateId] = useState('');
  const [signatureId, setSignatureId] = useState('');
  const [to, setTo] = useState(defaultTo || '');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [appendSignature, setAppendSignature] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [pdfFilename, setPdfFilename] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [showEditAkustiker, setShowEditAkustiker] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [savingAkustiker, setSavingAkustiker] = useState(false);

  const originalEmailRef = useRef('');

  useEffect(() => {
    if (!open) return;
    const initialCustomer = normalizeCustomer(customer);
    setCustomerData(initialCustomer);
    const startEmail = recipientForType(initialCustomer, emailType, defaultTo);
    // Nur die bereits in der DB hinterlegte Adresse — nicht defaultTo aus dem Formular
    originalEmailRef.current = recipientForType(initialCustomer, emailType, '');
    setTo(startEmail);
    setEditEmail(startEmail);
    setError('');
    setPdfError('');
    setAppendSignature(false);
    setShowEditAkustiker(false);
    setPdfBase64(pdfBase64Prop || '');
    setPdfFilename(pdfFilenameProp || '');

    (async () => {
      const customerId = initialCustomer?.id || repairOrder?.customer_id || null;
      if (customerId) {
        const { data: fresh } = await supabase.from('customers').select('*').eq('id', customerId).single();
        if (fresh) {
          setCustomerData(fresh);
          const stored = recipientForType(fresh, emailType, '');
          originalEmailRef.current = stored;
          const email = stored || (defaultTo || '').trim();
          if (email) setTo(email);
          setEditEmail(email);
        }
      }

      const [{ data: tpl, error: te }, { data: sig, error: se }] = await Promise.all([
        supabase
          .from('email_templates')
          .select('*')
          .eq('active', true)
          .eq('mailbox_key', mailbox.key)
          .in('type', emailType === 'kv' ? ['kv', 'both', 'general'] : ['invoice', 'both', 'general'])
          .order('is_default', { ascending: false }),
        supabase
          .from('email_signatures')
          .select('*')
          .eq('active', true)
          .order('is_default', { ascending: false })
      ]);
      if (te) {
        setError(te.message);
        return;
      }
      if (se) console.warn('Signaturen:', se.message);
      setTemplates(tpl || []);
      setSignatures(sig || []);

      const defaultSig = (sig || []).find((s) => s.is_default) || (sig || [])[0];
      if (defaultSig) setSignatureId(defaultSig.id);

      const preferred = (tpl || []).find((t) => t.is_default) || (tpl || [])[0];
      if (preferred) {
        const preferredHtml = applyTemplatePlaceholders(preferred.body_html, vars);
        setTemplateId(preferred.id);
        setSubject(applyTemplatePlaceholders(preferred.subject, vars));
        setBodyHtml(preferredHtml);
        setAppendSignature(hasSignature(preferredHtml));
      } else {
        setTemplateId('');
        setSubject(
          emailType === 'invoice'
            ? applyTemplatePlaceholders('Rechnung {{rechnungsnummer}}', vars)
            : applyTemplatePlaceholders('Kostenvoranschlag / Reparaturauftrag', vars)
        );
        setBodyHtml(
          applyTemplatePlaceholders(
            '<p>Guten Tag {{kunde_name}},</p><p>anbei erhalten Sie die Unterlagen.</p>',
            vars
          )
        );
      }
    })();
  }, [open, emailType, customer, defaultTo, pdfBase64Prop, pdfFilenameProp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || emailType !== 'invoice' || !invoice?.id || pdfBase64Prop) return;
    let cancelled = false;
    setPdfLoading(true);
    setPdfError('');
    buildInvoicePdfAttachment(invoice)
      .then(({ base64, filename }) => {
        if (cancelled) return;
        setPdfBase64(base64);
        setPdfFilename(filename);
      })
      .catch((e) => {
        if (cancelled) return;
        setPdfError(e.message || 'PDF konnte nicht erzeugt werden');
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, emailType, invoice, pdfBase64Prop]);

  useEffect(() => {
    if (!open || emailType !== 'kv' || !repairOrder?.id || pdfBase64Prop) return;
    let cancelled = false;
    setPdfLoading(true);
    setPdfError('');
    buildKvPdfAttachment(repairOrder)
      .then(({ base64, filename }) => {
        if (cancelled) return;
        setPdfBase64(base64);
        setPdfFilename(filename);
      })
      .catch((e) => {
        if (cancelled) return;
        setPdfError(e.message || 'PDF konnte nicht erzeugt werden');
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, emailType, repairOrder, pdfBase64Prop]);

  const selectedSignature = useMemo(
    () => signatures.find((s) => s.id === signatureId) || signatures.find((s) => s.is_default) || signatures[0],
    [signatures, signatureId]
  );

  const onPickTemplate = (id) => {
    setTemplateId(id);
    if (!id) {
      setAppendSignature(false);
      return;
    }
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(applyTemplatePlaceholders(t.subject, vars));
    const html = applyTemplatePlaceholders(t.body_html, vars);
    setAppendSignature(hasSignature(html));
    setBodyHtml(html);
  };

  const handleSignatureToggle = (checked) => {
    setAppendSignature(checked);
    const sigHtml = selectedSignature?.body_html || '';
    setBodyHtml((prev) => toggleSignatureInHtml(prev, sigHtml, checked));
  };

  const handleSignaturePick = (id) => {
    setSignatureId(id);
    if (!appendSignature) return;
    const sig = signatures.find((s) => s.id === id);
    if (!sig) return;
    setBodyHtml((prev) => toggleSignatureInHtml(stripSignature(prev), sig.body_html, true));
  };

  const saveAkustikerEmail = async () => {
    if (!customerData?.id) return;
    setSavingAkustiker(true);
    try {
      const email = editEmail.trim() || null;
      const patch = emailType === 'invoice'
        ? { invoice_email: email, updated_at: new Date().toISOString() }
        : { email, updated_at: new Date().toISOString() };
      const { error: err } = await supabase
        .from('customers')
        .update(patch)
        .eq('id', customerData.id);
      if (err) throw err;
      setCustomerData((p) => ({ ...p, ...patch }));
      setTo(email || '');
      if (!originalEmailRef.current) originalEmailRef.current = email || '';
      onCustomerUpdated?.();
      setShowEditAkustiker(false);
    } catch (e) {
      await notice.alert('Speichern fehlgeschlagen: ' + e.message, 'Fehler');
    } finally {
      setSavingAkustiker(false);
    }
  };

  const canSend = useMemo(
    () => to.trim() && subject.trim() && bodyHtml.trim() && !pdfLoading,
    [to, subject, bodyHtml, pdfLoading]
  );

  const maybePromptSaveEmail = async (sentTo) => {
    const cust = normalizeCustomer(customerData);
    const sent = (sentTo || '').trim();
    if (!sent) return;

    // Join liefert oft kein id — Fallback: repair_order.customer_id
    let customerId = cust?.id || repairOrder?.customer_id || null;
    if (!customerId && cust?.company) {
      let q = supabase.from('customers').select('id, email, invoice_email, company, branch').eq('company', cust.company).limit(1);
      if (cust.branch) q = q.eq('branch', cust.branch);
      const { data: found } = await q.maybeSingle();
      if (found?.id) {
        customerId = found.id;
        setCustomerData((prev) => ({ ...(prev || {}), ...found }));
        if (!(originalEmailRef.current || '').trim()) {
          originalEmailRef.current = recipientForType(found, emailType, '');
        }
      }
    }
    if (!customerId) {
      await notice.alert(
        'E-Mail wurde gesendet. Die Adresse konnte nicht gespeichert werden (Akustiker-ID fehlt).',
        'Hinweis'
      );
      return;
    }

    let original = (originalEmailRef.current || '').trim();
    if (!original) {
      const { data: fresh } = await supabase
        .from('customers')
        .select('email, invoice_email')
        .eq('id', customerId)
        .maybeSingle();
      original = recipientForType(fresh || cust, emailType, '').trim();
      originalEmailRef.current = original;
    }
    if (original && original.toLowerCase() === sent.toLowerCase()) return;

    const label = cust?.company || 'Akustiker';
    const msg = original
      ? `${emailFieldLabel} beim Akustiker „${label}“ ist derzeit „${original}“.\n\nAuf „${sent}“ aktualisieren?`
      : `${emailFieldLabel} war beim Akustiker „${label}“ noch nicht hinterlegt.\n\n„${sent}“ jetzt speichern?`;
    const ok = await notice.confirm(msg, `${emailFieldLabel} speichern?`);
    if (!ok) return;

    const patch = emailType === 'invoice'
      ? { invoice_email: sent, updated_at: new Date().toISOString() }
      : { email: sent, updated_at: new Date().toISOString() };
    const { error: err } = await supabase
      .from('customers')
      .update(patch)
      .eq('id', customerId);
    if (err) {
      await notice.alert('E-Mail konnte nicht gespeichert werden: ' + err.message, 'Fehler');
      return;
    }
    originalEmailRef.current = sent;
    setCustomerData((prev) => ({ ...(prev || {}), ...patch, id: customerId }));
    onCustomerUpdated?.();
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    const sentTo = to.trim();
    try {
      const attachments = [];
      const attachmentMeta = [];
      if (pdfBase64) {
        const filename = pdfFilename || (emailType === 'invoice' ? 'Rechnung.pdf' : 'Kostenvoranschlag.pdf');
        attachments.push({ filename, content: pdfBase64 });
        attachmentMeta.push({ filename, content_type: 'application/pdf' });
      }

      const result = await sendEmailApi({
        from: mailbox.from,
        to: sentTo,
        subject,
        html: bodyHtml,
        reply_to: mailbox.address,
        attachments
      });

      const { data: inserted, error: insertErr } = await supabase
        .from('email_logs')
        .insert({
          direction: 'outbound',
          email_type: emailType,
          mailbox_key: mailbox.key,
          template_id: templateId || null,
          customer_id: normalizeCustomer(customerData)?.id || null,
          repair_order_id: repairOrderId || null,
          invoice_id: invoiceId || null,
          from_address: result.from || mailbox.from,
          to_address: sentTo,
          reply_to: mailbox.address,
          subject,
          body_html: bodyHtml,
          attachments: attachmentMeta,
          resend_id: result.id || null,
          status: 'sent',
          is_test: false
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      if (pdfBase64 && inserted?.id && attachmentMeta[0]) {
        try {
          const stored = await storeEmailPdfAttachment({
            logId: inserted.id,
            filename: attachmentMeta[0].filename,
            pdfBase64
          });
          if (stored) {
            await supabase
              .from('email_logs')
              .update({ attachments: [stored] })
              .eq('id', inserted.id);
          }
        } catch (_) {
          // Versand war ok — Storage optional
        }
      }

      if (emailType === 'kv' && repairOrderId) {
        await supabase
          .from('repair_orders')
          .update({ kv_email_sent_at: new Date().toISOString(), kv_email_sent_to: sentTo })
          .eq('id', repairOrderId);
      }
      if (emailType === 'invoice' && invoiceId) {
        await supabase
          .from('invoices')
          .update({ email_sent_at: new Date().toISOString(), email_sent_to: sentTo })
          .eq('id', invoiceId);
      }

      // KV + Rechnung: speichern fragen, bevor Modal schließt
      // Zuerst Erfolg melden, DANN speichern fragen (sichtbare Reihenfolge wie gewünscht)
      await notice.alert(`E-Mail gesendet an ${sentTo}\n(von ${mailbox.address})`, 'Gesendet');
      await maybePromptSaveEmail(sentTo);

      onSent?.({ to: sentTo, resendId: result.id });
      onClose?.();
    } catch (e) {
      setError(e.message || 'Versand fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const akustikerLabel = customerData
    ? `${customerData.company || '—'}${customerData.branch ? ` / ${customerData.branch}` : ''}`
    : null;

  return (
    <div className="send-email-overlay" onClick={onClose}>
      <div className="send-email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="send-email-header sticky">
          <div>
            <h2>E-Mail senden — {emailType === 'invoice' ? 'Rechnung' : 'KV / Auftrag'}</h2>
            <p className="send-email-from-hint">Von: {mailbox.from}</p>
          </div>
          <div className="send-email-header-actions">
            <button type="button" onClick={onClose} className="send-email-btn-ghost">Abbrechen</button>
            <button type="button" disabled={!canSend || sending} onClick={handleSend} className="send-email-btn-primary">
              {sending ? 'Sendet…' : 'Senden'}
            </button>
            <button type="button" onClick={onClose} className="send-email-close" aria-label="Schließen">×</button>
          </div>
        </div>

        {customerData && (
          <div className="send-email-akustiker-box">
            <div><strong>Akustiker:</strong> {akustikerLabel}</div>
            <div className={recipientForType(customerData, emailType) ? 'send-email-ak-ok' : 'send-email-ak-warn'}>
              {recipientForType(customerData, emailType)
                ? `${emailFieldLabel}: ${recipientForType(customerData, emailType)}`
                : `${emailFieldLabel} noch nicht hinterlegt`}
            </div>
            <button type="button" className="send-email-btn-ghost send-email-ak-btn" onClick={() => {
              setEditEmail(recipientForType(customerData, emailType) || to || '');
              setShowEditAkustiker(true);
            }}>
              {emailFieldLabel} bearbeiten
            </button>
          </div>
        )}

        <label className="send-email-label">Empfänger</label>
        <input className="send-email-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@firma.de" />

        <label className="send-email-label">E-Mail-Vorlage</label>
        <select className="send-email-input" value={templateId} onChange={(e) => onPickTemplate(e.target.value)}>
          <option value="">— ohne gespeicherte Vorlage —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({TEMPLATE_TYPE_LABELS[t.type] || t.type})
            </option>
          ))}
        </select>

        <label className="send-email-label">Betreff</label>
        <input className="send-email-input" value={subject} onChange={(e) => setSubject(e.target.value)} />

        <label className="send-email-label">Inhalt (vor dem Senden editierbar)</label>
        <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />

        {signatures.length > 0 && (
          <div className="send-email-sig-row">
            <label className="send-email-check">
              <input
                type="checkbox"
                checked={appendSignature}
                onChange={(e) => handleSignatureToggle(e.target.checked)}
              />
              Signatur in Text einfügen
            </label>
            {appendSignature && (
              <select
                className="send-email-input send-email-sig-select"
                value={signatureId}
                onChange={(e) => handleSignaturePick(e.target.value)}
              >
                {signatures.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (Standard)' : ''}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="send-email-pdf-row">
          {pdfLoading && <span className="send-email-pdf-info">PDF wird erzeugt…</span>}
          {!pdfLoading && pdfBase64 && (
            <span className="send-email-pdf-ok">PDF-Anhang: {pdfFilename || 'Dokument.pdf'}</span>
          )}
          {!pdfLoading && !pdfBase64 && emailType === 'invoice' && (
            <span className="send-email-pdf-warn">{pdfError || 'Kein PDF — Versand nur als Text möglich.'}</span>
          )}
          {!pdfLoading && !pdfBase64 && emailType === 'kv' && (
            <span className="send-email-pdf-warn">{pdfError || 'Kein PDF — Versand nur als Text möglich.'}</span>
          )}
        </div>

        {error && <div className="send-email-error">{error}</div>}

        <div className="send-email-actions">
          <button type="button" onClick={onClose} className="send-email-btn-ghost">Abbrechen</button>
          <button type="button" disabled={!canSend || sending} onClick={handleSend} className="send-email-btn-primary">
            {sending ? 'Sendet…' : 'Senden'}
          </button>
        </div>
      </div>

      {showEditAkustiker && customerData && (
        <div className="send-email-overlay send-email-overlay-nested" onClick={() => setShowEditAkustiker(false)}>
          <div className="send-email-modal send-email-modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', color: '#1d426a' }}>{emailFieldLabel} bearbeiten</h3>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#555' }}>{akustikerLabel}</p>
            <label className="send-email-label">{emailFieldLabel}</label>
            <input
              className="send-email-input"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="name@firma.de"
            />
            <div className="send-email-actions">
              <button type="button" className="send-email-btn-ghost" onClick={() => setShowEditAkustiker(false)}>
                Abbrechen
              </button>
              <button type="button" className="send-email-btn-primary" disabled={savingAkustiker} onClick={saveAkustikerEmail}>
                {savingAkustiker ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .send-email-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; text-align: left; }
        .send-email-overlay-nested { z-index: 10001; }
        .send-email-modal { background: #fff; border-radius: 12px; width: min(720px, 100%); max-height: 92vh; overflow: auto; padding: 0 20px 20px; box-shadow: 0 12px 40px rgba(0,0,0,0.2); text-align: left; }
        .send-email-modal-sm { width: min(420px, 100%); padding: 20px; }
        .send-email-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding-top: 16px; }
        .send-email-header.sticky { position: sticky; top: 0; z-index: 5; background: #fff; padding: 14px 0 12px; margin: 0 0 4px; border-bottom: 1px solid #e5e7eb; }
        .send-email-header h2 { margin: 0; color: #1d426a; font-weight: 500; font-size: 1.25rem; }
        .send-email-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .send-email-close { border: none; background: transparent; font-size: 22px; cursor: pointer; line-height: 1; padding: 4px 6px; }
        .send-email-from-hint { margin: 6px 0 0; font-size: 13px; color: #666; }
        .send-email-akustiker-box { margin-top: 12px; padding: 12px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; line-height: 1.5; }
        .send-email-ak-ok { color: #15803d; margin-top: 4px; }
        .send-email-ak-warn { color: #ea580c; margin-top: 4px; font-weight: 500; }
        .send-email-ak-btn { margin-top: 8px; padding: 6px 12px; font-size: 13px; }
        .send-email-label { display: block; font-size: 13px; color: #555; margin-top: 12px; margin-bottom: 4px; }
        .send-email-input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; text-align: left; }
        .send-email-check { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 14px; }
        .send-email-sig-row { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
        .send-email-sig-select { max-width: 280px; margin-top: 0; }
        .send-email-pdf-row { margin-top: 10px; font-size: 13px; }
        .send-email-pdf-ok { color: #15803d; }
        .send-email-pdf-warn { color: #ea580c; }
        .send-email-pdf-info { color: #666; }
        .send-email-error { margin-top: 10px; color: #b91c1c; font-size: 14px; }
        .send-email-actions { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }
        .send-email-btn-primary { padding: 10px 16px; background: #1d426a; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
        .send-email-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .send-email-btn-ghost { padding: 10px 16px; background: #fff; color: #1d426a; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; }
      `}</style>
    </div>
  );
}
