import { useCallback, useState } from 'react';

const PREFS_KEY = 'gretzinger_admin_dashboard_prefs';

const todayISO = () => new Date().toISOString().slice(0, 10);
const yearStartISO = () => `${new Date().getFullYear()}-01-01`;
const currentMonthKey = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

const DEFAULTS = {
  kpiPeriod: 'year',
  kpiYear: new Date().getFullYear(),
  kpiDateFrom: yearStartISO(),
  kpiDateTo: todayISO(),
  kpiMonth: currentMonthKey(),
  revenue: {
    period: 'year',
    year: new Date().getFullYear(),
    chartType: 'bar',
    dateFrom: yearStartISO(),
    dateTo: todayISO(),
    month: currentMonthKey()
  },
  orders: {
    period: 'year',
    year: new Date().getFullYear(),
    chartType: 'bar',
    dateFrom: yearStartISO(),
    dateTo: todayISO(),
    month: currentMonthKey()
  },
  customers: {
    period: 'year',
    year: new Date().getFullYear(),
    chartType: 'list',
    dateFrom: yearStartISO(),
    dateTo: todayISO(),
    month: currentMonthKey()
  },
  finanzen: {
    chartType: 'bar',
    groupBy: 'month',
    periodMode: 'year',
    year: new Date().getFullYear(),
    dateFrom: '',
    dateTo: '',
    search: '',
    akustiker: '',
    filiale: ''
  }
};

function readPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      revenue: { ...DEFAULTS.revenue, ...(parsed.revenue || {}) },
      orders: { ...DEFAULTS.orders, ...(parsed.orders || {}) },
      customers: { ...DEFAULTS.customers, ...(parsed.customers || {}) },
      finanzen: { ...DEFAULTS.finanzen, ...(parsed.finanzen || {}) }
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function writePrefs(next) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Persist admin dashboard / Finanzen tile settings across reloads & logins */
export function useAdminDashboardPrefs() {
  const [prefs, setPrefsState] = useState(() => readPrefs());

  const setPrefs = useCallback((updater) => {
    setPrefsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writePrefs(next);
      return next;
    });
  }, []);

  const patchTile = useCallback((tileKey, patch) => {
    setPrefs((prev) => ({
      ...prev,
      [tileKey]: { ...prev[tileKey], ...patch }
    }));
  }, [setPrefs]);

  return { prefs, setPrefs, patchTile };
}

export { DEFAULTS as ADMIN_DASHBOARD_DEFAULTS };
