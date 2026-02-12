const PDFDocument = require('pdfkit');

/**
 * Builds a CSV string from rows and column definitions.
 */
const buildCSV = (rows, columns) => {
  const escapeField = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const headerRow = columns.map(c => escapeField(c.header)).join(',');
  const dataRows = rows.map(row =>
    columns.map(c => {
      let value = row[c.key];
      if (c.key.includes('date') && value) {
        value = new Date(value).toLocaleDateString();
      }
      return escapeField(value);
    }).join(',')
  );

  return headerRow + '\n' + dataRows.join('\n');
};

/**
 * Builds a PDF and pipes it to the response stream.
 */
const buildPDF = (res, options) => {
  const { company, title, filters, summary, details, columns } = options;
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  doc.pipe(res);

  // Company Header
  if (company) {
    doc.fontSize(16).font('Helvetica-Bold').text(company.company_name || '', { align: 'center' });
    const addressParts = [company.address_line1, company.city, company.state, company.postal_code]
      .filter(Boolean);
    if (addressParts.length > 0) {
      doc.fontSize(9).font('Helvetica').text(addressParts.join(', '), { align: 'center' });
    }
    const contactParts = [company.phone, company.email].filter(Boolean);
    if (contactParts.length > 0) {
      doc.fontSize(9).text(contactParts.join(' | '), { align: 'center' });
    }
    doc.moveDown(0.5);
  }

  // Report Title
  doc.fontSize(14).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.3);

  // Filter Info
  const filterParts = [];
  if (filters.start_date) filterParts.push('From: ' + filters.start_date);
  if (filters.end_date) filterParts.push('To: ' + filters.end_date);
  if (filters.status) filterParts.push('Status: ' + filters.status);
  if (filterParts.length > 0) {
    doc.fontSize(9).font('Helvetica').text('Filters: ' + filterParts.join(' | '), { align: 'center' });
  }
  doc.fontSize(8).text('Generated: ' + new Date().toLocaleString(), { align: 'right' });
  doc.moveDown(0.5);

  // Summary Box
  if (summary) {
    doc.fontSize(10).font('Helvetica-Bold').text('Summary');
    doc.fontSize(9).font('Helvetica');
    Object.keys(summary).forEach(key => {
      if (key !== 'orders_by_status' && key !== 'orders_by_priority') {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const value = typeof summary[key] === 'number'
          ? Number(summary[key]).toLocaleString(undefined, { maximumFractionDigits: 2 })
          : summary[key];
        doc.text(`${label}: ${value}`);
      }
    });
    doc.moveDown(0.5);
  }

  // Table
  const startX = doc.x;
  let currentY = doc.y;
  const rowHeight = 18;

  // Table header
  doc.fontSize(8).font('Helvetica-Bold');
  let xOffset = startX;
  columns.forEach(col => {
    doc.text(col.header, xOffset, currentY, {
      width: col.width || 80,
      align: col.align || 'left'
    });
    xOffset += (col.width || 80);
  });
  currentY += rowHeight;

  // Header line
  doc.moveTo(startX, currentY - 4)
    .lineTo(xOffset, currentY - 4)
    .stroke();

  // Table rows
  doc.font('Helvetica').fontSize(8);
  details.forEach((row) => {
    if (currentY > doc.page.height - 60) {
      doc.addPage();
      currentY = 40;
    }

    xOffset = startX;
    columns.forEach(col => {
      let value = row[col.key];
      if (value === null || value === undefined) value = '';
      if (col.key.includes('date') && value) {
        value = new Date(value).toLocaleDateString();
      }
      if (typeof value === 'number') {
        value = Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
      doc.text(String(value), xOffset, currentY, {
        width: col.width || 80,
        align: col.align || 'left'
      });
      xOffset += (col.width || 80);
    });
    currentY += rowHeight;
  });

  doc.end();
};

module.exports = { buildCSV, buildPDF };
