# ERP System - Backend API

A full-featured ERP (Enterprise Resource Planning) backend built with Node.js, Express, and MySQL.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (mysql2 driver)
- **PDF Generation**: PDFKit
- **Frontend**: React (Material Dashboard 2) - [separate repo](https://github.com/jongha1618/erp_frontend)

## Getting Started

### Prerequisites

- Node.js (v16+)
- MySQL Server

### Installation

```bash
git clone https://github.com/jongha1618/erp_backend.git
cd erp_backend
npm install
```

### Database Setup

1. Create a MySQL database
2. Run the schema file:
   ```bash
   mysql -u root -p your_database < sql/schema.sql
   ```
3. Update connection settings in `config/db.js`

### Run

```bash
node server.js
```

Server starts on **http://localhost:5000**

## Modules

| Module | Description |
|--------|-------------|
| **Items (Parts)** | Product catalog with cost/sales pricing |
| **Customers** | Customer master data management |
| **Suppliers** | Supplier master data management |
| **Inventory** | FIFO stock tracking with reservation system |
| **Inventory Transactions** | Audit trail for all stock movements |
| **Purchase Orders** | PO creation, approval, receiving with line items |
| **PO Requests** | Purchase requisitions with auto-create on stock shortage |
| **Sales Orders** | SO creation, shipping with inventory deduction |
| **Quotations** | Quote management with convert-to-SO functionality |
| **Kit Items (Assembly)** | Simple assembly: reserve components, build, output to inventory |
| **BOM (Bill of Materials)** | Manufacturing recipes with sub-assembly support |
| **Work Orders** | Hierarchical production orders with BOM-based auto-generation |
| **Dashboard** | Real-time KPI cards, charts, recent activity |
| **Reports** | Sales, Purchase, Inventory, Production reports with CSV/PDF export |

## API Endpoints

### Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/items` | List all items |
| GET | `/items/:id` | Get item details |
| POST | `/items` | Create item |
| PUT | `/items/:id` | Update item |
| DELETE | `/items/:id` | Delete item |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | List all customers |
| GET | `/customers/:id` | Get customer details |
| POST | `/customers` | Create customer |
| PUT | `/customers/:id` | Update customer |
| DELETE | `/customers/:id` | Delete customer |

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/suppliers` | List all suppliers |
| GET | `/suppliers/:id` | Get supplier details |
| POST | `/suppliers` | Create supplier |
| PUT | `/suppliers/:id` | Update supplier |
| DELETE | `/suppliers/:id` | Delete supplier |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventories` | List all inventory (FIFO ordered) |
| POST | `/inventories` | Add inventory record |
| PUT | `/inventories/:id` | Update inventory |
| DELETE | `/inventories/:id` | Delete inventory record |

### Inventory Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventorytransactions` | List all transactions |
| POST | `/inventorytransactions` | Create transaction |

### Purchase Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/purchase-orders` | List all POs |
| GET | `/purchase-orders/:id` | Get PO with line items |
| POST | `/purchase-orders` | Create PO (header + details) |
| PUT | `/purchase-orders/:id` | Update PO header |
| PATCH | `/purchase-orders/:id/status` | Update PO status |
| DELETE | `/purchase-orders/:id` | Delete PO |
| POST | `/purchase-orders/:id/details` | Add line item |
| PUT | `/purchase-orders/details/:id` | Update line item |
| DELETE | `/purchase-orders/details/:id` | Delete line item |
| POST | `/purchase-orders/details/:id/receive` | Receive line item |

### PO Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/purchase-requests` | List all requests |
| POST | `/purchase-requests` | Create request |
| PUT | `/purchase-requests/:id` | Update request |
| PATCH | `/purchase-requests/:id/status` | Update status |
| DELETE | `/purchase-requests/:id` | Delete request |
| POST | `/purchase-requests/convert-to-po` | Convert selected requests to PO |

### Sales Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sales` | List all sales orders |
| GET | `/sales/:id` | Get SO with line items |
| POST | `/sales` | Create SO (header + details) |
| PUT | `/sales/:id` | Update SO header |
| PATCH | `/sales/:id/status` | Update SO status |
| DELETE | `/sales/:id` | Delete SO |
| POST | `/sales/:id/details` | Add line item |
| PUT | `/sales/details/:id` | Update line item |
| DELETE | `/sales/details/:id` | Delete line item |
| POST | `/sales/details/:id/ship` | Ship line item (deducts inventory) |

### Quotations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quotations` | List all quotations |
| GET | `/quotations/:id` | Get quotation with line items |
| POST | `/quotations` | Create quotation (header + details) |
| PUT | `/quotations/:id` | Update quotation |
| DELETE | `/quotations/:id` | Delete quotation |
| POST | `/quotations/:id/convert-to-so` | Convert quotation to sales order |

### Kit Items (Assembly)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/kit-items` | List all kit items |
| GET | `/kit-items/:id` | Get kit with components |
| POST | `/kit-items` | Create kit item |
| PUT | `/kit-items/:id` | Update kit item |
| DELETE | `/kit-items/:id` | Delete kit item |
| POST | `/kit-items/:id/reserve` | Reserve component inventory |
| POST | `/kit-items/:id/complete` | Complete build (backflush + output) |

### BOM (Bill of Materials)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bom` | List all BOMs |
| GET | `/bom/:id` | Get BOM with components |
| POST | `/bom` | Create BOM |
| PUT | `/bom/:id` | Update BOM |
| DELETE | `/bom/:id` | Delete BOM |
| POST | `/bom/:id/components` | Add component |
| PUT | `/bom/components/:id` | Update component |
| DELETE | `/bom/components/:id` | Delete component |

### Work Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/work-orders` | List all work orders |
| GET | `/work-orders/:id` | Get WO with components |
| POST | `/work-orders` | Create work order |
| POST | `/work-orders/create-from-bom` | Create WO from BOM (auto sub-assemblies) |
| PUT | `/work-orders/:id` | Update work order |
| DELETE | `/work-orders/:id` | Delete work order |
| POST | `/work-orders/:id/allocate` | Allocate inventory to WO |
| POST | `/work-orders/:id/start` | Start work order |
| POST | `/work-orders/:id/complete` | Complete WO (backflush + output) |
| GET | `/work-orders/tree/:root_wo_id` | Get WO hierarchy tree |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | All dashboard data (cards, charts, recent activity) |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/sales` | Sales report (summary + details + grouped by customer) |
| GET | `/reports/sales/export/csv` | Export sales report as CSV |
| GET | `/reports/sales/export/pdf` | Export sales report as PDF |
| GET | `/reports/purchases` | Purchase report (summary + details + grouped by supplier) |
| GET | `/reports/purchases/export/csv` | Export purchase report as CSV |
| GET | `/reports/purchases/export/pdf` | Export purchase report as PDF |
| GET | `/reports/inventory` | Inventory report (summary + details + grouped by location) |
| GET | `/reports/inventory/export/csv` | Export inventory report as CSV |
| GET | `/reports/inventory/export/pdf` | Export inventory report as PDF |
| GET | `/reports/production` | Production report (summary + details + grouped by item) |
| GET | `/reports/production/export/csv` | Export production report as CSV |
| GET | `/reports/production/export/pdf` | Export production report as PDF |

**Report Query Parameters** (all optional):

| Parameter | Type | Used By | Example |
|-----------|------|---------|---------|
| `start_date` | YYYY-MM-DD | Sales, Purchases, Production | `?start_date=2026-01-01` |
| `end_date` | YYYY-MM-DD | Sales, Purchases, Production | `?end_date=2026-01-31` |
| `customer_id` | int | Sales | `?customer_id=1` |
| `supplier_id` | int | Purchases | `?supplier_id=2` |
| `item_id` | int | All reports | `?item_id=5` |
| `status` | string | Sales, Purchases, Production | `?status=confirmed` |

### Company
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/company` | Get company info |
| PUT | `/company` | Update company info |

## Project Structure

```
erp/
├── config/
│   └── db.js                  # MySQL connection pool
├── controllers/
│   ├── customerController.js
│   ├── supplierController.js
│   ├── itemController.js
│   ├── inventoryController.js
│   ├── inventorytransactionController.js
│   ├── purchaseOrderController.js
│   ├── purchaseRequestController.js
│   ├── salesController.js
│   ├── quotationController.js
│   ├── kitItemController.js
│   ├── bomController.js
│   ├── workOrderController.js
│   ├── dashboardController.js
│   ├── reportController.js
│   └── companyController.js
├── models/
│   ├── customerModel.js
│   ├── supplierModel.js
│   ├── itemModel.js
│   ├── inventoryModel.js
│   ├── inventorytransactionModel.js
│   ├── purchaseOrderModel.js
│   ├── purchaseRequestModel.js
│   ├── saleModel.js
│   ├── quotationModel.js
│   ├── kitItemModel.js
│   ├── bomModel.js
│   ├── workOrderModel.js
│   ├── dashboardModel.js
│   ├── reportModel.js
│   └── companyModel.js
├── routes/
│   ├── customerRoutes.js
│   ├── supplierRoutes.js
│   ├── itemRoutes.js
│   ├── inventoryRoutes.js
│   ├── inventorytransactionRoutes.js
│   ├── purchaseOrderRoutes.js
│   ├── purchaseRequestRoutes.js
│   ├── salesRoutes.js
│   ├── quotationRoutes.js
│   ├── kitItemRoutes.js
│   ├── bomRoutes.js
│   ├── workOrderRoutes.js
│   ├── dashboardRoutes.js
│   ├── reportRoutes.js
│   └── companyRoutes.js
├── helpers/
│   └── exportHelper.js        # CSV/PDF export builders
├── middleware/
│   └── corsMiddleware.js
├── sql/
│   └── schema.sql             # Complete database schema
├── server.js                  # Express app entry point
├── package.json
└── projectPlan.md             # Detailed project status & history
```

## Database Schema

22 tables with the `ep_` prefix. Key tables:

- `ep_items` - Product catalog
- `ep_customers` / `ep_suppliers` - Business partners
- `ep_inventories` - Stock records (FIFO, with reservation)
- `ep_inventory_transactions` - Stock movement audit trail
- `ep_purchase_orders` + `ep_purchase_order_details` - Purchase orders
- `ep_purchase_requests` - Purchase requisitions
- `ep_sales` + `ep_sale_details` - Sales orders
- `ep_quotations` + `ep_quotation_details` - Quotations
- `ep_kit_items` + `ep_kit_item_components` - Assembly orders
- `ep_bom_structures` + `ep_bom_components` - Manufacturing recipes
- `ep_work_orders` + `ep_work_order_components` - Production orders
- `ep_company` - Company master data
- `ep_users` - User reference

## Key Business Workflows

### Inventory Reservation System
- `available_qty = quantity - reservation_qty`
- FIFO ordering for stock consumption
- All movements logged in `ep_inventory_transactions`

### Quote to Cash
1. Create Quotation -> Send to customer
2. Convert accepted Quotation to Sales Order
3. Ship items from Sales Order (auto inventory deduction)

### Procure to Pay
1. PO Request created (manually or auto from stock shortage)
2. Convert PO Request to Purchase Order
3. Receive items against PO (auto inventory creation)

### Plan to Produce
1. Define BOM (Bill of Materials) with components
2. Create Work Order from BOM (auto-creates child WOs for sub-assemblies)
3. Allocate inventory to Work Order
4. Complete Work Order (backflush components, create output inventory)

## License

Private project.
