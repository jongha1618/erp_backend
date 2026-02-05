const express = require('express');
const router = express.Router();
const kitItemController = require('../controllers/kitItemController');

// Kit Items 목록 조회
router.get('/', kitItemController.getAllKitItems);

// 특정 아이템의 가용 Inventory 조회 - :id 보다 먼저 정의
router.get('/inventory/:item_id', kitItemController.getInventoryForItem);

// 특정 Kit Item 상세 조회 (헤더 + 구성품)
router.get('/:id', kitItemController.getKitItemFullDetails);

// 새 Kit Item 생성 (헤더 + 구성품)
router.post('/', kitItemController.createKitItem);

// Kit Item 헤더 업데이트
router.put('/:id', kitItemController.updateKitItemHeader);

// Kit Item 상태 업데이트
router.patch('/:id/status', kitItemController.updateKitItemStatus);

// Kit Item 삭제
router.delete('/:id', kitItemController.deleteKitItem);

// 기존 Kit Item에 구성품 추가
router.post('/:id/components', kitItemController.addComponentToKitItem);

// Kit Item 구성품 업데이트
router.put('/components/:component_id', kitItemController.updateKitItemComponentItem);

// Kit Item 구성품 삭제
router.delete('/components/:component_id', kitItemController.deleteKitItemComponentItem);

// 구성품 예약 (Reserve)
router.post('/:id/reserve', kitItemController.reserveComponents);

// Kit 조립 완료 (Complete build)
router.post('/:id/complete', kitItemController.completeKitBuild);

module.exports = router;
