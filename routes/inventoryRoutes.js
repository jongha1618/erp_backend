const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// GET all inventories
router.get('/', inventoryController.getAllInventories);

// GET all users (for assign-to dropdown)
router.get('/users', inventoryController.getAllUsers);

// GET inventory by ID
router.get('/:id', inventoryController.getInventoryById);

// GET inventory by item ID
router.get('/item/:item_id', inventoryController.getInventoryByItemId);

// PUT adjust inventory
router.put('/:id', inventoryController.adjustInventory);

module.exports = router;
