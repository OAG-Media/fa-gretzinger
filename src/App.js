import React, { useState } from 'react';
import './App.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COUNTRY_OPTIONS = [
  { key: 'DE', label: 'Deutschland', arbeitszeit: 22.0, porto: 5.95 },
  { key: 'AT', label: 'Österreich', arbeitszeit: 26.0, porto: 9.0 },
];

const FREIGABE_OPTIONS = [
  'Reparatur laut KV durchführen',
  'Unrepariert zurückschicken',
  'Verschrotten',
];

const FEHLERANGABEN = [
  'Gerät funktioniert nicht',
  'Gerät setzt aus',
  'Setzt aus bei Druck und Verwindung',
  'Gerät ist zu leise',
  'Lässt sich nicht ein- ausschalten',
  'Hörspule ohne Funktion',
  'Lautstärkeregelung ist mangelhaft',
  'Gerät rauscht',
  'Gerät macht Geräusche',
  'Gerät verzerrt',
  'Batterieverbrauch zu hoch',
  'Akustische Rückkopplung vorhanden',
  'Gerät schwingt',
  'Lässt sich nicht auslesen / programmieren',
  'Akku zu schwach',
];

const ARBEITEN = [
  { key: 'fehlerdiagnose', label: 'Fehlerdiagnose', price: 3.5 },
  { key: 'hoerer', label: 'Hörer' },
  { key: 'mikrofon', label: 'Mikrofon' },
  { key: 'schalter', label: 'Schalter / Taster' },
  { key: 'poti', label: 'Poti / LS-Wippe' },
  { key: 'batterie', label: 'Batterie / Akku' },
  { key: 'gehaeuse', label: 'Gehäuse / IDO Schale' },
  { key: 'gehaeuseteil', label: 'Gehäuseteil / Faceplate' },
  { key: 'winkel', label: 'Winkel' },
  { key: 'batteriekontakte', label: 'Batteriekontakte' },
  { key: 'bluetooth', label: 'Bluetooth-Board' },
  { key: 'noahlink', label: 'NOAHlink Buchse' },
  { key: 'verstaerker', label: 'Verstärker' },
  { key: 'hoerspule', label: 'Hörspule/ Funkspule' },
  { key: 'akrohr_hoerer', label: 'Ak.Rohr od. Lagerung für Hörer' },
  { key: 'akrohr_mikro', label: 'Ak.Rohr od. Lagerung für Mikrof.' },
  { key: 'reinigung', label: 'Reinigung', price: 5.0 },
  { key: 'verglasen', label: 'Verglasen, bzw. Antirutschb.' },
  { key: 'kleinmaterial', label: 'Kleinmaterial', price: 2.0 },
  { key: 'nearcom', label: 'nEARcom-Reparaturpauschale' },
  { key: 'arbeitszeit', label: 'Arbeitszeit', price: 'country' },
  { key: 'endkontrolle', label: 'Endkontrolle', price: 3.0 },
];

function App() {
  const [country, setCountry] = useState('DE');
  const [freigabe, setFreigabe] = useState('Reparatur laut KV durchführen');
  const [fehler, setFehler] = useState({});
  const [arbeiten, setArbeiten] = useState({});
  const [arbeitenManual, setArbeitenManual] = useState({});
  const [bottom, setBottom] = useState('kostenpflichtig');
  const [reklamationDate, setReklamationDate] = useState('');
  const [kulanzPorto, setKulanzPorto] = useState('ja');

  // Logic for disabling all fields if not 'Reparatur laut KV durchführen' or if Verfahren disables fields
  const verfahrenDisables = bottom === 'garantie' || bottom === 'reklamation' || bottom === 'kulanz';
  const isDisabled = freigabe !== 'Reparatur laut KV durchführen' || verfahrenDisables;
  const hideFields = isDisabled || verfahrenDisables;

  // Reset handler
  const handleReset = () => {
    setArbeiten({});
    setArbeitenManual({});
  };

  // Handlers
  const handleCountry = (e) => setCountry(e.target.value);
  const handleFreigabe = (val) => setFreigabe(val);
  const handleFehler = (key) => setFehler((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleArbeiten = (key) => setArbeiten((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleArbeitenManual = (key, value) => {
    value = value.replace(/[^0-9,]/g, '');
    value = value.replace(/(,.*),/g, '$1');
    setArbeitenManual((prev) => ({ ...prev, [key]: value }));
  };
  const handleBottom = (val) => {
    setBottom(val);
    if (val !== 'kostenpflichtig') setKulanzPorto('ja');
    if (val !== 'reklamation') setReklamationDate('');
  };
  const handleKulanzPorto = (val) => setKulanzPorto(val);
  const handleReklamationDate = (e) => setReklamationDate(e.target.value);

  // Calculation
  const countryObj = COUNTRY_OPTIONS.find((c) => c.key === country);
  let net = 0;
  let porto = countryObj ? countryObj.porto : 0;
  let arbeitszeit = countryObj ? countryObj.arbeitszeit : 0;

  if (freigabe === 'Unrepariert zurückschicken') {
    net = 14.95;
    porto = 0;
  } else if (freigabe === 'Verschrotten') {
    net = 0;
    porto = 0;
  } else if (bottom === 'kostenpflichtig') {
    ARBEITEN.forEach((a) => {
      if (arbeiten[a.key]) {
        if (a.price) {
          if (a.price === 'country') net += arbeitszeit;
          else net += a.price;
        } else {
          // Manual field
          const val = arbeitenManual[a.key];
          if (val) net += parseFloat(val.replace(',', '.')) || 0;
        }
      }
    });
    net += porto;
  } else if (bottom === 'garantie' || bottom === 'reklamation') {
    net = 0;
    porto = 0;
  } else if (bottom === 'kulanz') {
    net = 0;
    if (kulanzPorto === 'nein') porto = 0;
  }

  // PDF Export function
  const handlePdfExport = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    // Header
    doc.setFont('helvetica', '');
    doc.setFontSize(10);
    doc.text('HG Gretzinger UG, Hörgeräteservice', 10, 12);
    doc.text('Gibitzenhofstr. 86', 10, 17);
    doc.text('90443 Nürnberg', 10, 22);
    doc.text('Homepage: www.Fa-Gretzinger.de', 10, 27);
    doc.text('E-Mail: Fa.Gretzinger@t-online.de', 10, 32);
    doc.text('Tel. +49 (0)911 / 540 49 44, Fax.: 540 49 46', 10, 37);
    doc.addImage('https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png', 'PNG', 155, 8, 35, 16);
    doc.setLineWidth(0.3);
    doc.line(10, 40, 200, 40);

    // Title
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Reparaturauftrag', 105, 52, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    // More padding below title
    let y = 68;

    // Column positions
    const leftX = 14;
    const separatorX = 100; // move separator further right
    const rightX = separatorX + 4; // right column starts just after separator
    const priceColX = 190; // fixed X for right-aligned prices
    const sectionPad = 8;
    const linePad = 6;
    const labelPad = 8;

    // Left column: Freigabe, Fehlerangaben, Verfahren
    let yLeft = y;
    doc.setFont(undefined, 'bold');
    doc.text('Bei Freigabe bitte ankreuzen:', leftX, yLeft);
    doc.setFont(undefined, 'normal');
    yLeft += linePad + 1;
    FREIGABE_OPTIONS.forEach(opt => {
      const checked = freigabe === opt;
      drawCheckbox(doc, leftX + 2, yLeft - 3.5, checked);
      doc.text(opt, leftX + 8, yLeft);
      yLeft += linePad;
    });
    yLeft += sectionPad;
    doc.setFont(undefined, 'bold');
    doc.text('Fehlerangaben:', leftX, yLeft);
    doc.setFont(undefined, 'normal');
    yLeft += linePad + 1;
    FEHLERANGABEN.forEach((f, idx) => {
      const checked = !!fehler[f];
      drawCheckbox(doc, leftX + 2, yLeft - 3.5, checked);
      doc.text(f, leftX + 8, yLeft);
      yLeft += linePad - 1;
      if (idx === FEHLERANGABEN.length - 1) {
        yLeft += sectionPad;
      }
    });
    doc.setFont(undefined, 'bold');
    doc.text('Verfahren:', leftX, yLeft);
    doc.setFont(undefined, 'normal');
    yLeft += linePad + 1;
    const verfahrenOptions = [
      { label: 'Kostenpflichtige Reparatur', value: 'kostenpflichtig' },
      { label: 'Garantie', value: 'garantie' },
      { label: 'Reklamation auf Reparatur von', value: 'reklamation' },
      { label: 'Kulanz', value: 'kulanz' },
    ];
    verfahrenOptions.forEach(opt => {
      const checked = bottom === opt.value;
      let label = opt.label;
      if (opt.value === 'reklamation' && bottom === 'reklamation' && reklamationDate) {
        // Format date as DD.MM.YYYY
        const [yyyy, mm, dd] = reklamationDate.split('-');
        label += ' ';
        doc.setFont(undefined, checked ? 'bold' : 'normal');
        drawCheckbox(doc, leftX + 2, yLeft - 3.5, checked);
        doc.text(label, leftX + 8, yLeft);
        if (reklamationDate) {
          doc.text(`${dd}.${mm}.${yyyy}`, leftX + 8 + doc.getTextWidth(label) + 2, yLeft, { font: 'helvetica', fontStyle: 'bold' });
        }
        doc.setFont(undefined, 'normal');
      } else {
        drawCheckbox(doc, leftX + 2, yLeft - 3.5, checked);
        doc.text(label, leftX + 8, yLeft);
      }
      yLeft += linePad;
    });
    if (bottom === 'kulanz') {
      yLeft += 1;
      drawCheckbox(doc, leftX + 10, yLeft - 3.5, kulanzPorto === 'ja');
      doc.text('Porto ja', leftX + 16, yLeft);
      drawCheckbox(doc, leftX + 38, yLeft - 3.5, kulanzPorto === 'nein');
      doc.text('Porto nein', leftX + 44, yLeft);
      yLeft += linePad;
    }

    // Right column: Ausgeführte Arbeiten (true 3-column grid)
    let yRight = y;
    doc.setFont(undefined, 'bold');
    doc.text('Ausgeführte Arbeiten:', rightX, yRight);
    doc.setFont(undefined, 'normal');
    yRight += linePad + 1;

    // Find max label width for price alignment (calculate before the loop)
    let maxLabelWidth = 0;
    ARBEITEN.forEach(a => {
      const labelWidth = doc.getTextWidth(a.label);
      if (labelWidth > maxLabelWidth) maxLabelWidth = labelWidth;
    });
    ARBEITEN.forEach(a => {
      const checked = !!arbeiten[a.key];
      let value = '';
      if (checked) {
        if (bottom === 'kostenpflichtig') {
          if (a.price && a.price !== 'country') value = `${a.price.toFixed(2).replace('.', ',')} €`;
          else if (a.price === 'country') value = `${arbeitszeit.toFixed(2).replace('.', ',')} €`;
          else if (arbeitenManual[a.key]) value = `${arbeitenManual[a.key]} €`;
        } else {
          value = '0,00 €';
        }
      }
      // Checkbox
      drawCheckbox(doc, rightX + 2, yRight - 3.5, checked);
      // Label: fill space between checkbox and price, truncate if needed
      let labelMaxWidth = priceColX - (rightX + 2 + labelPad) - 8; // 8mm gap before price
      let labelText = a.label;
      let labelWidth = doc.getTextWidth(labelText);
      if (labelWidth > labelMaxWidth) {
        while (labelText.length > 2 && doc.getTextWidth(labelText + '…') > labelMaxWidth) {
          labelText = labelText.slice(0, -1);
        }
        labelText += '…';
      }
      doc.text(labelText, rightX + 2 + labelPad, yRight);
      // Price (only if checked)
      if (value) doc.text(value, priceColX, yRight, { align: 'right' });
      yRight += linePad;
    });
    yRight += sectionPad;

    // Draw vertical line between columns (only after left grid finishes)
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(separatorX, y, separatorX, Math.max(yLeft, yRight) + 5);

    // Draw horizontal separator line below the grid
    const sepY = Math.max(yLeft, yRight) + 10;
    doc.line(10, sepY, 200, sepY);

    // Nettopreis & Porto below the new separator, right-aligned
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text(`Nettopreis: ${net.toFixed(2).replace('.', ',')} €`, rightX + 8 + maxLabelWidth + 10, sepY + 10, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`+ Porto & Verpackung: ${porto.toFixed(2).replace('.', ',')} €`, rightX + 8 + maxLabelWidth + 10, sepY + 16, { align: 'right' });

    doc.save('reparaturauftrag.pdf');
  };

  const drawCheckbox = (doc, x, y, checked) => {
    doc.setDrawColor(50);
    doc.rect(x, y, 4, 4);
    if (checked) {
      doc.setLineWidth(0.6);
      doc.line(x + 0.7, y + 0.7, x + 3.3, y + 3.3);
      doc.line(x + 3.3, y + 0.7, x + 0.7, y + 3.3);
      doc.setLineWidth(0.2);
    }
  };

  // UI
  const boxStyle = {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: '1.2rem 1.5rem',
    marginBottom: 20,
    boxShadow: '0 1px 4px #0001',
  };

  return (
    <div className="App" style={{ fontFamily: 'Arial, sans-serif', background: '#fff', minHeight: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '2rem 1rem 1rem 1rem', borderBottom: '1px solid #eee' }}>
        <img src="https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png" alt="Gretzinger Logo" style={{ height: 80, marginRight: 24 }} />
        <h1 style={{ fontWeight: 400, color: '#1d426a', fontSize: '2rem', margin: 0 }}>Reparaturauftrag</h1>
      </header>
      <div style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gap: '1.5rem',
        maxWidth: 950,
        margin: '2rem auto',
        padding: '2rem',
        background: '#fafbfc',
        borderRadius: 8,
        boxShadow: '0 2px 8px #0001'
      }}>
        {/* Top row: Zurücksetzen button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={isDisabled}
            style={{
              padding: '6px 18px',
              fontSize: 15,
              background: isDisabled ? '#eee' : '#f5f5f5',
              color: isDisabled ? '#aaa' : '#1d426a',
              border: '1px solid #ccc',
              borderRadius: 6,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              alignSelf: 'center',
            }}
          >
            Zurücksetzen
          </button>
        </div>
        {/* Middle row: Main form content */}
        <form style={{ display: 'flex', flexDirection: 'row', gap: '2rem' }}>
          {/* Left column */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Bei Freigabe bitte ankreuzen:</div>
              {FREIGABE_OPTIONS.map((opt) => (
                <label key={opt} style={{ display: 'block', marginBottom: 4, textAlign: 'left' }}>
                  <input type="radio" name="freigabe" checked={freigabe === opt} onChange={() => handleFreigabe(opt)} /> {opt}
                </label>
              ))}
            </div>
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Fehlerangaben:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {FEHLERANGABEN.map((f) => (
                  <label key={f} style={{ fontSize: 15, textAlign: 'left' }}>
                    <input type="checkbox" checked={!!fehler[f]} onChange={() => handleFehler(f)} disabled={isDisabled} /> {f}
                  </label>
                ))}
              </div>
            </div>
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Verfahren:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', alignItems: 'flex-start' }}>
                <label>
                  <input type="radio" name="bottom" checked={bottom === 'kostenpflichtig'} onChange={() => handleBottom('kostenpflichtig')} /> Kostenpflichtige Reparatur
                </label>
                <label>
                  <input type="radio" name="bottom" checked={bottom === 'garantie'} onChange={() => handleBottom('garantie')} disabled={freigabe !== 'Reparatur laut KV durchführen'} /> Garantie
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <input type="radio" name="bottom" checked={bottom === 'reklamation'} onChange={() => handleBottom('reklamation')} disabled={freigabe !== 'Reparatur laut KV durchführen'} style={{ marginTop: 2 }} />
                    <span>Reklamation auf Reparatur von</span>
                  </label>
                  {bottom === 'reklamation' && (
                    <input type="date" value={reklamationDate} onChange={handleReklamationDate} style={{ fontSize: 15, marginLeft: 28, marginTop: 2 }} disabled={freigabe !== 'Reparatur laut KV durchführen'} />
                  )}
                </div>
                <label>
                  <input type="radio" name="bottom" checked={bottom === 'kulanz'} onChange={() => handleBottom('kulanz')} disabled={freigabe !== 'Reparatur laut KV durchführen'} /> Kulanz
                </label>
                <div style={{ marginLeft: 24, marginTop: 4, opacity: bottom === 'kulanz' && freigabe === 'Reparatur laut KV durchführen' ? 1 : 0.5, pointerEvents: bottom === 'kulanz' && freigabe === 'Reparatur laut KV durchführen' ? 'auto' : 'none' }}>
                  <label style={{ marginRight: 16 }}>
                    <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'ja'} disabled={bottom !== 'kulanz' || freigabe !== 'Reparatur laut KV durchführen'} onChange={() => handleKulanzPorto('ja')} /> Porto ja
                  </label>
                  <label>
                    <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'nein'} disabled={bottom !== 'kulanz' || freigabe !== 'Reparatur laut KV durchführen'} onChange={() => handleKulanzPorto('nein')} /> Porto nein
                  </label>
                </div>
              </div>
            </div>
          </div>
          {/* Right column */}
          <div style={{ flex: 2, minWidth: 340 }}>
            <div style={boxStyle}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <label style={{ fontWeight: 600, minWidth: 180, textAlign: 'left' }}>Land:</label>
                <select value={country} onChange={handleCountry} style={{ fontSize: 16, padding: 4 }}>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Ausgeführte Arbeiten:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ARBEITEN.map((a) => {
                  const checked = !!arbeiten[a.key];
                  // Determine if this row needs a price or input field
                  const showPrice = !hideFields && a.price && a.price !== 'country';
                  const showCountryPrice = !hideFields && a.price === 'country';
                  const showInput = !hideFields && !a.price;
                  return (
                    <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, textAlign: 'left', minHeight: 36 }}>
                      <input type="checkbox" checked={checked} onChange={() => handleArbeiten(a.key)} disabled={isDisabled} style={{ alignSelf: 'center' }} />
                      <span style={{ flex: 1, paddingRight: 10, alignSelf: 'center', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
                      {(showPrice || showCountryPrice) && (
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: 15, color: checked ? '#222' : '#888' }}>
                          <span>{showPrice ? a.price.toFixed(2).replace('.', ',') : arbeitszeit.toFixed(2).replace('.', ',')}</span>
                          <span style={{ marginLeft: 4 }}>€</span>
                        </div>
                      )}
                      {showInput && (
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: 15 }}>
                          <input
                            type="text"
                            value={arbeitenManual[a.key] || ''}
                            onChange={e => handleArbeitenManual(a.key, e.target.value)}
                            style={{ fontSize: 15, width: 70, color: checked ? '#222' : '#888', background: checked ? '#fff' : '#f5f5f5', borderColor: checked ? '#ccc' : '#eee', textAlign: 'center' }}
                            inputMode="decimal"
                            pattern="[0-9,]*"
                            disabled={!checked || isDisabled || bottom !== 'kostenpflichtig'}
                          />
                          <span style={{ marginLeft: 4, color: checked ? '#222' : '#888' }}>€</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ ...boxStyle, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 20 }}>
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'max-content max-content', gridTemplateRows: 'max-content max-content', justifyContent: 'end', alignItems: 'center', gap: '0 32px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1d426a', textAlign: 'right', gridColumn: 1, gridRow: 1 }}>
                  Nettopreis:
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1d426a', textAlign: 'right', gridColumn: 2, gridRow: 1 }}>
                  {net.toFixed(2).replace('.', ',')} €
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#222', textAlign: 'right', gridColumn: 1, gridRow: 2 }}>
                  + Porto & Verpackung:
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#222', textAlign: 'right', gridColumn: 2, gridRow: 2 }}>
                  {porto.toFixed(2).replace('.', ',')} €
                </div>
              </div>
            </div>
          </div>
        </form>
        {/* Bottom row: PDF Export button right-aligned */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handlePdfExport}
            style={{ padding: '8px 18px', fontSize: 15, background: '#1d426a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            PDF Export
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
