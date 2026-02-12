const express = require('express');
const router = express.Router();
const purchaseRequestController = require('../controllers/purchaseRequestController');

// Get all purchase requests
router.get('/', purchaseRequestController.getAllPurchaseRequests);

// Get purchase requests by status (e.g., /status/pending)
router.get('/status/:status', purchaseRequestController.getPurchaseRequestsByStatus);

// Get specific purchase request
router.get('/:id', purchaseRequestController.getPurchaseRequestById);

// Create new purchase request
router.post('/', purchaseRequestController.createPurchaseRequest);

// Update purchase request
router.put('/:id', purchaseRequestController.updatePurchaseRequest);

// Update purchase request status
router.patch('/:id/status', purchaseRequestController.updatePurchaseRequestStatus);

// Delete purchase request
router.delete('/:id', purchaseRequestController.deletePurchaseRequest);

// Convert purchase requests to Purchase Order
router.post('/convert-to-po', purchaseRequestController.convertToPurchaseOrder);

module.exports = router;
