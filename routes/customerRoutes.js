const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/', customerController.getAllCustomers);
router.get('/:customer_id', customerController.getCustomerDetails);
router.put('/:id', customerController.updateCustomerDetails);
router.post('/', customerController.addNewCustomer);

module.exports = router;
