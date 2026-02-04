const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

router.get('/', itemController.getAllItems);
router.get('/:item_id', itemController.getItemDetails);
router.put('/:id', itemController.updateItemDetails);
router.post('/', itemController.addNewItem);

module.exports = router;
