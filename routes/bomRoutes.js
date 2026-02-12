const express = require('express');
const router = express.Router();
const bomController = require('../controllers/bomController');

// List and dropdown
router.get('/', bomController.getAllBOMs);
router.get('/active', bomController.getActiveBOMs);

// Check if item has BOM
router.get('/check-item/:item_id', bomController.checkItemHasBOM);

// Get BOMs by output item
router.get('/by-output-item/:item_id', bomController.getBOMsByOutputItem);

// CRUD for BOM
router.get('/:id', bomController.getBOMFullDetails);
router.get('/:id/components', bomController.getBOMComponents);
router.post('/', bomController.createBOM);
router.put('/:id', bomController.updateBOMHeader);
router.delete('/:id', bomController.deleteBOM);

// Component management
router.post('/:id/components', bomController.addComponentToBOM);
router.put('/components/:component_id', bomController.updateBOMComponent);
router.delete('/components/:component_id', bomController.deleteBOMComponent);

module.exports = router;
