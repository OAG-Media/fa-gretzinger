import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import seedContacts from './data/importedContacts.json';
import { findMatches, matchQuality } from './contactMatch';

const tabStyle = (active) => ({
  padding: '10px 16px',
  border: 'none',
  borderBottom: active ? '3px solid #1d426a' : '3px solid transparent',
  background: 'transparent',
  color: active ? '#1d426a' : '#666',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  fontSize: 15
});

export default function KontaktlistePage({ customers = [], loadCustomers, navigate }) {
  const [tab, setTab] = useState('matches');
  const [imported, setImported] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  const loadImported = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('imported_contacts')
        .select('*')
        .order('display_name', { ascending: true });
      if (error) throw error;
      if (!data?.length) {
        setImported([]);
      } else {
        setImported(data);
      }
    } catch (e) {
      console.error(e);
      setImported([]);
      setMessage('Kontakte konnten nicht aus Supabase geladen werden: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImported();
  }, []);

  const syncFromExport = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const rows = seedContacts.map((c) => ({
        source: c.source || 'vcf',
        source_file: c.source_file,
        display_name: c.display_name,
        company: c.company || null,
        email: c.email || null,
        phone: c.phone || null,
        notes: c.notes || null,
        raw: {
          emails: c.emails || [],
          phones: c.phones || [],
          filename_hint: c.filename_hint || null
        }
      }));

      // upsert in chunks
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error } = await supabase
          .from('imported_contacts')
          .upsert(chunk, { onConflict: 'source_file', ignoreDuplicates: false });
        if (error) throw error;
      }
      await loadImported();
      setMessage(`${rows.length} Kontakte in separate Import-Tabelle geschrieben. Akustiker/Rechnungen unverändert.`);
    } catch (e) {
      console.error(e);
      setMessage('Sync fehlgeschlagen: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const activeCustomers = useMemo(
    () => (customers || []).filter((c) => !c.archived),
    [customers]
  );

  const matches = useMemo(
    () => findMatches(imported, activeCustomers, { minScore: 25 }),
    [imported, activeCustomers]
  );

  const filteredImported = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return imported;
    return imported.filter(
      (c) =>
        (c.display_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.source_file || '').toLowerCase().includes(q)
    );
  }, [imported, search]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeCustomers;
    return activeCustomers.filter(
      (c) =>
        (c.company || '').toLowerCase().includes(q) ||
        (c.branch || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.location || '').toLowerCase().includes(q)
    );
  }, [activeCustomers, search]);

  const mergeEmail = async (contact, customer) => {
    if (!contact?.email || !customer?.id) return;
    if (
      !window.confirm(
        `E-Mail „${contact.email}“ in Akustiker „${customer.company}${customer.branch ? ' / ' + customer.branch : ''}“ übernehmen?\n\n` +
          (customer.email ? `Bisherige E-Mail: ${customer.email}\n` : 'Bisher keine E-Mail hinterlegt.\n') +
          'Es wird nichts anderes überschrieben.'
      )
    ) {
      return;
    }
    setBusyId(contact.id || contact.source_file);
    try {
      const { error: custErr } = await supabase
        .from('customers')
        .update({ email: contact.email, updated_at: new Date().toISOString() })
        .eq('id', customer.id);
      if (custErr) throw custErr;

      if (contact.id) {
        const { error: impErr } = await supabase
          .from('imported_contacts')
          .update({
            merged_customer_id: customer.id,
            merged_at: new Date().toISOString()
          })
          .eq('id', contact.id);
        if (impErr) throw impErr;
      }

      if (loadCustomers) await loadCustomers();
      await loadImported();
      setMessage(`Merge ok: ${contact.email} → ${customer.company}`);
    } catch (e) {
      alert('Merge fehlgeschlagen: ' + e.message);
    } finally {
      setBusyId(null);
    }
  };

  const dismissMatch = async (contact) => {
    if (!contact?.id) return;
    setBusyId(contact.id);
    try {
      const { error } = await supabase
        .from('imported_contacts')
        .update({ dismissed: true })
        .eq('id', contact.id);
      if (error) throw error;
      await loadImported();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1d426a', fontWeight: 400 }}>Kontaktliste</h1>
          <p style={{ color: '#666', marginTop: 8, maxWidth: 640 }}>
            Abgleich der exportierten t-online-/Handy-Kontakte mit den Akustikern in Supabase.
            Merges nur manuell per grünem Haken — nichts wird automatisch geschrieben.
          </p>
          <div style={{ marginTop: 12, padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, fontSize: 13, color: '#0c4a6e', maxWidth: 720 }}>
            <strong>Was macht „Export → Supabase syncen“?</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.55 }}>
              <li>Kopiert die 165 VCF-Dateien aus <code>exportierte-kontakte</code> in die <strong>separate</strong> Tabelle <code>imported_contacts</code>.</li>
              <li><strong>Keine</strong> Akustiker, Rechnungen oder Umsätze werden verändert.</li>
              <li>Der grüne Merge-Haken schreibt <strong>nur</strong> die E-Mail in den gewählten Akustiker — erst nach deiner Bestätigung.</li>
            </ul>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate && navigate('/')}
            style={btnGhost}
          >
            ← Home
          </button>
          <button type="button" onClick={syncFromExport} disabled={syncing} style={btnPrimary}>
            {syncing ? 'Synchronisiere…' : 'Export → Supabase syncen'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#eef6ff', borderRadius: 8, color: '#1d426a' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginTop: 20 }}>
        <button type="button" style={tabStyle(tab === 'matches')} onClick={() => setTab('matches')}>
          Übereinstimmung gefunden ({matches.length})
        </button>
        <button type="button" style={tabStyle(tab === 'contacts')} onClick={() => setTab('contacts')}>
          Kontaktliste ({imported.length})
        </button>
        <button type="button" style={tabStyle(tab === 'akustiker')} onClick={() => setTab('akustiker')}>
          Akustiker ({activeCustomers.length})
        </button>
      </div>

      <div style={{ marginTop: 16, marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen…"
          style={{ width: '100%', maxWidth: 420, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
        />
      </div>

      {loading ? (
        <p>Lade…</p>
      ) : tab === 'matches' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {matches.length === 0 && (
            <p style={{ color: '#666' }}>
              Keine Übereinstimmungen. Zuerst „Export → Supabase syncen“, dann erneut prüfen.
            </p>
          )}
          {matches.map(({ contact, customer, score, reasons }) => {
            const q = matchQuality(score);
            const busy = busyId === (contact.id || contact.source_file);
            return (
              <div
                key={(contact.id || contact.source_file) + '-' + customer.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: 16,
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  background: '#fff'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#111' }}>{contact.display_name}</div>
                  <div style={{ color: '#1d426a', marginTop: 4 }}>{contact.email || '—'}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{contact.source_file}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontWeight: 700, color: q.color }}>{q.label}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>Score {score}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{reasons.slice(0, 2).join(' · ')}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{customer.company}</div>
                  <div style={{ color: '#666', fontSize: 14 }}>
                    {[customer.branch, customer.location].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4, color: customer.email ? '#15803d' : '#ea580c' }}>
                    {customer.email ? `Aktuell: ${customer.email}` : 'Noch keine E-Mail'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    title="E-Mail in Akustiker übernehmen"
                    disabled={busy || !contact.email}
                    onClick={() => mergeEmail(contact, customer)}
                    style={{
                      ...btnPrimary,
                      background: '#16a34a',
                      minWidth: 48,
                      padding: '10px 14px',
                      fontSize: 18
                    }}
                  >
                    {busy ? '…' : '✓'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !contact.id}
                    onClick={() => dismissMatch(contact)}
                    style={btnGhost}
                    title="Vorschlag ausblenden"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === 'contacts' ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
              <th style={th}>Name</th>
              <th style={th}>E-Mail</th>
              <th style={th}>Telefon</th>
              <th style={th}>Status</th>
              <th style={th}>Datei</th>
            </tr>
          </thead>
          <tbody>
            {filteredImported.map((c) => (
              <tr key={c.id || c.source_file} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={td}>{c.display_name}</td>
                <td style={td}>{c.email || '—'}</td>
                <td style={td}>{c.phone || '—'}</td>
                <td style={td}>
                  {c.merged_customer_id ? (
                    <span style={{ color: '#15803d' }}>gemerged</span>
                  ) : c.dismissed ? (
                    <span style={{ color: '#999' }}>ausgeblendet</span>
                  ) : (
                    <span style={{ color: '#ea580c' }}>offen</span>
                  )}
                </td>
                <td style={{ ...td, fontSize: 12, color: '#888' }}>{c.source_file}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
              <th style={th}>Firma</th>
              <th style={th}>Filiale</th>
              <th style={th}>Ort</th>
              <th style={th}>E-Mail</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={td}>{c.company}</td>
                <td style={td}>{c.branch || '—'}</td>
                <td style={td}>{c.location || '—'}</td>
                <td style={{ ...td, color: c.email ? '#15803d' : '#ea580c' }}>{c.email || 'fehlt'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = { padding: '10px 8px', color: '#666', fontWeight: 600 };
const td = { padding: '10px 8px', verticalAlign: 'top' };
const btnPrimary = {
  padding: '10px 14px',
  background: '#1d426a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 500
};
const btnGhost = {
  padding: '10px 14px',
  background: '#fff',
  color: '#1d426a',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  cursor: 'pointer'
};
