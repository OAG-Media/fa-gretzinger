import React from 'react';

/** Dropdown: Variable mit deutschem Label wählen → {{schlüssel}} einfügen. */
export default function TemplateVariableInsert({ variables, onInsert, label = 'Variable einfügen…' }) {
  if (!variables?.length) return null;

  return (
    <select
      className="tpl-var-select"
      value=""
      title="Variable an Cursor-Position einfügen"
      onChange={(e) => {
        const key = e.target.value;
        if (key) onInsert(`{{${key}}}`);
        e.target.value = '';
      }}
      style={{
        padding: '6px 10px',
        border: '1px solid #d1d5db',
        borderRadius: 6,
        background: '#fff',
        fontSize: 13,
        color: '#1d426a',
        cursor: 'pointer',
        maxWidth: '100%'
      }}
    >
      <option value="">{label}</option>
      {variables.map((v) => (
        <option key={v.key} value={v.key}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
