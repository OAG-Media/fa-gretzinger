import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NoticeContext = createContext(null);

export function NoticeProvider({ children }) {
  const [notice, setNotice] = useState(null);

  const close = useCallback(() => {
    setNotice((prev) => {
      if (prev?.resolve) prev.resolve(false);
      return null;
    });
  }, []);

  const alert = useCallback((message, title = 'Hinweis') => {
    return new Promise((resolve) => {
      setNotice({
        type: 'alert',
        title,
        message: String(message || ''),
        resolve: () => {
          resolve(true);
          setNotice(null);
        }
      });
    });
  }, []);

  const confirm = useCallback((message, title = 'Bestätigen') => {
    return new Promise((resolve) => {
      setNotice({
        type: 'confirm',
        title,
        message: String(message || ''),
        resolve: (ok) => {
          resolve(!!ok);
          setNotice(null);
        }
      });
    });
  }, []);

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);

  return (
    <NoticeContext.Provider value={value}>
      {children}
      {notice && (
        <div className="app-notice-overlay" onClick={notice.type === 'alert' ? () => notice.resolve() : undefined}>
          <div className="app-notice-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="app-notice-title">{notice.title}</h3>
            <p className="app-notice-msg">{notice.message}</p>
            <div className="app-notice-actions">
              {notice.type === 'confirm' && (
                <button type="button" className="app-notice-btn ghost" onClick={() => notice.resolve(false)}>
                  Abbrechen
                </button>
              )}
              <button
                type="button"
                className="app-notice-btn primary"
                onClick={() => notice.resolve(notice.type === 'confirm' ? true : undefined)}
                autoFocus
              >
                {notice.type === 'confirm' ? 'OK' : 'Verstanden'}
              </button>
            </div>
          </div>
          <style>{`
            .app-notice-overlay { position: fixed; inset: 0; z-index: 12000; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 16px; }
            .app-notice-modal { background: #fff; border-radius: 14px; width: min(440px, 100%); padding: 22px 22px 18px; box-shadow: 0 18px 50px rgba(0,0,0,0.25); text-align: left; border: 1px solid #e5e7eb; }
            .app-notice-title { margin: 0 0 10px; color: #1d426a; font-size: 1.15rem; font-weight: 600; }
            .app-notice-msg { margin: 0; color: #334155; font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
            .app-notice-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
            .app-notice-btn { padding: 10px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; border: 1px solid #d1d5db; }
            .app-notice-btn.primary { background: #1d426a; color: #fff; border-color: #1d426a; }
            .app-notice-btn.ghost { background: #fff; color: #1d426a; }
          `}</style>
        </div>
      )}
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const ctx = useContext(NoticeContext);
  if (!ctx) {
    return {
      alert: async (msg) => { window.alert(msg); },
      confirm: async (msg) => window.confirm(msg)
    };
  }
  return ctx;
}
