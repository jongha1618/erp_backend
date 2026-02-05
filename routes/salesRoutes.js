const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// Sales 목록 조회
router.get('/', salesController.getAllSales);

// 특정 아이템의 가용 Inventory 조회 (Ship dialog용) - :id 보다 먼저 정의
router.get('/inventory/:item_id', salesController.getInventoryForItem);

// 특정 Sale 상세 조회 (헤더 + 상세 항목)
router.get('/:id', salesController.getSaleFullDetails);

// 새 Sale 생성 (헤더 + 상세 항목)
router.post('/', salesController.createSale);

// Sale 헤더 업데이트
router.put('/:id', salesController.updateSaleHeader);

// Sale 상태 업데이트
router.patch('/:id/status', salesController.updateSaleStatus);

// Sale 삭제
router.delete('/:id', salesController.deleteSale);

// 기존 Sale에 상세 항목 추가
router.post('/:id/details', salesController.addDetailToSale);

// Sale 상세 항목 업데이트
router.put('/details/:detail_id', salesController.updateSaleDetailItem);

// Sale 상세 항목 삭제
router.delete('/details/:detail_id', salesController.deleteSaleDetailItem);

// Ship 처리
router.post('/details/:detail_id/ship', salesController.shipItem);

// 재고 예약 (Reserve inventory)
router.post('/inventory/reserve', salesController.reserveInventory);

// 예약 해제 (Release reservation)
router.post('/inventory/release', salesController.releaseReservation);

module.exports = router;
