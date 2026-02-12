const Company = require('../models/companyModel');

// Get company info
exports.getCompany = (req, res) => {
  Company.getCompany((err, results) => {
    if (err) {
      console.error('Error fetching company:', err);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(results[0]);
  });
};

// Update company info
exports.updateCompany = (req, res) => {
  Company.updateCompany(req.body, (err, result) => {
    if (err) {
      console.error('Error updating company:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Company updated successfully' });
  });
};
