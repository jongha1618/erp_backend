const Report = require('../models/reportModel');
const { buildCSV, buildPDF } = require('../helpers/exportHelper');

// Shared filter extractor
const extractFilters = (query) => ({
  start_date: query.start_date || null,
  end_date: query.end_date || null,
  customer_id: query.customer_id || null,
  supplier_id: query.supplier_id || null,
  item_id: query.item_id || null,
  status: query.status || null
});

// ============================================
// Sales Report
// ============================================
const getSalesReport = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getSalesReport(filters, (err, data) => {
    if (err) {
      console.error('Sales report error:', err);
      return res.status(500).json({ error: 'Failed to generate sales report' });
    }
    res.json({
      reportType: 'sales',
      filters,
      generatedAt: new Date().toISOString(),
      ...data
    });
  });
};

const SALES_COLUMNS = [
  { header: 'Sales Number', key: 'sales_number', width: 80 },
  { header: 'Order Date', key: 'order_date', width: 70 },
  { header: 'Customer', key: 'company_name', width: 130 },
  { header: 'Status', key: 'status', width: 70 },
  { header: 'Total Amount', key: 'total_amount', width: 80, align: 'right' },
  { header: 'Item Count', key: 'item_count', width: 60, align: 'right' }
];

const exportSalesCSV = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getSalesReport(filters, (err, data) => {
    if (err) {
      console.error('Sales CSV export error:', err);
      return res.status(500).json({ error: 'Failed to export sales report' });
    }

    const csv = buildCSV(data.details, SALES_COLUMNS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.csv');
    res.send(csv);
  });
};

const exportSalesPDF = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getCompanyInfo((err, company) => {
    if (err) {
      console.error('Company info error:', err);
      return res.status(500).json({ error: 'Failed to get company info' });
    }

    Report.getSalesReport(filters, (err, data) => {
      if (err) {
        console.error('Sales PDF export error:', err);
        return res.status(500).json({ error: 'Failed to export sales report' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

      buildPDF(res, {
        company,
        title: 'Sales Report',
        filters,
        summary: data.summary,
        details: data.details,
        columns: SALES_COLUMNS
      });
    });
  });
};

// ============================================
// Purchase Report
// ============================================
const getPurchaseReport = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getPurchaseReport(filters, (err, data) => {
    if (err) {
      console.error('Purchase report error:', err);
      return res.status(500).json({ error: 'Failed to generate purchase report' });
    }
    res.json({
      reportType: 'purchases',
      filters,
      generatedAt: new Date().toISOString(),
      ...data
    });
  });
};

const PURCHASE_COLUMNS = [
  { header: 'PO Number', key: 'po_number', width: 80 },
  { header: 'Order Date', key: 'order_date', width: 70 },
  { header: 'Expected Delivery', key: 'expected_delivery', width: 80 },
  { header: 'Supplier', key: 'company_name', width: 130 },
  { header: 'Status', key: 'status', width: 70 },
  { header: 'Total Amount', key: 'total_amount', width: 80, align: 'right' },
  { header: 'Item Count', key: 'item_count', width: 60, align: 'right' }
];

const exportPurchaseCSV = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getPurchaseReport(filters, (err, data) => {
    if (err) {
      console.error('Purchase CSV export error:', err);
      return res.status(500).json({ error: 'Failed to export purchase report' });
    }

    const csv = buildCSV(data.details, PURCHASE_COLUMNS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_report.csv');
    res.send(csv);
  });
};

const exportPurchasePDF = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getCompanyInfo((err, company) => {
    if (err) {
      console.error('Company info error:', err);
      return res.status(500).json({ error: 'Failed to get company info' });
    }

    Report.getPurchaseReport(filters, (err, data) => {
      if (err) {
        console.error('Purchase PDF export error:', err);
        return res.status(500).json({ error: 'Failed to export purchase report' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=purchase_report.pdf');

      buildPDF(res, {
        company,
        title: 'Purchase Report',
        filters,
        summary: data.summary,
        details: data.details,
        columns: PURCHASE_COLUMNS
      });
    });
  });
};

// ============================================
// Inventory Report
// ============================================
const getInventoryReport = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getInventoryReport(filters, (err, data) => {
    if (err) {
      console.error('Inventory report error:', err);
      return res.status(500).json({ error: 'Failed to generate inventory report' });
    }
    res.json({
      reportType: 'inventory',
      filters,
      generatedAt: new Date().toISOString(),
      ...data
    });
  });
};

const INVENTORY_COLUMNS = [
  { header: 'Item Code', key: 'item_code', width: 70 },
  { header: 'Item Name', key: 'name', width: 130 },
  { header: 'On Hand', key: 'total_quantity', width: 60, align: 'right' },
  { header: 'Reserved', key: 'total_reserved', width: 60, align: 'right' },
  { header: 'Available', key: 'available_quantity', width: 60, align: 'right' },
  { header: 'Cost Price', key: 'cost_price', width: 70, align: 'right' },
  { header: 'Stock Value', key: 'inventory_value_cost', width: 80, align: 'right' },
  { header: 'Batches', key: 'batch_count', width: 50, align: 'right' },
  { header: 'Locations', key: 'locations', width: 100 }
];

const exportInventoryCSV = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getInventoryReport(filters, (err, data) => {
    if (err) {
      console.error('Inventory CSV export error:', err);
      return res.status(500).json({ error: 'Failed to export inventory report' });
    }

    const csv = buildCSV(data.details, INVENTORY_COLUMNS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
    res.send(csv);
  });
};

const exportInventoryPDF = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getCompanyInfo((err, company) => {
    if (err) {
      console.error('Company info error:', err);
      return res.status(500).json({ error: 'Failed to get company info' });
    }

    Report.getInventoryReport(filters, (err, data) => {
      if (err) {
        console.error('Inventory PDF export error:', err);
        return res.status(500).json({ error: 'Failed to export inventory report' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.pdf');

      buildPDF(res, {
        company,
        title: 'Inventory Report',
        filters,
        summary: data.summary,
        details: data.details,
        columns: INVENTORY_COLUMNS
      });
    });
  });
};

// ============================================
// Production Report
// ============================================
const getProductionReport = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getProductionReport(filters, (err, data) => {
    if (err) {
      console.error('Production report error:', err);
      return res.status(500).json({ error: 'Failed to generate production report' });
    }
    res.json({
      reportType: 'production',
      filters,
      generatedAt: new Date().toISOString(),
      ...data
    });
  });
};

const PRODUCTION_COLUMNS = [
  { header: 'WO Number', key: 'wo_number', width: 80 },
  { header: 'Output Item', key: 'output_item_name', width: 120 },
  { header: 'Qty Ordered', key: 'quantity_ordered', width: 70, align: 'right' },
  { header: 'Qty Completed', key: 'quantity_completed', width: 70, align: 'right' },
  { header: 'Status', key: 'status', width: 70 },
  { header: 'Priority', key: 'priority', width: 60 },
  { header: 'Planned Start', key: 'planned_start_date', width: 80 },
  { header: 'Actual End', key: 'actual_end_date', width: 80 }
];

const exportProductionCSV = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getProductionReport(filters, (err, data) => {
    if (err) {
      console.error('Production CSV export error:', err);
      return res.status(500).json({ error: 'Failed to export production report' });
    }

    const csv = buildCSV(data.details, PRODUCTION_COLUMNS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=production_report.csv');
    res.send(csv);
  });
};

const exportProductionPDF = (req, res) => {
  const filters = extractFilters(req.query);

  Report.getCompanyInfo((err, company) => {
    if (err) {
      console.error('Company info error:', err);
      return res.status(500).json({ error: 'Failed to get company info' });
    }

    Report.getProductionReport(filters, (err, data) => {
      if (err) {
        console.error('Production PDF export error:', err);
        return res.status(500).json({ error: 'Failed to export production report' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=production_report.pdf');

      buildPDF(res, {
        company,
        title: 'Production Report',
        filters,
        summary: data.summary,
        details: data.details,
        columns: PRODUCTION_COLUMNS
      });
    });
  });
};

module.exports = {
  getSalesReport,
  exportSalesCSV,
  exportSalesPDF,
  getPurchaseReport,
  exportPurchaseCSV,
  exportPurchasePDF,
  getInventoryReport,
  exportInventoryCSV,
  exportInventoryPDF,
  getProductionReport,
  exportProductionCSV,
  exportProductionPDF
};
