const express = require('express');
const router = express.Router();
const workOrderController = require('../controllers/workOrderController');

// List views
router.get('/', workOrderController.getAllWorkOrders);
router.get('/roots', workOrderController.getRootWorkOrders);

// Tree view
router.get('/tree/:root_wo_id', workOrderController.getWorkOrderTree);

// CRUD
router.get('/:id', workOrderController.getWorkOrderFullDetails);
router.get('/:id/components', workOrderController.getWorkOrderComponents);
router.post('/', workOrderController.createWorkOrder);
router.post('/from-bom', workOrderController.createWorkOrderFromBOM);
router.put('/:id', workOrderController.updateWorkOrderHeader);
router.delete('/:id', workOrderController.deleteWorkOrder);

// Lifecycle operations
router.post('/:id/allocate', workOrderController.allocateComponents);
router.post('/:id/start', workOrderController.startWorkOrder);
router.post('/:id/complete', workOrderController.completeWorkOrder);
router.post('/:id/cancel', workOrderController.cancelWorkOrder);

// Status check
router.get('/:id/check-ready', workOrderController.checkWorkOrderReady);

// Component management
router.post('/:id/components', workOrderController.addComponent);
router.put('/components/:woc_id', workOrderController.updateComponent);
router.delete('/components/:woc_id', workOrderController.deleteComponent);

// Utility
router.get('/inventory/:item_id', workOrderController.getInventoryForItem);

module.exports = router;
