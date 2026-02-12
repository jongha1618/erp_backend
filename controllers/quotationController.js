const Quotation = require('../models/quotationModel');

// 모든 Quotation 조회
const getAllQuotations = (req, res) => {
  Quotation.getQuotations((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

// 특정 Quotation 상세 조회 (헤더 + 상세 항목)
const getQuotationFullDetails = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Quotation ID is required" });

  Quotation.getQuotationHeader(id, (err, headerResults) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (headerResults.length === 0) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    Quotation.getQuotationDetails(id, (err, detailResults) => {
      if (err) return res.status(500).json({ error: "Database error" });

      res.json({
        header: headerResults[0],
        details: detailResults
      });
    });
  });
};

// 새 Quotation 생성 (헤더 + 상세 항목)
const createQuotation = (req, res) => {
  const { header, details } = req.body;

  if (!header) {
    return res.status(400).json({ error: "Header is required" });
  }

  Quotation.addQuotation(header, (err, quotationId) => {
    if (err) {
      console.error("Create quotation error:", err);
      return res.status(500).json({ error: "Failed to create quotation" });
    }

    if (!details || details.length === 0) {
      return res.status(201).json({
        message: "Quotation created successfully",
        quotation_id: quotationId
      });
    }

    let completedCount = 0;
    let hasError = false;

    details.forEach((detail) => {
      const detailData = {
        quotation_id: quotationId,
        ...detail
      };

      Quotation.addQuotationDetail(detailData, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error("Add detail error:", err);
          return res.status(500).json({ error: "Failed to add quotation details" });
        }

        completedCount++;

        if (completedCount === details.length && !hasError) {
          res.status(201).json({
            message: "Quotation created successfully",
            quotation_id: quotationId
          });
        }
      });
    });
  });
};

// Quotation 헤더 업데이트
const updateQuotationHeader = (req, res) => {
  const { id } = req.params;

  if (!id || id === 'undefined') {
    return res.status(400).json({ error: "Valid Quotation ID is required" });
  }

  Quotation.updateQuotation(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Quotation updated successfully" });
  });
};

// Quotation 상태 업데이트
const updateQuotationStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  Quotation.updateQuotationStatus(id, status, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Quotation status updated successfully" });
  });
};

// Quotation 상세 항목 업데이트
const updateQuotationDetailItem = (req, res) => {
  const { detail_id } = req.params;

  Quotation.updateQuotationDetail(detail_id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Quotation detail updated successfully" });
  });
};

// 기존 Quotation에 상세 항목 추가
const addDetailToQuotation = (req, res) => {
  const { id } = req.params;
  const detailData = {
    quotation_id: id,
    ...req.body
  };

  Quotation.addQuotationDetail(detailData, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to add detail" });
    }
    res.status(201).json({
      message: "Detail added successfully",
      detail_id: result.insertId
    });
  });
};

// Quotation 상세 항목 삭제
const deleteQuotationDetailItem = (req, res) => {
  const { detail_id } = req.params;

  Quotation.deleteQuotationDetail(detail_id, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Quotation detail deleted successfully" });
  });
};

// Quotation 전체 삭제
const deleteQuotation = (req, res) => {
  const { id } = req.params;

  Quotation.deleteQuotation(id, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Quotation deleted successfully" });
  });
};

// Quotation을 Sales Order로 변환
const convertToSalesOrder = (req, res) => {
  const { id } = req.params;
  const { sales_number } = req.body;

  if (!sales_number) {
    return res.status(400).json({ error: "Sales Number is required" });
  }

  Quotation.convertToSalesOrder(id, sales_number, (err, result) => {
    if (err) {
      console.error("Convert to SO error:", err);
      return res.status(500).json({ error: err.message || "Failed to convert quotation to sales order" });
    }
    res.json(result);
  });
};

module.exports = {
  getAllQuotations,
  getQuotationFullDetails,
  createQuotation,
  updateQuotationHeader,
  updateQuotationStatus,
  updateQuotationDetailItem,
  addDetailToQuotation,
  deleteQuotationDetailItem,
  deleteQuotation,
  convertToSalesOrder
};
