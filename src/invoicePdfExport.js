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
  INVOICE_DATE_LEFT: 195, // Aligned with right edge of table
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
  COL_HINWEIS_LEFT: 95,
  COL_HINWEIS_WIDTH: 35,
  COL_REPKOSTEN_LEFT: 140,
  COL_REPKOSTEN_WIDTH: 20,
  COL_PORTO_LEFT: 163,
  COL_PORTO_WIDTH: 20,
  COL_GESAMT_LEFT: 176,
  COL_GESAMT_WIDTH: 25,
  
  // Calculations section (Netto, MwSt, Endbetrag)
  CALC_SECTION_MARGIN_TOP: 10,
  CALC_BOX_LEFT: 140,
  CALC_BOX_WIDTH: 55, // Extended to align with table corner (195 - 140 = 55)
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
const renderHeader = (doc, customer = null) => {
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
  
  // Show USt-ID for Austrian customers
  if (customer && customer.country === 'Österreich' && customer.ust_id) {
    doc.text(`USt-ID-Nr.: ${customer.ust_id}`, COMPANY_ADDRESS_LEFT, COMPANY_ADDRESS_TOP + 44, { align: 'right' });
  }
};

// Render shorter header for page 2+ (just logo, 2x smaller)
const renderShortHeader = (doc) => {
  const { HEADER_TOP, LOGO_LEFT } = PDF_LAYOUT;
  
  // Company logo only, 2x smaller
  const smallLogoWidth = PDF_LAYOUT.LOGO_WIDTH / 2;
  const smallLogoHeight = PDF_LAYOUT.LOGO_HEIGHT / 2;
  doc.addImage('https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png', 'PNG', LOGO_LEFT, HEADER_TOP, smallLogoWidth, smallLogoHeight);
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
  
  if (street) {
    doc.text(street, CUSTOMER_ADDRESS_LEFT, currentY);
    currentY += 4;
  }
  
  // City/location on its own line
  if (location) {
    doc.text(location, CUSTOMER_ADDRESS_LEFT, currentY);
    currentY += 4;
  }
  
  // Country on separate line below
  if (country) {
    doc.text(country, CUSTOMER_ADDRESS_LEFT, currentY);
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
  doc.text('Filiale', COL_HINWEIS_LEFT + 2, headerY);
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
  
  // Filiale (branch/reference) - show only city name
  const branchText = item.branch || '';
  // Show full branch name with truncation if too long
  const fullBranchName = branchText || '';
  const truncatedBranch = fullBranchName.length > 35 ? fullBranchName.substring(0, 35) + '...' : fullBranchName;
  doc.text(truncatedBranch, COL_HINWEIS_LEFT + 1, textY);
  
  // Repair costs (right aligned)
  const repairAmount = item.repairAmount || 0;
  doc.text(`${formatGermanNumber(repairAmount)} €`, COL_REPKOSTEN_LEFT + 15, textY, { align: 'right' });
  
  // Porto (right aligned)
  const porto = item.porto || 0;
  doc.text(`${formatGermanNumber(porto)} €`, COL_PORTO_LEFT +10, textY, { align: 'right' });
  
  // Total (right aligned to align Euro symbols)
  const total = item.total || 0;
  doc.text(`${formatGermanNumber(total)} €`, COL_GESAMT_LEFT + 15, textY, { align: 'right' });
  
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
  doc.text(`${formatGermanNumber(totals.subtotal)} €`, CALC_BOX_LEFT + CALC_BOX_WIDTH, startY + 5, { align: 'right' });
  
  // MwSt
  const taxPercent = Math.round(totals.taxRate * 100);
  doc.text(`MwSt ${taxPercent}%:`, CALC_BOX_LEFT, startY + 10);
  doc.text(`${formatGermanNumber(totals.taxAmount)} €`, CALC_BOX_LEFT + CALC_BOX_WIDTH, startY + 10, { align: 'right' });
  
  // Thin line separator above Endbetrag
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.line(CALC_BOX_LEFT, startY + 12, CALC_BOX_LEFT + CALC_BOX_WIDTH, startY + 12);
  
  // Endbetrag (bigger font and bold)
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_NORMAL + 2);
  doc.setFont('helvetica', 'bold');
  doc.text('Endbetrag:', CALC_BOX_LEFT, startY + 17);
  doc.text(`${formatGermanNumber(totals.total)} €`, CALC_BOX_LEFT + CALC_BOX_WIDTH, startY + 17, { align: 'right' });
  
  return startY + CALC_BOX_HEIGHT;
};

// Render footer with page counter and invoice number
const renderFooter = (doc, currentPage, totalPages, invoiceNumber) => {
  const { FOOTER_TOP, MARGIN_LEFT, PAGE_WIDTH, MARGIN_RIGHT } = PDF_LAYOUT;
  
  doc.setFontSize(PDF_LAYOUT.FONT_SIZE_SMALL);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  let currentY = FOOTER_TOP;
  
  // Payment instruction
  doc.text('Rechnungsbetrag bitte innerhalb 10 Tagen nach Erhalt auf folgendes Konto überweisen:', MARGIN_LEFT, currentY);
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
  
  // Page counter (bottom right)
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Seite ${currentPage} von ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, currentY + 8, { align: 'right' });
  
  // Invoice number reference (bottom left)
  doc.text(`Rechnung Nr. ${invoiceNumber}`, MARGIN_LEFT, currentY + 8);
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
  const taxRate = invoiceData.customer?.country === 'Österreich' ? 0 : 0.19;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  
  const totals = { subtotal, taxRate, taxAmount, total };
  
  // Prepare items for table
  const tableItems = [
    ...selectedOrders.map(order => {
      // Handle different data structures (direct repair order vs invoice item)
      const repairAmount = order.nettopreis || order.repair_amount || 0;
      const porto = order.porto || 0;
      
      // Debug: log the order structure to understand the data
      console.log('PDF Export - Order data:', {
        kommission: order.kommission,
        customers: order.customers,
        branch: order.customers?.branch,
        filiale: order.filiale,
        fullOrder: order
      });
      
      return {
        date: order.werkstattausgang || order.date_performed,
        kommission: order.kommission,
        description: (() => {
          // Check for KV repair or kostenpflichtige Reparatur - always "einzelne Positionen"
          if (order.freigabe === 'Reparatur laut KV durchführen' || order.freigabe === 'Kostenpflichtige Reparatur') {
            return 'einzelne Positionen';
          }
          
          // Check for specific status - just the word, no date or extra text
          if (order.freigabe === 'Garantie') {
            return 'Garantie';
          }
          if (order.freigabe === 'Reklamation') {
            return 'Reklamation';
          }
          if (order.freigabe === 'Unrepariert zurückschicken') {
            return 'Unrepariert zurück';
          }
          if (order.freigabe === 'Verschrotten') {
            return 'Verschrotten';
          }
          
          // Check for Kulanz - just "Kulanz"
          if (order.kulanz) {
            return 'Kulanz';
          }
          
          // Default fallback
          return 'einzelne Positionen';
        })(),
        branch: (() => {
          const branchText = order.customers?.branch || order.filiale || '';
          // Extract city name from branch (e.g., "Hörgeräte Langer Schrobenhausen" -> "Schrobenhausen")
          // Return full branch name instead of just city
          return branchText;
        })(),
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
  
  // Split items into pages (15 items on first page, 30 on subsequent pages)
  const FIRST_PAGE_ITEMS = 15;
  const SUBSEQUENT_PAGE_ITEMS = 30;
  
  const pages = [];
  let remainingItems = [...tableItems];
  
  // First page: 15 items
  if (remainingItems.length > 0) {
    pages.push(remainingItems.splice(0, FIRST_PAGE_ITEMS));
  }
  
  // Subsequent pages: 30 items each
  while (remainingItems.length > 0) {
    pages.push(remainingItems.splice(0, SUBSEQUENT_PAGE_ITEMS));
  }
  
  const totalPages = pages.length;
  
  // Render each page
  pages.forEach((pageItems, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage();
    }
    
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === pages.length - 1;
    
    // Render header
    if (isFirstPage) {
      renderHeader(doc, invoiceData.customer);
      renderCustomerAddress(doc, invoiceData.customer);
      renderInvoiceInfo(doc, invoiceData);
    } else {
      renderShortHeader(doc);
    }
    
    // Render table header - start earlier on page 2+ (reduced by 20%)
    const tableStartY = isFirstPage ? PDF_LAYOUT.TABLE_START_Y : PDF_LAYOUT.HEADER_TOP + PDF_LAYOUT.LOGO_HEIGHT / 2 + 20; // 20px below smaller logo (reduced from 25px)
    let currentY = renderTableHeader(doc, tableStartY);
    
    // Render table rows
    pageItems.forEach((item, index) => {
      // Calculate global index based on page distribution
      let globalIndex = 0;
      for (let i = 0; i < pageIndex; i++) {
        globalIndex += i === 0 ? FIRST_PAGE_ITEMS : SUBSEQUENT_PAGE_ITEMS;
      }
      globalIndex += index;
      
      currentY = renderTableRow(doc, item, currentY, globalIndex % 2 === 0);
    });
    
    // Add calculations section only on last page
    if (isLastPage) {
      currentY += PDF_LAYOUT.CALC_SECTION_MARGIN_TOP;
      currentY = renderCalculations(doc, currentY, totals);
    }
    
    // Add footer to all pages
    renderFooter(doc, pageIndex + 1, totalPages, invoiceData.invoiceNumber);
  });
  
  // Save PDF
  doc.save(`Rechnung_${invoiceData.invoiceNumber}.pdf`);
};