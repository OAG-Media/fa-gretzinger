import { getManualItemLineTotal, getManualItemKommission } from './invoicePdfExport.js';

export const formatGermanDecimal = (value) => Number(value).toFixed(2).replace('.', ',');

export const calculateInvoicePositionTotals = ({
  repairItems = [],
  manualItems = [],
  selectedOrders = [],
  customerCountry
}) => {
  const taxRate = customerCountry === 'Österreich' ? 0 : 0.19;

  let totalRepairCost = 0;
  let totalPorto = 0;

  repairItems.forEach((item) => {
    totalRepairCost += parseFloat(item.repair_amount || 0);
    totalPorto += parseFloat(item.porto || 0);
  });

  selectedOrders.forEach((order) => {
    totalRepairCost += parseFloat(order.nettopreis || order.repair_amount || 0);
    totalPorto += parseFloat(order.porto || 0);
  });

  const totalManualAmount = manualItems.reduce(
    (sum, item) => sum + getManualItemLineTotal(item),
    0
  );
  const subtotal = totalRepairCost + totalPorto + totalManualAmount;
  const totalTax = subtotal * taxRate;
  const grandTotal = subtotal + totalTax;

  return {
    totalRepairCost,
    totalPorto,
    totalManualAmount,
    subtotal,
    taxRate,
    totalTax,
    grandTotal
  };
};

export const buildInvoiceExcelRows = ({
  repairItems = [],
  manualItems = [],
  selectedOrders = [],
  getRepairDescription
}) => {
  const rows = [];

  repairItems.forEach((item) => {
    const lineTotal = item.line_total ?? (parseFloat(item.repair_amount || 0) + parseFloat(item.porto || 0));
    rows.push([
      item.date_performed ? new Date(item.date_performed).toLocaleDateString('de-DE') : '',
      item.kommission || '',
      item.description || '',
      item.filiale || '',
      formatGermanDecimal(item.repair_amount || 0),
      formatGermanDecimal(item.porto || 0),
      formatGermanDecimal(lineTotal)
    ]);
  });

  selectedOrders.forEach((order) => {
    const repairCost = parseFloat(order.nettopreis || order.repair_amount || 0);
    const portoCost = parseFloat(order.porto || 0);
    const description = getRepairDescription ? getRepairDescription(order) : 'einzelne Positionen';
    rows.push([
      order.werkstattausgang ? new Date(order.werkstattausgang).toLocaleDateString('de-DE') : '',
      order.kommission || '',
      description,
      order.customers?.branch || order.filiale || '',
      formatGermanDecimal(repairCost),
      formatGermanDecimal(portoCost),
      formatGermanDecimal(repairCost + portoCost)
    ]);
  });

  manualItems.forEach((item) => {
    const lineNet = getManualItemLineTotal(item);
    rows.push([
      '',
      getManualItemKommission(item),
      item.description || '',
      '',
      formatGermanDecimal(lineNet),
      formatGermanDecimal(0),
      formatGermanDecimal(lineNet)
    ]);
  });

  return rows;
};

export const downloadInvoicePositionsExcel = ({ invoiceNumber, rows, totals }) => {
  const exportRows = [
    ...rows,
    ['', '', '', '', '', 'Netto', formatGermanDecimal(totals.subtotal)],
    ['', '', '', '', '', `MwSt ${(totals.taxRate * 100).toFixed(0)}%`, formatGermanDecimal(totals.totalTax)],
    ['', '', '', '', '', 'Endbetrag', formatGermanDecimal(totals.grandTotal)]
  ];

  const csvContent = '\uFEFF' + [
    'Datum;Kommission;Reparatur;Filiale;Rep.kosten;Porto;Gesamt',
    ...exportRows.map((row) => row.join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Rechnung_${invoiceNumber || 'Export'}_Positionen.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};
