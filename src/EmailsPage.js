import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import RichTextEditor from './RichTextEditor';
import TemplateVariableInsert from './TemplateVariableInsert';
import { TEMPLATE_TYPE_LABELS } from './emailApi';
import { hasSignature, toggleSignatureInHtml, stripSignature } from './signatureUtils';
import { getVariablesForType } from './emailTemplateVars';
import { getMailbox, canAccessMailbox } from './emailConfig';
import { useNotice } from './AppNotice';
import { mailboxKeyForTemplateType } from './icons';

const SIG_DEFAULT_HTML =
  '<p>Mit freundlichen Grüßen<br/>Fa. Gretzinger Hörgeräteservice<br/>info@fa-gretzinger.de</p>';

const TYPE_TABS_ADMIN = [
  { value: 'kv', label: 'KV' },
  { value: 'invoice', label: 'Rechnung' },
  { value: 'general', label: 'Normal' }
];

const TYPE_TABS_STAFF = [
  { value: 'kv', label: 'KV' },
  { value: 'general', label: 'Normal' }
];

function emptyFormForType(type) {
  const mailbox_key = mailboxKeyForTemplateType(type);
  return {
    name: '',
    type,
    mailbox_key,
    subject: '',
    body_html:
      '<p>Guten Tag,</p><p></p><p>Mit freundlichen Grüßen<br/>Fa. Gretzinger<br/>info@fa-gretzinger.de</p>',
    is_default: false,
    active: true
  };
}

const emptySigForm = {
  name: '',
  body_html: SIG_DEFAULT_HTML,
  is_default: false,
  active: true
};

export default function EmailsPage({ navigate, role }) {
  const location = useLocation();
  const { mailboxKey: paramKey } = useParams();
  const unified = location.pathname === '/email-vorlagen' || location.pathname === '/emails' || !paramKey;
  const mailboxKey = unified ? null : (paramKey === 'kv' ? 'kv' : 'info');
  const mailbox = mailboxKey ? getMailbox(mailboxKey) : null;
  const notice = useNotice();
  const isAdmin = role === 'admin';
  const typeTabs = isAdmin ? TYPE_TABS_ADMIN : TYPE_TABS_STAFF;
  const [typeFilter, setTypeFilter] = useState(() => (isAdmin ? 'kv' : 'kv'));
  const [templates, setTemplates] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => emptyFormForType(unified ? 'kv' : (mailboxKey === 'kv' ? 'kv' : 'invoice')));
  const [sigForm, setSigForm] = useState(emptySigForm);
  const [editingId, setEditingId] = useState(null);
  const [editingSigId, setEditingSigId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('templates');
  const [sigAppendChecked, setSigAppendChecked] = useState(false);
  const [sigPickerId, setSigPickerId] = useState('');
  const subjectInputRef = useRef(null);
  const bodyEditorRef = useRef(null);

  const allowed = unified
    ? isAdmin || canAccessMailbox(role, 'kv')
    : canAccessMailbox(role, mailboxKey);

  const typeOptions = useMemo(() => {
    if (unified) {
      return typeTabs.map((t) => ({
        value: t.value,
        label: t.value === 'kv'
          ? 'Kostenvoranschlag / Reparaturauftrag'
          : t.value === 'invoice'
            ? 'Rechnung'
            : 'Standard / frei'
      }));
    }
    return mailboxKey === 'kv'
      ? [
          { value: 'kv', label: 'Kostenvoranschlag / Reparaturauftrag' },
          { value: 'general', label: 'Standard / frei' }
        ]
      : [
          { value: 'invoice', label: 'Rechnung' },
          { value: 'general', label: 'Standard / frei' }
        ];
  }, [unified, mailboxKey, typeTabs]);

  const visibleTemplates = useMemo(() => {
    if (!unified) return templates;
    return templates.filter((t) => t.type === typeFilter);
  }, [templates, unified, typeFilter]);

  const templateVariables = useMemo(
    () => getVariablesForType(form.type),
    [form.type]
  );

  const insertVariableSubject = (token) => {
    const el = subjectInputRef.current;
    const current = form.subject;
    if (!el) {
      setForm((p) => ({ ...p, subject: current + token }));
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? start;
    const newVal = current.slice(0, start) + token + current.slice(end);
    setForm((p) => ({ ...p, subject: newVal }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertVariableBody = (token) => {
    bodyEditorRef.current?.insertAtCursor(token);
  };

  const defaultSignature = useMemo(
    () => signatures.find((s) => s.is_default) || signatures[0],
    [signatures]
  );

  const selectedSigForTemplate = useMemo(
    () => signatures.find((s) => s.id === sigPickerId) || defaultSignature,
    [signatures, sigPickerId, defaultSignature]
  );

  const load = async () => {
    setLoading(true);
    try {
      let templatesQuery = supabase
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!unified && mailboxKey) {
        templatesQuery = templatesQuery.eq('mailbox_key', mailboxKey);
      } else if (!isAdmin) {
        templatesQuery = templatesQuery.in('type', ['kv', 'general']).eq('mailbox_key', 'kv');
      }

      let logsQuery = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (mailboxKey) logsQuery = logsQuery.eq('mailbox_key', mailboxKey);

      const [{ data: t, error: te }, { data: s, error: se }, { data: l, error: le }] = await Promise.all([
        templatesQuery,
        supabase.from('email_signatures').select('*').order('updated_at', { ascending: false }),
        logsQuery
      ]);
      if (te) throw te;
      if (se) throw se;
      if (le) throw le;
      setTemplates(t || []);
      setSignatures(s || []);
      setLogs(l || []);
      const defSig = (s || []).find((x) => x.is_default) || (s || [])[0];
      if (defSig) setSigPickerId((prev) => prev || defSig.id);
    } catch (e) {
      await notice.alert('Laden fehlgeschlagen: ' + e.message, 'Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialType = unified
      ? (typeTabs[0]?.value || 'kv')
      : (mailboxKey === 'kv' ? 'kv' : 'invoice');
    setTypeFilter(initialType);
    setForm(emptyFormForType(initialType));
    setEditingId(null);
    setTab('templates');
    load();
  }, [mailboxKey, unified]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNew = () => {
    setEditingId(null);
    const t = unified ? typeFilter : (mailboxKey === 'kv' ? 'kv' : 'invoice');
    setForm(emptyFormForType(t));
    setSigAppendChecked(false);
    setSigPickerId(defaultSignature?.id || '');
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      type: t.type,
      mailbox_key: t.mailbox_key || mailboxKeyForTemplateType(t.type),
      subject: t.subject,
      body_html: t.body_html,
      is_default: !!t.is_default,
      active: t.active !== false
    });
    if (unified) setTypeFilter(t.type);
    setSigAppendChecked(hasSignature(t.body_html));
    setSigPickerId(defaultSignature?.id || '');
  };

  const handleTemplateSigToggle = (checked) => {
    setSigAppendChecked(checked);
    const sigHtml = selectedSigForTemplate?.body_html || '';
    setForm((p) => ({
      ...p,
      body_html: toggleSignatureInHtml(p.body_html, sigHtml, checked)
    }));
  };

  const handleTemplateSigPick = (id) => {
    setSigPickerId(id);
    if (!sigAppendChecked) return;
    const sig = signatures.find((s) => s.id === id);
    if (!sig) return;
    setForm((p) => ({
      ...p,
      body_html: toggleSignatureInHtml(stripSignature(p.body_html), sig.body_html, true)
    }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      await notice.alert('Name und Betreff sind Pflicht.', 'Hinweis');
      return;
    }
    setSaving(true);
    try {
      const resolvedMailbox = form.mailbox_key || mailboxKeyForTemplateType(form.type);
      if (form.is_default) {
        await supabase
          .from('email_templates')
          .update({ is_default: false })
          .eq('type', form.type)
          .eq('mailbox_key', resolvedMailbox)
          .eq('is_default', true);
      }

      const payload = {
        ...form,
        mailbox_key: resolvedMailbox,
        name: form.name.trim(),
        subject: form.subject.trim(),
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from('email_templates').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_templates').insert(payload);
        if (error) throw error;
      }
      await load();
      startNew();
    } catch (e) {
      await notice.alert('Speichern fehlgeschlagen: ' + e.message, 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const ok = await notice.confirm('E-Mail-Vorlage wirklich löschen?', 'Vorlage löschen');
    if (!ok) return;
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) await notice.alert(error.message, 'Fehler');
    else await load();
  };

  const startNewSig = () => {
    setEditingSigId(null);
    setSigForm(emptySigForm);
  };

  const startEditSig = (s) => {
    setEditingSigId(s.id);
    setSigForm({
      name: s.name,
      body_html: s.body_html,
      is_default: !!s.is_default,
      active: s.active !== false
    });
  };

  const saveSig = async () => {
    if (!sigForm.name.trim()) {
      await notice.alert('Name ist Pflicht.', 'Hinweis');
      return;
    }
    setSaving(true);
    try {
      if (sigForm.is_default) {
        await supabase.from('email_signatures').update({ is_default: false }).eq('is_default', true);
      }
      const payload = {
        ...sigForm,
        name: sigForm.name.trim(),
        updated_at: new Date().toISOString()
      };
      if (editingSigId) {
        const { error } = await supabase.from('email_signatures').update(payload).eq('id', editingSigId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_signatures').insert(payload);
        if (error) throw error;
      }
      await load();
      startNewSig();
    } catch (e) {
      await notice.alert('Speichern fehlgeschlagen: ' + e.message, 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const removeSig = async (id) => {
    const ok = await notice.confirm('Signatur wirklich löschen?', 'Signatur löschen');
    if (!ok) return;
    const { error } = await supabase.from('email_signatures').delete().eq('id', id);
    if (error) await notice.alert(error.message, 'Fehler');
    else await load();
  };

  if (!allowed) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ color: '#1d426a' }}>E-Mail-Einstellungen</h1>
        <p>Kein Zugriff auf dieses Postfach.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1d426a', fontWeight: 400 }}>
            {unified ? 'E-Mail-Vorlagen' : 'E-Mail-Einstellungen'}
            {!unified && mailbox && (
              <span style={{ fontSize: '1rem', fontWeight: 400, color: '#8a9aab' }}> – {mailbox.address}</span>
            )}
          </h1>
          <p style={{ color: '#666', marginTop: 8 }}>
            {unified
              ? 'Vorlagen für KV, Rechnungen und normale E-Mails — sowie Signaturen.'
              : `Vorlagen und Signaturen für dieses Postfach. Absender: ${mailbox?.from || ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(mailbox?.navPath || (isAdmin ? '/postfach/info' : '/postfach/kv'))}
            style={btnGhost}
          >
            ← Postfach
          </button>
          <button type="button" onClick={() => navigate('/')} style={btnGhost}>
            Home
          </button>
        </div>
      </div>

      {unified && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {typeTabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setTypeFilter(t.value);
                setEditingId(null);
                setForm(emptyFormForType(t.value));
                setTab('templates');
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: typeFilter === t.value ? '2px solid #1d426a' : '1px solid #d1d5db',
                background: typeFilter === t.value ? '#e8f0f8' : '#fff',
                color: '#1d426a',
                fontWeight: typeFilter === t.value ? 600 : 500,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20, borderBottom: '1px solid #e5e7eb' }}>
        <TabBtn active={tab === 'templates'} onClick={() => setTab('templates')} label="E-Mail-Vorlagen" />
        <TabBtn active={tab === 'signatures'} onClick={() => setTab('signatures')} label={`Signaturen (${signatures.length})`} />
      </div>

      {loading ? (
        <p style={{ marginTop: 16 }}>Lade…</p>
      ) : tab === 'signatures' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.2fr)', gap: 24, marginTop: 20, textAlign: 'left' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#1d426a' }}>Signaturen</h2>
              <button type="button" onClick={startNewSig} style={btnGhost}>+ Neu</button>
            </div>
            <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>
              Wird optional in E-Mail-Vorlagen, beim Versand und im Postfach (freie Mails / Antworten) eingefügt.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {signatures.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => startEditSig(s)}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 10,
                    border: editingSigId === s.id ? '2px solid #1d426a' : '1px solid #e5e7eb',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    {s.is_default ? 'Standard · ' : ''}{s.active ? 'aktiv' : 'inaktiv'}
                  </div>
                </button>
              ))}
              {signatures.length === 0 && <p style={{ color: '#888' }}>Noch keine Signaturen.</p>}
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, textAlign: 'left' }}>
            <h2 style={{ marginTop: 0, fontSize: 18, color: '#1d426a' }}>
              {editingSigId ? 'Signatur bearbeiten' : 'Neue Signatur'}
            </h2>
            <label style={label}>Name</label>
            <input value={sigForm.name} onChange={(e) => setSigForm((p) => ({ ...p, name: e.target.value }))} style={input} />
            <label style={label}>Inhalt</label>
            <RichTextEditor value={sigForm.body_html} onChange={(html) => setSigForm((p) => ({ ...p, body_html: html }))} />
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={sigForm.is_default} onChange={(e) => setSigForm((p) => ({ ...p, is_default: e.target.checked }))} />
                Standard-Signatur
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={sigForm.active} onChange={(e) => setSigForm((p) => ({ ...p, active: e.target.checked }))} />
                Aktiv
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={saveSig} disabled={saving} style={btnPrimary}>{saving ? 'Speichert…' : 'Speichern'}</button>
              {editingSigId && (
                <button type="button" onClick={() => removeSig(editingSigId)} style={{ ...btnGhost, color: '#b91c1c' }}>Löschen</button>
              )}
            </div>
          </div>
        </div>
      ) : tab === 'templates' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.2fr)', gap: 24, marginTop: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#1d426a' }}>E-Mail-Vorlagen</h2>
              <button type="button" onClick={startNew} style={btnGhost}>
                + Neu
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => startEdit(t)}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 10,
                    border: editingId === t.id ? '2px solid #1d426a' : '1px solid #e5e7eb',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    {TEMPLATE_TYPE_LABELS[t.type] || t.type}
                    {t.is_default ? ' · Standard' : ''}
                    {!t.active ? ' · inaktiv' : ''}
                    {unified && t.mailbox_key ? ` · ${t.mailbox_key}@` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{t.subject}</div>
                </button>
              ))}
              {visibleTemplates.length === 0 && <p style={{ color: '#888' }}>Noch keine E-Mail-Vorlagen.</p>}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: 18, color: '#1d426a' }}>
              {editingId ? 'E-Mail-Vorlage bearbeiten' : 'Neue E-Mail-Vorlage'}
            </h2>
            <label style={label}>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              style={input}
              placeholder="z. B. Rechnung Standard oder allgemeine Anfrage"
            />
            <label style={label}>Typ</label>
            <select
              value={form.type}
              onChange={(e) => {
                const nextType = e.target.value;
                setForm((p) => ({
                  ...p,
                  type: nextType,
                  mailbox_key: mailboxKeyForTemplateType(nextType)
                }));
                if (unified) setTypeFilter(nextType);
              }}
              style={input}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {form.type === 'general' && (
              <>
                <label style={label}>Postfach</label>
                <select
                  value={form.mailbox_key || 'info'}
                  onChange={(e) => setForm((p) => ({ ...p, mailbox_key: e.target.value }))}
                  style={input}
                >
                  <option value="info">info@fa-gretzinger.de</option>
                  <option value="kv">kv@fa-gretzinger.de</option>
                </select>
              </>
            )}
            <label style={label}>Betreff</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={subjectInputRef}
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                style={{ ...input, flex: 1, minWidth: 200 }}
                placeholder="Ihre Rechnung {{rechnungsnummer}}"
              />
              <TemplateVariableInsert
                variables={templateVariables}
                onInsert={insertVariableSubject}
              />
            </div>
            <label style={label}>Inhalt</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <RichTextEditor
                  ref={bodyEditorRef}
                  value={form.body_html}
                  onChange={(html) => setForm((p) => ({ ...p, body_html: html }))}
                  placeholder="E-Mail-Text…"
                />
              </div>
              <TemplateVariableInsert
                variables={templateVariables}
                onInsert={insertVariableBody}
              />
            </div>
            {signatures.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={sigAppendChecked}
                    onChange={(e) => handleTemplateSigToggle(e.target.checked)}
                  />
                  Signatur in Text einfügen
                </label>
                {sigAppendChecked && (
                  <select
                    value={sigPickerId || defaultSignature?.id || ''}
                    onChange={(e) => handleTemplateSigPick(e.target.value)}
                    style={{ ...input, maxWidth: 280, marginTop: 0 }}
                  >
                    {signatures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.is_default ? ' (Standard)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
                />
                Standard für diesen Typ
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                />
                Aktiv
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={save} disabled={saving} style={btnPrimary}>
                {saving ? 'Speichert…' : 'Speichern'}
              </button>
              {editingId && (
                <button type="button" onClick={() => remove(editingId)} style={{ ...btnGhost, color: '#b91c1c' }}>
                  Löschen
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabBtn({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 14px',
        border: 'none',
        borderBottom: active ? '3px solid #1d426a' : '3px solid transparent',
        background: 'transparent',
        color: active ? '#1d426a' : '#666',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer'
      }}
    >
      {label}
    </button>
  );
}

const label = { display: 'block', fontSize: 13, color: '#555', marginTop: 10, marginBottom: 4 };
const input = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  boxSizing: 'border-box'
};
const th = { padding: '8px', color: '#666' };
const td = { padding: '8px', verticalAlign: 'top' };
const btnPrimary = {
  padding: '10px 14px',
  background: '#1d426a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer'
};
const btnGhost = {
  padding: '10px 14px',
  background: '#fff',
  color: '#1d426a',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  cursor: 'pointer'
};
