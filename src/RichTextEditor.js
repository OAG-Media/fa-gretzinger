import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export const DEFAULT_LOGO_URL =
  'https://gretzinger.b-cdn.net/Webseiten/Fa-Gretzinger/Logo/Gretzinger-Ho%CC%88rgera%CC%88te%20Logo.png';

const FONT_SIZES = [
  { label: 'Klein (11)', px: 11 },
  { label: 'Normal (14)', px: 14 },
  { label: 'Mittel (16)', px: 16 },
  { label: 'Groß (18)', px: 18 },
  { label: 'Sehr groß (22)', px: 22 }
];

const LINE_HEIGHTS = [
  { label: 'Eng (1.2)', value: '1.2' },
  { label: 'Normal (1.5)', value: '1.5' },
  { label: 'Weit (1.8)', value: '1.8' },
  { label: 'Doppel (2.0)', value: '2.0' }
];

/** Lightweight rich-text editor (contentEditable) for email fields. */
const RichTextEditor = forwardRef(function RichTextEditor({ value, onChange, placeholder }, ref) {
  const editorRef = useRef(null);
  const lastExternal = useRef(null);
  const [lineHeight, setLineHeight] = useState('1.5');
  const [color, setColor] = useState('#1d426a');

  useImperativeHandle(ref, () => ({
    insertAtCursor(text) {
      if (!text || !editorRef.current) return;
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          document.execCommand('insertHTML', false, text);
        }
      } else {
        document.execCommand('insertHTML', false, text);
      }
      lastExternal.current = editorRef.current.innerHTML;
      onChange?.(editorRef.current.innerHTML);
    },
    focus() {
      editorRef.current?.focus();
    }
  }));

  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== lastExternal.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
      lastExternal.current = value;
    }
  }, [value]);

  const emitChange = () => {
    if (!editorRef.current) return;
    lastExternal.current = editorRef.current.innerHTML;
    onChange?.(editorRef.current.innerHTML);
  };

  const exec = (cmd, arg) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    emitChange();
  };

  const insertHtml = (html) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emitChange();
  };

  const getActiveBlock = () => {
    const sel = window.getSelection();
    if (!sel?.anchorNode || !editorRef.current) return null;
    let node = sel.anchorNode;
    if (node.nodeType === 3) node = node.parentElement;
    if (!editorRef.current.contains(node)) return null;
    return node.closest('p, div, li, h1, h2, h3') || node;
  };

  const applyFontSize = (px) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      const block = getActiveBlock();
      if (block && block !== editorRef.current) {
        block.style.fontSize = `${px}px`;
        emitChange();
      }
      return;
    }
    const span = document.createElement('span');
    span.style.fontSize = `${px}px`;
    try {
      range.surroundContents(span);
    } catch {
      document.execCommand('insertHTML', false, `<span style="font-size:${px}px">${sel.toString()}</span>`);
      sel.removeAllRanges();
    }
    emitChange();
  };

  const applyLineHeight = (lh) => {
    setLineHeight(lh);
    const block = getActiveBlock();
    if (block && block !== editorRef.current) {
      block.style.lineHeight = lh;
    } else if (editorRef.current) {
      editorRef.current.style.lineHeight = lh;
    }
    emitChange();
  };

  const applyColor = (c) => {
    setColor(c);
    exec('foreColor', c);
  };

  const insertImage = (url, widthPx = 280) => {
    if (!url) return;
    insertHtml(
      `<img src="${url}" alt="" style="width:${widthPx}px;height:auto;display:block;margin:12px 0;" />`
    );
  };

  const insertImagePrompt = () => {
    const url = window.prompt('Bild-URL (CDN-Link, z. B. BunnyCDN):', DEFAULT_LOGO_URL);
    if (!url) return;
    const w = window.prompt('Breite in Pixel (leer = 280):', '280');
    insertImage(url.trim(), w ? parseInt(w, 10) || 280 : 280);
  };

  const insertLogo = () => {
    const w = window.prompt('Logo-Breite in Pixel:', '280');
    insertImage(DEFAULT_LOGO_URL, w ? parseInt(w, 10) || 280 : 280);
  };

  const resizeSelectedImage = () => {
    const sel = window.getSelection();
    if (!sel?.anchorNode) return;
    let node = sel.anchorNode;
    if (node.nodeType === 3) node = node.parentElement;
    const img = node?.closest?.('img') || (node?.tagName === 'IMG' ? node : null);
    if (!img) {
      window.alert('Bitte zuerst ein Bild im Text anklicken.');
      return;
    }
    const current = parseInt(img.style.width, 10) || img.width || 280;
    const w = window.prompt('Neue Breite in Pixel:', String(current));
    if (!w) return;
    img.style.width = `${parseInt(w, 10) || current}px`;
    img.style.height = 'auto';
    img.style.maxWidth = '100%';
    emitChange();
  };

  const insertLink = () => {
    const url = window.prompt('Link-URL:');
    if (!url) return;
    const text = window.getSelection()?.toString() || url;
    insertHtml(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
  };

  const handleEditorClick = (e) => {
    if (e.target.tagName === 'IMG') {
      e.target.style.outline = '2px solid #1d426a';
      editorRef.current?.querySelectorAll('img').forEach((img) => {
        if (img !== e.target) img.style.outline = '';
      });
    }
  };

  return (
    <div className="rte-root">
      <div className="rte-toolbar">
        <ToolBtn onClick={() => exec('bold')} label="B" title="Fett" style={{ fontWeight: 700 }} />
        <ToolBtn onClick={() => exec('italic')} label="I" title="Kursiv" style={{ fontStyle: 'italic' }} />
        <ToolBtn onClick={() => exec('underline')} label="U" title="Unterstrichen" style={{ textDecoration: 'underline' }} />
        <span className="rte-sep" />
        <select
          className="rte-select"
          title="Schriftgröße"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) applyFontSize(Number(e.target.value));
            e.target.value = '';
          }}
        >
          <option value="">Größe</option>
          {FONT_SIZES.map((f) => (
            <option key={f.px} value={f.px}>{f.label}</option>
          ))}
        </select>
        <label className="rte-color-wrap" title="Schriftfarbe">
          <span>A</span>
          <input type="color" value={color} onChange={(e) => applyColor(e.target.value)} />
        </label>
        <select
          className="rte-select"
          title="Zeilenabstand"
          value={lineHeight}
          onChange={(e) => applyLineHeight(e.target.value)}
        >
          {LINE_HEIGHTS.map((lh) => (
            <option key={lh.value} value={lh.value}>{lh.label}</option>
          ))}
        </select>
        <span className="rte-sep" />
        <ToolBtn onClick={() => exec('justifyLeft')} label="≡ links" title="Linksbündig" />
        <ToolBtn onClick={() => exec('justifyCenter')} label="≡ mitte" title="Zentriert" />
        <ToolBtn onClick={() => exec('justifyRight')} label="≡ rechts" title="Rechtsbündig" />
        <span className="rte-sep" />
        <ToolBtn onClick={() => exec('insertUnorderedList')} label="• Liste" title="Aufzählung" />
        <ToolBtn onClick={() => exec('insertOrderedList')} label="1. Liste" title="Nummerierung" />
        <span className="rte-sep" />
        <ToolBtn onClick={insertLink} label="Link" title="Link einfügen" />
        <ToolBtn onClick={insertImagePrompt} label="Bild" title="Bild per URL einfügen" />
        <ToolBtn onClick={insertLogo} label="Logo" title="Gretzinger-Logo einfügen" />
        <ToolBtn onClick={resizeSelectedImage} label="Größe" title="Bild vergrößern/verkleinern" />
        <ToolBtn onClick={() => exec('removeFormat')} label="Format weg" title="Formatierung entfernen" />
      </div>
      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onClick={handleEditorClick}
        data-placeholder={placeholder || 'Text…'}
        style={{ lineHeight }}
      />
      <style>{`
        .rte-root {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          overflow: hidden;
          text-align: left;
        }
        .rte-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
          align-items: center;
        }
        .rte-select {
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          font-size: 12px;
          cursor: pointer;
        }
        .rte-color-wrap {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
        }
        .rte-color-wrap input[type="color"] {
          width: 28px;
          height: 24px;
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        .rte-sep {
          width: 1px;
          background: #e5e7eb;
          margin: 0 4px;
          align-self: stretch;
        }
        .rte-editor {
          min-height: 180px;
          padding: 14px;
          outline: none;
          background: #fff;
          text-align: left;
          direction: ltr;
        }
        .rte-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
        .rte-editor p,
        .rte-editor div {
          text-align: inherit;
          margin: 0 0 0.6em;
        }
        .rte-editor img {
          max-width: 100%;
          height: auto;
          cursor: pointer;
        }
        .rte-editor a {
          color: #1d426a;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
});

export default RichTextEditor;

function ToolBtn({ onClick, label, title, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: '6px 10px',
        border: '1px solid #d1d5db',
        borderRadius: 6,
        background: '#fff',
        cursor: 'pointer',
        fontSize: 13,
        ...style
      }}
    >
      {label}
    </button>
  );
}
