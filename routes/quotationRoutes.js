const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');

// Quotation 목록 조회
router.get('/', quotationController.getAllQuotations);

// 특정 Quotation 상세 조회 (헤더 + 상세 항목)
router.get('/:id', quotationController.getQuotationFullDetails);

// 새 Quotation 생성 (헤더 + 상세 항목)
router.post('/', quotationController.createQuotation);

// Quotation 헤더 업데이트
router.put('/:id', quotationController.updateQuotationHeader);

// Quotation 상태 업데이트
router.patch('/:id/status', quotationController.updateQuotationStatus);

// Quotation 삭제
router.delete('/:id', quotationController.deleteQuotation);

// 기존 Quotation에 상세 항목 추가
router.post('/:id/details', quotationController.addDetailToQuotation);

// Quotation 상세 항목 업데이트
router.put('/details/:detail_id', quotationController.updateQuotationDetailItem);

// Quotation 상세 항목 삭제
router.delete('/details/:detail_id', quotationController.deleteQuotationDetailItem);

// Quotation을 Sales Order로 변환
router.post('/:id/convert-to-so', quotationController.convertToSalesOrder);

module.exports = router;
