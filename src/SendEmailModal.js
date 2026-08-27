import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { sendEmailApi, applyTemplatePlaceholders, TEMPLATE_TYPE_LABELS } from './emailApi';
import { buildInvoicePdfAttachment } from './invoiceEmailUtils';
import { buildKvPdfAttachment } from './kvEmailUtils';
import RichTextEditor from './RichTextEditor';
import { hasSignature, toggleSignatureInHtml, stripSignature } from './signatureUtils';
import { mailboxForEmailType } from './emailConfig';
import { useNotice } from './AppNotice';
import { storeEmailPdfAttachment, pdfBase64ToObjectUrl, openBlob, downloadBlob } from './emailAttachmentUtils';
import PdfGrabPreview from './PdfGrabPreview';
import EmailAttachBar, { isPdfAttachment } from './EmailAttachBar';
import { GearIcon } from './icons';

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
  const navigate = useNavigate();
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
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [previewKey, setPreviewKey] = useState('primary-pdf');
  const [extraAttachments, setExtraAttachments] = useState([]);
  const [previewWidth, setPreviewWidth] = useState(() => {
    try {
      const v = Number(localStorage.getItem('send_email_preview_width'));
      return Number.isFinite(v) && v >= 280 && v <= 720 ? v : 460;
    } catch {
      return 460;
    }
  });

  const originalEmailRef = useRef('');
  const previewPaneRef = useRef(null);
  const resizeDragRef = useRef(null);

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
    setExtraAttachments([]);
    setPreviewKey('primary-pdf');
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

  useEffect(() => {
    const attachFilename = pdfFilename || (emailType === 'invoice' ? 'Rechnung.pdf' : 'Kostenvoranschlag.pdf');
    let selected = null;
    if (previewKey === 'primary-pdf' && pdfBase64) {
      selected = { key: 'primary-pdf', filename: attachFilename, content: pdfBase64 };
    } else {
      selected = extraAttachments.find((a) => a.key === previewKey && isPdfAttachment(a)) || null;
      if (!selected && pdfBase64) {
        selected = { key: 'primary-pdf', filename: attachFilename, content: pdfBase64 };
      } else if (!selected) {
        selected = extraAttachments.find((a) => isPdfAttachment(a)) || null;
      }
    }

    if (!selected?.content) {
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
      setPdfPreviewBlob(null);
      setPreviewFilename('');
      return undefined;
    }

    const { blob, objectUrl } = pdfBase64ToObjectUrl(selected.content);
    setPdfPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });
    setPdfPreviewBlob(blob);
    setPreviewFilename(selected.filename || 'Dokument.pdf');
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pdfBase64, pdfFilename, emailType, previewKey, extraAttachments]);

  useEffect(() => () => {
    setPdfPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  }, []);

  useEffect(() => {
    if (previewKey === 'primary-pdf') return;
    if (previewKey && !extraAttachments.some((a) => a.key === previewKey)) {
      setPreviewKey(pdfBase64 ? 'primary-pdf' : '');
    }
  }, [extraAttachments, previewKey, pdfBase64]);

  useEffect(() => {
    try {
      localStorage.setItem('send_email_preview_width', String(previewWidth));
    } catch (_) { /* ignore */ }
  }, [previewWidth]);

  const startPreviewResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = previewWidth;
    resizeDragRef.current = { startX, startW };
    const onMove = (ev) => {
      if (!resizeDragRef.current) return;
      // Nach links ziehen = Vorschau größer
      const next = Math.min(720, Math.max(280, resizeDragRef.current.startW - (ev.clientX - resizeDragRef.current.startX)));
      setPreviewWidth(next);
    };
    const onUp = () => {
      resizeDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

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
      const primaryFilename = pdfFilename || (emailType === 'invoice' ? 'Rechnung.pdf' : 'Kostenvoranschlag.pdf');
      if (pdfBase64) {
        attachments.push({ filename: primaryFilename, content: pdfBase64, content_type: 'application/pdf' });
        attachmentMeta.push({ filename: primaryFilename, content_type: 'application/pdf', content: pdfBase64 });
      }
      for (const a of extraAttachments) {
        attachments.push({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType || 'application/octet-stream'
        });
        attachmentMeta.push({
          filename: a.filename,
          content_type: a.contentType || 'application/octet-stream',
          content: a.content
        });
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
          attachments: attachmentMeta.map(({ filename, content_type }) => ({ filename, content_type })),
          resend_id: result.id || null,
          status: 'sent',
          is_test: false
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      if (inserted?.id && attachmentMeta.length) {
        try {
          const stored = [];
          for (const a of attachmentMeta) {
            const s = await storeEmailPdfAttachment({
              logId: inserted.id,
              filename: a.filename,
              pdfBase64: a.content,
              contentType: a.content_type
            });
            if (s) stored.push(s);
          }
          if (stored.length) {
            await supabase
              .from('email_logs')
              .update({ attachments: stored })
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

  const focusPdfPreview = () => {
    previewPaneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handlePreviewAttachment = (att) => {
    if (!att?.key) return;
    setPreviewKey(att.key);
    focusPdfPreview();
  };

  const attachFilename = pdfFilename || (emailType === 'invoice' ? 'Rechnung.pdf' : 'Kostenvoranschlag.pdf');
  const lockedAttachments = pdfBase64
    ? [{ key: 'primary-pdf', filename: attachFilename, locked: true, content: pdfBase64, contentType: 'application/pdf' }]
    : [];
  const shownPreviewName = previewFilename || attachFilename;

  return (
    <div className="send-email-overlay" onClick={onClose}>
      <div className="send-email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="send-email-header sticky">
          <div>
            <h2>E-Mail senden — {emailType === 'invoice' ? 'Rechnung' : 'KV / Auftrag'}</h2>
            <p className="send-email-from-hint">Von: {mailbox.from}</p>
          </div>
          <div className="send-email-header-actions">
            <div className="send-email-tpl-wrap">
              <button
                type="button"
                className="send-email-tpl-btn send-email-tpl-btn-text"
                title="Vorlagen"
                aria-label="Vorlagen"
              >
                <GearIcon size={16} />
                <span>Vorlagen</span>
              </button>
              <div className="send-email-tpl-menu" role="menu">
                <div className="send-email-tpl-menu-title">Vorlage auswählen</div>
                <button
                  type="button"
                  className={`send-email-tpl-item${!templateId ? ' active' : ''}`}
                  onClick={() => onPickTemplate('')}
                >
                  — ohne gespeicherte Vorlage —
                </button>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`send-email-tpl-item${templateId === t.id ? ' active' : ''}`}
                    onClick={() => onPickTemplate(t.id)}
                  >
                    {t.name} ({TEMPLATE_TYPE_LABELS[t.type] || t.type})
                  </button>
                ))}
                <div className="send-email-tpl-sep" />
                <button
                  type="button"
                  className="send-email-tpl-item send-email-tpl-manage"
                  onClick={() => {
                    onClose?.();
                    navigate('/email-vorlagen');
                  }}
                >
                  Vorlagen bearbeiten…
                </button>
              </div>
            </div>
            <button type="button" onClick={onClose} className="send-email-btn-ghost">Abbrechen</button>
            <button type="button" disabled={!canSend || sending} onClick={handleSend} className="send-email-btn-primary">
              {sending ? 'Sendet…' : 'Senden'}
            </button>
            <button type="button" onClick={onClose} className="send-email-close" aria-label="Schließen">×</button>
          </div>
        </div>

        <div
          className="send-email-layout"
          style={{ gridTemplateColumns: `minmax(280px, 1fr) 6px ${previewWidth}px` }}
        >
          <div className="send-email-form">
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

            <label className="send-email-label">Betreff</label>
            <input className="send-email-input" value={subject} onChange={(e) => setSubject(e.target.value)} />

            <div className="send-email-pdf-row">
              <EmailAttachBar
                attachments={extraAttachments}
                onChange={setExtraAttachments}
                lockedAttachments={lockedAttachments}
                excludeKvIds={emailType === 'kv' && repairOrderId ? [repairOrderId] : []}
                excludeInvoiceIds={emailType === 'invoice' && invoiceId ? [invoiceId] : []}
                busyLabel={pdfLoading ? 'Haupt-PDF wird erzeugt…' : ''}
                onPreview={handlePreviewAttachment}
                activePreviewKey={previewKey}
              />
              {!pdfLoading && !pdfBase64 && (
                <span className="send-email-pdf-warn">{pdfError || 'Kein Haupt-PDF — Zusatzanhänge und Textversand möglich.'}</span>
              )}
            </div>

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

            {error && <div className="send-email-error">{error}</div>}

            <div className="send-email-actions">
              <button type="button" onClick={onClose} className="send-email-btn-ghost">Abbrechen</button>
              <button type="button" disabled={!canSend || sending} onClick={handleSend} className="send-email-btn-primary">
                {sending ? 'Sendet…' : 'Senden'}
              </button>
            </div>
          </div>

          <div
            className="send-email-resizer"
            onMouseDown={startPreviewResize}
            title="Breite der Vorschau ziehen"
            role="separator"
            aria-orientation="vertical"
          />

          <aside className="send-email-preview" ref={previewPaneRef}>
            <div className="send-email-preview-top">
              <h3 className="send-email-preview-title">PDF-Vorschau</h3>
              <div className="send-email-preview-actions">
                <button
                  type="button"
                  className="send-email-btn-ghost send-email-preview-btn"
                  disabled={!pdfPreviewBlob}
                  onClick={() => pdfPreviewBlob && downloadBlob(pdfPreviewBlob, shownPreviewName)}
                >
                  Herunterladen
                </button>
                <button
                  type="button"
                  className="send-email-btn-ghost send-email-preview-btn"
                  disabled={!pdfPreviewBlob}
                  onClick={() => pdfPreviewBlob && openBlob(pdfPreviewBlob)}
                >
                  Öffnen
                </button>
              </div>
            </div>
            <div className="send-email-preview-body">
              {pdfLoading && previewKey === 'primary-pdf' && <p className="send-email-preview-empty">PDF wird erzeugt…</p>}
              {!(pdfLoading && previewKey === 'primary-pdf') && !pdfPreviewUrl && (
                <p className="send-email-preview-empty">{pdfError || 'Kein PDF verfügbar — Lupe bei einem PDF-Anhang tippen'}</p>
              )}
              {!(pdfLoading && previewKey === 'primary-pdf') && pdfPreviewUrl && (
                <PdfGrabPreview url={pdfPreviewUrl} filename={shownPreviewName} />
              )}
            </div>
            <div className="send-email-preview-footer">
              {shownPreviewName || '—'}
            </div>
          </aside>
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
        .send-email-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 12px; text-align: left; }
        .send-email-overlay-nested { z-index: 10001; }
        .send-email-modal { background: #fff; border-radius: 12px; width: min(1240px, 100%); height: min(92vh, 920px); max-height: 92vh; overflow: hidden; padding: 0 16px 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.2); text-align: left; display: flex; flex-direction: column; }
        .send-email-modal-sm { width: min(420px, 100%); height: auto; max-height: 90vh; padding: 20px; overflow: auto; display: block; }
        .send-email-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding-top: 14px; flex-shrink: 0; }
        .send-email-header.sticky { position: relative; z-index: 5; background: #fff; padding: 14px 0 12px; margin: 0 0 4px; border-bottom: 1px solid #e5e7eb; }
        .send-email-header h2 { margin: 0; color: #1d426a; font-weight: 500; font-size: 1.25rem; }
        .send-email-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .send-email-tpl-wrap { position: relative; }
        .send-email-tpl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #1d426a; cursor: pointer; font-size: 13px; font-weight: 600; }
        .send-email-tpl-btn:hover, .send-email-tpl-wrap:hover .send-email-tpl-btn { background: #eef4fa; }
        .send-email-tpl-menu { display: none; position: absolute; right: 0; top: calc(100% + 4px); z-index: 20; min-width: 260px; max-width: 340px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 10px 28px rgba(0,0,0,0.14); padding: 8px; }
        .send-email-tpl-wrap:hover .send-email-tpl-menu, .send-email-tpl-wrap:focus-within .send-email-tpl-menu { display: block; }
        .send-email-tpl-menu-title { font-size: 12px; font-weight: 600; color: #1d426a; padding: 4px 8px 8px; border-bottom: 1px solid #eef2f6; margin-bottom: 4px; }
        .send-email-tpl-item { display: block; width: 100%; text-align: left; border: none; background: transparent; padding: 8px 10px; border-radius: 6px; font-size: 13px; color: #333; cursor: pointer; }
        .send-email-tpl-item:hover { background: #eef4fa; }
        .send-email-tpl-item.active { background: #e8f0f8; color: #1d426a; font-weight: 600; }
        .send-email-tpl-sep { height: 1px; background: #eef2f6; margin: 6px 0; }
        .send-email-tpl-manage { color: #1d426a; font-weight: 600; }
        .send-email-close { border: none; background: transparent; font-size: 22px; cursor: pointer; line-height: 1; padding: 4px 6px; }
        .send-email-from-hint { margin: 6px 0 0; font-size: 13px; color: #666; }
        .send-email-layout { display: grid; gap: 0; align-items: stretch; flex: 1; min-height: 0; overflow: hidden; }
        .send-email-form { min-width: 0; min-height: 0; overflow-x: hidden; overflow-y: auto; padding-right: 10px; padding-bottom: 8px; }
        .send-email-resizer { cursor: col-resize; background: #eef2f6; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 6px; flex-shrink: 0; }
        .send-email-resizer:hover { background: #dbe4ee; }
        .send-email-preview { position: static; align-self: stretch; height: 100%; min-height: 0; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; display: flex; flex-direction: column; overflow: hidden; }
        .send-email-preview-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: #fff; flex-shrink: 0; }
        .send-email-preview-title { margin: 0; font-size: 14px; font-weight: 600; color: #1d426a; }
        .send-email-preview-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .send-email-preview-btn { padding: 6px 10px; font-size: 12px; }
        .send-email-preview-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .send-email-preview-body { flex: 1; min-height: 0; background: #eef2f6; display: flex; flex-direction: column; align-items: stretch; justify-content: stretch; overflow: hidden; }
        .send-email-preview-frame { width: 100%; height: 100%; border: none; background: #fff; }
        .send-email-preview-empty { margin: auto; padding: 24px; color: #666; font-size: 14px; text-align: center; }
        .send-email-preview-footer { padding: 8px 12px; font-size: 12px; color: #555; border-top: 1px solid #e5e7eb; background: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
        .send-email-akustiker-box { margin-top: 4px; padding: 12px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; line-height: 1.5; }
        .send-email-ak-ok { color: #15803d; margin-top: 4px; }
        .send-email-ak-warn { color: #ea580c; margin-top: 4px; font-weight: 500; }
        .send-email-ak-btn { margin-top: 8px; padding: 6px 12px; font-size: 13px; }
        .send-email-label { display: block; font-size: 13px; color: #555; margin-top: 12px; margin-bottom: 4px; }
        .send-email-input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; text-align: left; }
        .send-email-check { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 14px; }
        .send-email-sig-row { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
        .send-email-sig-select { max-width: 280px; margin-top: 0; }
        .send-email-pdf-row { margin-top: 12px; margin-bottom: 4px; font-size: 13px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .send-email-pdf-label { color: #888; font-weight: 500; margin-right: 2px; }
        .send-email-attach-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid #bbf7d0; border-radius: 999px; background: #f0fdf4; color: #15803d; font-size: 13px; cursor: pointer; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .send-email-attach-chip:hover { background: #dcfce7; }
        .send-email-pdf-warn { color: #ea580c; }
        .send-email-pdf-info { color: #666; }
        .send-email-error { margin-top: 10px; color: #b91c1c; font-size: 14px; }
        .send-email-actions { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }
        .send-email-btn-primary { padding: 10px 16px; background: #1d426a; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
        .send-email-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .send-email-btn-ghost { padding: 10px 16px; background: #fff; color: #1d426a; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; }
        @media (max-width: 900px) {
          .send-email-modal { height: auto; max-height: 94vh; overflow: auto; display: block; }
          .send-email-layout { display: flex; flex-direction: column; overflow: visible; height: auto; }
          .send-email-resizer { display: none; }
          .send-email-form { overflow: visible; padding-right: 0; }
          .send-email-preview { min-height: 360px; height: 50vh; }
        }
      `}</style>
    </div>
  );
}
