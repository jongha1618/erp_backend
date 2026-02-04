const Sale = require('../models/saleModel');

const getAllSales = (req, res) => {
  Sale.getSales((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

const getSalesDetails = (req, res) => {
  const { sale_id } = req.params;
  if (!sale_id) return res.status(400).json({ error: "Sale ID is required" });

  Sale.getSaleById(sale_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    
    // If no items found, it might mean the sale ID doesn't exist or the sale has no items
    if (results.length === 0) return res.status(404).json({ error: "Sale not found" });

    // Return the full array of items, not just the first one (results[0])
    res.json(results);
  });
};

const addNewSale = (req, res) => {
  // Basic validation
  if (!req.body.items || req.body.items.length === 0) {
    return res.status(400).json({ error: "Cannot create a sale without items." });
  }

  // req.body should include: customer_id, total_amount, payment_status, created_by, items (array)
  Sale.addSale(req.body, (err, insertId) => {
    if (err) {
      console.error(err); // Log the specific error for debugging
      return res.status(500).json({ error: "Database error during sale creation" });
    }
    res.status(201).json({ message: "Sale added successfully", sale_id: insertId });
  });
};

module.exports = { getAllSales, getSalesDetails, addNewSale };