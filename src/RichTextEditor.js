import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

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

function Icon({ children, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const IcoAlignLeft = () => (
  <Icon>
    <path d="M4 6h16M4 12h10M4 18h14" />
  </Icon>
);
const IcoAlignCenter = () => (
  <Icon>
    <path d="M4 6h16M7 12h10M5 18h14" />
  </Icon>
);
const IcoAlignRight = () => (
  <Icon>
    <path d="M4 6h16M10 12h10M6 18h14" />
  </Icon>
);
const IcoBulletList = () => (
  <Icon>
    <circle cx="5" cy="7" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5" cy="17" r="1.2" fill="currentColor" stroke="none" />
    <path d="M9 7h11M9 12h11M9 17h11" />
  </Icon>
);
const IcoNumberList = () => (
  <Icon>
    <path d="M4 7h2M4 12h2M4 17h2M9 7h11M9 12h11M9 17h11" />
    <path d="M5 5.5v3M5 10.5v3.5M4.5 17.5h1.5" />
  </Icon>
);
const IcoLink = () => (
  <Icon>
    <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.5 5.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13.5 18.5" />
  </Icon>
);
const IcoImage = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m21 15-4.5-4.5L8 19" />
  </Icon>
);

/** Lightweight rich-text editor (contentEditable) for email fields. */
const RichTextEditor = forwardRef(function RichTextEditor({ value, onChange, placeholder }, ref) {
  const editorRef = useRef(null);
  const lastExternal = useRef(null);
  const resizeRef = useRef(null);
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

  const clearImageSelection = () => {
    editorRef.current?.querySelectorAll('img.rte-img-selected').forEach((img) => {
      img.classList.remove('rte-img-selected');
      img.style.outline = '';
    });
  };

  const selectImage = (img) => {
    clearImageSelection();
    img.classList.add('rte-img-selected');
    img.style.outline = '2px solid #1d426a';
    img.style.outlineOffset = '2px';
  };

  const insertImage = (url, widthPx = 280) => {
    if (!url) return;
    insertHtml(
      `<img src="${url}" alt="" style="width:${widthPx}px;height:auto;display:block;margin:12px 0;max-width:100%;" />`
    );
  };

  const insertImagePrompt = () => {
    const url = window.prompt('Bild-URL (CDN-Link, z. B. BunnyCDN):', '');
    if (!url) return;
    insertImage(url.trim(), 280);
  };

  const insertLink = () => {
    const url = window.prompt('Link-URL:');
    if (!url) return;
    const text = window.getSelection()?.toString() || url;
    insertHtml(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
  };

  const handleEditorClick = (e) => {
    if (e.target.tagName === 'IMG') {
      selectImage(e.target);
    } else {
      clearImageSelection();
    }
  };

  const handleEditorMouseDown = (e) => {
    if (e.target.tagName !== 'IMG') return;
    const img = e.target;
    const wasSelected = img.classList.contains('rte-img-selected');
    selectImage(img);
    // Erstes Klicken = auswählen; danach Ziehen = Größe ändern
    if (!wasSelected) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = img.getBoundingClientRect().width;
    resizeRef.current = { img, startX, startW };
    const onMove = (ev) => {
      const drag = resizeRef.current;
      if (!drag) return;
      const w = Math.max(48, Math.min(900, drag.startW + (ev.clientX - drag.startX)));
      drag.img.style.width = `${Math.round(w)}px`;
      drag.img.style.height = 'auto';
      drag.img.style.maxWidth = '100%';
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      emitChange();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="rte-root">
      <div className="rte-toolbar">
        <ToolBtn onClick={() => exec('bold')} title="Fett" style={{ fontWeight: 700 }}>B</ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="Kursiv" style={{ fontStyle: 'italic' }}>I</ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="Unterstrichen" style={{ textDecoration: 'underline' }}>U</ToolBtn>
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
        <ToolBtn onClick={() => exec('justifyLeft')} title="Linksbündig"><IcoAlignLeft /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} title="Zentriert"><IcoAlignCenter /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyRight')} title="Rechtsbündig"><IcoAlignRight /></ToolBtn>
        <span className="rte-sep" />
        <ToolBtn onClick={() => exec('insertUnorderedList')} title="Aufzählung"><IcoBulletList /></ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} title="Nummerierung"><IcoNumberList /></ToolBtn>
        <span className="rte-sep" />
        <ToolBtn onClick={insertLink} title="Link einfügen"><IcoLink /></ToolBtn>
        <ToolBtn onClick={insertImagePrompt} title="Bild per URL einfügen"><IcoImage /></ToolBtn>
      </div>
      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onClick={handleEditorClick}
        onMouseDown={handleEditorMouseDown}
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
        .rte-tool {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          color: #1d426a;
          cursor: pointer;
          font-size: 13px;
        }
        .rte-tool:hover { background: #eef4fa; }
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
          position: relative;
        }
        .rte-editor img.rte-img-selected {
          cursor: nwse-resize;
          box-shadow: 0 0 0 2px #1d426a;
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

function ToolBtn({ onClick, title, style, children }) {
  return (
    <button type="button" className="rte-tool" onClick={onClick} title={title} style={style}>
      {children}
    </button>
  );
}
