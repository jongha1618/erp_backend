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
