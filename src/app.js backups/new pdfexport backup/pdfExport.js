import jsPDF from 'jspdf';

// ============================================================================
// PDF EXPORT CONSTANTS & VARIABLES
// ============================================================================

// PDF Document Settings
const PDF_SETTINGS = {
  unit: 'mm',
  format: 'a4'
};

// Layout Constants
const LAYOUT = {
  zeile: 12,
  leftX: 20,
  leftxRow: 65,
  rightYstop: 192,
  separatorX: 100,
  rightX: 110, // separatorX + 10
  priceColX: 190,
  sectionPad: 4,
  linePad: 6,
  labelPad: 8,
  startcheckbox: 103
};

// Table Constants
const TABLE = {
  colWidth: 30,
  startX: 21, // leftX + 1
  padding: 1
};

// Workshop Constants
const WORKSHOP = {
  repWerkstattNotiz: 130, // leftX + 110
  perFaxMail: 182, // repWerkstattNotiz + 52
  gesendetanwerkstattX: 147, // leftX + 127
  werkstattausgangY: 262,
  werkstattausgangX: 144
};

// Kostenvoranschlag Constants
const KOSTENVORANSCHLAG = {
  kvYabNetto: 73,
  kvXabNetto: 45 // leftX + 25
};

// Verfahren Constants
const VERFAHREN = {
  verfahrenY: 228
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Global helper function to draw checkboxes in PDF
export const drawCheckbox = (doc, x, y, checked) => {
  doc.setDrawColor(50);
  doc.rect(x, y, 4, 4);
  if (checked) {
    doc.setLineWidth(0.6);
    doc.line(x + 0.7, y + 0.7, x + 3.3, y + 3.3);
    doc.line(x + 3.3, y + 0.7, x + 0.7, y + 3.3);
    doc.setLineWidth(0.2);
  }
};

// Format date helper
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const [yyyy, mm, dd] = dateString.split('-');
  return `${dd}.${mm}.${yyyy}`;
};

// Format price helper
export const formatPrice = (price) => {
  if (!price || price === 0) return '0,00 €';
  return `${price.toFixed(2).replace('.', ',')} €`;
};

// Format datetime helper
export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ============================================================================
// PDF BUILDING FUNCTIONS (in logical order)
// ============================================================================

// 1. HEADER + LOGO
const buildHeader = (doc) => {
  doc.setFont('helvetica', '');
  doc.setFontSize(8);
  doc.text('HG Gretzinger UG, Hörgeräteservice', LAYOUT.leftX, LAYOUT.zeile);
  doc.text('Gibitzenhofstr. 86', LAYOUT.leftX, LAYOUT.zeile + 4);
  doc.text('90443 Nürnberg', LAYOUT.leftX, LAYOUT.zeile + 8);
  doc.text('Homepage: www.Fa-Gretzinger.de', LAYOUT.leftxRow, LAYOUT.zeile);
  doc.text('E-Mail: Fa.Gretzinger@t-online.de', LAYOUT.leftxRow, LAYOUT.zeile + 4);
  doc.text('Tel. +49 (0)911 / 540 49 44, Fax.: 540 49 46', LAYOUT.leftxRow, LAYOUT.zeile + 8);
  doc.addImage('https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png', 'PNG', 165, 8, 33, 14);
  doc.setLineWidth(0.2);
  doc.line(LAYOUT.leftX, LAYOUT.zeile + 14, 200, LAYOUT.zeile + 14);
};

// 2. SEPARATOR LINE
const buildSeparator = (doc) => {
  // Separator line is built in header function
};

// 3. AKUSTIKER (Customer Information)
const buildAkustiker = (doc, selectedCustomer) => {
  const customerInfo = LAYOUT.zeile + 20;
  if (selectedCustomer) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Akustikername / Absender bzw. Firmenstempel:', 10, customerInfo);
    doc.setFont(undefined, 'normal');
    doc.text(selectedCustomer.company, 10, customerInfo + 4);
    doc.text(selectedCustomer.street, 10, customerInfo + 8);
    doc.text(`${selectedCustomer.location}, ${selectedCustomer.country}`, 10, customerInfo + 12);
  }
  return customerInfo;
};

// 4. REPARATURAUFTRAG (Title)
const buildReparaturauftrag = (doc, customerInfo) => {
  const repauftrag = customerInfo + 17;
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('Reparaturauftrag', 105, repauftrag, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  return repauftrag;
};

// 5. GESENDET AN DIE WERKSTATT
const buildGesendetAnWerkstatt = (doc, formData, notesY) => {
  if (formData.werkstattDate) {
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('gesendet an die Werkstatt:', WORKSHOP.gesendetanwerkstattX, notesY - 20);
    doc.setFont(undefined, 'normal');
    
    // Format date as DD.MM.YYYY
    const [yyyy, mm, dd] = formData.werkstattDate.split('-');
    doc.setFontSize(8);
    doc.text(`${dd}.${mm}.${yyyy}`, WORKSHOP.gesendetanwerkstattX + 33, notesY - 20);
  }
};

// 6. TABLE + CONTENT
const buildTable = (doc, repauftrag, formData) => {
  const {
    kommission,
    hersteller,
    geraetetyp,
    seriennummer,
    werkstatteingang,
    zubehoer,
    kvDate,
    perMethod,
    werkstattNotiz,
    werkstattDate,
    werkstattausgang
  } = formData;

  let y = repauftrag + 8;
  
  // Always show the table, even if empty (will show dashes)
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  
  // Table headers with 1px padding
  const tableY = y + 1;
  const startX = TABLE.startX;
  
  // Draw table borders with minimal padding
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  
  // Draw horizontal lines with minimal padding
  doc.line(startX - 1, tableY - 3, startX + TABLE.colWidth * 6 - 1, tableY - 3);
  doc.line(startX - 1, tableY + 11, startX + TABLE.colWidth * 6 - 1, tableY + 11);
  
  // Draw vertical lines with minimal padding
  doc.line(startX - 1, tableY - 3, startX - 1, tableY + 11);
  doc.line(startX + TABLE.colWidth - 1, tableY - 3, startX + TABLE.colWidth - 1, tableY + 11);
  doc.line(startX + TABLE.colWidth * 2 - 1, tableY - 3, startX + TABLE.colWidth * 2 - 1, tableY + 11);
  doc.line(startX + TABLE.colWidth * 3 - 1, tableY - 3, startX + TABLE.colWidth * 3 - 1, tableY + 11);
  doc.line(startX + TABLE.colWidth * 4 - 1, tableY - 3, startX + TABLE.colWidth * 4 - 1, tableY + 11);
  doc.line(startX + TABLE.colWidth * 5 - 1, tableY - 3, startX + TABLE.colWidth * 5 - 1, tableY + 11);
  doc.line(startX + TABLE.colWidth * 6 - 1, tableY - 3, startX + TABLE.colWidth * 6 - 1, tableY + 11);
  
  // Headers with padding
  doc.text('Kommission', startX, tableY);
  doc.text('Hersteller', startX + TABLE.colWidth, tableY);
  doc.text('Gerätetyp', startX + TABLE.colWidth * 2, tableY);
  doc.text('Seriennummer', startX + TABLE.colWidth * 3, tableY);
  doc.text('Werkstatteingang', startX + TABLE.colWidth * 4, tableY);
  doc.text('Zubehör', startX + TABLE.colWidth * 5, tableY);
  
  // Data row with padding - always show with fixed length and dashes for empty fields
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.text(kommission || '-', startX, tableY + 8);
  doc.text(hersteller || '-', startX + TABLE.colWidth, tableY + 8);
  doc.text(geraetetyp || '-', startX + TABLE.colWidth * 2, tableY + 8);
  doc.text(seriennummer || '-', startX + TABLE.colWidth * 3, tableY + 8);
  
  // Format date for Werkstatteingang
  let werkstatteingangFormatted = '-';
  if (werkstatteingang) {
    const [yyyy, mm, dd] = werkstatteingang.split('-');
    werkstatteingangFormatted = `${dd}.${mm}.${yyyy}`;
  }
  doc.text(werkstatteingangFormatted, startX + TABLE.colWidth * 4, tableY + 8);
  doc.text(zubehoer || '-', startX + TABLE.colWidth * 5, tableY + 8);
  
  // Workshop Notes
  if (kvDate || perMethod || werkstattNotiz) {
    doc.setFontSize(8);
    let notesY = tableY + 15;
    doc.setFont(undefined, 'bold');
    doc.text('Rep. werkstatt Notiz: KV am:', WORKSHOP.repWerkstattNotiz, notesY);
    doc.setFont(undefined, 'normal');
    
    if (kvDate) {
      const [yyyy, mm, dd] = kvDate.split('-');
      doc.text(` ${dd}.${mm}.${yyyy}`, WORKSHOP.repWerkstattNotiz + 37, notesY);
    }

    // Workshop Date Section (Top Right)
    if (werkstattDate) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('gesendet an die Werkstatt:', WORKSHOP.gesendetanwerkstattX, notesY - 20);
      doc.setFont(undefined, 'normal');
      
      // Format date as DD.MM.YYYY
      const [yyyy, mm, dd] = werkstattDate.split('-');
      doc.setFontSize(8);
      doc.text(`${dd}.${mm}.${yyyy}`, WORKSHOP.gesendetanwerkstattX + 33, notesY - 20);
    }

    // Werkstattausgang Section (Top Right)
    const werkstattausgangY = 262;
    const werkstattausgangX = 144;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Werkstattausgang:', werkstattausgangX, werkstattausgangY);
    doc.setFont(undefined, 'normal');
    
    if (werkstattausgang) {
      // Format date as DD.MM.YYYY
      const [yyyy, mm, dd] = werkstattausgang.split('-');
      doc.setFontSize(8);
      doc.text(`${dd}.${mm}.${yyyy}`, werkstattausgangX + 24, werkstattausgangY);
    } else {
      doc.text('-', 175, notesY - 15);
    }
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('per:', WORKSHOP.perFaxMail, notesY);
    doc.setFont(undefined, 'normal');
    doc.text(perMethod || '', WORKSHOP.perFaxMail + 6, notesY);
  }
  
  y = tableY + 10;
  return Math.max(y, 82);
};

// 7. KOSTENVORANSCHLAG
const buildKostenvoranschlag = (doc, kostenvoranschlagChecked, kostenvoranschlagAmount) => {
  // Kostenvoranschlag checkbox and amount
  drawCheckbox(doc, KOSTENVORANSCHLAG.kvXabNetto, KOSTENVORANSCHLAG.kvYabNetto - 2.5, kostenvoranschlagChecked);
  doc.text('ab', KOSTENVORANSCHLAG.kvXabNetto + 6, KOSTENVORANSCHLAG.kvYabNetto);
  
  if (kostenvoranschlagChecked && kostenvoranschlagAmount) {
    doc.text(kostenvoranschlagAmount, KOSTENVORANSCHLAG.kvXabNetto + 12, KOSTENVORANSCHLAG.kvYabNetto);
  } else {
    doc.text('_____', KOSTENVORANSCHLAG.kvXabNetto + 12, KOSTENVORANSCHLAG.kvYabNetto);
  }
  doc.text('€ - netto', KOSTENVORANSCHLAG.kvXabNetto + 25, KOSTENVORANSCHLAG.kvYabNetto);
};

// 8. REP. WERKSTATT NOTIZ
const buildRepWerkstattNotiz = (doc, werkstattNotiz) => {
  // This is handled in buildTable function
};

// 9. LEFT CONTENT: Freigabe / Fehlerangaben / Verfahren
const buildLeftContent = (doc, formData, constants) => {
  const {
    freigabe,
    fehler,
    bottom,
    reklamationDate,
    kulanzPorto,
    manualFehlerChecked1,
    manualFehler1,
    manualFehlerChecked2,
    manualFehler2,
    manualFehlerChecked3,
    manualFehler3
  } = formData;

  const { FREIGABE_OPTIONS, FEHLERANGABEN } = constants;

  // Left column: Freigabe, Fehlerangaben, Verfahren
  let yLeft = LAYOUT.startcheckbox + 32; // CheckBoxbereich
  doc.setFont(undefined, 'bold');
  doc.text('Bei Freigabe bitte ankreuzen:', LAYOUT.leftX, yLeft);
  doc.setFont(undefined, 'normal');
  yLeft += LAYOUT.linePad + 1;
  
  // Only show the actual repair options in PDF, not "Keine angabe"
  const pdfOptions = FREIGABE_OPTIONS.filter(opt => opt !== 'Keine angabe');
  pdfOptions.forEach(opt => {
    const checked = freigabe === opt;
    drawCheckbox(doc, LAYOUT.leftX + 1, yLeft - 2.5, checked);
    doc.text(opt, LAYOUT.leftX + 8, yLeft);
    yLeft += LAYOUT.linePad;
  });
  yLeft += LAYOUT.sectionPad;
  
  doc.setFont(undefined, 'bold');
  doc.text('Fehlerangaben:', LAYOUT.leftX, yLeft);
  doc.setFont(undefined, 'normal');
  yLeft += LAYOUT.linePad + 1;
  
  FEHLERANGABEN.forEach((f, idx) => {
    const checked = !!fehler[f];
    drawCheckbox(doc, LAYOUT.leftX + 1, yLeft - 2.5, checked);
    doc.text(f, LAYOUT.leftX + 8, yLeft);
    yLeft += LAYOUT.linePad;
    if (idx === FEHLERANGABEN.length - 1) {
      yLeft += LAYOUT.sectionPad;
    }
  });
  
  // Manual Fehlerangaben in PDF - Only show checked items
  if (manualFehlerChecked1 && manualFehler1) {
    drawCheckbox(doc, LAYOUT.leftX + 1, yLeft - 8, manualFehlerChecked1);
    doc.text(manualFehler1, LAYOUT.leftX + 8, yLeft - 5);
    yLeft += LAYOUT.linePad;
  }
  
  if (manualFehlerChecked2 && manualFehler2) {
    drawCheckbox(doc, LAYOUT.leftX + 1, yLeft - 8, manualFehlerChecked2);
    doc.text(manualFehler2, LAYOUT.leftX + 8, yLeft - 5);
    yLeft += LAYOUT.linePad;
  }
  
  if (manualFehlerChecked3 && manualFehler3) {
    drawCheckbox(doc, LAYOUT.leftX + 1, yLeft - 8, manualFehlerChecked3);
    doc.text(manualFehler3, LAYOUT.leftX + 8, yLeft - 5);
    yLeft += LAYOUT.linePad;
  }

  // Verfahren
  let verfahrenY = VERFAHREN.verfahrenY;
  doc.setFont(undefined, 'bold');
  doc.text('Verfahren:', LAYOUT.leftX, verfahrenY);
  doc.setFont(undefined, 'normal');
  verfahrenY += LAYOUT.linePad + 1;
  
  const verfahrenOptions = [
    { label: 'Kostenpflichtige Reparatur', value: 'kostenpflichtig' },
    { label: 'Garantie', value: 'garantie' },
    { label: 'Kulanz', value: 'kulanz' },
    { label: 'Reklamation', value: 'reklamation' }
  ];
  
  verfahrenOptions.forEach(opt => {
    const checked = bottom === opt.value;
    let label = opt.label;
    
    if (opt.value === 'reklamation' && reklamationDate) {
      const [yyyy, mm, dd] = reklamationDate.split('-');
      label += ' ';
      doc.setFont(undefined, checked ? 'bold' : 'normal');
      drawCheckbox(doc, LAYOUT.leftX + 1, verfahrenY - 3.5, checked);
      doc.text(label, LAYOUT.leftX + 8, verfahrenY);
      if (reklamationDate) {
        doc.text(`${dd}.${mm}.${yyyy}`, LAYOUT.leftX + 8 + doc.getTextWidth(label) + 2, verfahrenY, { font: 'helvetica', fontStyle: 'bold' });
      }
      doc.setFont(undefined, 'normal');
    } else {
      drawCheckbox(doc, LAYOUT.leftX + 1, verfahrenY - 3.5, checked);
      doc.text(label, LAYOUT.leftX + 8, verfahrenY);
    }
    verfahrenY += LAYOUT.linePad;
  });
  
  if (bottom === 'kulanz') {
    verfahrenY += 1;
    drawCheckbox(doc, LAYOUT.leftX + 10, verfahrenY - 3.5, kulanzPorto === 'ja');
    doc.text('Porto ja', LAYOUT.leftX + 16, verfahrenY);
    drawCheckbox(doc, LAYOUT.leftX + 38, verfahrenY - 3.5, kulanzPorto === 'nein');
    doc.text('Porto nein', LAYOUT.leftX + 44, verfahrenY);
    verfahrenY += LAYOUT.linePad;
  }
};

// 10. RIGHT CONTENT: Ausgeführte Arbeiten / Netto preis
const buildRightContent = (doc, formData, constants) => {
  const { arbeiten, arbeitenManual, arbeitszeit, net, porto } = formData;
  const { ARBEITEN } = constants;

  // Right column: Ausgeführte Arbeiten
  let yRight = LAYOUT.startcheckbox + 32; // CheckBoxbereich
  doc.setFont(undefined, 'bold');
  doc.text('Ausgeführte Arbeiten:', LAYOUT.rightX, yRight);
  doc.setFont(undefined, 'normal');
  yRight += LAYOUT.linePad + 1;
  
  ARBEITEN.forEach(a => {
    const checked = !!arbeiten[a.key];
    const showPrice = a.price && a.price !== 'country';
    const showCountryPrice = a.price === 'country';
    const showInput = !a.price;
    
    if (checked) {
      // Checkbox
      drawCheckbox(doc, LAYOUT.rightX + 2, yRight - 3.5, checked);
      // Label: fill space between checkbox and price, truncate if needed
      let labelMaxWidth = LAYOUT.priceColX - (LAYOUT.rightX + 2 + LAYOUT.labelPad) - 8; // 8mm gap before price
      let label = a.label;
      if (doc.getTextWidth(label) > labelMaxWidth) {
        // Truncate label to fit
        while (doc.getTextWidth(label + '...') > labelMaxWidth && label.length > 0) {
          label = label.slice(0, -1);
        }
        label += '...';
      }
      doc.text(label, LAYOUT.rightX + LAYOUT.labelPad, yRight);
      
      // Price or input
      if (showPrice) {
        doc.text(`${a.price.toFixed(2).replace('.', ',')} €`, LAYOUT.priceColX, yRight, { align: 'right' });
      } else if (showCountryPrice) {
        doc.text(`${arbeitszeit.toFixed(2).replace('.', ',')} €`, LAYOUT.priceColX, yRight, { align: 'right' });
      } else if (showInput && arbeitenManual[a.key]) {
        doc.text(`${arbeitenManual[a.key]} €`, LAYOUT.priceColX, yRight, { align: 'right' });
      }
    }
    yRight += LAYOUT.linePad;
  });
  
  // Nettopreis & Porto directly below "Ausgeführte Arbeiten", right-aligned
  const pricingY = yRight + 8;
  doc.setFont(undefined, 'bold');
  doc.text('Nettopreis:', LAYOUT.rightX, pricingY);
  doc.text(`${net.toFixed(2).replace('.', ',')} €`, LAYOUT.priceColX, pricingY, { align: 'right' });
  
  doc.text('+ Porto & Verpackung:', LAYOUT.rightX, pricingY + 8);
  doc.text(`${porto.toFixed(2).replace('.', ',')} €`, LAYOUT.priceColX, pricingY + 8, { align: 'right' });
  
  doc.setFont(undefined, 'bold');
  doc.text('Gesamt:', LAYOUT.rightX, pricingY + 16);
  doc.text(`${(net + porto).toFixed(2).replace('.', ',')} €`, LAYOUT.priceColX, pricingY + 16, { align: 'right' });
  
  return pricingY;
};

// 11. NOTIZEN / WERKSTATT AUSGANG
const buildNotizen = (doc, werkstattNotiz, notesY) => {
  if (werkstattNotiz && werkstattNotiz.trim() !== '') {
    doc.setFont(undefined, 'bold');
    doc.text('Notizen:', LAYOUT.leftX, notesY);
    doc.setFont(undefined, 'normal');
    doc.rect(LAYOUT.leftX, notesY + 5, 180, 20);
    doc.text(werkstattNotiz, LAYOUT.leftX + 5, notesY + 10);
  }
};

// ============================================================================
// MAIN PDF EXPORT FUNCTIONS
// ============================================================================

// Main PDF Export Function (for form)
export const handlePdfExport = (formData, constants) => {
  console.log('🔧 PDF Export started with formData:', formData);
  console.log('🔧 Constants:', constants);
  
  const doc = new jsPDF(PDF_SETTINGS);
  
  try {
    // Build PDF in logical order
    console.log('🔧 Building header...');
    buildHeader(doc);
    
    console.log('🔧 Building customer info...');
    const customerInfo = buildAkustiker(doc, formData.selectedCustomer);
    
    console.log('🔧 Building repair order title...');
    const repauftrag = buildReparaturauftrag(doc, customerInfo);
    
    console.log('🔧 Building table...');
    const y = buildTable(doc, repauftrag, formData);
    
    console.log('🔧 Building kostenvoranschlag...');
    buildKostenvoranschlag(doc, formData.kostenvoranschlagChecked, formData.kostenvoranschlagAmount);
    
    console.log('🔧 Building left content...');
    buildLeftContent(doc, formData, constants);
    
    console.log('🔧 Building right content...');
    const pricingY = buildRightContent(doc, formData, constants);
    
    console.log('🔧 Building notes...');
    buildNotizen(doc, formData.werkstattNotiz, pricingY + 30);
    
    // Save PDF
    const filename = `Reparaturauftrag_${formData.kommission || 'ohne_Kommission'}_${formData.selectedCustomer?.company || 'unbekannt'}.pdf`;
    console.log('🔧 Saving PDF as:', filename);
    doc.save(filename);
    
    console.log('✅ PDF Export completed successfully!');
  } catch (error) {
    console.error('❌ PDF Export failed:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// Table View PDF Export Function
export const handleExportPDF = (order, constants) => {
  const doc = new jsPDF(PDF_SETTINGS);
  
  // Customer Information
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Kundendaten:', 20, 50);
  doc.setFontSize(12);
  doc.text(`Firma: ${order.customers?.company || '-'}`, 25, 60);
  doc.text(`Filiale: ${order.customers?.branch || '-'}`, 25, 70);
  doc.text(`Adresse: ${order.customers?.street || '-'}, ${order.customers?.location || '-'}, ${order.customers?.country || '-'}`, 25, 80);
  
  // Repair Order Details
  doc.setFontSize(14);
  doc.text('Reparatur Details:', 20, 100);
  doc.setFontSize(12);
  doc.text(`Kommission: ${order.kommission || '-'}`, 25, 110);
  doc.text(`Hersteller: ${order.hersteller || '-'}`, 25, 120);
  doc.text(`Gerätetyp: ${order.geraetetyp || '-'}`, 25, 130);
  doc.text(`Seriennummer: ${order.seriennummer || '-'}`, 25, 140);
  doc.text(`Zubehör: ${order.zubehoer || '-'}`, 25, 150);
  
  // Workshop Details
  doc.setFontSize(14);
  doc.text('Werkstatt Details:', 20, 170);
  doc.setFontSize(12);
  doc.text(`Werkstatteingang: ${order.werkstatteingang ? formatDate(order.werkstatteingang) : '-'}`, 25, 180);
  doc.text(`KV am: ${order.kv_date ? formatDate(order.kv_date) : '-'}`, 25, 190);
  doc.text(`Per: ${order.per_method || '-'}`, 25, 200);
  doc.text(`Gesendet an Werkstatt: ${order.gesendet_an_werkstatt ? formatDate(order.gesendet_an_werkstatt) : '-'}`, 25, 210);
  doc.text(`Werkstattausgang: ${order.werkstattausgang ? formatDate(order.werkstattausgang) : '-'}`, 25, 220);
  
  // Kostenvoranschlag
  doc.setFontSize(14);
  doc.text('Kostenvoranschlag:', 20, 230);
  doc.setFontSize(12);
  if (order.kostenvoranschlag_checked) {
    doc.text(`ab ${order.kostenvoranschlag_amount || '_____'} € - netto`, 25, 240);
  } else {
    doc.text('Nicht angegeben', 25, 240);
  }
  
  // Prices
  doc.setFontSize(14);
  doc.text('Preise:', 20, 260);
  doc.setFontSize(12);
  doc.text(`Nettopreis: ${formatPrice(order.nettopreis)}`, 25, 270);
  doc.text(`Porto: ${formatPrice(order.porto)}`, 25, 280);
  doc.text(`Gesamt: ${formatPrice((order.nettopreis || 0) + (order.porto || 0))}`, 25, 290);
  
  // Timestamps
  doc.setFontSize(14);
  doc.text('Zeitstempel:', 20, 310);
  doc.setFontSize(12);
  doc.text(`Erstellt: ${formatDateTime(order.created_at)}`, 25, 320);
  doc.text(`Aktualisiert: ${formatDateTime(order.updated_at)}`, 25, 330);
  doc.text(`Version: ${order.version || 1}`, 25, 340);
  
  // Bei Freigabe bitte ankreuzen
  doc.setFontSize(14);
  doc.text('Bei Freigabe bitte ankreuzen:', 20, 360);
  doc.setFontSize(12);
  const pdfOptions = ['Reparatur laut KV durchführen', 'Unrepariert zurückschicken', 'Verschrotten'];
  let yPos = 370;
  pdfOptions.forEach(opt => {
    const checked = order.freigabe === opt;
    drawCheckbox(doc, 21, yPos - 2.5, checked);
    doc.text(opt, 28, yPos);
    yPos += 10;
  });
  
  // Workshop Notes
  if (order.werkstatt_notiz) {
    doc.setFontSize(14);
    doc.text('Werkstatt Notiz:', 20, yPos + 10);
    doc.setFontSize(12);
    doc.text(order.werkstatt_notiz, 25, yPos + 20);
  }
  
  // Save PDF
  const filename = `Reparaturauftrag_${order.kommission || 'ohne_Kommission'}_${order.customers?.company || 'unbekannt'}.pdf`;
  doc.save(filename);
};
