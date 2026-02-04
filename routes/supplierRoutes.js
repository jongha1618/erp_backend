const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

router.get('/', supplierController.getAllSuppliers);
router.get('/:supplier_id', supplierController.getSupplierDetails);
router.put('/:id', supplierController.updateSupplierDetails);
router.post('/', supplierController.addNewSupplier);

module.exports = router;
