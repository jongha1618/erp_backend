const Customer = require('../models/customerModel');

const getAllCustomers = (req, res) => {
  Customer.getCustomers((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

const getCustomerDetails = (req, res) => {
  const { customer_id } = req.params;
  if (!customer_id) return res.status(400).json({ error: "Customer ID is required" });

  Customer.getCustomerById(customer_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ error: "Customer not found" });

    res.json(results[0]);
  });
};

const updateCustomerDetails = (req, res) => {
  const { id } = req.params;
  Customer.updateCustomer(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Customer updated successfully" });
  });
};

const addNewCustomer = (req, res) => {
  Customer.addCustomer(req.body, (err, insertId) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "Customer added successfully", id: insertId });
  });
};

module.exports = { getAllCustomers, getCustomerDetails, updateCustomerDetails, addNewCustomer };
