import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { getMailbox, canAccessMailbox, EMAIL_TYPE_LABELS, detectMailboxKey } from './emailConfig';
import ComposeEmailModal from './ComposeEmailModal';
import { parseAddressList } from './emailRecipients';
import { useNotice } from './AppNotice';
import { resolveAttachmentBlob, downloadBlob, openBlob } from './emailAttachmentUtils';
import { GearIcon } from './icons';

function emailApiBase() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3002';
  }
  return '';
}

async function syncInboundApi() {
  const resp = await fetch(`${emailApiBase()}/api/sync-inbound`, { method: 'POST' });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Sync fehlgeschlagen');
  return data;
}

/** Hintergrund-Sync max. alle `minMs` (vermeidet Doppel-IMAP von Home + Postfach). */
async function quietSyncIfDue(minMs = 90_000) {
  try {
    const key = 'fa_email_last_sync_at';
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < minMs) return null;
    sessionStorage.setItem(key, String(Date.now()));
    return await syncInboundApi();
  } catch (e) {
    console.warn('[email auto-sync]', e.message || e);
    return null;
  }
}

export { quietSyncIfDue };

/** Eine sichtbare Zeile pro Message-ID (Resend + IMAP sonst doppelt). */
function dedupeByMessageId(mails) {
  const seen = new Set();
  const out = [];
  for (const m of mails || []) {
    const key = (m.message_id && String(m.message_id).trim()) || m.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

function SettingsIcon() {
  return <GearIcon size={18} />;
}

function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 8 6 12l4 4" />
      <path d="M6 12h9a4 4 0 0 1 4 4v0" />
    </svg>
  );
}

function ReplyAllIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 8 9 12l4 4" />
      <path d="M8 8 4 12l4 4" />
      <path d="M9 12h8a4 4 0 0 1 4 4v0" />
    </svg>
  );
}

function SyncIcon({ spinning = false }) {
  return (
    <svg
      className={`pf-sync-icon${spinning ? ' spinning' : ''}`}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8z"
        fill="currentColor"
      />
      <path
        d="M12 20v3l4-4-4-4v3c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 9.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8z"
        fill="currentColor"
      />
    </svg>
  );
}

function SyncButton({ onClick, disabled, syncing, compact = false }) {
  return (
    <button
      type="button"
      className={`pf-sync-btn${compact ? ' pf-sync-btn-compact' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title="Eingang synchronisieren"
      aria-label={syncing ? 'Synchronisiert…' : 'Synchronisieren'}
    >
      <SyncIcon spinning={syncing} />
      {!compact && <span>{syncing ? 'Synchronisiert…' : 'Synchronisieren'}</span>}
    </button>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h18v3H3z" />
      <path d="M5 10v9h14v-9" />
      <path d="M10 14h4" />
    </svg>
  );
}

/** Geschlossen = ungelesen markieren */
function EnvelopeClosedIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 7 9-7" />
    </svg>
  );
}

/** Offen = gelesen markieren */
function EnvelopeOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 9v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <path d="m5 9 7 5 7-5" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function ClearSelectionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 18h14" />
    </svg>
  );
}

function OpenFolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h6l2 2h10v10H3z" />
      <path d="M3 7V5h5l2 2" />
    </svg>
  );
}

export function PostfachPanel({ navigate, mailboxKey = 'info', compact = false, allowComposeFree = true }) {
  const mailbox = getMailbox(mailboxKey);
  const notice = useNotice();
  const [folder, setFolder] = useState('inbound');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState('new');
  const [replyTarget, setReplyTarget] = useState(null);
  const [draftTarget, setDraftTarget] = useState(null);
  const [previewAtt, setPreviewAtt] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [listWidth, setListWidth] = useState(() => {
    try {
      const v = Number(localStorage.getItem(`pf_list_width_${mailboxKey}`));
      return Number.isFinite(v) && v >= 240 && v <= 560 ? v : 300;
    } catch {
      return 300;
    }
  });
  const dragRef = useRef(null);
  const previewUrlRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      await notice.alert('Postfach laden fehlgeschlagen: ' + e.message, 'Fehler');
    } finally {
      setLoading(false);
    }
  }, [notice]);

  useEffect(() => {
    load();
    setSelectedId(null);
    setCheckedIds(new Set());
    setFolder('inbound');
  }, [load, mailboxKey]);

  // Auto: einmal beim Öffnen + alle ~90s im Hintergrund (IMAP + Resend)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const r = await quietSyncIfDue(90_000);
      if (cancelled) return;
      const imported = r?.imported || 0;
      if (r && imported > 0) {
        const { data } = await supabase
          .from('email_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (!cancelled && data) setLogs(data);
      }
    };
    run();
    const t = setInterval(run, 90_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [mailboxKey]);

  const mailboxLogs = useMemo(
    () => (logs || []).filter((m) => detectMailboxKey(m) === mailboxKey),
    [logs, mailboxKey]
  );
  const activeLogs = useMemo(
    () => mailboxLogs.filter((x) => !x.deleted_at && !x.archived_at),
    [mailboxLogs]
  );
  const inbound = useMemo(
    () => dedupeByMessageId(activeLogs.filter((x) => x.direction === 'inbound')),
    [activeLogs]
  );
  const outbound = useMemo(
    () => dedupeByMessageId(
      activeLogs.filter((x) => x.direction === 'outbound' && x.status !== 'draft')
    ),
    [activeLogs]
  );
  const drafts = useMemo(
    () => dedupeByMessageId(
      activeLogs.filter((x) => x.direction === 'outbound' && x.status === 'draft')
    ),
    [activeLogs]
  );
  const deleted = useMemo(
    () => dedupeByMessageId(mailboxLogs.filter((x) => !!x.deleted_at)),
    [mailboxLogs]
  );
  const archived = useMemo(
    () => dedupeByMessageId(mailboxLogs.filter((x) => !!x.archived_at && !x.deleted_at)),
    [mailboxLogs]
  );
  const unreadCount = useMemo(
    () => inbound.filter((x) => !x.read_at).length,
    [inbound]
  );

  const folderMails =
    folder === 'inbound' ? inbound
      : folder === 'outbound' ? outbound
        : folder === 'drafts' ? drafts
          : folder === 'deleted' ? deleted
            : archived;
  const selected = folderMails.find((m) => m.id === selectedId) || null;
  const checkedCount = checkedIds.size;
  const allVisibleChecked =
    folderMails.length > 0 && folderMails.every((m) => checkedIds.has(m.id));

  const clearChecked = () => setCheckedIds(new Set());

  const toggleChecked = (id, e) => {
    e?.stopPropagation?.();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCheckAllVisible = () => {
    if (allVisibleChecked) {
      clearChecked();
      return;
    }
    setCheckedIds(new Set(folderMails.map((m) => m.id)));
  };

  const markRead = async (mail) => {
    if (!mail || mail.direction !== 'inbound' || mail.read_at) return;
    const now = new Date().toISOString();
    const mid = mail.message_id && String(mail.message_id).trim();

    const { error } = await supabase
      .from('email_logs')
      .update({ read_at: now })
      .eq('id', mail.id);
    if (error) {
      console.warn('[markRead]', error.message);
      return;
    }

    // Geschwister-Duplikate (gleiche Message-ID) mitziehen
    if (mid) {
      await supabase
        .from('email_logs')
        .update({ read_at: now })
        .eq('message_id', mid)
        .is('read_at', null);
    }

    setLogs((prev) =>
      prev.map((x) => {
        if (x.id === mail.id) return { ...x, read_at: now };
        if (mid && x.message_id === mid && detectMailboxKey(x) === mailboxKey && !x.read_at) {
          return { ...x, read_at: now };
        }
        return x;
      })
    );
    try {
      window.dispatchEvent(new CustomEvent('fa-email-unread-changed'));
    } catch (_) { /* ignore */ }
  };

  const softDelete = async (mail, e) => {
    e?.stopPropagation?.();
    if (!mail) return;
    const ok = await notice.confirm('Diese E-Mail in „Gelöscht“ verschieben?', 'Löschen');
    if (!ok) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('email_logs')
      .update({ deleted_at: now, archived_at: null })
      .eq('id', mail.id);
    if (error) {
      await notice.alert(error.message, 'Fehler');
      return;
    }
    setLogs((prev) => prev.map((x) => (x.id === mail.id ? { ...x, deleted_at: now, archived_at: null } : x)));
    if (selectedId === mail.id) setSelectedId(null);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(mail.id);
      return next;
    });
  };

  const softArchive = async (mail, e) => {
    e?.stopPropagation?.();
    if (!mail) return;
    const ok = await notice.confirm('Diese E-Mail archivieren?', 'Archivieren');
    if (!ok) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('email_logs')
      .update({ archived_at: now, deleted_at: null })
      .eq('id', mail.id);
    if (error) {
      await notice.alert(error.message, 'Fehler');
      return;
    }
    setLogs((prev) => prev.map((x) => (x.id === mail.id ? { ...x, archived_at: now, deleted_at: null } : x)));
    if (selectedId === mail.id) setSelectedId(null);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(mail.id);
      return next;
    });
  };

  const bulkSoftDelete = async () => {
    const ids = [...checkedIds];
    if (ids.length === 0) return;
    const ok = await notice.confirm(
      `${ids.length} E-Mail(s) in „Gelöscht“ verschieben?`,
      'Massen-Löschung'
    );
    if (!ok) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('email_logs')
      .update({ deleted_at: now, archived_at: null })
      .in('id', ids);
    if (error) {
      await notice.alert(error.message, 'Fehler');
      return;
    }
    const idSet = new Set(ids);
    setLogs((prev) =>
      prev.map((x) => (idSet.has(x.id) ? { ...x, deleted_at: now, archived_at: null } : x))
    );
    if (selectedId && idSet.has(selectedId)) setSelectedId(null);
    clearChecked();
  };

  const bulkSoftArchive = async () => {
    const ids = [...checkedIds];
    if (ids.length === 0) return;
    const ok = await notice.confirm(
      `${ids.length} E-Mail(s) archivieren?`,
      'Massen-Archivierung'
    );
    if (!ok) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('email_logs')
      .update({ archived_at: now, deleted_at: null })
      .in('id', ids);
    if (error) {
      await notice.alert(error.message, 'Fehler');
      return;
    }
    const idSet = new Set(ids);
    setLogs((prev) =>
      prev.map((x) => (idSet.has(x.id) ? { ...x, archived_at: now, deleted_at: null } : x))
    );
    if (selectedId && idSet.has(selectedId)) setSelectedId(null);
    clearChecked();
  };

  const bulkRestore = async () => {
    const ids = [...checkedIds];
    if (ids.length === 0) return;
    const ok = await notice.confirm(
      `${ids.length} E-Mail(s) wiederherstellen?`,
      'Wiederherstellen'
    );
    if (!ok) return;
    const { error } = await supabase
      .from('email_logs')
      .update({ deleted_at: null, archived_at: null })
      .in('id', ids);
    if (error) {
      await notice.alert(error.message, 'Fehler');
      return;
    }
    const idSet = new Set(ids);
    setLogs((prev) =>
      prev.map((x) => (idSet.has(x.id) ? { ...x, deleted_at: null, archived_at: null } : x))
    );
    if (selectedId && idSet.has(selectedId)) setSelectedId(null);
    clearChecked();
  };

  const bulkMarkRead = async () => {
    const ids = [...checkedIds];
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('email_logs')
      .update({ read_at: now })
      .in('id', ids)
      .eq('direction', 'inbound');
    if (error) {
      await notice.alert(error.message, 'Fehler');
      return;
    }
    const idSet = new Set(ids);
    setLogs((prev) =>
      prev.map((x) => (idSet.has(x.id) && x.direction === 'inbound' ? { ...x, read_at: now } : x))
    );
    clearChecked();
    try {
      window.dispatchEvent(new CustomEvent('fa-email-unread-changed'));
    } catch (_) { /* ignore */ }
  };

  const bulkMarkUnread = async () => {
    const ids = [...checkedIds];
    if (ids.length === 0) return;
    const { error } = await supabase
      .from('email_logs')
      .update({ read_at: null })
      .in('id', ids)
      .eq('direction', 'inbound');
    if (error) {
      await notice.alert(error.message, 'Fehler');
      return;
    }
    const idSet = new Set(ids);
    setLogs((prev) =>
      prev.map((x) => (idSet.has(x.id) && x.direction === 'inbound' ? { ...x, read_at: null } : x))
    );
    clearChecked();
    try {
      window.dispatchEvent(new CustomEvent('fa-email-unread-changed'));
    } catch (_) { /* ignore */ }
  };

  const restoreMail = async (mail, e) => {
    e?.stopPropagation?.();
    if (!mail) return;
    const { error } = await supabase
      .from('email_logs')
      .update({ deleted_at: null, archived_at: null })
      .eq('id', mail.id);
    if (error) {
      await notice.alert(error.message, 'Fehler');
      return;
    }
    setLogs((prev) => prev.map((x) => (x.id === mail.id ? { ...x, deleted_at: null, archived_at: null } : x)));
    if (selectedId === mail.id) setSelectedId(null);
  };

  const closePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewAtt(null);
    setPreviewError('');
    setPreviewLoading(false);
  };

  const openAttachmentPreview = async (mail, att) => {
    closePreview();
    setPreviewLoading(true);
    setPreviewAtt({ mail, att, objectUrl: null, blob: null, filename: att?.filename || 'Anhang.pdf' });
    try {
      const resolved = await resolveAttachmentBlob(mail, att);
      previewUrlRef.current = resolved.objectUrl;
      setPreviewAtt({
        mail,
        att,
        blob: resolved.blob,
        objectUrl: resolved.objectUrl,
        filename: resolved.filename
      });
    } catch (err) {
      setPreviewError(err.message || 'Vorschau fehlgeschlagen');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await syncInboundApi();
      await load();
      const imapPart = r.imap
        ? `\nIMAP: ${r.imap.imported || 0} neu (kv/info)`
        : '';
      await notice.alert(
        `Sync fertig: ${r.imported} neu, ${r.skipped} bereits vorhanden.${imapPart}`,
        'Eingang synchronisiert'
      );
    } catch (e) {
      await notice.alert(
        'Eingang sync fehlgeschlagen:\n\n' +
          (e.message || 'Unbekannter Fehler') +
          (String(e.message || '').includes('only send emails')
            ? '\n\n→ Resend API-Key braucht Full Access.'
            : ''),
        'Sync fehlgeschlagen'
      );
    } finally {
      setSyncing(false);
    }
  };

  const startListResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = listWidth;
    dragRef.current = { startX, startW };
    const onMove = (ev) => {
      if (!dragRef.current) return;
      const next = Math.min(560, Math.max(240, dragRef.current.startW + (ev.clientX - dragRef.current.startX)));
      setListWidth(next);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    try {
      localStorage.setItem(`pf_list_width_${mailboxKey}`, String(listWidth));
    } catch (_) { /* ignore */ }
  }, [listWidth, mailboxKey]);

  const startNew = () => {
    if (!allowComposeFree && mailboxKey === 'info') return;
    setComposeMode('new');
    setReplyTarget(null);
    setDraftTarget(null);
    setComposeOpen(true);
  };

  const startReply = (replyMode = 'reply') => {
    if (!selected || folder !== 'inbound') return;
    setComposeMode(replyMode);
    setReplyTarget(selected);
    setDraftTarget(null);
    setComposeOpen(true);
  };

  const openDraft = (mail) => {
    setComposeMode('new');
    setReplyTarget(null);
    setDraftTarget(mail);
    setComposeOpen(true);
  };

  const openMail = async (mail) => {
    if (mail?.status === 'draft') {
      openDraft(mail);
      return;
    }
    setSelectedId(mail.id);
    await markRead(mail);
  };

  const selectedCc = selected ? parseAddressList(selected.cc_address) : [];
  const selectedBcc = selected ? parseAddressList(selected.bcc_address) : [];
  const showNew = allowComposeFree || mailboxKey === 'kv';

  const attachmentListFor = (mail) => {
    if (!mail) return [];
    if (Array.isArray(mail.attachments) && mail.attachments.length > 0) return mail.attachments;
    // ältere Logs vor Meta-Speicherung: KV/Rechnung hatten immer PDF
    if (mail.direction === 'outbound' && mail.email_type === 'kv') {
      return [{ filename: mail.subject ? `${mail.subject}.pdf` : 'Kostenvoranschlag.pdf' }];
    }
    if (mail.direction === 'outbound' && mail.email_type === 'invoice') {
      return [{ filename: mail.subject ? `${mail.subject}.pdf` : 'Rechnung.pdf' }];
    }
    return [];
  };

  return (
    <div className={`pf-root${compact ? ' pf-compact' : ''}`}>
      {!compact && (
        <div className="pf-top">
          <div>
            <h2 className="pf-title">
              E-Mail
              <span className="pf-title-addr"> – {mailbox.address}</span>
            </h2>
            <p className="pf-sub">
              From: {mailbox.from} · Reply-To: {mailbox.address}
            </p>
          </div>
          <div className="pf-top-actions">
            {navigate && (
              <>
                <button
                  type="button"
                  className="pf-icon-btn pf-settings-btn"
                  title="E-Mail-Vorlagen"
                  aria-label="E-Mail-Vorlagen"
                  onClick={() => navigate(mailbox.settingsPath)}
                >
                  <SettingsIcon />
                  <span className="pf-settings-label">Vorlagen</span>
                </button>
                <button type="button" className="pf-btn-ghost" onClick={() => navigate('/')}>← Home</button>
              </>
            )}
            <SyncButton onClick={handleSync} disabled={syncing} syncing={syncing} />
            {showNew && (
              <button type="button" className="pf-btn-primary" onClick={startNew}>Neue E-Mail</button>
            )}
          </div>
        </div>
      )}

      <div
        className="pf-layout"
        style={{ gridTemplateColumns: `160px ${listWidth}px 6px minmax(240px, 1fr)` }}
      >
        <aside className="pf-sidebar">
          <button
            type="button"
            className={`pf-folder${folder === 'inbound' ? ' active' : ''}`}
            onClick={() => { setFolder('inbound'); setSelectedId(null); clearChecked(); }}
          >
            Eingang
            {unreadCount > 0 && <span className="pf-badge">{unreadCount}</span>}
          </button>
          <button
            type="button"
            className={`pf-folder${folder === 'outbound' ? ' active' : ''}`}
            onClick={() => { setFolder('outbound'); setSelectedId(null); clearChecked(); }}
          >
            Gesendet
            <span className="pf-count">{outbound.length}</span>
          </button>
          <button
            type="button"
            className={`pf-folder${folder === 'drafts' ? ' active' : ''}`}
            onClick={() => { setFolder('drafts'); setSelectedId(null); clearChecked(); }}
          >
            Entwürfe
            <span className="pf-count">{drafts.length}</span>
          </button>
          <button
            type="button"
            className={`pf-folder${folder === 'archived' ? ' active' : ''}`}
            onClick={() => { setFolder('archived'); setSelectedId(null); clearChecked(); }}
          >
            Archiviert
            <span className="pf-count">{archived.length}</span>
          </button>
          <button
            type="button"
            className={`pf-folder${folder === 'deleted' ? ' active' : ''}`}
            onClick={() => { setFolder('deleted'); setSelectedId(null); clearChecked(); }}
          >
            Gelöscht
            <span className="pf-count">{deleted.length}</span>
          </button>
          {compact && (
            <>
              <SyncButton onClick={handleSync} disabled={syncing} syncing={syncing} compact />
              {showNew && (
                <button type="button" className="pf-btn-primary pf-sidebar-new" onClick={startNew}>
                  + Neue E-Mail
                </button>
              )}
            </>
          )}
        </aside>

        <div className="pf-list">
          {!loading && folderMails.length > 0 && (
            <div className="pf-bulk-bar">
              <label className="pf-check-all">
                <input
                  type="checkbox"
                  checked={allVisibleChecked}
                  onChange={toggleCheckAllVisible}
                  aria-label="Alle markieren"
                />
                <span>{checkedCount > 0 ? `${checkedCount} markiert` : 'Alle'}</span>
              </label>
              {checkedCount > 0 && (
                <div className="pf-bulk-actions">
                  {(folder === 'deleted' || folder === 'archived') ? (
                    <button type="button" className="pf-bulk-btn" onClick={bulkRestore} title="Wiederherstellen" aria-label="Wiederherstellen">
                      <RestoreIcon />
                    </button>
                  ) : (
                    <>
                      {folder === 'inbound' && (
                        <>
                          <button type="button" className="pf-bulk-btn" onClick={bulkMarkRead} title="Als gelesen markieren" aria-label="Als gelesen markieren">
                            <EnvelopeOpenIcon />
                          </button>
                          <button type="button" className="pf-bulk-btn" onClick={bulkMarkUnread} title="Als ungelesen markieren" aria-label="Als ungelesen markieren">
                            <EnvelopeClosedIcon />
                          </button>
                        </>
                      )}
                      {folder !== 'drafts' && (
                        <button type="button" className="pf-bulk-btn" onClick={bulkSoftArchive} title="Archivieren" aria-label="Archivieren">
                          <ArchiveIcon />
                        </button>
                      )}
                      <button type="button" className="pf-bulk-btn pf-bulk-danger" onClick={bulkSoftDelete} title="Löschen" aria-label="Löschen">
                        <TrashIcon />
                      </button>
                    </>
                  )}
                  <button type="button" className="pf-bulk-btn pf-bulk-muted" onClick={clearChecked} title="Auswahl aufheben" aria-label="Auswahl aufheben">
                    <ClearSelectionIcon />
                  </button>
                </div>
              )}
            </div>
          )}
          {loading ? (
            <p className="pf-empty">Lade…</p>
          ) : folderMails.length === 0 ? (
            <p className="pf-empty">
              {folder === 'inbound'
                ? 'Noch keine Eingänge. „Synchronisieren“ oder Hostinger-Weiterleitung prüfen.'
                : folder === 'outbound'
                  ? 'Noch keine gesendeten Mails.'
                  : folder === 'drafts'
                    ? 'Keine Entwürfe.'
                    : folder === 'archived'
                      ? 'Noch keine archivierten Mails.'
                      : 'Papierkorb ist leer.'}
            </p>
          ) : (
            folderMails.map((mail) => {
              const isUnread = folder === 'inbound' && !mail.read_at;
              const peer = mail.direction === 'inbound' ? mail.from_address : mail.to_address;
              const isChecked = checkedIds.has(mail.id);
              return (
                <div
                  key={mail.id}
                  className={`pf-mail${selectedId === mail.id ? ' selected' : ''}${isUnread ? ' unread' : ''}${isChecked ? ' checked' : ''}`}
                  onClick={() => openMail(mail)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') openMail(mail); }}
                >
                  <label
                    className="pf-mail-check"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => toggleChecked(mail.id, e)}
                      aria-label="E-Mail markieren"
                    />
                  </label>
                  <div className="pf-mail-main">
                    <div className="pf-mail-row">
                      <span className="pf-mail-peer">{peer || '—'}</span>
                      <span className="pf-mail-date">
                        {mail.created_at ? new Date(mail.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="pf-mail-subject">{mail.subject || '(ohne Betreff)'}</div>
                    <div className="pf-mail-meta">
                      {EMAIL_TYPE_LABELS[mail.email_type] || mail.email_type || '—'}
                      {attachmentListFor(mail).length > 0 ? ' · 📎' : ''}
                    </div>
                  </div>
                  <div className="pf-mail-actions">
                    {(folder === 'deleted' || folder === 'archived') ? (
                      <button
                        type="button"
                        className="pf-mail-act"
                        title="Wiederherstellen"
                        onClick={(e) => restoreMail(mail, e)}
                      >
                        ↩
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="pf-mail-act"
                          title="Löschen"
                          onClick={(e) => softDelete(mail, e)}
                        >
                          <TrashIcon />
                        </button>
                        <button
                          type="button"
                          className="pf-mail-act"
                          title="Archivieren"
                          onClick={(e) => softArchive(mail, e)}
                        >
                          <ArchiveIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          className="pf-resizer"
          onMouseDown={startListResize}
          title="Breite ziehen"
          role="separator"
          aria-orientation="vertical"
        />

        <div className="pf-detail">
          {!selected ? (
            <div className="pf-detail-empty">Mail auswählen</div>
          ) : (
            <>
              <div className="pf-detail-head">
                <div className="pf-detail-title-row">
                  <h3>{selected.subject || '(ohne Betreff)'}</h3>
                  <div className="pf-reply-actions">
                    {folder === 'inbound' && (
                      <>
                        <button type="button" className="pf-icon-btn" title="Antworten" onClick={() => startReply('reply')}>
                          <ReplyIcon />
                          <span>Antworten</span>
                        </button>
                        <button type="button" className="pf-icon-btn" title="Allen antworten" onClick={() => startReply('replyAll')}>
                          <ReplyAllIcon />
                          <span>Allen antworten</span>
                        </button>
                      </>
                    )}
                    {(folder === 'deleted' || folder === 'archived') ? (
                      <button type="button" className="pf-icon-btn" title="Wiederherstellen" onClick={(e) => restoreMail(selected, e)}>
                        <span>Wiederherstellen</span>
                      </button>
                    ) : (
                      <>
                        <button type="button" className="pf-icon-btn" title="Löschen" onClick={(e) => softDelete(selected, e)}>
                          <TrashIcon />
                        </button>
                        <button type="button" className="pf-icon-btn" title="Archivieren" onClick={(e) => softArchive(selected, e)}>
                          <ArchiveIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="pf-detail-meta">
                  <div><span className="pf-meta-k">Von</span> {selected.from_address || '—'}</div>
                  <div><span className="pf-meta-k">An</span> {selected.to_address || '—'}</div>
                  {selectedCc.length > 0 && (
                    <div><span className="pf-meta-k">Cc</span> {selectedCc.join('; ')}</div>
                  )}
                  {selected.direction === 'outbound' && selectedBcc.length > 0 && (
                    <div><span className="pf-meta-k">Bcc</span> {selectedBcc.join('; ')}</div>
                  )}
                  <div className="pf-detail-date">
                    {selected.created_at ? new Date(selected.created_at).toLocaleString('de-DE') : '—'}
                  </div>
                </div>
                {attachmentListFor(selected).length > 0 && (
                  <div className="pf-attachments">
                    <div className="pf-attachments-label">Anhänge</div>
                    {attachmentListFor(selected).map((att, idx) => (
                      <button
                        key={`${att.filename || 'file'}-${idx}`}
                        type="button"
                        className="pf-attachment-chip"
                        onClick={() => openAttachmentPreview(selected, att)}
                        title="Vorschau öffnen"
                      >
                        📎 {att.filename || 'Anhang'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div
                className="pf-detail-body"
                dangerouslySetInnerHTML={{ __html: selected.body_html || '<p><em>Kein Inhalt</em></p>' }}
              />
            </>
          )}
        </div>
      </div>

      {previewAtt && (
        <div className="pf-preview-overlay" onClick={closePreview}>
          <div className="pf-preview-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="pf-preview-top">
              <h3>{previewAtt.filename || 'Anhang'}</h3>
              <div className="pf-preview-actions">
                <button
                  type="button"
                  className="pf-icon-btn"
                  disabled={!previewAtt.blob || previewLoading}
                  title="Herunterladen"
                  onClick={() => previewAtt.blob && downloadBlob(previewAtt.blob, previewAtt.filename)}
                >
                  <DownloadIcon />
                  <span>Herunterladen</span>
                </button>
                <button
                  type="button"
                  className="pf-icon-btn"
                  disabled={!previewAtt.blob || previewLoading}
                  title="PDF öffnen"
                  onClick={() => previewAtt.blob && openBlob(previewAtt.blob)}
                >
                  <OpenFolderIcon />
                  <span>PDF öffnen</span>
                </button>
                <button type="button" className="pf-icon-btn" onClick={closePreview} title="Schließen">×</button>
              </div>
            </div>
            <div className="pf-preview-body">
              {previewLoading && <p className="pf-empty">Lade Vorschau…</p>}
              {!previewLoading && previewError && <p className="pf-empty">{previewError}</p>}
              {!previewLoading && !previewError && previewAtt.objectUrl && (
                <iframe title="PDF-Vorschau" src={previewAtt.objectUrl} className="pf-preview-frame" />
              )}
            </div>
          </div>
        </div>
      )}

      <ComposeEmailModal
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setDraftTarget(null); setReplyTarget(null); }}
        mode={composeMode}
        replyToMail={replyTarget}
        draftMail={draftTarget}
        mailboxKey={mailboxKey}
        onSent={() => { load(); setComposeOpen(false); setDraftTarget(null); }}
        onDraftSaved={() => { load(); }}
      />

      <style>{`
        .pf-root { text-align: left; }
        .pf-top { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-start; }
        .pf-title { margin: 0; color: #1d426a; font-weight: 500; font-size: 1.5rem; }
        .pf-title-addr { font-size: 0.95rem; font-weight: 400; color: #8a9aab; vertical-align: middle; }
        .pf-sub { margin: 6px 0 0; color: #666; font-size: 13px; }
        .pf-top-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .pf-settings-btn { padding: 8px 12px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: #1d426a; }
        .pf-settings-label { font-size: 13px; }
        .pf-layout { display: grid; grid-template-columns: 160px 280px 6px minmax(240px, 1fr); gap: 0; min-height: 520px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; }
        .pf-resizer { cursor: col-resize; background: #eef2f6; border-right: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb; }
        .pf-resizer:hover { background: #dbe4ee; }
        .pf-sidebar { background: #f8fafc; border-right: 1px solid #e5e7eb; padding: 12px 8px; display: flex; flex-direction: column; gap: 4px; }
        .pf-folder { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 12px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-size: 14px; color: #333; text-align: left; }
        .pf-folder.active { background: #1d426a; color: #fff; font-weight: 600; }
        .pf-badge { background: #ea580c; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 999px; font-weight: 700; }
        .pf-folder.active .pf-badge { background: #fff; color: #1d426a; }
        .pf-count { font-size: 12px; color: #888; }
        .pf-folder.active .pf-count { color: rgba(255,255,255,0.85); }
        .pf-sidebar-new { margin-top: 12px; width: 100%; font-size: 13px; padding: 8px; }
        .pf-sync-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: #eef2f6; color: #3d4f5f; border: 1px solid #d8dee6; border-radius: 999px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .pf-sync-btn:hover:not(:disabled) { background: #e4eaf0; }
        .pf-sync-btn:disabled { opacity: 0.65; cursor: wait; }
        .pf-sync-btn-compact { width: 100%; justify-content: center; margin-top: auto; border-radius: 8px; padding: 8px; }
        .pf-sync-icon.spinning { animation: pf-spin 0.9s linear infinite; }
        @keyframes pf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pf-list { border-right: none; overflow-x: hidden; overflow-y: auto; max-height: 70vh; min-width: 0; }
        .pf-bulk-bar { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; position: sticky; top: 0; z-index: 2; }
        .pf-check-all { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: #3d4f5f; cursor: pointer; user-select: none; }
        .pf-check-all input, .pf-mail-check input { width: 15px; height: 15px; accent-color: #1d426a; cursor: pointer; }
        .pf-bulk-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .pf-bulk-btn { padding: 6px 8px; border: 1px solid #d8dee6; background: #fff; color: #1d426a; border-radius: 6px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
        .pf-bulk-btn:hover { background: #eef4fa; }
        .pf-bulk-btn.pf-bulk-danger { color: #b91c1c; border-color: #f0c4c4; }
        .pf-bulk-btn.pf-bulk-muted { color: #666; }
        .pf-mail-check { display: flex; align-items: flex-start; padding-top: 2px; flex-shrink: 0; }
        .pf-mail.checked { background: #f0f7fc; }
        .pf-attachments { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0 4px; }
        .pf-attachments-label { font-size: 12px; color: #888; margin-right: 4px; }
        .pf-attachment-chip { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; background: #f1f5f9; border: 1px solid #dbe3ec; font-size: 12px; color: #1d426a; cursor: pointer; }
        .pf-attachment-chip:hover { background: #e2ebf4; }
        .pf-mail { display: flex; align-items: flex-start; gap: 6px; width: 100%; box-sizing: border-box; text-align: left; padding: 10px 8px 10px 12px; border: none; border-bottom: 1px solid #f0f0f0; background: #fff; cursor: pointer; }
        .pf-mail:hover { background: #f8fafc; }
        .pf-mail.selected { background: #eef4fa; border-left: 3px solid #1d426a; padding-left: 9px; }
        .pf-mail.unread .pf-mail-subject { font-weight: 700; }
        .pf-mail-main { flex: 1; min-width: 0; }
        .pf-mail-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; align-items: baseline; }
        .pf-mail-peer { color: #1d426a; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1; }
        .pf-mail-date { color: #888; font-size: 11px; flex-shrink: 0; white-space: nowrap; }
        .pf-mail-subject { margin-top: 4px; font-size: 14px; color: #222; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pf-mail-meta { margin-top: 4px; font-size: 11px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pf-mail-actions { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; width: 28px; opacity: 0.45; }
        .pf-mail:hover .pf-mail-actions, .pf-mail.selected .pf-mail-actions { opacity: 1; }
        .pf-mail-act { border: none; background: transparent; color: #3d4f5f; cursor: pointer; padding: 4px; border-radius: 6px; line-height: 0; display: inline-flex; align-items: center; justify-content: center; }
        .pf-mail-act:hover { background: #e5edf5; color: #1d426a; }
        .pf-detail { overflow-y: auto; max-height: 70vh; padding: 16px 20px; }
        .pf-detail-empty { color: #888; padding: 40px 20px; text-align: center; }
        .pf-detail-head h3 { margin: 0; color: #1d1d1d; font-weight: 600; font-size: 1.15rem; line-height: 1.35; }
        .pf-detail-title-row { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 12px; }
        .pf-reply-actions { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
        .pf-icon-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid #d8dee6; background: #fff; color: #3d4f5f; border-radius: 8px; cursor: pointer; font-size: 13px; }
        .pf-icon-btn:hover:not(:disabled) { background: #f3f6f9; }
        .pf-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pf-icon-btn svg { width: 18px; height: 18px; }
        .pf-detail-meta { font-size: 13px; color: #555; line-height: 1.7; margin-bottom: 4px; }
        .pf-meta-k { display: inline-block; min-width: 36px; color: #888; font-weight: 500; }
        .pf-detail-date { color: #888; font-size: 12px; margin-top: 6px; }
        .pf-detail-body { font-size: 14px; line-height: 1.55; color: #222; border-top: 1px solid #eee; padding-top: 16px; }
        .pf-detail-body img { max-width: 100%; }
        .pf-empty { padding: 24px; color: #888; text-align: center; }
        .pf-btn-primary { padding: 10px 14px; background: #1d426a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
        .pf-btn-ghost { padding: 10px 14px; background: #fff; color: #1d426a; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; font-size: 14px; }
        .pf-preview-overlay { position: fixed; inset: 0; z-index: 11000; background: rgba(15, 23, 42, 0.5); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .pf-preview-modal { background: #fff; border-radius: 14px; width: min(960px, 100%); height: min(86vh, 900px); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 18px 50px rgba(0,0,0,0.28); border: 1px solid #e5e7eb; }
        .pf-preview-top { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid #e5e7eb; }
        .pf-preview-top h3 { margin: 0; font-size: 1rem; color: #1d426a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pf-preview-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .pf-preview-body { flex: 1; background: #f8fafc; min-height: 0; }
        .pf-preview-frame { width: 100%; height: 100%; border: none; background: #fff; }
        @media (max-width: 960px) {
          .pf-layout { grid-template-columns: 1fr; }
          .pf-resizer { display: none; }
          .pf-sidebar { flex-direction: row; flex-wrap: wrap; border-right: none; border-bottom: 1px solid #e5e7eb; }
          .pf-list { max-height: 240px; border-right: none; border-bottom: 1px solid #e5e7eb; }
        }
      `}</style>
    </div>
  );
}

export default function PostfachPage({ navigate, role }) {
  const { mailboxKey: paramKey } = useParams();
  const mailboxKey = paramKey === 'kv' ? 'kv' : paramKey === 'info' ? 'info' : (role === 'admin' ? 'info' : 'kv');

  if (!canAccessMailbox(role, mailboxKey)) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ color: '#1d426a' }}>Postfach</h1>
        <p>Kein Zugriff auf dieses Postfach.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <PostfachPanel
        navigate={navigate}
        mailboxKey={mailboxKey}
        allowComposeFree={role === 'admin' || mailboxKey === 'kv'}
      />
    </div>
  );
}
