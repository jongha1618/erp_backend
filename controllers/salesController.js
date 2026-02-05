const Sale = require('../models/saleModel');

// 모든 Sales 조회
const getAllSales = (req, res) => {
  Sale.getSales((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

// 특정 Sale 상세 조회 (헤더 + 상세 항목)
const getSaleFullDetails = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Sale ID is required" });

  // 헤더 정보 조회
  Sale.getSaleHeader(id, (err, headerResults) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (headerResults.length === 0) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // 상세 항목 조회
    Sale.getSaleDetails(id, (err, detailResults) => {
      if (err) return res.status(500).json({ error: "Database error" });

      res.json({
        header: headerResults[0],
        details: detailResults
      });
    });
  });
};

// 새 Sale 생성 (헤더 + 상세 항목)
const createSale = (req, res) => {
  const { header, details } = req.body;

  if (!header) {
    return res.status(400).json({ error: "Header is required" });
  }

  // 1. 헤더 생성
  Sale.addSale(header, (err, saleId) => {
    if (err) {
      console.error("Create sale error:", err);
      return res.status(500).json({ error: "Failed to create sale" });
    }

    // details가 없으면 바로 응답
    if (!details || details.length === 0) {
      return res.status(201).json({
        message: "Sale created successfully",
        sale_id: saleId
      });
    }

    // 2. 상세 항목 생성
    let completedCount = 0;
    let hasError = false;

    details.forEach((detail) => {
      const detailData = {
        sale_id: saleId,
        ...detail
      };

      Sale.addSaleDetail(detailData, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error("Add detail error:", err);
          return res.status(500).json({ error: "Failed to add sale details" });
        }

        completedCount++;

        if (completedCount === details.length && !hasError) {
          res.status(201).json({
            message: "Sale created successfully",
            sale_id: saleId
          });
        }
      });
    });
  });
};

// Sale 헤더 업데이트
const updateSaleHeader = (req, res) => {
  const { id } = req.params;

  if (!id || id === 'undefined') {
    return res.status(400).json({ error: "Valid Sale ID is required" });
  }

  Sale.updateSale(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Sale updated successfully" });
  });
};

// Sale 상태 업데이트
const updateSaleStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  Sale.updateSaleStatus(id, status, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Sale status updated successfully" });
  });
};

// Sale 상세 항목 업데이트
const updateSaleDetailItem = (req, res) => {
  const { detail_id } = req.params;

  Sale.updateSaleDetail(detail_id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Sale detail updated successfully" });
  });
};

// 기존 Sale에 상세 항목 추가
const addDetailToSale = (req, res) => {
  const { id } = req.params;
  const detailData = {
    sale_id: id,
    ...req.body
  };

  Sale.addSaleDetail(detailData, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to add detail" });
    }
    res.status(201).json({
      message: "Detail added successfully",
      detail_id: result.insertId
    });
  });
};

// Sale 상세 항목 삭제
const deleteSaleDetailItem = (req, res) => {
  const { detail_id } = req.params;

  Sale.deleteSaleDetail(detail_id, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Sale detail deleted successfully" });
  });
};

// Sale 전체 삭제
const deleteSale = (req, res) => {
  const { id } = req.params;

  Sale.deleteSale(id, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Sale deleted successfully" });
  });
};

// Ship 처리
const shipItem = (req, res) => {
  const { detail_id } = req.params;
  const { shipped_quantity, shipped_date, shipped_by, inventory_id, notes } = req.body;

  if (!shipped_quantity || !shipped_date || !inventory_id) {
    return res.status(400).json({
      error: "Shipped quantity, date, and inventory selection are required"
    });
  }

  const shipData = {
    shipped_quantity,
    shipped_date,
    shipped_by: shipped_by || null,
    inventory_id,
    notes: notes || null
  };

  Sale.shipItem(detail_id, shipData, (err, result) => {
    if (err) {
      console.error("Ship item error:", err);
      return res.status(500).json({ error: "Failed to ship item", details: err.message });
    }
    res.json({ message: "Item shipped successfully", data: result });
  });
};

// 특정 아이템의 가용 Inventory 조회 (Ship dialog용)
const getInventoryForItem = (req, res) => {
  const { item_id } = req.params;

  Sale.getInventoryByItemId(item_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

// 재고 예약 (Reserve inventory)
const reserveInventory = (req, res) => {
  const { inventory_id, quantity } = req.body;

  if (!inventory_id || !quantity) {
    return res.status(400).json({ error: "Inventory ID and quantity are required" });
  }

  Sale.reserveInventory(inventory_id, quantity, (err, result) => {
    if (err) {
      console.error("Reserve inventory error:", err);
      return res.status(500).json({ error: err.message || "Failed to reserve inventory" });
    }
    res.json({ message: "Inventory reserved successfully", data: result });
  });
};

// 예약 해제 (Release reservation)
const releaseReservation = (req, res) => {
  const { inventory_id, quantity } = req.body;

  if (!inventory_id || !quantity) {
    return res.status(400).json({ error: "Inventory ID and quantity are required" });
  }

  Sale.releaseReservation(inventory_id, quantity, (err, result) => {
    if (err) {
      console.error("Release reservation error:", err);
      return res.status(500).json({ error: "Failed to release reservation" });
    }
    res.json({ message: "Reservation released successfully", data: result });
  });
};

module.exports = {
  getAllSales,
  getSaleFullDetails,
  createSale,
  updateSaleHeader,
  updateSaleStatus,
  updateSaleDetailItem,
  addDetailToSale,
  deleteSaleDetailItem,
  deleteSale,
  shipItem,
  getInventoryForItem,
  reserveInventory,
  releaseReservation
};
