const Inventory = require('../models/inventoryModel');

// 모든 인벤토리 조회
const getAllInventories = (req, res) => {
  Inventory.getInventories((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

// 특정 인벤토리 조회
const getInventoryById = (req, res) => {
  const { id } = req.params;
  Inventory.getInventoryById(id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) {
      return res.status(404).json({ error: "Inventory not found" });
    }
    res.json(results[0]);
  });
};

// 특정 아이템의 인벤토리 조회
const getInventoryByItemId = (req, res) => {
  const { item_id } = req.params;
  Inventory.getInventoryByItemId(item_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

// 인벤토리 수량 조정 (with transaction logging)
const adjustInventory = (req, res) => {
  const { id } = req.params;
  Inventory.adjustInventory(id, req.body, (err, result) => {
    if (err) {
      console.error("Adjust inventory error:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(result);
  });
};

// 모든 사용자 조회
const getAllUsers = (req, res) => {
  Inventory.getUsers((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

module.exports = {
  getAllInventories,
  getInventoryById,
  getInventoryByItemId,
  adjustInventory,
  getAllUsers
};
