const PurchaseRequest = require('../models/purchaseRequestModel');

// Get all purchase requests
const getAllPurchaseRequests = (req, res) => {
  PurchaseRequest.getPurchaseRequests((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

// Get purchase requests by status
const getPurchaseRequestsByStatus = (req, res) => {
  const { status } = req.params;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  PurchaseRequest.getPurchaseRequestsByStatus(status, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

// Get purchase request by ID
const getPurchaseRequestById = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Request ID is required" });
  }

  PurchaseRequest.getPurchaseRequestById(id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) {
      return res.status(404).json({ error: "Purchase request not found" });
    }
    res.json(results[0]);
  });
};

// Create new purchase request
const createPurchaseRequest = (req, res) => {
  const { item_id, quantity_needed } = req.body;

  if (!item_id || !quantity_needed) {
    return res.status(400).json({ error: "Item ID and quantity are required" });
  }

  PurchaseRequest.addPurchaseRequest(req.body, (err, requestId) => {
    if (err) {
      console.error("Create purchase request error:", err);
      return res.status(500).json({ error: "Failed to create purchase request" });
    }
    res.status(201).json({
      message: "Purchase request created successfully",
      request_id: requestId
    });
  });
};

// Update purchase request
const updatePurchaseRequest = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Request ID is required" });
  }

  PurchaseRequest.updatePurchaseRequest(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Purchase request updated successfully" });
  });
};

// Update purchase request status
const updatePurchaseRequestStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  PurchaseRequest.updatePurchaseRequestStatus(id, status, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Purchase request status updated successfully" });
  });
};

// Delete purchase request
const deletePurchaseRequest = (req, res) => {
  const { id } = req.params;

  PurchaseRequest.deletePurchaseRequest(id, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Purchase request deleted successfully" });
  });
};

// Convert multiple purchase requests to a Purchase Order
const convertToPurchaseOrder = (req, res) => {
  const { request_ids, po_data } = req.body;

  if (!request_ids || !Array.isArray(request_ids) || request_ids.length === 0) {
    return res.status(400).json({ error: "Request IDs array is required" });
  }

  if (!po_data || !po_data.supplier_id) {
    return res.status(400).json({ error: "PO data with supplier_id is required" });
  }

  PurchaseRequest.convertToPurchaseOrder(request_ids, po_data, (err, result) => {
    if (err) {
      console.error("Convert to PO error:", err);
      return res.status(500).json({ error: "Failed to convert to Purchase Order", details: err.message });
    }
    res.status(201).json({
      message: "Purchase Order created successfully",
      ...result
    });
  });
};

module.exports = {
  getAllPurchaseRequests,
  getPurchaseRequestsByStatus,
  getPurchaseRequestById,
  createPurchaseRequest,
  updatePurchaseRequest,
  updatePurchaseRequestStatus,
  deletePurchaseRequest,
  convertToPurchaseOrder
};
