import React, { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { buildKvPdfAttachment } from './kvEmailUtils';
import { buildInvoicePdfAttachment } from './invoiceEmailUtils';

const MAX_FILE_BYTES = 12 * 1024 * 1024;

export function isPdfAttachment(att) {
  if (!att) return false;
  const name = String(att.filename || '').toLowerCase();
  const type = String(att.contentType || att.content_type || '').toLowerCase();
  return type.includes('pdf') || name.endsWith('.pdf');
}

function PaperclipIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.44 11.05-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a1.5 1.5 0 1 1-2.12-2.12l7.78-7.78" />
    </svg>
  );
}

function LoupeIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('de-DE');
  } catch {
    return String(value);
  }
}

function customerOf(row) {
  const c = row?.customers;
  if (!c) return null;
  return Array.isArray(c) ? c[0] || null : c;
}

function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error(`Datei zu groß (max. ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB): ${file.name}`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const content = raw.includes(',') ? raw.split(',')[1] : raw;
      const nameLower = String(file.name || '').toLowerCase();
      const isPdf = (file.type || '').toLowerCase().includes('pdf') || nameLower.endsWith('.pdf');
      resolve({
        key: `file-${file.name}-${file.size}-${Date.now()}`,
        filename: file.name,
        content,
        contentType: isPdf ? 'application/pdf' : (file.type || 'application/octet-stream'),
        source: 'file'
      });
    };
    reader.onerror = () => reject(new Error(`Datei konnte nicht gelesen werden: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Anhang-Leiste: große Klammer → KV / Rechnung / PC.
 * attachments: [{ key, filename, content, contentType, source, sourceId?, locked? }]
 */
export default function EmailAttachBar({
  attachments = [],
  onChange,
  lockedAttachments = [],
  excludeKvIds = [],
  excludeInvoiceIds = [],
  busyLabel = '',
  onPreview,
  activePreviewKey = ''
}) {
  const fileRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [picker, setPicker] = useState(null); // 'kv' | 'invoice' | null
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const allShown = [...lockedAttachments, ...attachments];

  useEffect(() => {
    if (!picker) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoadingList(true);
      setError('');
      try {
        const q = query.trim();
        if (picker === 'kv') {
          const { data, error: err } = await supabase
            .from('repair_orders')
            .select('id, kommission, werkstattausgang, created_at, customers(company, branch)')
            .eq('archived', false)
            .order('created_at', { ascending: false })
            .limit(150);
          if (err) throw err;
          let list = data || [];
          if (q) {
            const lower = q.toLowerCase();
            list = list.filter((r) => {
              const c = customerOf(r);
              return (
                String(r.kommission || '').toLowerCase().includes(lower)
                || String(c?.company || '').toLowerCase().includes(lower)
                || String(c?.branch || '').toLowerCase().includes(lower)
              );
            });
          }
          if (!cancelled) setRows(list.slice(0, 80));
        } else {
          const { data, error: err } = await supabase
            .from('invoices')
            .select('id, invoice_number, invoice_date, period_end, customers(company, branch)')
            .order('created_at', { ascending: false })
            .limit(150);
          if (err) throw err;
          let list = data || [];
          if (q) {
            const lower = q.toLowerCase();
            list = list.filter((r) => {
              const c = customerOf(r);
              return (
                String(r.invoice_number || '').toLowerCase().includes(lower)
                || String(c?.company || '').toLowerCase().includes(lower)
              );
            });
          }
          if (!cancelled) setRows(list.slice(0, 80));
        }
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setError(e.message || 'Liste konnte nicht geladen werden');
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };
    const t = setTimeout(load, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [picker, query]);

  const pushAttachment = (att) => {
    if (!att) return;
    const exists = attachments.some(
      (a) => a.key === att.key
        || (att.sourceId && a.source === att.source && a.sourceId === att.sourceId)
        || (a.filename === att.filename && a.source === att.source)
    );
    if (exists) {
      setError('Anhang ist bereits hinzugefügt.');
      return;
    }
    onChange?.([...attachments, att]);
  };

  const removeAttachment = (key) => {
    onChange?.(attachments.filter((a) => a.key !== key));
  };

  const pickKv = async (row) => {
    if (excludeKvIds.includes(row.id)) {
      setError('Dieser KV ist bereits als Hauptanhang dabei.');
      return;
    }
    setBusy('KV-PDF wird erzeugt…');
    setError('');
    try {
      const { base64, filename } = await buildKvPdfAttachment({ id: row.id });
      pushAttachment({
        key: `kv-${row.id}`,
        filename: filename || `KV_${row.kommission || row.id}.pdf`,
        content: base64,
        contentType: 'application/pdf',
        source: 'kv',
        sourceId: row.id
      });
      setPicker(null);
      setMenuOpen(false);
    } catch (e) {
      setError(e.message || 'KV-PDF fehlgeschlagen');
    } finally {
      setBusy('');
    }
  };

  const pickInvoice = async (row) => {
    if (excludeInvoiceIds.includes(row.id)) {
      setError('Diese Rechnung ist bereits als Hauptanhang dabei.');
      return;
    }
    setBusy('Rechnungs-PDF wird erzeugt…');
    setError('');
    try {
      const { data: full, error: err } = await supabase.from('invoices').select('*').eq('id', row.id).single();
      if (err) throw err;
      const { base64, filename } = await buildInvoicePdfAttachment(full);
      pushAttachment({
        key: `invoice-${row.id}`,
        filename: filename || `Rechnung_${row.invoice_number || row.id}.pdf`,
        content: base64,
        contentType: 'application/pdf',
        source: 'invoice',
        sourceId: row.id
      });
      setPicker(null);
      setMenuOpen(false);
    } catch (e) {
      setError(e.message || 'Rechnungs-PDF fehlgeschlagen');
    } finally {
      setBusy('');
    }
  };

  const onPcFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy('Datei wird gelesen…');
    setError('');
    try {
      const next = [...attachments];
      for (const file of files) {
        const att = await fileToAttachment(file);
        if (!next.some((a) => a.filename === att.filename && a.source === 'file')) {
          next.push(att);
        }
      }
      onChange?.(next);
      setMenuOpen(false);
    } catch (err) {
      setError(err.message || 'Datei fehlgeschlagen');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="eab-root">
      <div className="eab-row">
        <div className="eab-add-wrap">
          <button
            type="button"
            className="eab-clip"
            title="Anhang hinzufügen"
            aria-label="Anhang hinzufügen"
            onClick={() => {
              setMenuOpen((v) => !v);
              setPicker(null);
              setError('');
            }}
          >
            <PaperclipIcon size={26} />
            <span>Anhang</span>
          </button>
          {menuOpen && !picker && (
            <div className="eab-menu" role="menu">
              <button type="button" className="eab-menu-item" onClick={() => { setPicker('kv'); setQuery(''); setRows([]); }}>
                KV (Kostenvoranschlag)
              </button>
              <button type="button" className="eab-menu-item" onClick={() => { setPicker('invoice'); setQuery(''); setRows([]); }}>
                Rechnung
              </button>
              <button
                type="button"
                className="eab-menu-item"
                onClick={() => fileRef.current?.click()}
              >
                Vom PC…
              </button>
            </div>
          )}
        </div>

        <div className="eab-chips">
          {allShown.map((att) => {
            const pdf = isPdfAttachment(att);
            const active = activePreviewKey && att.key === activePreviewKey;
            return (
              <span
                key={att.key || att.filename}
                className={`eab-chip${att.locked ? ' locked' : ''}${active ? ' active' : ''}`}
                title={att.filename}
              >
                <PaperclipIcon size={14} />
                <span className="eab-chip-name">{att.filename}</span>
                {pdf && onPreview && (
                  <button
                    type="button"
                    className="eab-chip-loupe"
                    title="PDF-Vorschau"
                    aria-label={`Vorschau ${att.filename}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(att);
                    }}
                  >
                    <LoupeIcon />
                  </button>
                )}
                {!att.locked && (
                  <button type="button" className="eab-chip-x" onClick={() => removeAttachment(att.key)} aria-label="Entfernen">×</button>
                )}
              </span>
            );
          })}
          {!allShown.length && !busy && !busyLabel && (
            <span className="eab-hint">KV, Rechnung oder Datei vom PC</span>
          )}
          {(busy || busyLabel) && <span className="eab-busy">{busy || busyLabel}</span>}
        </div>
      </div>

      {error && <div className="eab-error">{error}</div>}

      {picker && (
        <div className="eab-picker">
          <div className="eab-picker-head">
            <strong>{picker === 'kv' ? 'KV auswählen' : 'Rechnung auswählen'}</strong>
            <button type="button" className="eab-picker-close" onClick={() => setPicker(null)}>Schließen</button>
          </div>
          <input
            className="eab-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={picker === 'kv' ? 'Suche Kommission / Akustiker…' : 'Suche Rechnungsnr. / Akustiker…'}
            autoFocus
          />
          <div className="eab-list">
            {loadingList && <div className="eab-empty">Lädt…</div>}
            {!loadingList && rows.length === 0 && <div className="eab-empty">Keine Treffer</div>}
            {!loadingList && rows.map((row) => {
              if (picker === 'kv') {
                const blocked = excludeKvIds.includes(row.id) || attachments.some((a) => a.source === 'kv' && a.sourceId === row.id);
                const c = customerOf(row);
                const label = [
                  row.kommission ? `Komm ${row.kommission}` : 'ohne Kommission',
                  c?.company,
                  c?.branch,
                  formatDate(row.werkstattausgang || row.created_at)
                ].filter(Boolean).join(' · ');
                return (
                  <button
                    key={row.id}
                    type="button"
                    className="eab-list-item"
                    disabled={blocked || !!busy}
                    onClick={() => pickKv(row)}
                  >
                    {label}{blocked ? ' (bereits angehängt)' : ''}
                  </button>
                );
              }
              const blocked = excludeInvoiceIds.includes(row.id) || attachments.some((a) => a.source === 'invoice' && a.sourceId === row.id);
              const c = customerOf(row);
              const label = [
                row.invoice_number || 'Rechnung',
                c?.company,
                formatDate(row.invoice_date || row.period_end)
              ].filter(Boolean).join(' · ');
              return (
                <button
                  key={row.id}
                  type="button"
                  className="eab-list-item"
                  disabled={blocked || !!busy}
                  onClick={() => pickInvoice(row)}
                >
                  {label}{blocked ? ' (bereits angehängt)' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={onPcFiles}
      />

      <style>{`
        .eab-root { margin: 10px 0 12px; }
        .eab-row { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
        .eab-add-wrap { position: relative; flex-shrink: 0; }
        .eab-clip {
          display: inline-flex; align-items: center; gap: 8px;
          min-height: 44px; padding: 8px 14px;
          border: 1px solid #d1d5db; border-radius: 10px;
          background: #fff; color: #1d426a; cursor: pointer;
          font-size: 14px; font-weight: 600;
        }
        .eab-clip:hover { background: #eef4fa; }
        .eab-menu {
          position: absolute; left: 0; top: calc(100% + 4px); z-index: 30;
          min-width: 220px; background: #fff; border: 1px solid #e5e7eb;
          border-radius: 10px; box-shadow: 0 10px 28px rgba(0,0,0,0.14); padding: 6px;
        }
        .eab-menu-item {
          display: block; width: 100%; text-align: left; border: none; background: transparent;
          padding: 10px 12px; border-radius: 7px; font-size: 13px; color: #333; cursor: pointer;
        }
        .eab-menu-item:hover { background: #eef4fa; color: #1d426a; }
        .eab-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; flex: 1; min-height: 44px; }
        .eab-chip {
          display: inline-flex; align-items: center; gap: 6px;
          max-width: 280px; padding: 7px 10px;
          background: #eef4fa; border: 1px solid #c5d4e6; border-radius: 999px;
          color: #1d426a; font-size: 13px;
        }
        .eab-chip.locked { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
        .eab-chip.active { box-shadow: 0 0 0 2px #1d426a; }
        .eab-chip-loupe {
          display: inline-flex; align-items: center; justify-content: center;
          border: none; background: transparent; color: #1d426a; cursor: pointer;
          padding: 0 2px; border-radius: 4px;
        }
        .eab-chip-loupe:hover { background: rgba(29,66,106,0.12); }
        .eab-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .eab-chip-x {
          border: none; background: transparent; color: #64748b; cursor: pointer;
          font-size: 16px; line-height: 1; padding: 0 2px;
        }
        .eab-chip-x:hover { color: #b91c1c; }
        .eab-hint { color: #9ca3af; font-size: 13px; }
        .eab-busy { color: #1d426a; font-size: 13px; }
        .eab-error { margin-top: 6px; color: #b91c1c; font-size: 13px; }
        .eab-picker {
          margin-top: 10px; border: 1px solid #e5e7eb; border-radius: 10px;
          background: #fafbfc; padding: 10px; max-height: 280px; display: flex; flex-direction: column; gap: 8px;
        }
        .eab-picker-head { display: flex; justify-content: space-between; align-items: center; color: #1d426a; font-size: 14px; }
        .eab-picker-close { border: none; background: transparent; color: #1d426a; cursor: pointer; font-size: 13px; }
        .eab-search {
          width: 100%; padding: 9px 11px; border: 1px solid #d1d5db; border-radius: 8px;
          font-size: 14px; box-sizing: border-box;
        }
        .eab-list { overflow: auto; max-height: 190px; display: flex; flex-direction: column; gap: 2px; }
        .eab-list-item {
          text-align: left; border: none; background: #fff; padding: 9px 10px; border-radius: 7px;
          font-size: 13px; color: #333; cursor: pointer; border: 1px solid transparent;
        }
        .eab-list-item:hover:not(:disabled) { background: #eef4fa; border-color: #dbe7f3; }
        .eab-list-item:disabled { opacity: 0.55; cursor: not-allowed; }
        .eab-empty { padding: 12px; color: #888; font-size: 13px; text-align: center; }
      `}</style>
    </div>
  );
}
