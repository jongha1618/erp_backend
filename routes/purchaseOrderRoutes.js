const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');

// PO 목록 조회
router.get('/', purchaseOrderController.getAllPurchaseOrders);

// 특정 PO 상세 조회 (헤더 + 상세 항목)
router.get('/:id', purchaseOrderController.getPurchaseOrderDetails);

// 새 PO 생성 (헤더 + 상세 항목)
router.post('/', purchaseOrderController.createPurchaseOrder);

// PO 헤더 업데이트
router.put('/:id', purchaseOrderController.updatePurchaseOrderHeader);

// PO 상태 업데이트
router.patch('/:id/status', purchaseOrderController.updatePurchaseOrderStatus);

// PO 삭제
router.delete('/:id', purchaseOrderController.deletePurchaseOrder);

// 기존 PO에 상세 항목 추가
router.post('/:id/details', purchaseOrderController.addDetailToPurchaseOrder);

// PO 상세 항목 업데이트
router.put('/details/:pod_id', purchaseOrderController.updatePurchaseOrderDetailItem);

// PO 상세 항목 삭제
router.delete('/details/:pod_id', purchaseOrderController.deletePurchaseOrderDetailItem);

// 품목 수령 처리
router.post('/details/:pod_id/receive', purchaseOrderController.receiveItem);

module.exports = router;
