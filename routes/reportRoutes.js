const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Sales Report
router.get('/sales', reportController.getSalesReport);
router.get('/sales/export/csv', reportController.exportSalesCSV);
router.get('/sales/export/pdf', reportController.exportSalesPDF);

// Purchase Report
router.get('/purchases', reportController.getPurchaseReport);
router.get('/purchases/export/csv', reportController.exportPurchaseCSV);
router.get('/purchases/export/pdf', reportController.exportPurchasePDF);

// Inventory Report
router.get('/inventory', reportController.getInventoryReport);
router.get('/inventory/export/csv', reportController.exportInventoryCSV);
router.get('/inventory/export/pdf', reportController.exportInventoryPDF);

// Production Report
router.get('/production', reportController.getProductionReport);
router.get('/production/export/csv', reportController.exportProductionCSV);
router.get('/production/export/pdf', reportController.exportProductionPDF);

module.exports = router;
