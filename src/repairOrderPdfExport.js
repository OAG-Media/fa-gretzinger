import jsPDF from 'jspdf';
import { buildKvPdfFilename } from './emailTemplateVars';

export const FREIGABE_OPTIONS = [
  'Keine angabe',
  'Reparatur laut KV durchführen',
  'Kostenpflichtige Reparatur',
  'Unrepariert zurückschicken',
  'Verschrotten',
  'Garantie',
  'Reklamation',
];

export const FEHLERANGABEN = [
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

export const ARBEITEN = [
  { key: 'fehlerdiagnose', label: 'Fehlerdiagnose', price: 3.5 },
  { key: 'hoerer', label: 'Hörer' },
  { key: 'mikrofon', label: 'Mikrofon' },
  { key: 'schalter', label: 'Schalter / Taster' },
  { key: 'poti', label: 'Poti / LS-Wippe' },
  { key: 'batterie', label: 'Batterie / Akku' },
  { key: 'gehaeuse', label: 'Gehäuse / IDO Schale' },
  { key: 'schale_repariert', label: 'Schale repariert' },
  { key: 'gehaeuseteil', label: 'Gehäuseteil / Faceplate' },
  { key: 'winkel', label: 'Winkel' },
  { key: 'zugfaden', label: 'Zugfaden' },
  { key: 'batteriekontakte', label: 'Batteriekontakte' },
  { key: 'bluetooth', label: 'Bluetooth-Board' },
  { key: 'cerumenschutz', label: 'Cerumenschutz' },
  { key: 'noahlink', label: 'NOAHlink Buchse' },
  { key: 'verstaerker', label: 'Verstärker' },
  { key: 'hoerspule', label: 'Hörspule/ Funkspule' },
  { key: 'akrohr_hoerer', label: 'Ak.Rohr od. Lagerung für Hörer' },
  { key: 'akrohr_mikro', label: 'Ak.Rohr od. Lagerung für Mikrof.' },
  { key: 'reinigung', label: 'Reinigung', price: 5.0 },
  { key: 'verglasen', label: 'Verglasen, bzw. Antirutschb.' },
  { key: 'kleinmaterial', label: 'Kleinmaterial', price: 2.0 },
  { key: 'nearcom', label: 'Noahlink / nEARcom Rep. Pauschale' },
  { key: 'arbeitszeit', label: 'Arbeitszeit', price: 'country' },
  { key: 'endkontrolle', label: 'Endkontrolle', price: 3.0 },
];

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

/**
 * Gleiche Reparaturauftrag/KV-PDF wie im Formular-Download.
 * @param {object} data Formular-/Auftragsdaten
 * @param {{ returnBase64?: boolean, filename?: string }} [options]
 */
export function generateRepairOrderPDF(data, options = {}) {

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const FONT = 'times'; // Times-Roman ≈ Times New Roman (jsPDF Standard)
    const zeile = 12;
    const leftX = 20;
    const leftxRow = 65;
    const rightXstop = 192;
    // Header
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.text('HG Gretzinger UG, Hörgeräteservice', leftX, zeile);
    doc.text('Gibitzenhofstr. 86', leftX, zeile+4);
    doc.text('90443 Nürnberg', leftX, zeile+8);
    doc.text('Homepage: www.Fa-Gretzinger.de', leftxRow, zeile);
    doc.text('E-Mail: Fa.Gretzinger@t-online.de', leftxRow, zeile+4);
    doc.text('Tel. +49 (0)911 / 540 49 44, Fax.: 540 49 46', leftxRow, zeile +8);
    doc.addImage('https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png', 'PNG', rightXstop-35, 8, 33, 14);
    doc.setLineWidth(0.2);
    doc.line(leftX, zeile+14, rightXstop, zeile+14);



    // Customer Information Section
    const customerInfo = zeile+18;
    if (data.selectedCustomer) {
      doc.setFontSize(8);
      doc.setFont(FONT, 'bold');
      doc.text('Akustikername / Absender bzw. Firmenstempel:',leftX, customerInfo);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(11);
      doc.text(data.selectedCustomer.company, leftX, customerInfo+5);
      doc.text(data.selectedCustomer.street, leftX, customerInfo+9);
      doc.text(`${data.selectedCustomer.location}, ${data.selectedCustomer.country}`, leftX, customerInfo+13);
    }

    // Title — etwas Abstand zur Akustiker-Adresse
    const repauftrag = customerInfo + 26;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(22);
    doc.text('Reparaturauftrag', leftX+85, repauftrag+3, { align: 'center' });
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);


    
    
    // Repair Order Details Table - Always show with fixed length
    let y = repauftrag + 8;
    // Always show the table, even if empty (will show dashes)
    {
      doc.setFontSize(10);
      doc.setFont(FONT, 'bold');
      
      // Table headers with 1px padding
      const tableY = y + 1; // Reduced to 1px top padding
      const colWidth = 30;
      const startX = leftX+1; // Reduced to 1px left padding (10 + 1)
      
      // Draw table borders with minimal padding
      doc.setDrawColor(0); // Black color
      doc.setLineWidth(0.3); // Thicker lines for table borders
      

      
      // Draw vertical lines with minimal padding
      const tableY1 = tableY - 3;
      const tableheight = 12.5;
      const tableY2 = tableY1 + tableheight;
      const tablestartX = startX-1;
      const tablenEndX = rightXstop
      const tableHeadingY = tableY1 + 3;
      const tableContentY = tableY2 -2;
      const txtdistancetable = 1.5;
      
      const komissionx1 = tablestartX;
      const komissionwidth = 30;
      const komissionx2 = startX + komissionwidth;
      const komissionTextX = komissionx1 + txtdistancetable;
     

      const herstellerx1 = komissionx2;
      const herstellerTextX = herstellerx1 + txtdistancetable;
      const herstellerwidth = 25;
      const herstellerx2 = herstellerx1 + herstellerwidth;

      const geraetetypx1 = herstellerx2;
      const geraetetypTextX = geraetetypx1 + txtdistancetable;
      const geraetetypwidth = 42;
      const geraetetypx2 = geraetetypx1 + geraetetypwidth;

      const seriennummerx1 = geraetetypx2;
      const seriennummerTextX = seriennummerx1 + txtdistancetable;
      const seriennummerwidth = 27;
      const seriennummerx2 = seriennummerx1 + seriennummerwidth;

      const werkstatteingangx1 = seriennummerx2;
      const werkstatteingangTextX = werkstatteingangx1 + txtdistancetable;
      const werkstatteingangwidth = 26;
      const werkstatteingangx2 = werkstatteingangx1 + werkstatteingangwidth;

      const zubehoerx1 = werkstatteingangx2;
      const zubehoerTextX = zubehoerx1 + txtdistancetable;
      const zubehoerwidth = 25;
      const zubehoerx2 = zubehoerx1 + zubehoerwidth;
      


      

      // vertical lines

      // Linienstärke anpassen
doc.setLineWidth(0.25); // Die Linie wird etwas dicker

// Linienfarbe auf hellgrau setzen
// doc.setDrawColor('#353839');
      doc.line(tablestartX, tableY1, tablestartX, tableY2); // first vertical line - left border

      doc.line(komissionx2, tableY1, komissionx2, tableY2); // second vertical line - komission endline
      doc.line(herstellerx2, tableY1, herstellerx2, tableY2); // third vertical line - data.hersteller endline
      doc.line(geraetetypx2, tableY1, geraetetypx2, tableY2); // fourth vertical line - data.geraetetyp endline
      doc.line(seriennummerx2, tableY1, seriennummerx2, tableY2); // fifth vertical line - data.seriennummer endline
      doc.line(werkstatteingangx2, tableY1, werkstatteingangx2, tableY2); // sixth vertical line - data.werkstatteingang endline

      doc.line(tablenEndX, tableY1, tablenEndX, tableY2); // last vertical line - right border

      // horizontal lines
      doc.line(tablestartX, tableY1, tablenEndX, tableY1); // top horizontal line
      doc.line(tablestartX, tableY2, tablenEndX, tableY2); // bottom horizontal line



            // Headers with padding
      
            doc.text('Kommission', komissionTextX, tableHeadingY);
            doc.text('Hersteller', herstellerTextX, tableHeadingY);
            doc.text('Gerätetyp', geraetetypTextX, tableHeadingY);
            doc.text('Seriennummer', seriennummerTextX, tableHeadingY);
            doc.text('Wkst. Eingang', werkstatteingangTextX, tableHeadingY);
            doc.text('Zubehör', zubehoerTextX, tableHeadingY);
            
            // Data row with padding - always show with fixed length and dashes for empty fields
            doc.setFont(FONT, 'normal');
            doc.setFontSize(10.5);
            doc.text(data.kommission || '-', komissionTextX, tableContentY);
            doc.text(data.hersteller || '-', herstellerTextX, tableContentY);
            doc.text(data.geraetetyp || '-', geraetetypTextX, tableContentY);
            doc.text(data.seriennummer || '-', seriennummerTextX, tableContentY);



      

      
      const repWerkstattNotiz = leftX+108
      const perFaxMail = repWerkstattNotiz +52

      // Format date for Werkstatteingang
      let werkstatteingangFormatted = '-';
      if (data.werkstatteingang) {
        const [yyyy, mm, dd] = data.werkstatteingang.split('-');
        werkstatteingangFormatted = `${dd}.${mm}.${yyyy}`;
      }
      doc.text(werkstatteingangFormatted, werkstatteingangTextX, tableContentY);
      doc.text(data.zubehoer || '-', zubehoerTextX, tableContentY);
      
      // Eine Zeile unter der Tabelle: Kostenvoranschlag (links) + Rep. werkstatt Notiz (rechts)
      const notesY = tableY + 15;
      const checkboxYOffsetKv = 2.8;

      doc.setFontSize(8);
      doc.setFont(FONT, 'bold');
      const kvLabel = 'Kostenvoranschlag:';
      doc.text(kvLabel, leftX, notesY);
      const kvLabelW = doc.getTextWidth(kvLabel);
      const kvCheckX = leftX + kvLabelW + 2;
      drawCheckbox(doc, kvCheckX, notesY - checkboxYOffsetKv, data.kostenvoranschlagChecked);
      doc.setFont(FONT, 'normal');
      doc.text('ab', kvCheckX + 6, notesY);
      if (data.kostenvoranschlagChecked && data.kostenvoranschlagAmount) {
        doc.text(`${data.kostenvoranschlagAmount} € - netto`, kvCheckX + 12, notesY);
      } else {
        doc.text('_____ € - netto', kvCheckX + 12, notesY);
      }

      // Rep. werkstatt Notiz auf derselben Höhe
      doc.setFont(FONT, 'bold');
      doc.text('Rep. werkstatt Notiz: KV am:', repWerkstattNotiz, notesY);
      doc.setFont(FONT, 'normal');
      if (data.kvDate) {
        const [yyyy, mm, dd] = data.kvDate.split('-');
        doc.text(` ${dd}.${mm}.${yyyy}`, repWerkstattNotiz+37, notesY);
      }
      doc.setFont(FONT, 'bold');
      doc.text('per:', perFaxMail, notesY);
      doc.setFont(FONT, 'normal');
      doc.text(data.perMethod || '', perFaxMail+6, notesY);

      // Auftrag von / Sendedatum (rechts oben)
      if (data.werkstattDate) {
        const [yyyy, mm, dd] = data.werkstattDate.split('-');
        const dateStr = `${dd}.${mm}.${yyyy}`;
        const sendLabel = (data.pdfVersion >= 2) ? 'Auftrag von: ' : 'Sendedatum: ';
        doc.setFontSize(8);
        doc.setFont(FONT, 'bold');
        const labelW = doc.getTextWidth(sendLabel);
        doc.setFont(FONT, 'normal');
        const dateW = doc.getTextWidth(dateStr);
        const blockLeft = rightXstop - labelW - dateW;
        doc.setFont(FONT, 'bold');
        doc.text(sendLabel, blockLeft, customerInfo);
        doc.setFont(FONT, 'normal');
        doc.text(dateStr, rightXstop, customerInfo, { align: 'right' });
      }
      
      y = tableY + 10; // Reduced margin below heading only
    }
    
    // More padding below title
    y = Math.max(y, 86);

    // Typography + spacing (einheitlich links/rechts)
    const SIZE_SECTION = 10;   // Überschriften (Freigabe, Fehlerangaben, Arbeiten, Kulanz, …)
    const SIZE_ITEM = 9;       // Checkbox-Beschriftungen
    const SIZE_PRICE_NET = 13;
    const SIZE_PRICE_PORTO = 8;
    const separatorX = 100;
    const rightX = separatorX + 10;
    const priceColX = 190;
    const sectionPad = 3.5;
    // Einheitlicher Zeilenabstand für beide Spalten (etwas enger als früher links)
    const linePad = 5.1;
    const labelPad = 8;
    const checkboxYOffset = 2.8;

    var CheckBoxbereich = repauftrag + 34;

    const setSectionHead = () => {
      doc.setFont(FONT, 'bold');
      doc.setFontSize(SIZE_SECTION);
    };
    const setItemText = () => {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(SIZE_ITEM);
    };

    // Left column: Freigabe, Fehlerangaben, Kulanz
    let yLeft = CheckBoxbereich;
    setSectionHead();
    doc.text('Bei Freigabe bitte ankreuzen:', leftX, CheckBoxbereich);
    setItemText();
    yLeft += linePad + 0.8;
    
    // Only show the actual repair options in PDF, not "Keine angabe"
    const pdfOptions = FREIGABE_OPTIONS.filter(opt => opt !== 'Keine angabe');
    pdfOptions.forEach(opt => {
      const checked = data.freigabe === opt;
      drawCheckbox(doc, leftX + 1, yLeft - checkboxYOffset, checked);
      setItemText();
      
      if ((opt === 'Reparatur laut KV durchführen' || opt === 'Unrepariert zurückschicken' || opt === 'Verschrotten') && checked && data.kvMethod && data.kvMethod !== 'keine Angabe' && data.kvFreigabeDate) {
        const formattedDate = new Date(data.kvFreigabeDate).toLocaleDateString('de-DE');
        let freigabeText = `${opt} -  ${data.kvMethod} am ${formattedDate}`;
        if (opt === 'Unrepariert zurückschicken' && data.unrepariertKostenlos) {
          freigabeText += ' (kostenlos)';
        }
        doc.text(freigabeText, leftX + 8, yLeft);
      } else if (opt === 'Unrepariert zurückschicken' && checked && data.unrepariertKostenlos) {
        doc.text(`${opt} (kostenlos)`, leftX + 8, yLeft);
      } else if (opt === 'Garantie' && checked && data.garantieDate) {
        const formattedDate = new Date(data.garantieDate).toLocaleDateString('de-DE');
        doc.text(`${opt} auf Reparatur von ${formattedDate}`, leftX + 8, yLeft);
      } else if (opt === 'Reklamation' && checked && data.reklamationDate) {
        const formattedDate = new Date(data.reklamationDate).toLocaleDateString('de-DE');
        doc.text(`${opt} auf Reparatur von ${formattedDate}`, leftX + 8, yLeft);
      } else {
        doc.text(opt, leftX + 8, yLeft);
      }
      yLeft += linePad;
    });
    yLeft += sectionPad;
    setSectionHead();
    doc.text('Fehlerangaben:', leftX, yLeft);
    setItemText();
    yLeft += linePad + 0.8;
    FEHLERANGABEN.forEach((f) => {
      const checked = !!data.fehler[f];
      drawCheckbox(doc, leftX + 1, yLeft - checkboxYOffset, checked);
      setItemText();
      doc.text(f, leftX + 8, yLeft);
      yLeft += linePad;
    });
    
    // Manual Fehlerangaben in PDF - Only show checked items
    if (data.manualFehlerChecked1 || data.manualFehlerChecked2 || data.manualFehlerChecked3) {
      yLeft += 1;
      setItemText();
      
      if (data.manualFehlerChecked1 && data.manualFehler1) {
        drawCheckbox(doc, leftX + 1, yLeft - checkboxYOffset, data.manualFehlerChecked1);
        doc.text(data.manualFehler1, leftX + 8, yLeft);
        yLeft += linePad;
      }
      
      if (data.manualFehlerChecked2 && data.manualFehler2) {
        drawCheckbox(doc, leftX + 1, yLeft - checkboxYOffset, data.manualFehlerChecked2);
        doc.text(data.manualFehler2, leftX + 8, yLeft);
        yLeft += linePad;
      }
      
      if (data.manualFehlerChecked3 && data.manualFehler3) {
        drawCheckbox(doc, leftX + 1, yLeft - checkboxYOffset, data.manualFehlerChecked3);
        doc.text(data.manualFehler3, leftX + 8, yLeft);
        yLeft += linePad;
      }
    }

    // Kulanz direkt im Anschluss an Fehlerangaben (gleiche Überschrift-Optik)
    yLeft += sectionPad;
    setSectionHead();
    doc.text('Kulanz:', leftX, yLeft);
    setItemText();
    yLeft += linePad + 0.8;
    drawCheckbox(doc, leftX + 1, yLeft - checkboxYOffset, data.kulanz);
    doc.text('Kulanz', leftX + 8, yLeft);
    yLeft += linePad;
    
    if (data.kulanz) {
      drawCheckbox(doc, leftX + 10, yLeft - checkboxYOffset, data.kulanzPorto === 'ja');
      doc.text('Porto ja', leftX + 16, yLeft);
      drawCheckbox(doc, leftX + 38, yLeft - checkboxYOffset, data.kulanzPorto === 'nein');
      doc.text('Porto nein', leftX + 44, yLeft);
      if (data.country === 'AT') {
        drawCheckbox(doc, leftX + 70, yLeft - checkboxYOffset, data.kulanzPorto === 'austria');
        doc.text('Porto 14,90€', leftX + 76, yLeft);
      }
      const manualPortoX = data.country === 'AT' ? leftX + 105 : leftX + 70;
      const manualPortoTextX = data.country === 'AT' ? leftX + 111 : leftX + 76;
      drawCheckbox(doc, manualPortoX, yLeft - checkboxYOffset, data.kulanzPorto === 'manual');
      const manualPortoText = data.kulanzPorto === 'manual' && data.manualPorto ? 
        `Porto ${parseFloat(data.manualPorto).toFixed(2).replace('.', ',')}€` : 
        'Porto manuell';
      doc.text(manualPortoText, manualPortoTextX, yLeft);
      yLeft += linePad;
    }

    // Kostenvoranschlag wird oben auf Höhe von „Rep. werkstatt Notiz“ gezeichnet

    // Right column: Ausgeführte Arbeiten — gleicher linePad wie links
    let yRight = CheckBoxbereich;
    setSectionHead();
    doc.text('Ausgeführte Arbeiten:', rightX, yRight);
    setItemText();
    yRight += linePad + 0.8;

    const pdfCustomRows = data.customArbeiten.filter((r) => r.checked && ((r.label && r.label.trim()) || (r.price && String(r.price).trim())));

    let maxLabelWidth = 0;
    ARBEITEN.forEach(a => {
      const labelForWidth = (a.key === 'nearcom' && data.pdfVersion < 2) ? 'nEARcom-Reparaturpauschale' : a.label;
      const labelWidth = doc.getTextWidth(labelForWidth);
      if (labelWidth > maxLabelWidth) maxLabelWidth = labelWidth;
    });
    pdfCustomRows.forEach((r) => {
      const w = doc.getTextWidth(r.label || 'Position');
      if (w > maxLabelWidth) maxLabelWidth = w;
    });

    const nearcomIdx = ARBEITEN.findIndex((a) => a.key === 'nearcom');
    const arbeitenBefore = ARBEITEN.slice(0, nearcomIdx + 1);
    const arbeitenAfter = ARBEITEN.slice(nearcomIdx + 1);

    const drawArbeitPdfRow = (a) => {
      const checked = !!data.arbeiten[a.key];
      let value = '';
      if (checked) {
        if (!data.kulanz) {
          if (a.price && a.price !== 'country') value = `${a.price.toFixed(2).replace('.', ',')} €`;
          else if (a.price === 'country') value = `${data.arbeitszeit.toFixed(2).replace('.', ',')} €`;
          else if (data.arbeitenManual[a.key]) value = `${data.arbeitenManual[a.key]} €`;
        } else {
          value = '0,00 €';
        }
      }
      drawCheckbox(doc, rightX + 2, yRight - checkboxYOffset, checked);
      setItemText();
      let labelMaxWidth = priceColX - (rightX + 2 + labelPad) - 8;
      let labelText = (a.key === 'nearcom' && data.pdfVersion < 2) ? 'nEARcom-Reparaturpauschale' : a.label;
      let labelWidth = doc.getTextWidth(labelText);
      if (labelWidth > labelMaxWidth) {
        while (labelText.length > 2 && doc.getTextWidth(labelText + '…') > labelMaxWidth) {
          labelText = labelText.slice(0, -1);
        }
        labelText += '…';
      }
      doc.text(labelText, rightX + 2 + labelPad, yRight);
      if (value) doc.text(value, priceColX, yRight, { align: 'right' });
      yRight += linePad;
    };

    arbeitenBefore.forEach(drawArbeitPdfRow);

    pdfCustomRows.forEach((row) => {
      drawCheckbox(doc, rightX + 2, yRight - checkboxYOffset, true);
      setItemText();
      let labelMaxWidth = priceColX - (rightX + 2 + labelPad) - 8;
      let labelText = row.label || 'Position';
      if (doc.getTextWidth(labelText) > labelMaxWidth) {
        while (labelText.length > 2 && doc.getTextWidth(labelText + '…') > labelMaxWidth) {
          labelText = labelText.slice(0, -1);
        }
        labelText += '…';
      }
      doc.text(labelText, rightX + 2 + labelPad, yRight);
      if (!data.kulanz && row.price) {
        const p = parseFloat(String(row.price).replace(',', '.'));
        if (!Number.isNaN(p)) {
          doc.text(`${p.toFixed(2).replace('.', ',')} €`, priceColX, yRight, { align: 'right' });
        } else {
          doc.text(`${row.price} €`, priceColX, yRight, { align: 'right' });
        }
      } else if (data.kulanz) {
        doc.text('0,00 €', priceColX, yRight, { align: 'right' });
      }
      yRight += linePad;
    });

    arbeitenAfter.forEach(drawArbeitPdfRow);

    // Footer: Notizen etwas höher + größere Box; Werkstattausgang rechts daneben
    const PAGE_BOTTOM = 282;
    const NOTES_H = 20;
    const notesBoxY = PAGE_BOTTOM - NOTES_H;
    const notizenLabelY = notesBoxY - 4;

    // Nettopreis-Block: immer knapp über Notizen (nicht an Endkontrolle kleben)
    // fester Abstand nach unten zu „Notizen:“ und genug Luft nach oben zur letzten Arbeitszeile
    const pricingY = notizenLabelY - 16;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(SIZE_PRICE_NET);
    doc.text(`Nettopreis: ${data.net.toFixed(2).replace('.', ',')} €`, priceColX, pricingY, { align: 'right' });
    doc.setFont(FONT, 'normal');
    doc.setFontSize(SIZE_PRICE_PORTO);
    doc.text(`zzgl. Porto & Verpackung: ${data.porto.toFixed(2).replace('.', ',')} €`, priceColX, pricingY + 5.5, { align: 'right' });

    // Werkstattausgang rechts neben Notizen-Überschrift
    const werkstattausgangX = 144;
    setSectionHead();
    doc.text('Werkstattausgang:', werkstattausgangX, notizenLabelY);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(SIZE_SECTION);
    if (data.werkstattausgang) {
      const [yyyy, mm, dd] = data.werkstattausgang.split('-');
      doc.setFont(FONT, 'bold');
      doc.text(`${dd}.${mm}.${yyyy}`, rightXstop, notizenLabelY, { align: 'right' });
    } else {
      doc.text('-', rightXstop, notizenLabelY, { align: 'right' });
    }

    // Notizen-Box ganz unten
    setSectionHead();
    doc.text('Notizen:', leftX, notizenLabelY);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(SIZE_ITEM);
    doc.setDrawColor(100);
    doc.setLineWidth(0.2);
    doc.rect(leftX, notesBoxY, rightXstop - leftX, NOTES_H);
    if (data.werkstattNotiz) {
      doc.text(data.werkstattNotiz, leftX + 3, notesBoxY + 5);
    }


  const filename =
    options.filename ||
    (data.kommission
      ? buildKvPdfFilename(data.kommission)
      : 'reparaturauftrag.pdf');

  if (options.returnBase64) {
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    return { base64, filename };
  }

  doc.save(filename);
  return { filename };
}

/** DB-Repair-Order → Formdaten für generateRepairOrderPDF */
export function mapRepairOrderToPdfData(order, arbeitszeitFallback = 22) {
  const fehlerDb = order.fehlerangaben || {};
  const arbeitenDb = order['ausgeführte_arbeiten'] || order.ausgefuehrte_arbeiten || {};
  const arbeitenMap = {};
  const arbeitenManual = {};
  let customArbeiten = [];

  Object.keys(arbeitenDb).forEach((key) => {
    if (key === '_custom') {
      customArbeiten = Array.isArray(arbeitenDb[key]) ? arbeitenDb[key] : [];
      return;
    }
    if (arbeitenDb[key] && arbeitenDb[key].checked) {
      arbeitenMap[key] = true;
      if (arbeitenDb[key].input) arbeitenManual[key] = arbeitenDb[key].input;
    }
  });

  const fehlerMap = {};
  Object.keys(fehlerDb).forEach((key) => {
    if (!['manual1', 'manual2', 'manual3'].includes(key) && fehlerDb[key]) {
      fehlerMap[key] = true;
    }
  });

  const isAt = (order.country || 'DE') === 'AT';
  const arbeitszeit = isAt
    ? (Number(order.austria_arbeitszeit) || 26)
    : arbeitszeitFallback;

  return {
    selectedCustomer: order.customers || null,
    kommission: order.kommission || '',
    hersteller: order.hersteller || '',
    geraetetyp: order.geraetetyp || '',
    seriennummer: order.seriennummer || '',
    werkstatteingang: order.werkstatteingang || '',
    zubehoer: order.zubehoer || '',
    kvDate: order.kv_date || '',
    perMethod: order.per_method || '',
    werkstattNotiz: order.werkstatt_notiz || '',
    werkstattDate: order.werkstatt_date || order.gesendet_an_werkstatt || '',
    werkstattausgang: order.werkstattausgang || '',
    kostenvoranschlagChecked: !!order.kostenvoranschlag_checked,
    kostenvoranschlagAmount: order.kostenvoranschlag_amount || '',
    freigabe: order.freigabe || 'Keine angabe',
    kvMethod: order.kv_method || 'keine Angabe',
    kvFreigabeDate: order.kv_date_freigabe || '',
    unrepariertKostenlos: !!order.unrepariert_kostenlos,
    garantieDate: order.garantie_date || '',
    reklamationDate: order.reklamation_date || '',
    fehler: fehlerMap,
    manualFehlerChecked1: fehlerDb.manual1?.checked || false,
    manualFehler1: fehlerDb.manual1?.text || '',
    manualFehlerChecked2: fehlerDb.manual2?.checked || false,
    manualFehler2: fehlerDb.manual2?.text || '',
    manualFehlerChecked3: fehlerDb.manual3?.checked || false,
    manualFehler3: fehlerDb.manual3?.text || '',
    kulanz: !!order.kulanz,
    kulanzPorto: order.kulanz_porto || 'ja',
    manualPorto: order.manual_porto || '',
    country: order.country || 'DE',
    arbeiten: arbeitenMap,
    arbeitenManual,
    customArbeiten,
    arbeitszeit,
    net: Number(order.nettopreis) || 0,
    porto: Number(order.porto) || 0,
    pdfVersion: order.pdf_version != null ? order.pdf_version : 1
  };
}
