const express = require('express');
const router = express.Router();
const inventorytransactionController = require('../controllers/inventorytransactionController');

router.get('/', inventorytransactionController.getAllInventorytransactions);
router.get('/:inventory_transaction_id', inventorytransactionController.getInventorytransactionDetails);
router.put('/:id', inventorytransactionController.updateInventorytransactionDetails);
router.post('/', inventorytransactionController.addNewInventorytransaction);

module.exports = router;
