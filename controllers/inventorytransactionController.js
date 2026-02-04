const Inventorytransaction = require('../models/inventorytransactionModel');

const getAllInventorytransactions = (req, res) => {
  Inventorytransaction.getInventorytransactions((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

const getInventorytransactionDetails = (req, res) => {
  const { inventory_transaction_id } = req.params;
  if (!inventory_transaction_id) return res.status(400).json({ error: "Inventorytransaction ID is required" });

  Inventorytransaction.getInventorytransactionById(inventory_transaction_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ error: "Inventorytransaction not found" });

    res.json(results[0]);
  });
};

const updateInventorytransactionDetails = (req, res) => {
  const { id } = req.params;
  Inventorytransaction.updateInventorytransaction(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Inventorytransaction updated successfully" });
  });
};

const addNewInventorytransaction = (req, res) => {
  Inventorytransaction.addInventorytransaction(req.body, (err, insertId) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "Inventorytransaction added successfully", id: insertId });
  });
};

module.exports = { getAllInventorytransactions, getInventorytransactionDetails, updateInventorytransactionDetails, addNewInventorytransaction };
