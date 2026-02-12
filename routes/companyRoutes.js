const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// GET /company - Get company info
router.get('/', companyController.getCompany);

// PUT /company - Update company info
router.put('/', companyController.updateCompany);

module.exports = router;
