const Supplier = require('../models/supplierModel');

const getAllSuppliers = (req, res) => {
  Supplier.getSuppliers((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

const getSupplierDetails = (req, res) => {
  const { supplier_id } = req.params;
  if (!supplier_id) return res.status(400).json({ error: "Supplier ID is required" });

  Supplier.getSupplierById(supplier_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ error: "Supplier not found" });

    res.json(results[0]);
  });
};

const updateSupplierDetails = (req, res) => {
  const { id } = req.params;
  Supplier.updateSupplier(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Supplier updated successfully" });
  });
};

const addNewSupplier = (req, res) => {
  Supplier.addSupplier(req.body, (err, insertId) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "Supplier added successfully", id: insertId });
  });
};

module.exports = { getAllSuppliers, getSupplierDetails, updateSupplierDetails, addNewSupplier };
