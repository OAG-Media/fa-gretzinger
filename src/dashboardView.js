import { useCallback, useEffect, useState } from 'react';

export const DASHBOARD_VIEW_KEY = 'gretzinger_dashboard_view';
export const DASHBOARD_VIEW_EVENT = 'gretzinger-dashboard-view';

export function getDashboardView() {
  try {
    const stored = localStorage.getItem(DASHBOARD_VIEW_KEY);
    // Kein Eintrag → neue Ansicht als Default; nur explizit „classic“ bleibt klassisch
    if (stored === 'classic') return 'classic';
    return 'modern';
  } catch {
    return 'modern';
  }
}

export function setDashboardView(next) {
  const value = next === 'modern' ? 'modern' : 'classic';
  try {
    localStorage.setItem(DASHBOARD_VIEW_KEY, value);
  } catch (_) { /* ignore */ }
  window.dispatchEvent(new CustomEvent(DASHBOARD_VIEW_EVENT, { detail: value }));
  return value;
}

export function useDashboardView() {
  const [view, setView] = useState(getDashboardView);

  useEffect(() => {
    const onChange = (e) => setView(e.detail || getDashboardView());
    window.addEventListener(DASHBOARD_VIEW_EVENT, onChange);
    return () => window.removeEventListener(DASHBOARD_VIEW_EVENT, onChange);
  }, []);

  const update = useCallback((next) => {
    setView(setDashboardView(next));
  }, []);

  return [view, update];
}
