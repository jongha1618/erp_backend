# ERP Project Plan & Status

## Project Overview
- **Frontend**: React (Material Dashboard) - `C:\react\material-dashboard-react`
- **Backend**: Node.js/Express - `C:\react\erp`
- **Database**: MySQL
- **GitHub**:
  - Frontend: https://github.com/jongha1618/erp_frontend
  - Backend: https://github.com/jongha1618/erp_backend

---

## Modules Status

### ✅ Completed Modules

| Module | Backend | Frontend | Notes |
|--------|---------|----------|-------|
| Items (Parts) | ✅ | ✅ | CRUD complete |
| Customers | ✅ | ✅ | CRUD complete |
| Suppliers | ✅ | ✅ | CRUD complete |
| Inventory | ✅ | ✅ | FIFO ordering, Reserved/Available qty display |
| Inventory Transactions | ✅ | ✅ | Transaction logging |
| Purchase Orders | ✅ | ✅ | Master-Detail, Receive functionality |
| Sales Orders | ✅ | ✅ | Master-Detail, Ship functionality with inventory deduction |
| Kit Items (Assembly) | ✅ | ✅ | Reserve → Complete build → Output to inventory |
| PO Request | ✅ | ✅ | Auto-create on Kit Reserve, Convert to PO |
| BOM (Bill of Materials) | ✅ | ✅ | 마스터 레시피, 하위 조립품 BOM 연결 지원 |
| Work Orders | ✅ | ✅ | 계층형 WO, BOM 기반 자동 생성, Tree View, Backflushing |

### 🔄 In Progress

(None currently)

### 📋 Planned / TODO

- [ ] Quotation & Invoice module
- [ ] User authentication/authorization
- [ ] Dashboard statistics
- [ ] Reports

---

## 🆕 PO Request Module (Planning)

### Concept
Kit Item Reserve 시 재고 부족하면 자동으로 PO Request 목록에 추가되어 구매 담당자가 검토 후 실제 PO로 변환

### Database: ep_purchase_requests
```sql
CREATE TABLE ep_purchase_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  quantity_needed DECIMAL(10,2) NOT NULL,
  source_type ENUM('kit_reserve', 'manual', 'sales_order') DEFAULT 'manual',
  source_id INT NULL,
  status ENUM('pending', 'approved', 'converted_to_po', 'cancelled') DEFAULT 'pending',
  suggested_supplier_id INT NULL,
  priority ENUM('normal', 'urgent') DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES ep_items(item_id),
  FOREIGN KEY (suggested_supplier_id) REFERENCES ep_suppliers(supplier_id)
);
```

### Workflow
1. **자동 생성**: Kit Reserve 시 재고 부족 → PO Request 자동 생성
2. **목록 관리**: PO Request 목록 화면에서 pending 요청 확인
3. **PO 변환**: 선택한 요청들을 실제 Purchase Order로 변환

### Backend Tasks
- [x] Create purchaseRequestModel.js
- [x] Create purchaseRequestController.js
- [x] Create purchaseRequestRoutes.js
- [x] Register routes in server.js (`/purchase-requests`)
- [x] Modify kitItemModel.js - reserveComponents() 에서 부족 시 auto-create request
- [x] Add "Convert to PO" functionality (POST /purchase-requests/convert-to-po)

### Frontend Tasks
- [x] Create PO Request list page (`layouts/purchaserequests/index.js`)
- [x] Create PO Request table data (`layouts/purchaserequests/data/purchaseRequestsTableData.js`)
- [x] Add "Convert to PO" button with dialog
- [x] Add route to sidenav (`routes.js`)
- [ ] (Optional) Update Kit Item form to show link to created PO Request

---

## Recent Changes (Latest First)

### 2026-02-11
- **Bug Fix**: BOM - Output Item 자기 참조 방지
  - 문제: BOM의 Output Item으로 선택한 아이템을 Components의 Item에서도 선택 가능 (순환 참조)
  - Frontend: Components Item 드롭다운에서 Output Item 필터링 (`availableComponentItems`)
  - Backend: `createBOM`, `addComponentToBOM`에서 output_item_id와 동일한 component item_id 검증
  - 변경 파일: `bomform.js`, `bomController.js`
- **Bug Fix**: Work Order - BOM 기반 WO 생성 시 트랜잭션 데드락 해결
  - 문제: `createFromBOM` 재귀 호출 시 별도 DB connection/트랜잭션 사용으로 Lock wait timeout 발생
  - 해결: `options._connection`을 통해 재귀 호출 시 동일한 connection을 공유하도록 리팩토링
  - 변경 파일: `workOrderModel.js`
- **Bug Fix**: Work Order - WO 번호 중복 생성 방지
  - 문제: `generateWONumber`이 pool connection 사용 → 트랜잭션 내 미커밋 INSERT를 못 봄 → 중복 번호 생성
  - 해결: `generateWONumber`에 optional connection 파라미터 추가, `createFromBOM`에서 트랜잭션 connection 전달
  - 변경 파일: `workOrderModel.js`
- **Bug Fix**: Purchase Order - `expected_delivery` 빈 문자열 에러 수정
  - 문제: expected_delivery가 빈 문자열 `''`로 전달되면 MySQL date 컬럼에서 에러 발생
  - 해결: INSERT/UPDATE 시 빈 문자열을 NULL로 변환
  - 변경 파일: `purchaseOrderModel.js`, `purchaseRequestModel.js`
- **Enhancement**: PO Request - Convert to PO 모달 PO Number 필드 변경
  - PO Number 자동 생성(prepopulate) 제거, 사용자 직접 입력으로 변경
  - PO Number를 required 필드로 변경 (미입력 시 alert)
  - 변경 파일: `layouts/purchaserequests/index.js`

### 2026-02-09
- **New Feature**: Work Order (작업 지시서) 모듈 완료
  - 계층형 Work Order 지원 (parent_wo_id, root_wo_id, depth)
  - BOM 기반 자동 WO 생성 (하위 조립품 BOM이 있으면 자동으로 Child WO 생성)
  - 상태 머신: Draft → Blocked → Ready → In Progress → Completed
  - Soft Allocation (가할당): 재고 예약 + 부족 시 PO Request 자동 생성
  - Backflushing: WO 완료 시 재고 차감 + 완성품 인벤토리 생성
  - Tree View: MUI TreeView로 계층 구조 시각화 (진행률 표시)
  - 파일:
    - Backend: `workOrderModel.js`, `workOrderController.js`, `workOrderRoutes.js`
    - Frontend: `layouts/workorders/index.js`, `workorderform.js`, `WorkOrderTreeView.js`
- **New Feature**: BOM (Bill of Materials) 모듈 완료
  - 마스터 레시피 정의 (output_item_id, output_quantity)
  - 구성품 관리 (quantity_per_unit)
  - 하위 조립품 BOM 연결 (is_subassembly, subassembly_bom_id)
  - 버전 관리 (version), 활성화 상태 (is_active)
  - 파일:
    - Backend: `bomModel.js`, `bomController.js`, `bomRoutes.js`
    - Frontend: `layouts/bom/index.js`, `bomform.js`, `bomTableData.js`

### 2026-02-06
- **New Feature**: PO PDF 프린트 기능
  - PO 디테일 페이지에서 Print PO 버튼 추가
  - jsPDF + jspdf-autotable을 사용하여 PDF 생성
  - PDF 내용: 회사 정보, PO 번호/날짜, Supplier 정보, 아이템 테이블, 총액, 노트
  - 변경 파일: `layouts/purchaseorders/newpurchaseorder/purchaseorderform.js`
- **New Feature**: 회사 정보 테이블 (ep_company)
  - 회사 이름, 주소, 전화번호, 이메일, 웹사이트, Tax ID, 로고 URL 저장
  - Backend API: GET/PUT `/company`
  - 파일: `models/companyModel.js`, `controllers/companyController.js`, `routes/companyRoutes.js`
- **Enhancement**: PO Status 변경 추적
  - DB 스키마에 `approved_by`, `approved_date`, `cancelled_by`, `cancelled_date` 필드 추가
  - Status가 Approved로 변경되면 approved_by, approved_date 자동 기록
  - Status가 Cancelled로 변경되면 cancelled_by, cancelled_date 자동 기록
  - 변경 파일: `models/purchaseOrderModel.js`, `sql/schema.sql`
- **Bug Fix**: Purchase Order 디테일 페이지 Status 드롭다운 표시 문제 수정
  - 문제: PO 디테일 페이지에서 Status 드롭다운에 현재 상태가 표시되지 않음
  - 원인: STATUS_OPTIONS 대소문자 불일치 (DB: 'Pending' vs 코드: 'pending')
  - 해결: STATUS_OPTIONS를 DB 스키마의 대소문자와 일치하도록 수정
  - 변경 파일: `layouts/purchaseorders/newpurchaseorder/purchaseorderform.js`
  - 변경 내용: `["pending", ...]` → `["Pending", "Approved", "Received", "Cancelled"]`
  - DB 스키마: `enum('Pending','Approved','Shipped','Received','Cancelled')`
- **New Feature**: PO Request 수동 추가 기능 (Add Request 버튼)
  - 일반 사용자가 PO Request를 수동으로 추가할 수 있는 기능
  - 변경 파일:
    - `layouts/purchaserequests/index.js` - Add Request 버튼 및 다이얼로그 추가
    - `layouts/purchaserequests/data/purchaseRequestsTableData.js` - `useItemsData` hook 추가
  - 다이얼로그 입력 필드:
    - Item 선택 (Autocomplete) + **현재 재고 정보 표시** (Current Qty, Reserved, Available)
    - Quantity Needed 입력
    - Priority 선택 (Normal/Urgent)
    - Notes 입력
  - 아이템 선택 시 `/kit-items/inventory/:itemId` API 호출하여 재고 정보 조회
  - source_type: 'manual'로 설정되어 자동 생성과 구분
- **Bug Fix**: Complete Build 시 마이너스 재고 항목 PO Request 자동 생성
  - 문제: Quantity to Build를 늘린 후 Complete Build 시 마이너스 재고가 발생해도 PO Request가 생성되지 않음
  - 원인: `reserveComponents`에만 PO Request 생성 로직이 있었고, `completeKitBuild`에는 없었음
  - 해결: `completeKitBuild` 함수에 마이너스 재고 감지 및 PO Request 자동 생성 로직 추가
  - 변경 파일: `models/kitItemModel.js`
  - 세부 내용:
    - Complete Build 전에 각 component의 재고 차감 후 마이너스 여부 미리 계산
    - 마이너스가 되는 항목들에 대해 shortage 양만큼 PO Request 자동 생성
    - Complete Build로 생성된 PO Request는 priority: 'urgent'로 설정 (이미 재고가 마이너스이므로)
    - 기존 pending 상태의 같은 아이템 요청이 있으면 수량 병합
- **New Feature**: PO Request Module Frontend 완료
  - `layouts/purchaserequests/index.js` - 목록 페이지 (체크박스 선택, Convert to PO)
  - `layouts/purchaserequests/data/purchaseRequestsTableData.js` - 테이블 데이터
  - `routes.js` 업데이트 - PO Request 메뉴 추가
  - 기능: 목록 조회, 상태별 필터, Convert to PO 다이얼로그, Cancel/Delete
- **New Feature**: PO Request Module Backend 완료
  - `ep_purchase_requests` 테이블 생성
  - `purchaseRequestModel.js`, `purchaseRequestController.js`, `purchaseRequestRoutes.js` 생성
  - API Endpoints: `/purchase-requests` (GET, POST, PUT, DELETE, PATCH)
  - Convert to PO: `POST /purchase-requests/convert-to-po`
  - Kit Reserve 시 재고 부족하면 자동으로 PO Request 생성 (`kitItemModel.js` 수정)
  - 동일 아이템에 대한 중복 요청은 기존 요청에 수량 추가 (병합)
- **Enhancement**: Kit Items Reserve now allows negative available quantity with warning
  - Reserve proceeds even when inventory is insufficient (for future stock arrivals)
  - Displays warning message with shortage details
  - Backend: Modified `reserveComponents` in kitItemModel.js
  - Frontend: Updated kititemform.js to show warning alerts
- **Bug Fix**: Added `notes` column to `ep_inventories` table
  - Fixed "Unknown column 'notes'" error when completing kit builds with output item
- **Bug Fix**: Added 'kit_usage' and 'kit_production' to `ep_inventory_transactions.transaction_type` ENUM
  - Fixed "Data truncated for column 'transaction_type'" error when completing kit builds
- Removed Claude Co-Authored-By from frontend repo
- Sales Order module completed (Ship function with inventory deduction)
- Kit Items: Added output_item_id feature (completed kits create inventory)
- Inventory: Changed to FIFO ordering (grouped by item_code, sorted by created_at)
- Inventory: Added Reserved/Available quantity columns

---

## Database Schema (Key Tables)

### ep_items
- item_id, item_code, name, description, part_number, unit_price, etc.

### ep_inventories
- inventory_id, item_id, quantity, reservation_qty, batch_number, location, expiry_date, created_at

### ep_inventory_transactions
- transaction_id, inventory_id, item_id, quantity, transaction_type, transaction_date, notes
- transaction_type: 'adjustment', 'purchase', 'sale', 'kit_usage', 'kit_production'

### ep_sales + ep_sale_details
- Master-Detail structure
- Status: draft, confirmed, shipped, delivered, cancelled
- Ship function deducts from inventory

### ep_kit_items + ep_kit_item_components
- Master-Detail structure
- Status: draft, in_progress, completed, cancelled
- output_item_id: Item created when kit is completed
- Reserve → Complete build workflow

### ep_purchase_orders + ep_purchase_order_details
- Master-Detail structure
- Status: Pending, Approved, Shipped, Received, Cancelled
- approved_by, approved_date (Approved 시 자동 기록)
- cancelled_by, cancelled_date (Cancelled 시 자동 기록)

### ep_purchase_requests
- request_id, item_id, quantity_needed, source_type, source_id
- status: pending, approved, converted_to_po, cancelled
- priority: normal, urgent
- suggested_supplier_id, converted_po_id

### ep_bom_structures (BOM 마스터)
- bom_id, bom_number, name, description
- output_item_id: 생산되는 아이템
- output_quantity: 1회 생산 수량
- version: 버전 관리 (기본 '1.0')
- is_active: 활성화 상태

### ep_bom_components (BOM 구성품)
- bom_component_id, bom_id, item_id
- quantity_per_unit: 단위당 필요 수량
- is_subassembly: 하위 조립품 여부
- subassembly_bom_id: 하위 BOM 참조 (재귀적)
- sequence_order: 순서

### ep_work_orders (계층형 Work Order)
- wo_id, wo_number, bom_id, output_item_id
- quantity_ordered, quantity_completed
- parent_wo_id: 상위 WO (계층 구조)
- root_wo_id: 최상위 WO
- depth: 계층 깊이 (0부터 시작)
- status: draft, blocked, ready, in_progress, completed, cancelled
- priority: low, normal, high, urgent
- planned_start_date, planned_end_date, actual_start_date, actual_end_date

### ep_work_order_components (WO 자재 + 할당 추적)
- woc_id, wo_id, item_id, inventory_id
- quantity_required: 필요 수량
- quantity_allocated: Soft Allocation 수량
- quantity_consumed: Backflushing 수량
- is_subassembly, child_wo_id: 하위 WO 연결

### ep_company
- company_id, company_name, address_line1, address_line2
- city, state, postal_code, country
- phone, fax, email, website, tax_id, logo_url
- PDF 문서 생성 시 회사 정보 표시에 사용
- Auto-created when Kit Reserve has insufficient inventory

---

## Key Features & Patterns

### Inventory Management
- FIFO (First In First Out) ordering
- Reservation system: `available_qty = quantity - reservation_qty`
- Transaction logging for all changes

### Kit Assembly Workflow
1. Create Kit Item with components
2. Reserve components (locks inventory)
3. Complete build (deducts from inventory, creates output inventory if output_item_id set)

### Sales Order Ship Workflow
1. Create Sales Order with details
2. Ship items (select inventory batch → deduct quantity → log transaction)

### BOM & Work Order 관계
- **BOM**: 마스터 레시피 ("A를 만들려면 B 2개, C 1개가 필요하다")
- **Work Order**: 실제 생산 기록 ("2026-02-09에 A 10개를 만든다")
- Kit Items와 병행 사용 (간단한 조립은 Kit Items, 복잡한 계층 생산은 Work Order)

### Work Order 상태 머신
```
Draft ──▶ [체크: 하위 WO 완료? 자재 확보?]
              │
    Yes ──────┼───────▶ Ready ──▶ In Progress ──▶ Completed
              │
    No ───────┴───────▶ Blocked
                            │
                    (조건 충족 시) ──▶ Ready
```

### Work Order Workflow
1. **BOM에서 WO 생성**: "Create from BOM" → 수량/우선순위 입력 → 하위 BOM이 있으면 Child WO 자동 생성
2. **재고 할당 (Allocate)**: Soft Allocation으로 재고 예약 → 부족 시 PO Request 자동 생성
3. **작업 시작 (Start)**: Ready 상태에서만 시작 가능
4. **작업 완료 (Complete)**: Backflushing으로 재고 차감 + 완성품 인벤토리 생성
5. **부모 WO 자동 업데이트**: 모든 Child WO 완료 + 자재 확보 시 부모 WO가 Ready로 전환

---

## How to Use This File

When starting a new Claude session:
1. Ask Claude to read this file first: "Read projectPlan.md and understand the project status"
2. Then describe your task
3. After completing work, ask Claude to update this file

Example prompt:
```
projectPlan.md 파일을 읽고 프로젝트 상태를 파악해줘.
그 다음 [작업 내용] 을 해줘.

작업 완료 후
만약에 databse schema 가 바뀌었으면 sql\schema.sql 파일을 업데이트 해줘.
projectPlan.md 파일을 업데이트 해줘.
```

---

## Notes

- Frontend port: 3000
- Backend port: 5000
- All API calls use axios to http://localhost:5000

