import jsPDF from 'jspdf';

// ========================================
// PDF LAYOUT VARIABLES - MODIFY HERE TO ADJUST ENTIRE LAYOUT
// ========================================

const PDF_LAYOUT = {
  // Page settings
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,
  
  // Main positioning variables
  MARGIN_LEFT: 15,
  MARGIN_RIGHT: 15,
  MARGIN_TOP: 15,
  MARGIN_BOTTOM: 15,
  
  // Header section (logo + company address)
  HEADER_TOP: 15,
  HEADER_HEIGHT: 35,
  LOGO_LEFT: 15,
  LOGO_WIDTH: 60,
  LOGO_HEIGHT: 25,
  COMPANY_ADDRESS_LEFT: 195, // Right edge of page for right alignment
  COMPANY_ADDRESS_TOP: 20,
  
  // Customer address (Rechnungsadresse)
  CUSTOMER_ADDRESS_TOP: 55,
  CUSTOMER_ADDRESS_LEFT: 15,
  CUSTOMER_ADDRESS_HEIGHT: 35,
  
  // Invoice info section (Rechnung Nr., Datum, etc.) - moved above table
  INVOICE_INFO_TOP: 100,
  INVOICE_INFO_HEIGHT: 25,
  INVOICE_NUMBER_LEFT: 15,
  INVOICE_DATE_LEFT: 180,
  PERIOD_TEXT_TOP: 125,
  
  // Table section
  TABLE_START_Y: 135,
  TABLE_HEADER_HEIGHT: 8,
  TABLE_ROW_HEIGHT: 6,
  
  // Column positions and widths
  TABLE_LEFT: 15,
  TABLE_WIDTH: 180,
  COL_DATUM_LEFT: 15,
  COL_DATUM_WIDTH: 20,
  COL_KOMMISSION_LEFT: 35,
  COL_KOMMISSION_WIDTH: 25,
  COL_REPARATUR_LEFT: 60,
  COL_REPARATUR_WIDTH: 45,
  COL_HINWEIS_LEFT: 105,
  COL_HINWEIS_WIDTH: 25,
  COL_REPKOSTEN_LEFT: 130,
  COL_REPKOSTEN_WIDTH: 20,
  COL_PORTO_LEFT: 150,
  COL_PORTO_WIDTH: 20,
  COL_GESAMT_LEFT: 170,
  COL_GESAMT_WIDTH: 25,
  
  // Calculations section (Netto, MwSt, Endbetrag)
  CALC_SECTION_MARGIN_TOP: 10,
  CALC_BOX_LEFT: 140,
  CALC_BOX_WIDTH: 55,
  CALC_BOX_HEIGHT: 20,
  
  // Footer section
  FOOTER_HEIGHT: 45,
  FOOTER_TOP: 252, // PAGE_HEIGHT - FOOTER_HEIGHT
  
  // Page break settings
  SECURE_ZONE_HEIGHT: 60, // Minimum space needed at bottom for calculations + footer
  
  // Font sizes
  FONT_SIZE_HEADER: 12,
  FONT_SIZE_NORMAL: 9,
  FONT_SIZE_SMALL: 8,
  FONT_SIZE_LARGE: 14,
  
  // Colors
  COLOR_PRIMARY: '#1d426a',
  COLOR_TEXT: '#000000',
  COLOR_BORDER: '#cccccc'
};

// Helper function to check if we need a page break
const needsPageBreak = (currentY) => {
  return currentY > (PDF_LAYOUT.PAGE_HEIGHT - PDF_LAYOUT.SECURE_ZONE_HEIGHT);
};

// Render header (logo + company address)
const renderHeader = (doc) => {
  const { HEADER_TOP, LOGO_LEFT, LOGO_WIDTH, LOGO_HEIGHT, COMPANY_ADDRESS_LEFT, COMPANY_ADDRESS_TOP } = PDF_LAYOUT;
  
  // Company logo (using actual logo from CDN)
  doc.addImage('https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png', 'PNG', LOGO_LEFT, HEADER_TOP, LOGO_WIDTH, LOGO_HEIGHT);
  
  // Company address (right side - right aligned)
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_NORMAL);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('HG Gretzinger UG', COMPANY_ADDRESS_LEFT, COMPANY_ADDRESS_TOP, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Hörgeräteservice', COMPANY_ADDRESS_LEFT, COMPANY_ADDRESS_TOP + 4, { align: 'right' });
  doc.text('Gibitzenhofstr. 86', COMPANY_ADDRESS_LEFT, COMPANY_ADDRESS_TOP + 8, { align: 'right' });
  doc.text('90443 Nürnberg', COMPANY_ADDRESS_LEFT, COMPANY_ADDRESS_TOP + 12, { align: 'right' });
  doc.text('Tel.: 0911/54 04 944', COMPANY_ADDRESS_LEFT, COMPANY_ADDRESS_TOP + 16, { align: 'right' });
  doc.text('Fax: 0911/54 04 946', COMPANY_ADDRESS_LEFT, COMPANY_ADDRESS_TOP + 20, { align: 'right' });
};

// Render invoice information
const renderInvoiceInfo = (doc, invoiceData) => {
  const { INVOICE_INFO_TOP, INVOICE_NUMBER_LEFT, INVOICE_DATE_LEFT, PERIOD_TEXT_TOP } = PDF_LAYOUT;
  
  // Invoice number (left)
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_LARGE);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rechnung Nr. ${invoiceData.invoiceNumber}`, INVOICE_NUMBER_LEFT, INVOICE_INFO_TOP);
  
  // Invoice date (right aligned)
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'normal');
  const invoiceDate = new Date(invoiceData.invoiceDate).toLocaleDateString('de-DE');
  doc.text(invoiceDate, INVOICE_DATE_LEFT, INVOICE_INFO_TOP, { align: 'right' });
  
  // Period text
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_NORMAL);
  const periodStart = new Date(invoiceData.periodStart).toLocaleDateString('de-DE');
  const periodEnd = new Date(invoiceData.periodEnd).toLocaleDateString('de-DE');
  doc.text(`Die nachfolgenden Leistungen wurden für den Zeitraum von ${periodStart} bis ${periodEnd} berechnet.`, 
           INVOICE_NUMBER_LEFT, PERIOD_TEXT_TOP);
};

// Render customer address
const renderCustomerAddress = (doc, customer) => {
  const { CUSTOMER_ADDRESS_TOP, CUSTOMER_ADDRESS_LEFT } = PDF_LAYOUT;
  
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'normal');
  
  let currentY = CUSTOMER_ADDRESS_TOP;
  
  // Use billing address if available, otherwise use main address
  const street = customer.billing_street || customer.street;
  const location = customer.billing_location || customer.location;
  const country = customer.billing_country || customer.country;
  
  // Only show company name (not branch to avoid duplication)
  if (customer.company) {
    doc.text(customer.company, CUSTOMER_ADDRESS_LEFT, currentY);
    currentY += 4;
  }
  
  // Only show branch if it's different from company
  if (customer.branch && customer.branch !== customer.company) {
    doc.text(customer.branch, CUSTOMER_ADDRESS_LEFT, currentY);
    currentY += 4;
  }
  
  if (street) {
    doc.text(street, CUSTOMER_ADDRESS_LEFT, currentY);
    currentY += 4;
  }
  
  const locationLine = `${location || ''} ${country || ''}`.trim();
  if (locationLine) {
    doc.text(locationLine, CUSTOMER_ADDRESS_LEFT, currentY);
  }
};

// Render table header
const renderTableHeader = (doc, startY) => {
  const { TABLE_LEFT, TABLE_WIDTH, TABLE_HEADER_HEIGHT } = PDF_LAYOUT;
  const { COL_DATUM_LEFT, COL_KOMMISSION_LEFT, COL_REPARATUR_LEFT, COL_HINWEIS_LEFT, 
          COL_REPKOSTEN_LEFT, COL_PORTO_LEFT, COL_GESAMT_LEFT } = PDF_LAYOUT;
  
  // Header background
  doc.setFillColor(240, 240, 240);
  doc.rect(TABLE_LEFT, startY, TABLE_WIDTH, TABLE_HEADER_HEIGHT, 'F');
  
  // Header text
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_SMALL);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  const headerY = startY + 5;
  doc.text('Datum', COL_DATUM_LEFT + 2, headerY);
  doc.text('Kommission', COL_KOMMISSION_LEFT + 2, headerY);
  doc.text('Reparatur', COL_REPARATUR_LEFT + 2, headerY);
  doc.text('Hinweis', COL_HINWEIS_LEFT + 2, headerY);
  doc.text('Rep.kosten', COL_REPKOSTEN_LEFT + 2, headerY);
  doc.text('Porto', COL_PORTO_LEFT + 2, headerY);
  doc.text('Gesamt', COL_GESAMT_LEFT + 2, headerY);
  
  // Header borders
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(TABLE_LEFT, startY, TABLE_WIDTH, TABLE_HEADER_HEIGHT);
  
  return startY + TABLE_HEADER_HEIGHT;
};

// Render table row
const renderTableRow = (doc, item, startY, isEven = false) => {
  const { TABLE_LEFT, TABLE_WIDTH, TABLE_ROW_HEIGHT } = PDF_LAYOUT;
  const { COL_DATUM_LEFT, COL_KOMMISSION_LEFT, COL_REPARATUR_LEFT, COL_HINWEIS_LEFT, 
          COL_REPKOSTEN_LEFT, COL_PORTO_LEFT, COL_GESAMT_LEFT } = PDF_LAYOUT;
  
  // Alternating row background
  if (isEven) {
    doc.setFillColor(250, 250, 250);
    doc.rect(TABLE_LEFT, startY, TABLE_WIDTH, TABLE_ROW_HEIGHT, 'F');
  }
  
  // Row text
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_SMALL);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const textY = startY + 4;
  
  // Format date
  const date = item.date ? new Date(item.date).toLocaleDateString('de-DE') : '';
  doc.text(date, COL_DATUM_LEFT + 1, textY);
  
  // Kommission
  doc.text(item.kommission || '', COL_KOMMISSION_LEFT + 1, textY);
  
  // Reparatur description (truncate if too long)
  const description = item.description || '';
  const truncatedDesc = description.length > 25 ? description.substring(0, 25) + '...' : description;
  doc.text(truncatedDesc, COL_REPARATUR_LEFT + 1, textY);
  
  // Hinweis (branch/reference)
  doc.text(item.branch || '', COL_HINWEIS_LEFT + 1, textY);
  
  // Repair costs (right aligned)
  const repairAmount = item.repairAmount || 0;
  doc.text(`${formatGermanNumber(repairAmount)} €`, COL_REPKOSTEN_LEFT + 15, textY, { align: 'right' });
  
  // Porto (right aligned)
  const porto = item.porto || 0;
  doc.text(`${formatGermanNumber(porto)} €`, COL_PORTO_LEFT + 15, textY, { align: 'right' });
  
  // Total (right aligned)
  const total = item.total || 0;
  doc.text(`${formatGermanNumber(total)} €`, COL_GESAMT_LEFT + 20, textY, { align: 'right' });
  
  // Row border
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(TABLE_LEFT, startY, TABLE_WIDTH, TABLE_ROW_HEIGHT);
  
  return startY + TABLE_ROW_HEIGHT;
};

// Helper function to format numbers with German comma notation
const formatGermanNumber = (number) => {
  return number.toFixed(2).replace('.', ',');
};

// Render calculations section (Netto, MwSt, Endbetrag)
const renderCalculations = (doc, startY, totals) => {
  const { CALC_BOX_LEFT, CALC_BOX_WIDTH, CALC_BOX_HEIGHT } = PDF_LAYOUT;
  
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'normal');
  
  // Netto
  doc.text('Netto:', CALC_BOX_LEFT, startY + 5);
  doc.text(`${formatGermanNumber(totals.subtotal)} €`, CALC_BOX_LEFT + CALC_BOX_WIDTH - 5, startY + 5, { align: 'right' });
  
  // MwSt
  const taxPercent = Math.round(totals.taxRate * 100);
  doc.text(`${taxPercent}%:`, CALC_BOX_LEFT, startY + 10);
  doc.text(`${formatGermanNumber(totals.taxAmount)} €`, CALC_BOX_LEFT + CALC_BOX_WIDTH - 5, startY + 10, { align: 'right' });
  
  // Thin line separator above Endbetrag
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.line(CALC_BOX_LEFT, startY + 12, CALC_BOX_LEFT + CALC_BOX_WIDTH, startY + 12);
  
  // Endbetrag (bigger font and bold)
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_NORMAL + 2);
  doc.setFont('helvetica', 'bold');
  doc.text('Endbetrag:', CALC_BOX_LEFT, startY + 17);
  doc.text(`${formatGermanNumber(totals.total)} €`, CALC_BOX_LEFT + CALC_BOX_WIDTH - 5, startY + 17, { align: 'right' });
  
  return startY + CALC_BOX_HEIGHT;
};

// Render footer
const renderFooter = (doc) => {
  const { FOOTER_TOP, MARGIN_LEFT } = PDF_LAYOUT;
  
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_SMALL);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  let currentY = FOOTER_TOP;
  
  // Payment instruction
  doc.text('Rechnungsbetrag bitte innerhalb 14 Tagen nach Erhalt auf folgendes Konto überweisen:', MARGIN_LEFT, currentY);
  currentY += 4;
  
  // Bank details
  doc.text('HypoVereinsbank', MARGIN_LEFT, currentY);
  currentY += 4;
  doc.text('BLZ: 760 200 70    Kontonummer: 18432480', MARGIN_LEFT, currentY);
  currentY += 4;
  doc.text('IBAN: DE22760200700018432480', MARGIN_LEFT, currentY);
  currentY += 4;
  doc.text('Swift (BIC): HYVEDEMM460', MARGIN_LEFT, currentY);
  currentY += 6;
  
  // Tax information (centered and in blue)
  doc.setTextColor(0, 0, 255);
  doc.text('Steuernummer: 241/128/31777', 105, currentY, { align: 'center' });
  currentY += 4;
  doc.text('Handelsregister: Amtsgericht Nürnberg HRB 28915, Sitz: Nürnberg', 105, currentY, { align: 'center' });
};

// Main PDF generation function
export const generateInvoicePDF = (invoiceData, selectedOrders) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  
  // Calculate totals
  const repairOrdersSubtotal = selectedOrders.reduce((sum, order) => {
    const repairAmount = order.nettopreis || order.repair_amount || 0;
    const porto = order.porto || 0;
    return sum + repairAmount + porto;
  }, 0);
  
  const manualItemsSubtotal = (invoiceData.manualItems || []).reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0;
    return sum + (item.type === 'positive' ? amount : -amount);
  }, 0);
  
  const subtotal = repairOrdersSubtotal + manualItemsSubtotal;
  const taxRate = invoiceData.customer?.country === 'Österreich' ? 0.20 : 0.19;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  
  const totals = { subtotal, taxRate, taxAmount, total };
  
  // Page 1
  renderHeader(doc);
  renderCustomerAddress(doc, invoiceData.customer);
  renderInvoiceInfo(doc, invoiceData);
  
  let currentY = renderTableHeader(doc, PDF_LAYOUT.TABLE_START_Y);
  
  // Prepare items for table
  const tableItems = [
    ...selectedOrders.map(order => {
      // Handle different data structures (direct repair order vs invoice item)
      const repairAmount = order.nettopreis || order.repair_amount || 0;
      const porto = order.porto || 0;
      
      return {
        date: order.werkstattausgang || order.date_performed,
        kommission: order.kommission,
        description: order.freigabe === 'garantie' ? 'Garantie' : 
                    order.freigabe === 'reklamation' ? 'Reklamation' :
                    order.freigabe === 'kulanz' ? 'Kulanz' :
                    order.freigabe === 'unrepariert zurück' ? 'Unrepariert zurück' :
                    order.kv_repair === 'ja' ? 'Reparatur laut KV durchführen' : 'einzelne Positionen',
        branch: order.customers?.branch || order.filiale,
        repairAmount: repairAmount,
        porto: porto,
        total: repairAmount + porto
      };
    }),
    ...(invoiceData.manualItems || []).map(item => ({
      date: null,
      kommission: null,
      description: item.description,
      branch: null,
      repairAmount: 0,
      porto: 0,
      total: item.type === 'positive' ? parseFloat(item.amount) : -parseFloat(item.amount)
    }))
  ];
  
  // Render table rows with page break logic
  let itemsOnPage1 = [];
  let itemsOnPage2 = [];
  let needsSecondPage = false;
  
  for (let i = 0; i < tableItems.length; i++) {
    const testY = currentY + PDF_LAYOUT.TABLE_ROW_HEIGHT;
    const spaceNeededForCalcs = PDF_LAYOUT.CALC_SECTION_MARGIN_TOP + PDF_LAYOUT.CALC_BOX_HEIGHT + PDF_LAYOUT.FOOTER_HEIGHT;
    
    if (testY + spaceNeededForCalcs > PDF_LAYOUT.PAGE_HEIGHT - PDF_LAYOUT.MARGIN_BOTTOM) {
      // Need page break - but ensure at least some items on page 2
      const remainingItems = tableItems.length - i;
      if (remainingItems > 3 || i < tableItems.length * 0.3) { // Smart distribution
        needsSecondPage = true;
        itemsOnPage1 = tableItems.slice(0, i);
        itemsOnPage2 = tableItems.slice(i);
        break;
      }
    }
    itemsOnPage1.push(tableItems[i]);
  }
  
  // Render page 1 items
  itemsOnPage1.forEach((item, index) => {
    currentY = renderTableRow(doc, item, currentY, index % 2 === 0);
  });
  
  if (needsSecondPage) {
    // Add page 2
    doc.addPage();
    
    // Page 2 header (same as page 1)
    renderHeader(doc);
    renderCustomerAddress(doc, invoiceData.customer);
    renderInvoiceInfo(doc, invoiceData);
    
    // Continue table on page 2
    currentY = renderTableHeader(doc, PDF_LAYOUT.TABLE_START_Y);
    
    itemsOnPage2.forEach((item, index) => {
      currentY = renderTableRow(doc, item, currentY, (itemsOnPage1.length + index) % 2 === 0);
    });
  }
  
  // Add calculations section
  currentY += PDF_LAYOUT.CALC_SECTION_MARGIN_TOP;
  currentY = renderCalculations(doc, currentY, totals);
  
  // Add footer to last page
  renderFooter(doc);
  
  // Add footer to page 1 if there's a page 2
  if (needsSecondPage) {
    doc.setPage(1);
    renderFooter(doc);
  }
  
  // Save PDF
  doc.save(`Rechnung_${invoiceData.invoiceNumber}.pdf`);
};