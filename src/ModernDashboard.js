import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase, fetchAllPages } from './supabaseClient';
import { useAdminDashboardPrefs } from './dashboardPrefs';
import { mailboxesForRole, detectMailboxKey } from './emailConfig';
import './ModernDashboard.css';

const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTHS_DE_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const Icon = ({ name }) => {
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
    case 'finance':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 15v-4M12 15V8M16 15v-6" />
        </svg>
      );
    case 'settings':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3V20.5M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
        </svg>
      );
    case 'mail':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 7 9-7" />
        </svg>
      );
    case 'inbox':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <path d="M4 4h16v12H4z" />
          <path d="M4 4l8 6 8-6" />
          <path d="M4 16h16" />
        </svg>
      );
    case 'contacts':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <circle cx="12" cy="9" r="2.5" />
          <path d="M8 16.5c.8-1.8 2.2-2.7 4-2.7s3.2.9 4 2.7" />
        </svg>
      );
    case 'logout':
      return (
        <svg className="md-nav-icon" viewBox="0 0 24 24" {...common}>
          <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" />
          <path d="M14 8l4 4-4 4M18 12H10" />
        </svg>
      );
    case 'chart-bar':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M5 19V10M12 19V5M19 19v-7" />
        </svg>
      );
    case 'chart-line':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 16l5-5 4 3 7-8" />
          <path d="M4 19h16" />
        </svg>
      );
    case 'chart-donut':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4.5V8" />
        </svg>
      );
    case 'chart-list':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M8 7h11M8 12h11M8 17h11" />
          <path d="M4 7h.01M4 12h.01M4 17h.01" />
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

export function formatEuro(n) {
  return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Months Jan..Dec for a year, truncated to current month when year === this year */
export function monthKeysForYear(year) {
  const now = new Date();
  let lastIdx = 11;
  if (year === now.getFullYear()) lastIdx = now.getMonth();
  else if (year > now.getFullYear()) lastIdx = -1;
  const keys = [];
  for (let m = 0; m <= lastIdx; m++) {
    keys.push({
      key: `${year}-${String(m + 1).padStart(2, '0')}`,
      label: MONTHS_DE[m],
      monthIndex: m
    });
  }
  return keys;
}

export function orderAmount(o) {
  return (parseFloat(o.nettopreis) || 0) + (parseFloat(o.porto) || 0);
}

export function customerLabel(o) {
  const c = o.customers;
  if (!c) return 'Unbekannt';
  const company = (c.company || '').trim() || 'Ohne Name';
  const branch = (c.branch || '').trim();
  return branch ? `${company} · ${branch}` : company;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function inPeriod(d, period, year, dateFrom = '', dateTo = '', monthKeyStr = '') {
  if (!d) return false;
  const now = new Date();
  if (period === 'all') return true;
  if (period === 'month') {
    if (monthKeyStr && /^\d{4}-\d{2}$/.test(monthKeyStr)) {
      const [y, m] = monthKeyStr.split('-').map(Number);
      return d.getFullYear() === y && d.getMonth() === m - 1;
    }
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === 'untilToday') return d <= endOfDay(now);
  if (period === 'range') {
    if (dateFrom) {
      const from = parseDate(dateFrom);
      if (from && d < startOfDay(from)) return false;
    }
    if (dateTo) {
      const to = parseDate(dateTo);
      if (to && d > endOfDay(to)) return false;
    }
    return true;
  }
  return d.getFullYear() === year;
}

export function monthLabelDe(monthKeyStr, full = false) {
  if (!monthKeyStr || !/^\d{4}-\d{2}$/.test(monthKeyStr)) return '';
  const [y, m] = monthKeyStr.split('-').map(Number);
  const name = (full ? MONTHS_DE_FULL : MONTHS_DE)[m - 1];
  return `${name} ${y}`;
}

export function monthNameDe(monthKeyStr) {
  if (!monthKeyStr || !/^\d{4}-\d{2}$/.test(monthKeyStr)) return '';
  const m = Number(monthKeyStr.split('-')[1]);
  return MONTHS_DE_FULL[m - 1] || '';
}

export function listAvailableMonths(dateList) {
  const set = new Set();
  dateList.forEach((value) => {
    const d = parseDate(value);
    if (!d) return;
    set.add(monthKey(d));
  });
  return [...set].sort((a, b) => b.localeCompare(a));
}

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function donutSlicePath(cx, cy, rInner, rOuter, a0, a1) {
  const p0 = polar(cx, cy, rOuter, a0);
  const p1 = polar(cx, cy, rOuter, a1);
  const p2 = polar(cx, cy, rInner, a1);
  const p3 = polar(cx, cy, rInner, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
}

export function BarChart({ series, valueFormatter = formatEuro }) {
  const w = 640;
  const h = 240;
  const pad = { t: 16, r: 12, b: 36, l: 48 };
  const max = Math.max(...series.map((s) => s.value), 1);
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 8;
  const barW = Math.max(8, (innerW - gap * (series.length - 1)) / Math.max(series.length, 1));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Balkendiagramm">
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
          <g key={`${s.label}-${i}`}>
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
              <title>{`${s.label}: ${valueFormatter(s.value)}`}</title>
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

export function LineChart({ series, valueFormatter = formatEuro }) {
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
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Liniendiagramm">
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
      {points.map((p, i) => (
        <circle key={`${p.label}-${i}`} cx={p.x} cy={p.y} r="4" fill="#f0a04b" stroke="#fff" strokeWidth="1.5">
          <title>{`${p.label}: ${valueFormatter(p.value)}`}</title>
        </circle>
      ))}
      {points.map((p, i) => (
        <text key={`t-${p.label}-${i}`} x={p.x} y={h - 12} textAnchor="middle" fontSize="10" fill="#6a7a8c">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

export function DonutChart({ slices, centerLabel = 'Summe', valueFormatter = (v) => String(v) }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [tip, setTip] = useState(null);
  const chartRef = React.useRef(null);
  const total = Math.max(slices.reduce((s, x) => s + x.value, 0), 0.0001);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 90;
  const rInner = 54;
  const colors = ['#1d426a', '#f0a04b', '#3d7ab5', '#7eb0d6', '#c97b3a', '#5c6f82', '#8ab4a5', '#d4a5a5'];

  let angle = 0;
  const arcs = slices.map((s, i) => {
    const sweep = (s.value / total) * 360;
    const a0 = angle;
    const a1 = angle + Math.max(sweep, 0.01);
    angle = a1;
    return { ...s, i, a0, a1, color: colors[i % colors.length] };
  });

  const active = hoverIdx != null ? arcs[hoverIdx] : null;
  const centerValue = active ? valueFormatter(active.value) : valueFormatter(total);
  const centerSub = active ? active.label : centerLabel;

  const updateTip = (e, s) => {
    const box = chartRef.current?.getBoundingClientRect();
    if (!box) return;
    setHoverIdx(s.i);
    setTip({
      x: e.clientX - box.left + 14,
      y: e.clientY - box.top + 10,
      label: s.label,
      value: valueFormatter(s.value)
    });
  };

  return (
    <div className="md-donut-wrap md-donut-side">
      <div
        className="md-donut-chart"
        ref={chartRef}
        onMouseLeave={() => { setHoverIdx(null); setTip(null); }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="md-donut-svg">
          <circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} fill="none" stroke="#eef2f6" strokeWidth={rOuter - rInner} />
          {arcs.map((s) => (
            <path
              key={`${s.label}-${s.i}`}
              className={`md-donut-seg${hoverIdx === s.i ? ' is-hot' : ''}${hoverIdx != null && hoverIdx !== s.i ? ' is-dim' : ''}`}
              d={donutSlicePath(cx, cy, rInner, rOuter, s.a0, s.a1)}
              fill={s.color}
              onMouseEnter={(e) => updateTip(e, s)}
              onMouseMove={(e) => updateTip(e, s)}
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="15" fontWeight="700" fill="#1d426a">
            {String(centerValue).replace(' €', '')}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#8a97a6">
            {centerSub.length > 18 ? `${centerSub.slice(0, 16)}…` : centerSub}
          </text>
        </svg>
        {tip && (
          <div className="md-donut-tip" style={{ left: tip.x, top: tip.y }}>
            <strong>{tip.label}</strong>
            <span>{tip.value}</span>
          </div>
        )}
      </div>
      <div className="md-donut-legend-side">
        {arcs.map((s) => (
          <button
            type="button"
            key={`${s.label}-${s.i}`}
            className={`md-donut-legend-item${hoverIdx === s.i ? ' is-hot' : ''}`}
            onMouseEnter={() => { setHoverIdx(s.i); setTip(null); }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <span className="md-legend-dot" style={{ background: s.color }} />
            <span className="md-donut-legend-label">{s.label}</span>
            <span className="md-donut-legend-val">{valueFormatter(s.value)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function RankingList({ items, valueFormatter = formatEuro, emptyText = 'Keine Daten' }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (!items.length) return <div className="md-empty">{emptyText}</div>;
  return (
    <div className="md-rank-list">
      {items.map((item, idx) => (
        <div key={`${item.label}-${idx}`} className="md-rank-row" style={{ animationDelay: `${idx * 0.04}s` }}>
          <div className="md-rank-meta">
            <span className="md-rank-pos">{idx + 1}</span>
            <span className="md-rank-name" title={item.label}>{item.label}</span>
            <span className="md-rank-value">{valueFormatter(item.value)}</span>
          </div>
          <div className="md-rank-track">
            <div className="md-rank-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const CHART_ICONS = {
  bar: 'chart-bar',
  line: 'chart-line',
  donut: 'chart-donut',
  list: 'chart-list'
};

/** Minimalist single-button cycle switcher for chart/list modes */
export function ViewModeSwitcher({ value, options, onChange, title = 'Ansicht wechseln' }) {
  const idx = Math.max(0, options.indexOf(value));
  const next = () => onChange(options[(idx + 1) % options.length]);
  const icon = CHART_ICONS[value] || 'chart-bar';
  return (
    <button type="button" className="md-view-cycle" onClick={next} title={title} aria-label={title}>
      <Icon name={icon} />
    </button>
  );
}

export function PeriodSelect({
  period,
  year,
  years,
  dateFrom = '',
  dateTo = '',
  month = '',
  months = [],
  onPeriod,
  onYear,
  onDateFrom,
  onDateTo,
  onMonth,
  showRange = true
}) {
  const today = new Date().toISOString().slice(0, 10);
  const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  return (
    <div className="md-tile-tools">
      {(showRange
        ? [['month', 'Monat'], ['year', 'Jahr'], ['range', 'Von–Bis'], ['untilToday', 'Bis heute'], ['all', 'Alles']]
        : [['month', 'Monat'], ['year', 'Jahr'], ['all', 'Alles']]
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={`md-mini-chip${period === id ? ' active' : ''}`}
          onClick={() => onPeriod(id)}
        >
          {label}
        </button>
      ))}
      {period === 'year' && (
        <select
          className="md-mini-select"
          value={year}
          onChange={(e) => onYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      )}
      {period === 'month' && onMonth && (
        <select
          className="md-mini-select"
          value={month || nowKey}
          onChange={(e) => onMonth(e.target.value)}
        >
          {(months.length ? months : [nowKey]).map((mk) => (
            <option key={mk} value={mk}>
              {monthLabelDe(mk, true)}{mk === nowKey ? ' (aktuell)' : ''}
            </option>
          ))}
        </select>
      )}
      {period === 'range' && onDateFrom && onDateTo && (
        <div className="md-range-inputs">
          <input
            type="date"
            className="md-mini-date"
            value={dateFrom || ''}
            onChange={(e) => onDateFrom(e.target.value)}
          />
          <input
            type="date"
            className="md-mini-date"
            value={dateTo || ''}
            onChange={(e) => onDateTo(e.target.value)}
          />
          <button
            type="button"
            className="md-mini-chip"
            title="Enddatum auf heute setzen"
            onClick={() => onDateTo(today)}
          >
            Bis heute
          </button>
        </div>
      )}
    </div>
  );
}

export function ChartBody({ type, series, ranking, euro = true, centerLabel }) {
  const fmt = euro ? formatEuro : (v) => String(Math.round(v));
  if (type === 'list') {
    return <RankingList items={ranking || series} valueFormatter={fmt} />;
  }
  if (!series?.length) return <div className="md-empty">Keine Daten für den Zeitraum</div>;
  if (type === 'line') return <LineChart series={series} valueFormatter={fmt} />;
  if (type === 'donut') {
    return <DonutChart slices={series} valueFormatter={fmt} centerLabel={centerLabel || (euro ? 'Umsatz' : 'Aufträge')} />;
  }
  return <BarChart series={series} valueFormatter={fmt} />;
}

const ModernHome = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const { prefs, setPrefs, patchTile } = useAdminDashboardPrefs();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [orderData, invoiceData] = await Promise.all([
          fetchAllPages(() =>
            supabase
              .from('repair_orders')
              .select('id, created_at, werkstattausgang, werkstatteingang, nettopreis, porto, freigabe, archived, customer_id, customers(company, branch)')
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
    if (!availableYears.includes(prefs.kpiYear)) {
      setPrefs((p) => ({ ...p, kpiYear: availableYears[0] }));
    }
  }, [availableYears, prefs.kpiYear, setPrefs]);

  const buildMonthly = (year, metric) => {
    const buckets = monthKeysForYear(year);
    const map = {};
    buckets.forEach((b) => { map[b.key] = { label: b.label, value: 0 }; });
    orders.forEach((o) => {
      const d = parseDate(o.werkstattausgang || o.created_at);
      if (!d || d.getFullYear() !== year) return;
      const mk = monthKey(d);
      if (!map[mk]) return;
      if (metric === 'revenue') map[mk].value += orderAmount(o);
      else map[mk].value += 1;
    });
    return buckets.map((b) => ({
      label: b.label,
      value: metric === 'revenue' ? Math.round(map[b.key].value * 100) / 100 : map[b.key].value
    }));
  };

  const buildCustomerRanking = (period, year, metric, dateFrom = '', dateTo = '', month = '') => {
    const map = {};
    orders.forEach((o) => {
      const d = parseDate(o.werkstattausgang || o.created_at);
      if (!inPeriod(d, period, year, dateFrom, dateTo, month)) return;
      const label = customerLabel(o);
      if (!map[label]) map[label] = 0;
      map[label] += metric === 'revenue' ? orderAmount(o) : 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({
        label,
        value: metric === 'revenue' ? Math.round(value * 100) / 100 : value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  };

  const buildRangeMonthly = (period, year, dateFrom, dateTo, metric, month = '') => {
    const map = {};
    orders.forEach((o) => {
      const d = parseDate(o.werkstattausgang || o.created_at);
      if (!inPeriod(d, period, year, dateFrom, dateTo, month)) return;
      const mk = monthKey(d);
      if (!map[mk]) {
        map[mk] = {
          label: `${MONTHS_DE[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          value: 0,
          sort: mk
        };
      }
      map[mk].value += metric === 'revenue' ? orderAmount(o) : 1;
    });
    return Object.values(map)
      .sort((a, b) => a.sort.localeCompare(b.sort))
      .map((m) => ({
        label: m.label,
        value: metric === 'revenue' ? Math.round(m.value * 100) / 100 : m.value
      }));
  };

  const availableMonths = useMemo(() => {
    const dates = [
      ...orders.map((o) => o.werkstattausgang || o.created_at),
      ...invoices.map((inv) => inv.invoice_date || inv.created_at)
    ];
    const list = listAvailableMonths(dates);
    const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    if (!list.includes(nowKey)) list.unshift(nowKey);
    return list;
  }, [orders, invoices]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const period = prefs.kpiPeriod;
    const year = prefs.kpiYear;
    const dateFrom = prefs.kpiDateFrom;
    const dateTo = prefs.kpiDateTo;
    const month = prefs.kpiMonth;
    const invAmount = (inv) => parseFloat(inv.total_amount) || parseFloat(inv.subtotal) || 0;

    let revenueOrders = 0;
    let revenueInvoices = 0;
    let orderCount = 0;
    let orderCountMonth = 0;
    let revenueMonth = 0;

    orders.forEach((o) => {
      const d = parseDate(o.werkstattausgang || o.created_at);
      if (!d) return;
      const amt = orderAmount(o);
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
        orderCountMonth += 1;
        revenueMonth += amt;
      }
      if (inPeriod(d, period, year, dateFrom, dateTo, month)) {
        orderCount += 1;
        revenueOrders += amt;
      }
    });

    invoices.forEach((inv) => {
      const d = parseDate(inv.invoice_date || inv.created_at);
      if (!d) return;
      if (inPeriod(d, period, year, dateFrom, dateTo, month)) revenueInvoices += invAmount(inv);
    });

    return {
      revenueOrders,
      revenueInvoices,
      orderCount,
      orderCountMonth,
      revenueMonth,
      ordersThisWeek: orders.filter((o) => {
        const d = parseDate(o.werkstattausgang || o.created_at);
        if (!d) return false;
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff < 7;
      }).length
    };
  }, [orders, invoices, prefs.kpiPeriod, prefs.kpiYear, prefs.kpiDateFrom, prefs.kpiDateTo, prefs.kpiMonth]);

  const revenueSeries = useMemo(() => {
    const { period, year, dateFrom, dateTo, month } = prefs.revenue;
    if (period === 'month') {
      let value = 0;
      orders.forEach((o) => {
        const d = parseDate(o.werkstattausgang || o.created_at);
        if (inPeriod(d, 'month', year, '', '', month)) value += orderAmount(o);
      });
      return [{ label: monthLabelDe(month).split(' ')[0] || 'Monat', value: Math.round(value * 100) / 100 }];
    }
    if (period === 'all' || period === 'untilToday' || period === 'range') {
      return buildRangeMonthly(period, year, dateFrom, dateTo, 'revenue', month);
    }
    return buildMonthly(year, 'revenue');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, prefs.revenue.period, prefs.revenue.year, prefs.revenue.dateFrom, prefs.revenue.dateTo, prefs.revenue.month]);

  const ordersSeries = useMemo(() => {
    const { period, year, chartType, dateFrom, dateTo, month } = prefs.orders;
    if (chartType === 'list') return [];
    if (period === 'month') {
      let value = 0;
      orders.forEach((o) => {
        const d = parseDate(o.werkstattausgang || o.created_at);
        if (inPeriod(d, 'month', year, '', '', month)) value += 1;
      });
      return [{ label: monthLabelDe(month).split(' ')[0] || 'Monat', value }];
    }
    if (period === 'all' || period === 'untilToday' || period === 'range') {
      return buildRangeMonthly(period, year, dateFrom, dateTo, 'orders', month);
    }
    return buildMonthly(year, 'orders');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, prefs.orders.period, prefs.orders.year, prefs.orders.chartType, prefs.orders.dateFrom, prefs.orders.dateTo, prefs.orders.month]);

  const ordersRanking = useMemo(
    () => buildCustomerRanking(prefs.orders.period, prefs.orders.year, 'orders', prefs.orders.dateFrom, prefs.orders.dateTo, prefs.orders.month),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, prefs.orders.period, prefs.orders.year, prefs.orders.dateFrom, prefs.orders.dateTo, prefs.orders.month]
  );

  const customerRanking = useMemo(
    () => buildCustomerRanking(prefs.customers.period, prefs.customers.year, 'revenue', prefs.customers.dateFrom, prefs.customers.dateTo, prefs.customers.month),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, prefs.customers.period, prefs.customers.year, prefs.customers.dateFrom, prefs.customers.dateTo, prefs.customers.month]
  );
  const revenueDisplay = useCountUp(stats.revenueOrders, 1200, 2);
  const invoiceDisplay = useCountUp(stats.revenueInvoices, 1200, 2);
  const ordersDisplay = useCountUp(stats.orderCount, 900, 0);
  const weekDisplay = useCountUp(stats.ordersThisWeek, 900, 0);

  const nowMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const kpiLabel =
    prefs.kpiPeriod === 'month'
      ? (prefs.kpiMonth === nowMonthKey
        ? `Aktueller Monat ${monthNameDe(prefs.kpiMonth)}`
        : `Monat ${monthLabelDe(prefs.kpiMonth, true)}`)
      : prefs.kpiPeriod === 'year'
        ? `Jahr ${prefs.kpiYear}`
        : prefs.kpiPeriod === 'untilToday'
          ? 'bis heute'
          : prefs.kpiPeriod === 'range'
            ? `${prefs.kpiDateFrom || '…'} – ${prefs.kpiDateTo || '…'}`
            : 'gesamter Zeitraum';

  const periodHint = (tile) => {
    if (tile.period === 'month') {
      const mk = tile.month || nowMonthKey;
      return mk === nowMonthKey
        ? `Aktueller Monat ${monthNameDe(mk)}`
        : `Monat ${monthLabelDe(mk, true)}`;
    }
    if (tile.period === 'all') return 'gesamter Zeitraum';
    if (tile.period === 'untilToday') return 'bis heute';
    if (tile.period === 'range') return `${tile.dateFrom || '…'} – ${tile.dateTo || '…'}`;
    const keys = monthKeysForYear(tile.year);
    if (!keys.length) return String(tile.year);
    if (keys.length < 12) return `${keys[0].label}–${keys[keys.length - 1].label} ${tile.year}`;
    return `Jahr ${tile.year}`;
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="md-header">
        <div>
          <h1>Übersicht</h1>
          <p>Einnahmen & Reparaturaufträge — {kpiLabel}</p>
        </div>
        <div className="md-toolbar">
          {[
            ['month', 'Monat'],
            ['year', 'Jahr'],
            ['range', 'Von–Bis'],
            ['untilToday', 'Bis heute'],
            ['all', 'Alles']
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`md-chip${prefs.kpiPeriod === id ? ' active' : ''}`}
              onClick={() => setPrefs((prev) => ({ ...prev, kpiPeriod: id }))}
            >
              {label}
            </button>
          ))}
          {prefs.kpiPeriod === 'year' && (
            <select
              className="md-mini-select"
              value={prefs.kpiYear}
              onChange={(e) => setPrefs((prev) => ({ ...prev, kpiYear: Number(e.target.value) }))}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
          {prefs.kpiPeriod === 'month' && (
            <select
              className="md-mini-select"
              value={prefs.kpiMonth || nowMonthKey}
              onChange={(e) => setPrefs((prev) => ({ ...prev, kpiMonth: e.target.value }))}
            >
              {availableMonths.map((mk) => (
                <option key={mk} value={mk}>
                  {monthLabelDe(mk, true)}{mk === nowMonthKey ? ' (aktuell)' : ''}
                </option>
              ))}
            </select>
          )}
          {prefs.kpiPeriod === 'range' && (
            <div className="md-range-inputs">
              <input
                type="date"
                className="md-mini-date"
                value={prefs.kpiDateFrom || ''}
                onChange={(e) => setPrefs((prev) => ({ ...prev, kpiDateFrom: e.target.value }))}
              />
              <input
                type="date"
                className="md-mini-date"
                value={prefs.kpiDateTo || ''}
                onChange={(e) => setPrefs((prev) => ({ ...prev, kpiDateTo: e.target.value }))}
              />
              <button
                type="button"
                className="md-chip"
                onClick={() => setPrefs((prev) => ({ ...prev, kpiDateTo: today }))}
              >
                Bis heute
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="md-loading">Lade Kennzahlen…</div>
      ) : (
        <>
          <div className="md-kpi-grid">
            <div className="md-kpi accent">
              <div className="md-kpi-glow" />
              <div className="md-kpi-label">Werkstatt-Umsatz ({kpiLabel})</div>
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

          <div className="md-grid-3">
            <div className="md-card">
              <div className="md-card-head">
                <div>
                  <h2>Umsatz nach Monat</h2>
                  <div className="md-card-sub">{periodHint(prefs.revenue)}</div>
                </div>
                <div className="md-card-controls">
                  <PeriodSelect
                    period={prefs.revenue.period}
                    year={prefs.revenue.year}
                    years={availableYears}
                    dateFrom={prefs.revenue.dateFrom}
                    dateTo={prefs.revenue.dateTo}
                    month={prefs.revenue.month}
                    months={availableMonths}
                    onPeriod={(period) => patchTile('revenue', { period })}
                    onYear={(year) => patchTile('revenue', { year })}
                    onDateFrom={(dateFrom) => patchTile('revenue', { dateFrom })}
                    onDateTo={(dateTo) => patchTile('revenue', { dateTo })}
                    onMonth={(month) => patchTile('revenue', { month })}
                  />
                  <ViewModeSwitcher
                    value={prefs.revenue.chartType}
                    options={['bar', 'line', 'donut']}
                    onChange={(chartType) => patchTile('revenue', { chartType })}
                  />
                </div>
              </div>
              <div className="md-chart-wrap md-chart-wrap-donut">
                <ChartBody type={prefs.revenue.chartType} series={revenueSeries} euro centerLabel="Umsatz" />
              </div>
            </div>

            <div className="md-card">
              <div className="md-card-head">
                <div>
                  <h2>Aufträge</h2>
                  <div className="md-card-sub">
                    {prefs.orders.chartType === 'list'
                      ? `Ranking Kunden · ${periodHint(prefs.orders)}`
                      : periodHint(prefs.orders)}
                  </div>
                </div>
                <div className="md-card-controls">
                  <PeriodSelect
                    period={prefs.orders.period}
                    year={prefs.orders.year}
                    years={availableYears}
                    dateFrom={prefs.orders.dateFrom}
                    dateTo={prefs.orders.dateTo}
                    month={prefs.orders.month}
                    months={availableMonths}
                    onPeriod={(period) => patchTile('orders', { period })}
                    onYear={(year) => patchTile('orders', { year })}
                    onDateFrom={(dateFrom) => patchTile('orders', { dateFrom })}
                    onDateTo={(dateTo) => patchTile('orders', { dateTo })}
                    onMonth={(month) => patchTile('orders', { month })}
                  />
                  <ViewModeSwitcher
                    value={prefs.orders.chartType}
                    options={['bar', 'line', 'donut', 'list']}
                    onChange={(chartType) => patchTile('orders', { chartType })}
                    title="Diagramm / Kunden-Ranking"
                  />
                </div>
              </div>
              <div className="md-chart-wrap md-chart-wrap-scroll md-chart-wrap-donut">
                <ChartBody
                  type={prefs.orders.chartType}
                  series={ordersSeries}
                  ranking={ordersRanking}
                  euro={false}
                  centerLabel="Aufträge"
                />
              </div>
              {prefs.orders.chartType !== 'list' && (
                <div className="md-legend" style={{ justifyContent: 'space-between' }}>
                  <span>Aktueller Monat: <strong>{stats.orderCountMonth}</strong> Aufträge</span>
                  <span>Umsatz Monat: <strong>{formatEuro(stats.revenueMonth)}</strong></span>
                </div>
              )}
            </div>

            <div className="md-card">
              <div className="md-card-head">
                <div>
                  <h2>Top Kunden nach Umsatz</h2>
                  <div className="md-card-sub">{periodHint(prefs.customers)}</div>
                </div>
                <div className="md-card-controls">
                  <PeriodSelect
                    period={prefs.customers.period}
                    year={prefs.customers.year}
                    years={availableYears}
                    dateFrom={prefs.customers.dateFrom}
                    dateTo={prefs.customers.dateTo}
                    month={prefs.customers.month}
                    months={availableMonths}
                    onPeriod={(period) => patchTile('customers', { period })}
                    onYear={(year) => patchTile('customers', { year })}
                    onDateFrom={(dateFrom) => patchTile('customers', { dateFrom })}
                    onDateTo={(dateTo) => patchTile('customers', { dateTo })}
                    onMonth={(month) => patchTile('customers', { month })}
                  />
                </div>
              </div>
              <div className="md-chart-wrap md-chart-wrap-scroll">
                <ChartBody type="list" ranking={customerRanking} euro centerLabel="Umsatz" />
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

export function ModernStaffHome({ navigate }) {
  const tiles = [
    { id: 'akustiker', title: 'Akustiker', text: 'Kunden verwalten und bearbeiten', path: '/akustiker', icon: 'users' },
    { id: 'kontaktliste', title: 'Kontaktliste', text: 'E-Mails aus Export mit Akustikern abgleichen', path: '/kontaktliste', icon: 'contacts' },
    { id: 'erstellen', title: 'Reparaturauftrag erstellen', text: 'Neuen Reparaturauftrag anlegen', path: '/reperaturauftrag', icon: 'plus' },
    { id: 'auftraege', title: 'Erstellte Reparaturaufträge', text: 'Alle Reparaturaufträge anzeigen', path: '/erstellte-reperaturauftrage', icon: 'list' },
    { id: 'einstellungen', title: 'Einstellungen', text: 'Länder, Steuern und Portokosten', path: '/einstellungen', icon: 'settings' }
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
  const [unreadByMailbox, setUnreadByMailbox] = useState({ kv: 0, info: 0 });

  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const { data, error } = await supabase
          .from('email_logs')
          .select('id, mailbox_key, from_address, to_address, email_type, direction, read_at, deleted_at, archived_at')
          .eq('direction', 'inbound')
          .is('read_at', null)
          .is('deleted_at', null)
          .is('archived_at', null)
          .limit(500);
        if (error) throw error;
        const counts = { kv: 0, info: 0 };
        for (const row of data || []) {
          const key = detectMailboxKey(row);
          if (key === 'kv') counts.kv += 1;
          else counts.info += 1;
        }
        if (!cancelled) setUnreadByMailbox(counts);
      } catch (_) {
        /* ignore */
      }
    };
    loadUnread();
    const t = setInterval(loadUnread, 45000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [path, role]);

  const mailboxNav = mailboxesForRole(role).map((m) => ({
    id: `postfach-${m.key}`,
    label: m.label,
    sublabel: m.sublabel,
    icon: 'inbox',
    path: m.navPath,
    match: (p) => p === m.navPath || p.startsWith(`${m.navPath}/`),
    badge: unreadByMailbox[m.key] || 0,
    mailboxKey: m.key
  }));

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home', path: '/', match: (p) => p === '/' },
    ...(showInvoices
      ? [{ id: 'finanzen', label: 'Finanzen', icon: 'finance', path: '/finanzen', match: (p) => p.startsWith('/finanzen') }]
      : []),
    { id: 'akustiker', label: 'Akustiker', icon: 'users', path: '/akustiker', match: (p) => p.startsWith('/akustiker') },
    { id: 'kontaktliste', label: 'Kontaktliste', icon: 'contacts', path: '/kontaktliste', match: (p) => p.startsWith('/kontaktliste') },
    { id: 'erstellen', label: 'Auftrag erstellen', icon: 'plus', path: '/reperaturauftrag', match: (p) => p.startsWith('/reperaturauftrag') },
    { id: 'auftraege', label: 'Reparaturaufträge', icon: 'list', path: '/erstellte-reperaturauftrage', match: (p) => p.startsWith('/erstellte-reperaturauftrage') },
    ...(showInvoices
      ? [
          { id: 'rechnungen', label: 'Rechnungen', icon: 'invoice', path: '/erstellte-rechnungen', match: (p) => p.startsWith('/erstellte-rechnungen') || p.startsWith('/rechnung-') }
        ]
      : []),
    ...mailboxNav,
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
              className={`md-nav-item${item.match(path) ? ' active' : ''}${item.sublabel ? ' md-nav-item-mail' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon name={item.icon} />
              <span className="md-nav-label-wrap">
                <span className="md-nav-label-main">{item.label}</span>
                {item.sublabel && <span className="md-nav-label-sub">{item.sublabel}</span>}
              </span>
              {item.badge > 0 && <span className="md-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
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
