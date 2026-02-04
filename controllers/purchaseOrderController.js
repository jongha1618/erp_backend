const PurchaseOrder = require('../models/purchaseOrderModel');

// 모든 PO 조회
const getAllPurchaseOrders = (req, res) => {
  PurchaseOrder.getPurchaseOrders((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

// 특정 PO 상세 조회 (헤더 + 상세 항목)
const getPurchaseOrderDetails = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Purchase Order ID is required" });

  // 헤더 정보 조회
  PurchaseOrder.getPurchaseOrderById(id, (err, headerResults) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (headerResults.length === 0) {
      return res.status(404).json({ error: "Purchase Order not found" });
    }

    // 상세 항목 조회
    PurchaseOrder.getPurchaseOrderDetails(id, (err, detailResults) => {
      if (err) return res.status(500).json({ error: "Database error" });

      res.json({
        header: headerResults[0],
        details: detailResults
      });
    });
  });
};

// 새 PO 생성 (헤더 + 상세 항목)
const createPurchaseOrder = (req, res) => {
  const { header, details } = req.body;

  if (!header || !details || details.length === 0) {
    return res.status(400).json({ error: "Header and details are required" });
  }

  // 1. 헤더 생성
  PurchaseOrder.addPurchaseOrder(header, (err, purchaseOrderId) => {
    if (err) {
      return res.status(500).json({ error: "Failed to create purchase order" });
    }

    // 2. 상세 항목 생성
    let completedCount = 0;
    let hasError = false;

    details.forEach((detail) => {
      const detailData = {
        purchaseorder_id: purchaseOrderId,
        ...detail
      };

      PurchaseOrder.addPurchaseOrderDetail(detailData, (err) => {
        if (err && !hasError) {
          hasError = true;
          return res.status(500).json({ error: "Failed to add purchase order details" });
        }

        completedCount++;

        // 모든 상세 항목이 추가되면 성공 응답
        if (completedCount === details.length && !hasError) {
          res.status(201).json({
            message: "Purchase Order created successfully",
            purchaseorder_id: purchaseOrderId
          });
        }
      });
    });
  });
};

// PO 헤더 업데이트
const updatePurchaseOrderHeader = (req, res) => {
  const { id } = req.params;

  if (!id || id === 'undefined') {
    return res.status(400).json({ error: "Valid Purchase Order ID is required" });
  }

  PurchaseOrder.updatePurchaseOrder(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Purchase Order updated successfully" });
  });
};

// PO 상태 업데이트
const updatePurchaseOrderStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  PurchaseOrder.updatePurchaseOrderStatus(id, status, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Purchase Order status updated successfully" });
  });
};

// PO 상세 항목 업데이트
const updatePurchaseOrderDetailItem = (req, res) => {
  const { pod_id } = req.params;

  PurchaseOrder.updatePurchaseOrderDetail(pod_id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Purchase Order detail updated successfully" });
  });
};

// 품목 수령 처리
const receiveItem = (req, res) => {
  const { pod_id } = req.params;
  const { received_quantity, received_date, received_by, notes, batch_number, expiry_date, location } = req.body;

  // received_by는 null 가능
  if (!received_quantity || !received_date) {
    return res.status(400).json({
      error: "Received quantity and date are required"
    });
  }

  const receiveData = {
    received_quantity,
    received_date,
    received_by: received_by || null,
    notes: notes || null,
    batch_number: batch_number || null,
    expiry_date: expiry_date || null,
    location: location || null
  };

  PurchaseOrder.receiveItem(pod_id, receiveData, (err, result) => {
    if (err) {
      console.error("Receive item error:", err);
      return res.status(500).json({ error: "Failed to receive item", details: err.message });
    }
    res.json({ message: "Item received successfully", data: result });
  });
};

// PO 상세 항목 추가 (기존 PO에)
const addDetailToPurchaseOrder = (req, res) => {
  const { id } = req.params; // purchaseorder_id
  const detailData = {
    purchaseorder_id: id,
    ...req.body
  };

  PurchaseOrder.addPurchaseOrderDetail(detailData, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to add detail" });
    }
    res.status(201).json({
      message: "Detail added successfully",
      pod_id: result.insertId
    });
  });
};

// PO 상세 항목 삭제
const deletePurchaseOrderDetailItem = (req, res) => {
  const { pod_id } = req.params;

  PurchaseOrder.deletePurchaseOrderDetail(pod_id, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Purchase Order detail deleted successfully" });
  });
};

// PO 전체 삭제
const deletePurchaseOrder = (req, res) => {
  const { id } = req.params;

  PurchaseOrder.deletePurchaseOrder(id, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Purchase Order deleted successfully" });
  });
};

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderDetails,
  createPurchaseOrder,
  updatePurchaseOrderHeader,
  updatePurchaseOrderStatus,
  updatePurchaseOrderDetailItem,
  receiveItem,
  addDetailToPurchaseOrder,
  deletePurchaseOrderDetailItem,
  deletePurchaseOrder
};
