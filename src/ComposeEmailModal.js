import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { sendEmailApi } from './emailApi';
import { getMailbox } from './emailConfig';
import { useNotice } from './AppNotice';
import RichTextEditor from './RichTextEditor';
import { toggleSignatureInHtml, withSignature } from './signatureUtils';
import RecipientField from './RecipientField';
import {
  buildReplyRecipients,
  extractEmail,
  formatAddressList,
  uniqueAddresses
} from './emailRecipients';

/**
 * Freie E-Mail / Antwort — Absender = aktuelles Postfach (kv oder info).
 */
export default function ComposeEmailModal({
  open,
  onClose,
  mode = 'new',
  replyToMail = null,
  mailboxKey = 'info',
  onSent
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
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedSignature = useMemo(
    () => signatures.find((s) => s.id === signatureId) || signatures.find((s) => s.is_default) || signatures[0],
    [signatures, signatureId]
  );

  const title =
    mode === 'replyAll' ? 'Allen antworten' : mode === 'reply' ? 'Antworten' : 'Neue E-Mail';

  useEffect(() => {
    if (!open) return;
    setError('');

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
  }, [open, mode, replyToMail, mailboxKey]);

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

  const handleSend = async () => {
    if (!to.length || !subject.trim() || !bodyHtml.trim()) return;
    setSending(true);
    setError('');

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

      const result = await sendEmailApi(payload);

      await supabase.from('email_logs').insert({
        direction: 'outbound',
        email_type: mode === 'new' ? 'free' : 'reply',
        mailbox_key: mailbox.key,
        template_id: templateId || null,
        in_reply_to_id: replyToMail?.id || null,
        from_address: result.from || mailbox.from,
        to_address: formatAddressList(to),
        cc_address: formatAddressList(cc),
        bcc_address: formatAddressList(bcc),
        reply_to: mailbox.address,
        subject,
        body_html: bodyHtml,
        resend_id: result.id || null,
        status: 'sent',
        is_test: false
      });

      onSent?.({ to });
      onClose?.();
      await notice.alert(`E-Mail gesendet an ${to.join(', ')}.`, 'Gesendet');
    } catch (e) {
      setError(e.message || 'Versand fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="compose-overlay" onClick={onClose}>
      <div className="compose-modal" onClick={(e) => e.stopPropagation()}>
        <div className="compose-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} className="compose-close" aria-label="Schließen">×</button>
        </div>

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

        {templates.length > 0 && mode === 'new' && (
          <div className="compose-template-row">
            <label>Vorlage</label>
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">Ohne Vorlage</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.is_default ? ' (Standard)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

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
          <button type="button" onClick={onClose} className="compose-btn-ghost">Abbrechen</button>
          <button
            type="button"
            disabled={sending || !to.length || !subject.trim() || !bodyHtml.trim()}
            onClick={handleSend}
            className="compose-btn-primary"
          >
            {sending ? 'Sendet…' : 'Senden'}
          </button>
        </div>

        <style>{`
          .compose-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; text-align: left; }
          .compose-modal { background: #fff; border-radius: 12px; width: min(860px, 100%); max-height: 94vh; overflow: auto; padding: 20px 22px; box-shadow: 0 12px 40px rgba(0,0,0,0.2); text-align: left; }
          .compose-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .compose-header h2 { margin: 0; color: #1d426a; font-weight: 500; font-size: 1.2rem; }
          .compose-close { border: none; background: transparent; font-size: 24px; cursor: pointer; line-height: 1; color: #555; }
          .compose-fields { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin: 12px 0 14px; }
          .compose-row { display: grid; grid-template-columns: 72px 1fr auto; align-items: center; gap: 8px; min-height: 42px; padding: 4px 10px; border-bottom: 1px solid #eee; }
          .compose-row:last-child { border-bottom: none; }
          .compose-label { color: #888; font-size: 13px; }
          .compose-static { font-size: 14px; color: #333; padding: 6px 0; }
          .compose-subject { width: 100%; border: none; outline: none; font-size: 14px; padding: 8px 0; background: transparent; }
          .compose-bcc-toggle { border: none; background: transparent; color: #1d426a; cursor: pointer; font-size: 13px; padding: 4px 6px; }
          .compose-template-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 13px; color: #555; }
          .compose-template-row select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; min-width: 220px; }
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
