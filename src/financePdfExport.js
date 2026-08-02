import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatEuro } from './ModernDashboard';

/**
 * Steuerberater-tauglicher Analyse-PDF (kein Rechnungsdokument).
 */
export function generateFinanceAnalysisPDF({ title, filtersSummary, series, rows, totals }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  let y = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(29, 66, 106);
  doc.text('Fa. Gretzinger – Finanzanalyse', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 90, 100);
  doc.text(title || 'Auswertung', margin, y);
  y += 6;
  doc.setFontSize(9);
  const filterLines = doc.splitTextToSize(filtersSummary || '', 180);
  doc.text(filterLines, margin, y);
  y += filterLines.length * 4.2 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(29, 66, 106);
  doc.text('Kennzahlen', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 50, 60);
  doc.text(`Umsatz gesamt: ${formatEuro(totals.revenue)}`, margin, y);
  y += 5;
  doc.text(`Aufträge: ${totals.orders}`, margin, y);
  y += 5;
  doc.text(`Durchschnitt / Auftrag: ${formatEuro(totals.avg)}`, margin, y);
  y += 8;

  if (series?.length) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 66, 106);
    doc.text('Zeitreihe', margin, y);
    y += 2;
    doc.autoTable({
      startY: y,
      head: [['Zeitraum', 'Umsatz', 'Aufträge']],
      body: series.map((s) => [s.label, formatEuro(s.revenue), String(s.orders)]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [29, 66, 106] },
      margin: { left: margin, right: margin }
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (rows?.length) {
    if (y > 240) {
      doc.addPage();
      y = 16;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 66, 106);
    doc.text('Nach Kunde', margin, y);
    y += 2;
    doc.autoTable({
      startY: y,
      head: [['Kunde / Filiale', 'Umsatz', 'Aufträge']],
      body: rows.map((r) => [r.label, formatEuro(r.revenue), String(r.orders)]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [29, 66, 106] },
      margin: { left: margin, right: margin }
    });
  }

  const stamp = new Date().toLocaleString('de-DE');
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 150, 160);
    doc.text(`Erstellt: ${stamp} · nur Analyse, keine Rechnung · Seite ${i}/${pageCount}`, margin, 290);
  }

  const fileName = `Finanzanalyse_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
