import React, { useState } from 'react';
import { addressesFromDraft, extractEmail, uniqueAddresses } from './emailRecipients';

/**
 * Outlook-ähnliche Empfängerzeile mit Pills + Drag & Drop zwischen An / Cc / Bcc.
 */
export default function RecipientField({
  field,
  recipients,
  onMove,
  placeholder = 'E-Mail hinzufügen'
}) {
  const [draft, setDraft] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const commitDraft = () => {
    const added = addressesFromDraft(draft);
    if (added.length) onMove(added, field);
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (['Enter', 'Tab', ',', ';'].includes(e.key)) {
      if (draft.trim()) {
        e.preventDefault();
        commitDraft();
      }
    } else if (e.key === 'Backspace' && !draft && recipients.length) {
      onMove([recipients[recipients.length - 1]], null);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      const email = extractEmail(payload.email);
      if (email) onMove([email], field);
    } catch {
      const text = e.dataTransfer.getData('text/plain');
      const added = addressesFromDraft(text);
      if (added.length) onMove(added, field);
    }
  };

  return (
    <div
      className={`rf-box${dragOver ? ' drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
    >
      {recipients.map((email) => (
        <span
          key={email}
          className="rf-pill"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ email, from: field }));
            e.dataTransfer.setData('text/plain', email);
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
          {email}
          <button
            type="button"
            className="rf-pill-x"
            aria-label={`${email} entfernen`}
            onClick={(ev) => {
              ev.stopPropagation();
              onMove([email], null);
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="rf-input"
        value={draft}
        placeholder={recipients.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commitDraft}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          const added = uniqueAddresses(addressesFromDraft(text));
          if (added.length && /[,;\s]/.test(text)) {
            e.preventDefault();
            onMove(added, field);
            setDraft('');
          }
        }}
      />
    </div>
  );
}
