import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase, fetchAllPages } from './supabaseClient';
import './ModernDashboard.css';

const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const Icon = ({ name }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10.5V20h14v-9.5" />
        </svg>
      );
    case 'users':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M15 19c.4-2 1.8-3.2 3.8-3.2 1.2 0 2.2.4 2.9 1.1" />
        </svg>
      );
    case 'plus':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <rect x="4" y="3.5" width="16" height="17" rx="2" />
          <path d="M12 9v6M9 12h6" />
        </svg>
      );
    case 'list':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <path d="M8 7h12M8 12h12M8 17h12" />
          <circle cx="4.5" cy="7" r="1" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'invoice':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15l-2.2-1.4-2.3 1.4-2.2-1.4-2.3 1.4-2.2-1.4-2.3 1.4V5A1.5 1.5 0 0 1 7 3.5z" />
          <path d="M9 8h6M9 12h6M9 16h3.5" />
        </svg>
      );
    case 'settings':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3V20.5M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
        </svg>
      );
    case 'logout':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" />
          <path d="M14 8l4 4-4 4M18 12H10" />
        </svg>
      );
    default:
      return null;
  }
};

function useCountUp(target, duration = 1100, decimals = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;
    const to = Number(target) || 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value);
}

function formatEuro(n) {
  return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function BarChart({ series }) {
  const w = 640;
  const h = 240;
  const pad = { t: 16, r: 12, b: 36, l: 48 };
  const max = Math.max(...series.map((s) => s.value), 1);
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 8;
  const barW = Math.max(8, (innerW - gap * (series.length - 1)) / Math.max(series.length, 1));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Balkendiagramm Umsatz">
      {[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const y = pad.t + innerH * (1 - p);
        return (
          <g key={p}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#e6edf4" strokeWidth="1" />
            <text x={pad.l - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#8a97a6">
              {Math.round(max * p).toLocaleString('de-DE')}
            </text>
          </g>
        );
      })}
      {series.map((s, i) => {
        const bh = (s.value / max) * innerH;
        const x = pad.l + i * (barW + gap);
        const y = pad.t + innerH - bh;
        return (
          <g key={s.label}>
            <rect
              className="md-bar"
              x={x}
              y={y}
              width={barW}
              height={Math.max(bh, 2)}
              rx="5"
              fill={i % 2 === 0 ? '#1d426a' : '#f0a04b'}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <title>{`${s.label}: ${formatEuro(s.value)}`}</title>
            </rect>
            <text x={x + barW / 2} y={h - 12} textAnchor="middle" fontSize="10" fill="#6a7a8c">
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ series }) {
  const w = 640;
  const h = 240;
  const pad = { t: 16, r: 12, b: 36, l: 48 };
  const max = Math.max(...series.map((s) => s.value), 1);
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const points = series.map((s, i) => {
    const x = pad.l + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y = pad.t + innerH - (s.value / max) * innerH;
    return { x, y, ...s };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${points[points.length - 1]?.x || pad.l} ${pad.t + innerH} L ${pad.l} ${pad.t + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Liniendiagramm Umsatz">
      <defs>
        <linearGradient id="mdArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d426a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#1d426a" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((p) => {
        const y = pad.t + innerH * (1 - p);
        return <line key={p} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#e6edf4" />;
      })}
      {points.length > 0 && <path d={area} fill="url(#mdArea)" />}
      {points.length > 0 && (
        <path className="md-line-path" d={path} fill="none" stroke="#1d426a" strokeWidth="2.6" />
      )}
      {points.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r="4" fill="#f0a04b" stroke="#fff" strokeWidth="1.5">
          <title>{`${p.label}: ${formatEuro(p.value)}`}</title>
        </circle>
      ))}
      {points.map((p) => (
        <text key={`t-${p.label}`} x={p.x} y={h - 12} textAnchor="middle" fontSize="10" fill="#6a7a8c">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function DonutChart({ slices }) {
  const total = Math.max(slices.reduce((s, x) => s + x.value, 0), 1);
  const size = 168;
  const cx = size / 2;
  const r = 52;
  const stroke = 16;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const colors = ['#1d426a', '#f0a04b', '#3d7ab5', '#7eb0d6', '#c97b3a', '#5c6f82'];

  return (
    <div className="md-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="md-donut-svg">
        <g transform={`translate(${cx},${cx}) rotate(-90)`}>
          <circle r={r} fill="none" stroke="#eef2f6" strokeWidth={stroke} />
          {slices.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                className="md-donut-seg"
                r={r}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </g>
        <text x={cx} y={cx - 4} textAnchor="middle" fontSize="18" fontWeight="700" fill="#1d426a">
          {total}
        </text>
        <text x={cx} y={cx + 14} textAnchor="middle" fontSize="10" fill="#8a97a6">
          Aufträge
        </text>
      </svg>
      <div className="md-legend md-donut-legend">
        {slices.map((s, i) => (
          <span key={s.label}>
            <span className="md-legend-dot" style={{ background: colors[i % colors.length] }} />
            {s.label}: {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}

const ModernHome = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [period, setPeriod] = useState('year'); // month | year | all
  const [chartType, setChartType] = useState('bar'); // bar | line | donut
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [orderData, invoiceData] = await Promise.all([
          fetchAllPages(() =>
            supabase
              .from('repair_orders')
              .select('id, created_at, werkstattausgang, werkstatteingang, nettopreis, porto, freigabe, archived')
              .eq('archived', false)
              .order('created_at', { ascending: false })
          ),
          fetchAllPages(() =>
            supabase
              .from('invoices')
              .select('id, invoice_date, created_at, total_amount, subtotal, status')
              .order('invoice_date', { ascending: false })
          )
        ]);
        if (!cancelled) {
          setOrders(orderData || []);
          setInvoices(invoiceData || []);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
        if (!cancelled) alert('Dashboard-Daten konnten nicht geladen werden: ' + err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const availableYears = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      const d = parseDate(o.werkstattausgang || o.created_at);
      if (d) set.add(d.getFullYear());
    });
    invoices.forEach((inv) => {
      const d = parseDate(inv.invoice_date || inv.created_at);
      if (d) set.add(d.getFullYear());
    });
    const years = [...set].sort((a, b) => b - a);
    return years.length ? years : [new Date().getFullYear()];
  }, [orders, invoices]);

  useEffect(() => {
    if (!availableYears.includes(year)) setYear(availableYears[0]);
  }, [availableYears, year]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const orderAmount = (o) => (parseFloat(o.nettopreis) || 0) + (parseFloat(o.porto) || 0);
    const invAmount = (inv) => parseFloat(inv.total_amount) || parseFloat(inv.subtotal) || 0;

    const inScopeOrder = (d) => {
      if (!d) return false;
      if (period === 'all') return true;
      if (period === 'year') return d.getFullYear() === year;
      return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
    };

    const inScopeInvoice = inScopeOrder;

    let revenueOrders = 0;
    let revenueInvoices = 0;
    let orderCount = 0;
    let orderCountMonth = 0;
    let revenueMonth = 0;

    const byMonth = {};
    for (let m = 0; m < 12; m++) {
      byMonth[`${year}-${String(m + 1).padStart(2, '0')}`] = { label: MONTHS_DE[m], revenue: 0, orders: 0 };
    }

    const freigabeCounts = {};

    orders.forEach((o) => {
      const d = parseDate(o.werkstattausgang || o.created_at);
      if (!d) return;
      const amt = orderAmount(o);
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
        orderCountMonth += 1;
        revenueMonth += amt;
      }
      if (inScopeOrder(d)) {
        orderCount += 1;
        revenueOrders += amt;
        const key = o.freigabe || 'Keine Angabe';
        freigabeCounts[key] = (freigabeCounts[key] || 0) + 1;
      }
      if (d.getFullYear() === year) {
        const mk = monthKey(d);
        if (byMonth[mk]) {
          byMonth[mk].revenue += amt;
          byMonth[mk].orders += 1;
        }
      }
    });

    invoices.forEach((inv) => {
      const d = parseDate(inv.invoice_date || inv.created_at);
      if (!d) return;
      if (inScopeInvoice(d)) revenueInvoices += invAmount(inv);
    });

    const monthSeries = Object.values(byMonth).map((m) => ({
      label: m.label,
      value: Math.round(m.revenue * 100) / 100,
      orders: m.orders
    }));

    const freigabeSlices = Object.entries(freigabeCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      revenueOrders,
      revenueInvoices,
      orderCount,
      orderCountMonth,
      revenueMonth,
      monthSeries,
      freigabeSlices,
      ordersThisWeek: orders.filter((o) => {
        const d = parseDate(o.werkstattausgang || o.created_at);
        if (!d) return false;
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff < 7;
      }).length
    };
  }, [orders, invoices, period, year]);

  const revenueDisplay = useCountUp(stats.revenueOrders, 1200, 2);
  const invoiceDisplay = useCountUp(stats.revenueInvoices, 1200, 2);
  const ordersDisplay = useCountUp(stats.orderCount, 900, 0);
  const weekDisplay = useCountUp(stats.ordersThisWeek, 900, 0);

  const periodLabel =
    period === 'month' ? 'dieser Monat' : period === 'year' ? `Jahr ${year}` : 'gesamter Zeitraum';

  return (
    <>
      <div className="md-header">
        <div>
          <h1>Übersicht</h1>
          <p>Einnahmen & Reparaturaufträge — {periodLabel}</p>
        </div>
        <div className="md-toolbar">
          {['month', 'year', 'all'].map((p) => (
            <button
              key={p}
              type="button"
              className={`md-chip${period === p ? ' active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'month' ? 'Monat' : p === 'year' ? 'Jahr' : 'Alles'}
            </button>
          ))}
          {(period === 'year' || chartType !== 'donut') && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{
                borderRadius: 999,
                border: '1px solid #cfd8e3',
                padding: '0.4rem 0.75rem',
                background: '#fff',
                color: '#1d426a',
                fontSize: '0.82rem'
              }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
          {['bar', 'line', 'donut'].map((t) => (
            <button
              key={t}
              type="button"
              className={`md-chip${chartType === t ? ' active' : ''}`}
              onClick={() => setChartType(t)}
            >
              {t === 'bar' ? 'Balken' : t === 'line' ? 'Linie' : 'Kreis'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="md-loading">Lade Kennzahlen…</div>
      ) : (
        <>
          <div className="md-kpi-grid">
            <div className="md-kpi accent">
              <div className="md-kpi-glow" />
              <div className="md-kpi-label">Werkstatt-Umsatz ({periodLabel})</div>
              <div className="md-kpi-value">
                {Number(revenueDisplay).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div className="md-kpi-sub">Netto + Porto aus Aufträgen</div>
            </div>
            <div className="md-kpi">
              <div className="md-kpi-label">Rechnungsvolumen</div>
              <div className="md-kpi-value" style={{ color: '#1d426a' }}>
                {Number(invoiceDisplay).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div className="md-kpi-sub">Summe Rechnungen (inkl. Entwürfe)</div>
            </div>
            <div className="md-kpi">
              <div className="md-kpi-label">Reparaturaufträge</div>
              <div className="md-kpi-value" style={{ color: '#1d426a' }}>{ordersDisplay}</div>
              <div className="md-kpi-sub">im gewählten Zeitraum</div>
            </div>
            <div className="md-kpi">
              <div className="md-kpi-label">Diese Woche</div>
              <div className="md-kpi-value" style={{ color: '#c97b3a' }}>{weekDisplay}</div>
              <div className="md-kpi-sub">Aufträge der letzten 7 Tage</div>
            </div>
          </div>

          <div className="md-grid-2">
            <div className="md-card">
              <div className="md-card-head">
                <h2>
                  {chartType === 'donut'
                    ? 'Freigabe-Verteilung'
                    : `Umsatz nach Monat (${year})`}
                </h2>
              </div>
              <div className="md-chart-wrap">
                {chartType === 'bar' && <BarChart series={stats.monthSeries} />}
                {chartType === 'line' && <LineChart series={stats.monthSeries} />}
                {chartType === 'donut' && (
                  stats.freigabeSlices.length ? (
                    <DonutChart slices={stats.freigabeSlices} />
                  ) : (
                    <div className="md-empty">Keine Daten für den Zeitraum</div>
                  )
                )}
              </div>
            </div>

            <div className="md-card">
              <div className="md-card-head">
                <h2>Aufträge / Monat ({year})</h2>
              </div>
              <div className="md-chart-wrap" style={{ height: 260 }}>
                <BarChart
                  series={stats.monthSeries.map((m) => ({ label: m.label, value: m.orders }))}
                />
              </div>
              <div className="md-legend" style={{ justifyContent: 'space-between' }}>
                <span>Aktueller Monat: <strong>{stats.orderCountMonth}</strong> Aufträge</span>
                <span>Umsatz Monat: <strong>{formatEuro(stats.revenueMonth)}</strong></span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export function DashboardViewSwitcher({ view, onChange }) {
  const isModern = view === 'modern';
  return (
    <div className="dash-switcher" title="Zwischen klassischer und neuer Ansicht wechseln">
      <span className="dash-switcher-label">Ansicht</span>
      <button
        type="button"
        className={`dash-switch${isModern ? ' on' : ''}`}
        aria-label={isModern ? 'Zur klassischen Ansicht wechseln' : 'Zur neuen Ansicht wechseln'}
        onClick={() => onChange(isModern ? 'classic' : 'modern')}
      >
        <span className="dash-switch-knob" />
      </button>
      <span className="dash-switch-hint">{isModern ? 'Neu' : 'Klassisch'}</span>
    </div>
  );
}

/** Mitarbeiter-Home: Kacheln im neuen Design (ohne Umsatz-Dashboard, ohne Rechnungen) */
export function ModernStaffHome({ navigate }) {
  const tiles = [
    {
      id: 'akustiker',
      title: 'Akustiker',
      text: 'Kunden verwalten und bearbeiten',
      path: '/akustiker',
      icon: 'users'
    },
    {
      id: 'erstellen',
      title: 'Reparaturauftrag erstellen',
      text: 'Neuen Reparaturauftrag anlegen',
      path: '/reperaturauftrag',
      icon: 'plus'
    },
    {
      id: 'auftraege',
      title: 'Erstellte Reparaturaufträge',
      text: 'Alle Reparaturaufträge anzeigen',
      path: '/erstellte-reperaturauftrage',
      icon: 'list'
    },
    {
      id: 'einstellungen',
      title: 'Einstellungen',
      text: 'Länder, Steuern und Portokosten',
      path: '/einstellungen',
      icon: 'settings'
    }
  ];

  return (
    <>
      <div className="md-header">
        <div>
          <h1>Willkommen</h1>
          <p>Schnellzugriff auf deine wichtigsten Bereiche</p>
        </div>
      </div>
      <div className="md-staff-grid">
        {tiles.map((tile, idx) => (
          <button
            key={tile.id}
            type="button"
            className="md-staff-tile"
            style={{ animationDelay: `${0.05 + idx * 0.07}s` }}
            onClick={() => navigate(tile.path)}
          >
            <span className="md-staff-tile-icon">
              <Icon name={tile.icon} />
            </span>
            <span className="md-staff-tile-title">{tile.title}</span>
            <span className="md-staff-tile-text">{tile.text}</span>
            <span className="md-staff-tile-cta">Öffnen →</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function ModernShell({ onLogout, navigate, role = 'mitarbeiter', children }) {
  const location = useLocation();
  const path = location.pathname;
  const showInvoices = role === 'admin';

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home', path: '/', match: (p) => p === '/' },
    { id: 'akustiker', label: 'Akustiker', icon: 'users', path: '/akustiker', match: (p) => p.startsWith('/akustiker') },
    { id: 'erstellen', label: 'Auftrag erstellen', icon: 'plus', path: '/reperaturauftrag', match: (p) => p.startsWith('/reperaturauftrag') },
    { id: 'auftraege', label: 'Reparaturaufträge', icon: 'list', path: '/erstellte-reperaturauftrage', match: (p) => p.startsWith('/erstellte-reperaturauftrage') },
    ...(showInvoices
      ? [{ id: 'rechnungen', label: 'Rechnungen', icon: 'invoice', path: '/erstellte-rechnungen', match: (p) => p.startsWith('/erstellte-rechnungen') || p.startsWith('/rechnung-') }]
      : []),
    { id: 'einstellungen', label: 'Einstellungen', icon: 'settings', path: '/einstellungen', match: (p) => p.startsWith('/einstellungen') }
  ];

  const isHome = path === '/';

  return (
    <div className="md-root">
      <aside className="md-sidebar">
        <div className="md-brand">
          <img src="https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png" alt="Gretzinger" />
          <div className="md-brand-label">Hörgeräteservice</div>
          <div className="md-role-badge">{role === 'admin' ? 'Admin' : 'Mitarbeiter'}</div>
        </div>
        <nav className="md-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`md-nav-item${item.match(path) ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="md-sidebar-footer">
          <button type="button" className="md-nav-item" onClick={onLogout}>
            <Icon name="logout" />
            <span>Abmelden</span>
          </button>
        </div>
      </aside>
      <main className={`md-main${isHome ? '' : ' md-main-page'}`}>
        {isHome ? children : <div className="md-page-panel">{children}</div>}
      </main>
    </div>
  );
}

export default ModernHome;
