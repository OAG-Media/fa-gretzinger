import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Worker über CDN — funktioniert in CRA ohne Webpack-Worker-Hacks
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * PDF-Vorschau mit Grab-Hand (Ziehen zum Scrollen) und Einpassen.
 * url: Blob-URL der PDF
 */
export default function PdfGrabPreview({ url, filename = 'Dokument.pdf' }) {
  const viewportRef = useRef(null);
  const canvasHostRef = useRef(null);
  const dragRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTokenRef = useRef(0);

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [dragging, setDragging] = useState(false);

  const computeFitScale = useCallback(async (pdf) => {
    const host = viewportRef.current;
    if (!host || !pdf) return 1;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const pad = 24;
    const avail = Math.max(120, host.clientWidth - pad);
    return Math.max(0.35, Math.min(2.5, avail / base.width));
  }, []);

  const renderPages = useCallback(async (pdf, nextScale) => {
    const host = canvasHostRef.current;
    if (!host || !pdf) return;
    const token = ++renderTokenRef.current;
    host.innerHTML = '';

    for (let i = 1; i <= pdf.numPages; i += 1) {
      if (token !== renderTokenRef.current) return;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: nextScale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.className = 'pdf-grab-page';
      host.appendChild(canvas);
      await page.render({
        canvasContext: ctx,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
      }).promise;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setStatus('error');
      setError('Kein PDF');
      return undefined;
    }

    setStatus('loading');
    setError('');
    pdfDocRef.current = null;

    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages);
        const fitted = await computeFitScale(pdf);
        if (cancelled) return;
        setFitScale(fitted);
        setScale(fitted);
        await renderPages(pdf, fitted);
        if (cancelled) return;
        setStatus('ready');
        if (viewportRef.current) {
          viewportRef.current.scrollTop = 0;
          viewportRef.current.scrollLeft = 0;
        }
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setError(e.message || 'PDF konnte nicht geladen werden');
      }
    })();

    return () => {
      cancelled = true;
      renderTokenRef.current += 1;
      pdfDocRef.current = null;
    };
  }, [url, computeFitScale, renderPages]);

  useEffect(() => {
    const pdf = pdfDocRef.current;
    if (!pdf || status !== 'ready') return undefined;
    let cancelled = false;
    (async () => {
      await renderPages(pdf, scale);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [scale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Über der PDF: Mausrad = Zoomen (nicht Scrollen)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || status !== 'ready') return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setScale((s) => Math.max(0.35, Math.min(2.8, Number((s * factor).toFixed(3)))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [status]);

  const normalizeView = async () => {
    const pdf = pdfDocRef.current;
    if (!pdf) return;
    const fitted = await computeFitScale(pdf);
    setFitScale(fitted);
    setScale(fitted);
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
      viewportRef.current.scrollLeft = 0;
    }
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const el = viewportRef.current;
    if (!el) return;
    el.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop
    };
    setDragging(true);
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    const el = viewportRef.current;
    if (!drag || !el) return;
    el.scrollLeft = drag.left - (e.clientX - drag.x);
    el.scrollTop = drag.top - (e.clientY - drag.y);
  };

  const endDrag = (e) => {
    if (dragRef.current && viewportRef.current?.releasePointerCapture) {
      try {
        viewportRef.current.releasePointerCapture(e.pointerId);
      } catch (_) { /* ignore */ }
    }
    dragRef.current = null;
    setDragging(false);
  };

  const zoomBy = (factor) => {
    setScale((s) => Math.max(0.35, Math.min(2.8, Number((s * factor).toFixed(3)))));
  };

  return (
    <div className="pdf-grab-root">
      <div className="pdf-grab-toolbar">
        <span className="pdf-grab-hint" title="Ziehen zum Verschieben · Rad zum Zoomen">
          Hand · ziehen · Rad zoomen
        </span>
        <div className="pdf-grab-tools">
          <button type="button" className="pdf-grab-btn" onClick={() => zoomBy(1 / 1.15)} disabled={status !== 'ready'} title="Verkleinern">
            −
          </button>
          <button type="button" className="pdf-grab-btn" onClick={() => zoomBy(1.15)} disabled={status !== 'ready'} title="Vergrößern">
            +
          </button>
          <button
            type="button"
            className="pdf-grab-btn pdf-grab-btn-fit"
            onClick={normalizeView}
            disabled={status !== 'ready'}
            title="Auf Standard-Breite einpassen und nach oben setzen"
          >
            Einpassen
          </button>
        </div>
        {pageCount > 0 && (
          <span className="pdf-grab-meta">{pageCount} Seite{pageCount === 1 ? '' : 'n'} · {Math.round((scale / (fitScale || scale)) * 100)}%</span>
        )}
      </div>

      <div
        ref={viewportRef}
        className={`pdf-grab-viewport${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {status === 'loading' && <p className="pdf-grab-empty">PDF wird geladen…</p>}
        {status === 'error' && <p className="pdf-grab-empty">{error || 'Fehler'}</p>}
        <div ref={canvasHostRef} className="pdf-grab-pages" aria-label={filename} />
      </div>

      <style>{`
        .pdf-grab-root { display: flex; flex-direction: column; height: 100%; min-height: 0; background: #eef2f6; }
        .pdf-grab-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 10px; background: #fff; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
        .pdf-grab-hint { font-size: 12px; color: #1d426a; font-weight: 600; }
        .pdf-grab-tools { display: flex; gap: 4px; margin-left: auto; }
        .pdf-grab-btn { min-width: 32px; padding: 4px 10px; border: 1px solid #d1d5db; background: #fff; color: #1d426a; border-radius: 6px; cursor: pointer; font-size: 13px; line-height: 1.2; }
        .pdf-grab-btn:hover:not(:disabled) { background: #eef4fa; }
        .pdf-grab-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .pdf-grab-btn-fit { font-weight: 600; }
        .pdf-grab-meta { font-size: 11px; color: #888; width: 100%; }
        .pdf-grab-viewport { flex: 1; min-height: 0; overflow: auto; cursor: grab; touch-action: none; user-select: none; }
        .pdf-grab-viewport.is-dragging { cursor: grabbing; }
        .pdf-grab-pages { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px; min-height: 100%; box-sizing: border-box; }
        .pdf-grab-page { display: block; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.12); pointer-events: none; }
        .pdf-grab-empty { margin: auto; padding: 32px 16px; color: #666; font-size: 14px; text-align: center; }
      `}</style>
    </div>
  );
}
