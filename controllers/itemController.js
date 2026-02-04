const Item = require('../models/itemModel');

const getAllItems = (req, res) => {
  Item.getItems((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

const getItemDetails = (req, res) => {
  const { item_id } = req.params;
  if (!item_id) return res.status(400).json({ error: "Item ID is required" });

  Item.getItemById(item_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ error: "Item not found" });

    res.json(results[0]);
  });
};

const updateItemDetails = (req, res) => {
  const { id } = req.params;
  Item.updateItem(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Item updated successfully" });
  });
};

const addNewItem = (req, res) => {
  Item.addItem(req.body, (err, insertId) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "Item added successfully", id: insertId });
  });
};

module.exports = { getAllItems, getItemDetails, updateItemDetails, addNewItem };
