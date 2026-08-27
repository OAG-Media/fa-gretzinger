import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { sendEmailApi } from './emailApi';
import { getMailbox } from './emailConfig';
import { useNotice } from './AppNotice';
import RichTextEditor from './RichTextEditor';
import { toggleSignatureInHtml, withSignature } from './signatureUtils';
import RecipientField from './RecipientField';
import EmailAttachBar, { isPdfAttachment } from './EmailAttachBar';
import { storeEmailPdfAttachment, pdfBase64ToObjectUrl, openBlob, downloadBlob } from './emailAttachmentUtils';
import PdfGrabPreview from './PdfGrabPreview';
import {
  buildReplyRecipients,
  extractEmail,
  formatAddressList,
  parseAddressList,
  uniqueAddresses
} from './emailRecipients';

function plainTextFromHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Freie E-Mail / Antwort / Entwurf — Absender = aktuelles Postfach (kv oder info).
 */
export default function ComposeEmailModal({
  open,
  onClose,
  mode = 'new',
  replyToMail = null,
  draftMail = null,
  mailboxKey = 'info',
  onSent,
  onDraftSaved
}) {
  const mailbox = getMailbox(mailboxKey);
  const notice = useNotice();
  const [signatures, setSignatures] = useState([]);
  const [signatureId, setSignatureId] = useState('');
  const [appendSignature, setAppendSignature] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [extraAttachments, setExtraAttachments] = useState([]);
  const [previewKey, setPreviewKey] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [previewWidth, setPreviewWidth] = useState(420);
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [error, setError] = useState('');
  const [skipDraftOnClose, setSkipDraftOnClose] = useState(false);
  const resizeDragRef = useRef(null);

  useEffect(() => {
    const att = extraAttachments.find((a) => a.key === previewKey && isPdfAttachment(a));
    if (!att?.content) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
      setPreviewBlob(null);
      setPreviewFilename('');
      return undefined;
    }
    const { blob, objectUrl } = pdfBase64ToObjectUrl(att.content);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });
    setPreviewBlob(blob);
    setPreviewFilename(att.filename || 'Dokument.pdf');
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [previewKey, extraAttachments]);

  useEffect(() => () => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  }, []);

  useEffect(() => {
    if (previewKey && !extraAttachments.some((a) => a.key === previewKey)) {
      setPreviewKey('');
    }
  }, [extraAttachments, previewKey]);

  const startPreviewResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = previewWidth;
    resizeDragRef.current = { startX, startW };
    const onMove = (ev) => {
      if (!resizeDragRef.current) return;
      const next = Math.min(640, Math.max(280, resizeDragRef.current.startW - (ev.clientX - resizeDragRef.current.startX)));
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

  const title =
    draftMail || draftId
      ? 'Entwurf'
      : mode === 'replyAll'
        ? 'Allen antworten'
        : mode === 'reply'
          ? 'Antworten'
          : 'Neue E-Mail';

  useEffect(() => {
    if (!open) return;
    setError('');
    setSkipDraftOnClose(false);
    setDraftId(draftMail?.id || null);
    setExtraAttachments([]);
    setPreviewKey('');
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    setPreviewBlob(null);
    setPreviewFilename('');

    (async () => {
      const [{ data: sig }, { data: tpl }] = await Promise.all([
        supabase.from('email_signatures').select('*').eq('active', true).order('is_default', { ascending: false }),
        supabase.from('email_templates').select('*').eq('active', true).eq('type', 'general').eq('mailbox_key', mailboxKey).order('is_default', { ascending: false })
      ]);
      setSignatures(sig || []);
      setTemplates(tpl || []);
      const defSig = (sig || []).find((s) => s.is_default) || (sig || [])[0];
      if (defSig) setSignatureId(defSig.id);
      const useSig = Boolean(defSig);
      setAppendSignature(useSig);

      if (draftMail) {
        setTo(parseAddressList(draftMail.to_address));
        setCc(parseAddressList(draftMail.cc_address));
        const draftBcc = parseAddressList(draftMail.bcc_address);
        setBcc(draftBcc);
        setShowBcc(draftBcc.length > 0);
        setSubject(draftMail.subject || '');
        setBodyHtml(draftMail.body_html || '');
        setTemplateId(draftMail.template_id || '');
        return;
      }

      if (mode === 'reply' || mode === 'replyAll') {
        const rec = buildReplyRecipients(replyToMail, mode);
        setTo(rec.to);
        setCc(rec.cc);
        setBcc([]);
        setShowBcc(false);
        setTemplateId('');
        const subj = replyToMail?.subject || '';
        setSubject(/^re:\s/i.test(subj) ? subj : `Re: ${subj}`);
        const quote = `<p><br/></p><p>---</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555">${replyToMail?.body_html || ''}</blockquote>`;
        setBodyHtml(useSig ? withSignature(quote, defSig.body_html) : quote);
      } else {
        setTo([]);
        setCc([]);
        setBcc([]);
        setShowBcc(false);
        const preferred = (tpl || []).find((t) => t.is_default) || null;
        setTemplateId(preferred?.id || '');
        const greeting = preferred?.body_html || '<p>Guten Tag,</p><p></p>';
        setSubject(preferred?.subject || '');
        setBodyHtml(useSig ? withSignature(greeting, defSig.body_html) : greeting);
      }
    })();
  }, [open, mode, replyToMail, draftMail, mailboxKey]);

  const moveRecipients = (emails, targetField) => {
    const moving = uniqueAddresses(emails);
    if (!moving.length) return;
    const strip = (list) => list.filter((x) => !moving.includes(extractEmail(x)));
    setTo((prev) => (targetField === 'to' ? uniqueAddresses([...strip(prev), ...moving]) : strip(prev)));
    setCc((prev) => (targetField === 'cc' ? uniqueAddresses([...strip(prev), ...moving]) : strip(prev)));
    setBcc((prev) => (targetField === 'bcc' ? uniqueAddresses([...strip(prev), ...moving]) : strip(prev)));
    if (targetField === 'bcc') setShowBcc(true);
  };

  const handleSignatureToggle = (checked) => {
    setAppendSignature(checked);
    setBodyHtml((prev) => toggleSignatureInHtml(prev, selectedSignature?.body_html || '', checked));
  };

  const handleSignaturePick = (id) => {
    setSignatureId(id);
    if (!appendSignature) return;
    const sig = signatures.find((s) => s.id === id);
    if (!sig) return;
    setBodyHtml((prev) => {
      const stripped = toggleSignatureInHtml(prev, selectedSignature?.body_html || '', false);
      return toggleSignatureInHtml(stripped, sig.body_html, true);
    });
  };

  const applyTemplate = (id) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    const base = tpl?.body_html || '<p>Guten Tag,</p><p></p>';
    if (tpl?.subject) setSubject(tpl.subject);
    setBodyHtml(appendSignature ? withSignature(base, selectedSignature?.body_html || '') : base);
  };

  const draftPayload = () => ({
    direction: 'outbound',
    email_type: mode === 'reply' || mode === 'replyAll' ? 'reply' : 'free',
    mailbox_key: mailbox.key,
    template_id: templateId || null,
    in_reply_to_id: replyToMail?.id || draftMail?.in_reply_to_id || null,
    from_address: mailbox.from,
    to_address: formatAddressList(to) || '',
    cc_address: formatAddressList(cc) || null,
    bcc_address: formatAddressList(bcc) || null,
    reply_to: mailbox.address,
    subject: subject.trim() || '(ohne Betreff)',
    body_html: bodyHtml,
    status: 'draft',
    is_test: false,
    deleted_at: null,
    archived_at: null
  });

  const shouldSaveDraft = () => {
    if (skipDraftOnClose || sending) return false;
    if (to.length || cc.length || bcc.length || subject.trim()) return true;
    return plainTextFromHtml(bodyHtml).length > 0;
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const row = draftPayload();
      if (draftId) {
        const { error: updErr } = await supabase.from('email_logs').update(row).eq('id', draftId);
        if (updErr) throw updErr;
      } else {
        const { data, error: insErr } = await supabase.from('email_logs').insert(row).select('id').single();
        if (insErr) throw insErr;
        if (data?.id) setDraftId(data.id);
      }
      onDraftSaved?.();
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDismiss = async () => {
    if (sending || savingDraft) return;
    if (shouldSaveDraft()) {
      try {
        await saveDraft();
      } catch (e) {
        setError(e.message || 'Entwurf speichern fehlgeschlagen');
        return;
      }
    }
    onClose?.();
  };

  const handleSend = async () => {
    if (!to.length || !subject.trim() || !bodyHtml.trim()) return;
    setSending(true);
    setError('');
    setSkipDraftOnClose(true);

    try {
      const payload = {
        from: mailbox.from,
        to,
        subject,
        html: bodyHtml,
        reply_to: mailbox.address
      };
      if (cc.length) payload.cc = cc;
      if (bcc.length) payload.bcc = bcc;
      if (extraAttachments.length) {
        payload.attachments = extraAttachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType || 'application/octet-stream'
        }));
      }

      const result = await sendEmailApi(payload);

      const attachmentMeta = extraAttachments.map((a) => ({
        filename: a.filename,
        content_type: a.contentType || 'application/octet-stream'
      }));

      const sentRow = {
        direction: 'outbound',
        email_type: mode === 'reply' || mode === 'replyAll' ? 'reply' : 'free',
        mailbox_key: mailbox.key,
        template_id: templateId || null,
        in_reply_to_id: replyToMail?.id || draftMail?.in_reply_to_id || null,
        from_address: result.from || mailbox.from,
        to_address: formatAddressList(to),
        cc_address: formatAddressList(cc),
        bcc_address: formatAddressList(bcc),
        reply_to: mailbox.address,
        subject,
        body_html: bodyHtml,
        attachments: attachmentMeta.length ? attachmentMeta : null,
        resend_id: result.id || null,
        status: 'sent',
        is_test: false,
        deleted_at: null,
        archived_at: null
      };

      let logId = draftId;
      if (draftId) {
        const { error: updErr } = await supabase.from('email_logs').update(sentRow).eq('id', draftId);
        if (updErr) throw updErr;
      } else {
        const { data: inserted, error: insErr } = await supabase.from('email_logs').insert(sentRow).select('id').single();
        if (insErr) throw insErr;
        logId = inserted?.id || null;
      }

      if (logId && extraAttachments.length) {
        try {
          const stored = [];
          for (const a of extraAttachments) {
            const s = await storeEmailPdfAttachment({
              logId,
              filename: a.filename,
              pdfBase64: a.content,
              contentType: a.contentType || 'application/octet-stream'
            });
            if (s) stored.push(s);
          }
          if (stored.length) {
            await supabase.from('email_logs').update({ attachments: stored }).eq('id', logId);
          }
        } catch (_) {
          // Versand war ok — Storage optional
        }
      }

      onSent?.({ to });
      onClose?.();
      await notice.alert(`E-Mail gesendet an ${to.join(', ')}.`, 'Gesendet');
    } catch (e) {
      setSkipDraftOnClose(false);
      setError(e.message || 'Versand fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const showPreview = Boolean(previewKey && previewUrl);

  return (
    <div className="compose-overlay" onClick={handleDismiss}>
      <div
        className={`compose-modal${showPreview ? ' with-preview' : ''}`}
        style={showPreview ? { width: `min(${860 + previewWidth + 12}px, 98vw)` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="compose-header">
          <h2>{title}</h2>
          <div className="compose-header-actions">
            {templates.length > 0 && mode === 'new' && !draftMail && (
              <div className="compose-tpl-wrap">
                <button
                  type="button"
                  className="compose-tpl-btn"
                  title="Vorlage auswählen"
                  aria-label="Vorlage auswählen"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M9 13h6M9 17h6" />
                  </svg>
                </button>
                <div className="compose-tpl-menu" role="menu">
                  <div className="compose-tpl-menu-title">Vorlage auswählen</div>
                  <button
                    type="button"
                    className={`compose-tpl-item${!templateId ? ' active' : ''}`}
                    onClick={() => applyTemplate('')}
                  >
                    Ohne Vorlage
                  </button>
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`compose-tpl-item${templateId === t.id ? ' active' : ''}`}
                      onClick={() => applyTemplate(t.id)}
                    >
                      {t.name}{t.is_default ? ' (Standard)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="button" onClick={handleDismiss} className="compose-close" aria-label="Schließen">×</button>
          </div>
        </div>

        <div
          className="compose-layout"
          style={showPreview ? { gridTemplateColumns: `minmax(320px, 1fr) 6px ${previewWidth}px` } : undefined}
        >
          <div className="compose-form">
            <div className="compose-fields">
              <div className="compose-row">
                <span className="compose-label">Von</span>
                <div className="compose-static">{mailbox.from}</div>
              </div>

              <div className="compose-row">
                <span className="compose-label">An</span>
                <RecipientField field="to" recipients={to} onMove={moveRecipients} />
                {!showBcc && (
                  <button type="button" className="compose-bcc-toggle" onClick={() => setShowBcc(true)}>Bcc</button>
                )}
              </div>

              <div className="compose-row">
                <span className="compose-label">Cc</span>
                <RecipientField field="cc" recipients={cc} onMove={moveRecipients} placeholder="Kopie an…" />
              </div>

              {showBcc && (
                <div className="compose-row">
                  <span className="compose-label">Bcc</span>
                  <RecipientField field="bcc" recipients={bcc} onMove={moveRecipients} placeholder="Blindkopie…" />
                </div>
              )}

              <div className="compose-row">
                <span className="compose-label">Betreff</span>
                <input
                  className="compose-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Betreff"
                />
              </div>
            </div>

            <EmailAttachBar
              attachments={extraAttachments}
              onChange={setExtraAttachments}
              onPreview={(att) => setPreviewKey(att.key)}
              activePreviewKey={previewKey}
            />

            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />

            {signatures.length > 0 && (
              <div className="compose-sig-row">
                <label className="compose-check">
                  <input
                    type="checkbox"
                    checked={appendSignature}
                    onChange={(e) => handleSignatureToggle(e.target.checked)}
                  />
                  Signatur einfügen
                </label>
                {appendSignature && (
                  <select value={signatureId} onChange={(e) => handleSignaturePick(e.target.value)}>
                    {signatures.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (Standard)' : ''}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {error && <div className="compose-error">{error}</div>}

            <div className="compose-actions">
              <button type="button" onClick={handleDismiss} className="compose-btn-ghost" disabled={sending || savingDraft}>
                {savingDraft ? 'Speichert…' : 'Schließen'}
              </button>
              <button
                type="button"
                disabled={sending || savingDraft || !to.length || !subject.trim() || !bodyHtml.trim()}
                onClick={handleSend}
                className="compose-btn-primary"
              >
                {sending ? 'Sendet…' : 'Senden'}
              </button>
            </div>
          </div>

          {showPreview && (
            <>
              <div
                className="compose-resizer"
                onMouseDown={startPreviewResize}
                title="Breite der Vorschau ziehen"
                role="separator"
                aria-orientation="vertical"
              />
              <aside className="compose-preview">
                <div className="compose-preview-top">
                  <h3 className="compose-preview-title">PDF-Vorschau</h3>
                  <div className="compose-preview-actions">
                    <button
                      type="button"
                      className="compose-btn-ghost compose-preview-btn"
                      disabled={!previewBlob}
                      onClick={() => previewBlob && downloadBlob(previewBlob, previewFilename)}
                    >
                      Herunterladen
                    </button>
                    <button
                      type="button"
                      className="compose-btn-ghost compose-preview-btn"
                      disabled={!previewBlob}
                      onClick={() => previewBlob && openBlob(previewBlob)}
                    >
                      Öffnen
                    </button>
                    <button
                      type="button"
                      className="compose-btn-ghost compose-preview-btn"
                      onClick={() => setPreviewKey('')}
                    >
                      Schließen
                    </button>
                  </div>
                </div>
                <div className="compose-preview-body">
                  <PdfGrabPreview url={previewUrl} filename={previewFilename} />
                </div>
                <div className="compose-preview-footer">{previewFilename || '—'}</div>
              </aside>
            </>
          )}
        </div>

        <style>{`
          .compose-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; text-align: left; }
          .compose-modal { background: #fff; border-radius: 12px; width: min(860px, 100%); max-height: 94vh; overflow: auto; padding: 20px 22px; box-shadow: 0 12px 40px rgba(0,0,0,0.2); text-align: left; }
          .compose-modal.with-preview { overflow: hidden; display: flex; flex-direction: column; }
          .compose-layout { display: block; }
          .compose-modal.with-preview .compose-layout { display: grid; gap: 0; flex: 1; min-height: 0; max-height: calc(94vh - 70px); }
          .compose-form { min-width: 0; overflow: auto; padding-right: 4px; }
          .compose-resizer { cursor: col-resize; background: #e5e7eb; }
          .compose-resizer:hover { background: #1d426a; }
          .compose-preview { display: flex; flex-direction: column; min-width: 0; min-height: 0; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; overflow: hidden; }
          .compose-preview-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: #fff; flex-wrap: wrap; }
          .compose-preview-title { margin: 0; font-size: 14px; color: #1d426a; font-weight: 600; }
          .compose-preview-actions { display: flex; gap: 6px; flex-wrap: wrap; }
          .compose-preview-btn { padding: 6px 10px !important; font-size: 12px !important; }
          .compose-preview-body { flex: 1; min-height: 280px; overflow: hidden; }
          .compose-preview-footer { padding: 8px 12px; font-size: 12px; color: #64748b; border-top: 1px solid #e5e7eb; background: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .compose-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 12px; }
          .compose-header h2 { margin: 0; color: #1d426a; font-weight: 500; font-size: 1.2rem; }
          .compose-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
          .compose-tpl-wrap { position: relative; }
          .compose-tpl-btn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #1d426a; cursor: pointer; }
          .compose-tpl-btn:hover, .compose-tpl-wrap:hover .compose-tpl-btn { background: #eef4fa; }
          .compose-tpl-menu { display: none; position: absolute; right: 0; top: calc(100% + 4px); z-index: 20; min-width: 240px; max-width: 320px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 10px 28px rgba(0,0,0,0.14); padding: 8px; }
          .compose-tpl-wrap:hover .compose-tpl-menu, .compose-tpl-wrap:focus-within .compose-tpl-menu { display: block; }
          .compose-tpl-menu-title { font-size: 12px; font-weight: 600; color: #1d426a; padding: 4px 8px 8px; border-bottom: 1px solid #eef2f6; margin-bottom: 4px; }
          .compose-tpl-item { display: block; width: 100%; text-align: left; border: none; background: transparent; padding: 8px 10px; border-radius: 6px; font-size: 13px; color: #333; cursor: pointer; }
          .compose-tpl-item:hover { background: #eef4fa; }
          .compose-tpl-item.active { background: #e8f0f8; color: #1d426a; font-weight: 600; }
          .compose-close { border: none; background: transparent; font-size: 24px; cursor: pointer; line-height: 1; color: #555; }
          .compose-fields { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin: 12px 0 14px; }
          .compose-row { display: grid; grid-template-columns: 72px 1fr auto; align-items: center; gap: 8px; min-height: 42px; padding: 4px 10px; border-bottom: 1px solid #eee; }
          .compose-row:last-child { border-bottom: none; }
          .compose-label { color: #888; font-size: 13px; }
          .compose-static { font-size: 14px; color: #333; padding: 6px 0; }
          .compose-subject { width: 100%; border: none; outline: none; font-size: 14px; padding: 8px 0; background: transparent; }
          .compose-bcc-toggle { border: none; background: transparent; color: #1d426a; cursor: pointer; font-size: 13px; padding: 4px 6px; }
          .compose-check { display: flex; align-items: center; gap: 8px; font-size: 14px; }
          .compose-sig-row { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
          .compose-sig-row select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; max-width: 280px; }
          .compose-error { margin-top: 10px; color: #b91c1c; font-size: 14px; }
          .compose-actions { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }
          .compose-btn-primary { padding: 10px 16px; background: #1d426a; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
          .compose-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
          .compose-btn-ghost { padding: 10px 16px; background: #fff; color: #1d426a; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; }
          .rf-box { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 32px; padding: 4px 0; cursor: text; }
          .rf-box.drag-over { background: #eef4fa; border-radius: 6px; }
          .rf-pill { display: inline-flex; align-items: center; gap: 4px; background: #eef2f6; border: 1px solid #d8dee6; border-radius: 999px; padding: 3px 8px 3px 10px; font-size: 13px; color: #1d426a; cursor: grab; }
          .rf-pill-x { border: none; background: transparent; cursor: pointer; color: #666; font-size: 15px; line-height: 1; padding: 0 2px; }
          .rf-input { flex: 1; min-width: 140px; border: none; outline: none; font-size: 14px; padding: 6px 0; background: transparent; }
        `}</style>
      </div>
    </div>
  );
}
