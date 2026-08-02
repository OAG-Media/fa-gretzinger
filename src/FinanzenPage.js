import React, { useEffect, useMemo, useState } from 'react';
import { supabase, fetchAllPages } from './supabaseClient';
import { useAdminDashboardPrefs } from './dashboardPrefs';
import {
  ChartBody,
  ViewModeSwitcher,
  formatEuro,
  parseDate,
  monthKey,
  monthKeysForYear,
  orderAmount,
  customerLabel
} from './ModernDashboard';
import './ModernDashboard.css';

const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function dateInRange(d, fromStr, toStr) {
  if (!d) return false;
  if (fromStr) {
    const from = parseDate(fromStr);
    if (from && d < new Date(from.getFullYear(), from.getMonth(), from.getDate())) return false;
  }
  if (toStr) {
    const to = parseDate(toStr);
    if (to && d > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59)) return false;
  }
  return true;
}

export default function FinanzenPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const { prefs, patchTile } = useAdminDashboardPrefs();
  const f = prefs.finanzen;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchAllPages(() =>
          supabase
            .from('repair_orders')
            .select('id, created_at, werkstattausgang, nettopreis, porto, archived, customer_id, customers(company, branch)')
            .eq('archived', false)
            .order('created_at', { ascending: false })
        );
        if (!cancelled) setOrders(data || []);
      } catch (err) {
        console.error(err);
        if (!cancelled) alert('Finanzen konnten nicht geladen werden: ' + err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const akustikerOptions = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      const name = (o.customers?.company || '').trim();
      if (name) set.add(name);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'de'));
  }, [orders]);

  const filialeOptions = useMemo(() => {
    if (!f.akustiker) return [];
    const set = new Set();
    orders.forEach((o) => {
      if ((o.customers?.company || '').trim() !== f.akustiker) return;
      const b = (o.customers?.branch || '').trim();
      if (b) set.add(b);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'de'));
  }, [orders, f.akustiker]);

  const availableYears = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      const d = parseDate(o.werkstattausgang || o.created_at);
      if (d) set.add(d.getFullYear());
    });
    const years = [...set].sort((a, b) => b - a);
    return years.length ? years : [new Date().getFullYear()];
  }, [orders]);

  const filtered = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      const d = parseDate(o.werkstattausgang || o.created_at);
      if (!d) return false;

      if (f.periodMode === 'month') {
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
      } else if (f.periodMode === 'year') {
        if (d.getFullYear() !== f.year) return false;
      } else if (f.periodMode === 'range') {
        if (!dateInRange(d, f.dateFrom, f.dateTo)) return false;
      }

      const company = (o.customers?.company || '').trim();
      const branch = (o.customers?.branch || '').trim();
      const label = customerLabel(o).toLowerCase();

      if (f.akustiker && company !== f.akustiker) return false;
      if (f.filiale && branch !== f.filiale) return false;
      if (f.search) {
        const q = f.search.toLowerCase().trim();
        if (!label.includes(q) && !company.toLowerCase().includes(q) && !branch.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [orders, f]);

  const series = useMemo(() => {
    if (f.groupBy === 'year') {
      const map = {};
      filtered.forEach((o) => {
        const d = parseDate(o.werkstattausgang || o.created_at);
        if (!d) return;
        const y = String(d.getFullYear());
        if (!map[y]) map[y] = { label: y, revenue: 0, orders: 0 };
        map[y].revenue += orderAmount(o);
        map[y].orders += 1;
      });
      return Object.keys(map)
        .sort()
        .map((k) => ({
          label: map[k].label,
          value: Math.round(map[k].revenue * 100) / 100,
          revenue: Math.round(map[k].revenue * 100) / 100,
          orders: map[k].orders
        }));
    }

    // by month — if year mode use truncated months; else collect keys from data
    if (f.periodMode === 'year') {
      const buckets = monthKeysForYear(f.year);
      const map = {};
      buckets.forEach((b) => { map[b.key] = { label: b.label, revenue: 0, orders: 0 }; });
      filtered.forEach((o) => {
        const d = parseDate(o.werkstattausgang || o.created_at);
        if (!d) return;
        const mk = monthKey(d);
        if (!map[mk]) return;
        map[mk].revenue += orderAmount(o);
        map[mk].orders += 1;
      });
      return buckets.map((b) => ({
        label: b.label,
        value: Math.round(map[b.key].revenue * 100) / 100,
        revenue: Math.round(map[b.key].revenue * 100) / 100,
        orders: map[b.key].orders
      }));
    }

    const map = {};
    filtered.forEach((o) => {
      const d = parseDate(o.werkstattausgang || o.created_at);
      if (!d) return;
      const mk = monthKey(d);
      if (!map[mk]) {
        map[mk] = {
          label: `${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`,
          revenue: 0,
          orders: 0,
          sort: mk
        };
      }
      map[mk].revenue += orderAmount(o);
      map[mk].orders += 1;
    });
    return Object.values(map)
      .sort((a, b) => a.sort.localeCompare(b.sort))
      .map((m) => ({
        label: m.label,
        value: Math.round(m.revenue * 100) / 100,
        revenue: Math.round(m.revenue * 100) / 100,
        orders: m.orders
      }));
  }, [filtered, f.groupBy, f.periodMode, f.year]);

  const byCustomer = useMemo(() => {
    const map = {};
    filtered.forEach((o) => {
      const label = customerLabel(o);
      if (!map[label]) map[label] = { label, revenue: 0, orders: 0 };
      map[label].revenue += orderAmount(o);
      map[label].orders += 1;
    });
    return Object.values(map)
      .map((r) => ({ ...r, revenue: Math.round(r.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const totals = useMemo(() => {
    const revenue = filtered.reduce((s, o) => s + orderAmount(o), 0);
    const count = filtered.length;
    return {
      revenue: Math.round(revenue * 100) / 100,
      orders: count,
      avg: count ? Math.round((revenue / count) * 100) / 100 : 0
    };
  }, [filtered]);

  const filtersSummary = useMemo(() => {
    const parts = [];
    if (f.periodMode === 'month') parts.push('Zeitraum: aktueller Monat');
    else if (f.periodMode === 'year') parts.push(`Zeitraum: Jahr ${f.year}`);
    else if (f.periodMode === 'all') parts.push('Zeitraum: alles');
    else parts.push(`Zeitraum: ${f.dateFrom || '…'} – ${f.dateTo || '…'}`);
    parts.push(`Gruppierung: ${f.groupBy === 'year' ? 'Jahre' : 'Monate'}`);
    if (f.akustiker) parts.push(`Akustiker: ${f.akustiker}`);
    if (f.filiale) parts.push(`Filiale: ${f.filiale}`);
    if (f.search) parts.push(`Suche: ${f.search}`);
    return parts.join(' · ');
  }, [f]);

  const handleExport = async () => {
    const { generateFinanceAnalysisPDF } = await import('./financePdfExport.js');
    generateFinanceAnalysisPDF({
      title: 'Werkstatt-Umsatz (Netto + Porto)',
      filtersSummary,
      series,
      rows: byCustomer.slice(0, 80),
      totals
    });
  };

  return (
    <div className="fn-page">
      <div className="md-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1>Finanzen</h1>
          <p>Tot-Analyse — filtern, visualisieren, als PDF für Steuerberater exportieren</p>
        </div>
        <button type="button" className="fn-export-btn" onClick={handleExport} disabled={loading}>
          PDF exportieren
        </button>
      </div>

      {loading ? (
        <div className="md-loading">Lade Finanzdaten…</div>
      ) : (
        <div className="fn-grid">
          <div className="fn-row-top">
            <aside className="fn-filters md-card">
              <h2>Filter</h2>

              <label className="fn-label">Suche</label>
              <input
                className="fn-input"
                value={f.search}
                placeholder="Kunde / Filiale…"
                onChange={(e) => patchTile('finanzen', { search: e.target.value })}
              />

              <label className="fn-label">Akustiker</label>
              <select
                className="fn-input"
                value={f.akustiker}
                onChange={(e) => patchTile('finanzen', { akustiker: e.target.value, filiale: '' })}
              >
                <option value="">Alle</option>
                {akustikerOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {f.akustiker && (
                <>
                  <label className="fn-label">Filiale</label>
                  <select
                    className="fn-input"
                    value={f.filiale}
                    onChange={(e) => patchTile('finanzen', { filiale: e.target.value })}
                  >
                    <option value="">Alle Filialen</option>
                    {filialeOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </>
              )}

              <label className="fn-label">Zeitraum</label>
              <div className="fn-chip-row">
                {[
                  ['month', 'Monat'],
                  ['year', 'Jahr'],
                  ['range', 'Von–Bis'],
                  ['all', 'Alles']
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`md-mini-chip${f.periodMode === id ? ' active' : ''}`}
                    onClick={() => patchTile('finanzen', { periodMode: id })}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {f.periodMode === 'year' && (
                <select
                  className="fn-input"
                  value={f.year}
                  onChange={(e) => patchTile('finanzen', { year: Number(e.target.value) })}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}

              {f.periodMode === 'range' && (
                <div className="fn-date-row">
                  <input
                    type="date"
                    className="fn-input"
                    value={f.dateFrom}
                    onChange={(e) => patchTile('finanzen', { dateFrom: e.target.value })}
                  />
                  <input
                    type="date"
                    className="fn-input"
                    value={f.dateTo}
                    onChange={(e) => patchTile('finanzen', { dateTo: e.target.value })}
                  />
                </div>
              )}

              <label className="fn-label">Darstellung</label>
              <div className="fn-chip-row">
                <button
                  type="button"
                  className={`md-mini-chip${f.groupBy === 'month' ? ' active' : ''}`}
                  onClick={() => patchTile('finanzen', { groupBy: 'month' })}
                >
                  Nach Monaten
                </button>
                <button
                  type="button"
                  className={`md-mini-chip${f.groupBy === 'year' ? ' active' : ''}`}
                  onClick={() => patchTile('finanzen', { groupBy: 'year' })}
                >
                  Nach Jahren
                </button>
              </div>

              <div className="fn-kpi-mini">
                <div><span>Umsatz</span><strong>{formatEuro(totals.revenue)}</strong></div>
                <div><span>Aufträge</span><strong>{totals.orders}</strong></div>
                <div><span>Ø / Auftrag</span><strong>{formatEuro(totals.avg)}</strong></div>
              </div>
            </aside>

            <section className="fn-viz md-card">
              <div className="md-card-head">
                <div>
                  <h2>Ergebnis</h2>
                  <div className="md-card-sub">{filtersSummary}</div>
                </div>
                <ViewModeSwitcher
                  value={f.chartType}
                  options={['bar', 'line', 'donut']}
                  onChange={(chartType) => patchTile('finanzen', { chartType })}
                />
              </div>
              <div className="md-chart-wrap" style={{ height: 340 }}>
                <ChartBody type={f.chartType} series={series} euro centerLabel="Umsatz" />
              </div>
            </section>
          </div>

          <div className="fn-row-bottom md-card">
            <div className="md-card-head">
              <h2>Kunden-Ranking (gefiltert)</h2>
              <span className="md-card-sub">{byCustomer.length} Einträge</span>
            </div>
            <div className="fn-table-wrap">
              <table className="fn-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Kunde / Filiale</th>
                    <th>Aufträge</th>
                    <th>Umsatz</th>
                  </tr>
                </thead>
                <tbody>
                  {byCustomer.slice(0, 50).map((r, i) => (
                    <tr key={r.label}>
                      <td>{i + 1}</td>
                      <td>{r.label}</td>
                      <td>{r.orders}</td>
                      <td>{formatEuro(r.revenue)}</td>
                    </tr>
                  ))}
                  {!byCustomer.length && (
                    <tr>
                      <td colSpan={4} className="md-empty">Keine Treffer für die Filter</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
