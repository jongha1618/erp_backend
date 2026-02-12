const db = require('../config/db');

// ============================================
// Shared Helper: Dynamic WHERE clause builder
// ============================================
const buildWhereClause = (filters, fieldMap) => {
  const conditions = [];
  const params = [];

  if (filters.start_date && fieldMap.start_date) {
    conditions.push(`${fieldMap.start_date} >= ?`);
    params.push(filters.start_date);
  }
  if (filters.end_date && fieldMap.end_date) {
    conditions.push(`${fieldMap.end_date} <= ?`);
    params.push(filters.end_date);
  }
  if (filters.customer_id && fieldMap.customer_id) {
    conditions.push(`${fieldMap.customer_id} = ?`);
    params.push(parseInt(filters.customer_id));
  }
  if (filters.supplier_id && fieldMap.supplier_id) {
    conditions.push(`${fieldMap.supplier_id} = ?`);
    params.push(parseInt(filters.supplier_id));
  }
  if (filters.item_id && fieldMap.item_id) {
    conditions.push(`${fieldMap.item_id} = ?`);
    params.push(parseInt(filters.item_id));
  }
  if (filters.status && fieldMap.status) {
    conditions.push(`${fieldMap.status} = ?`);
    params.push(filters.status);
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  return { whereClause, params };
};

// ============================================
// Sales Report
// ============================================
const getSalesReport = (filters, callback) => {
  const baseFieldMap = {
    start_date: 's.order_date',
    end_date: 's.order_date',
    customer_id: 's.customer_id',
    status: 's.status'
  };
  const detailFieldMap = { ...baseFieldMap, item_id: 'sd.item_id' };

  const wDetail = buildWhereClause(filters, detailFieldMap);
  const wBase = filters.item_id
    ? buildWhereClause(filters, detailFieldMap)
    : buildWhereClause(filters, baseFieldMap);

  const detailJoin = filters.item_id
    ? 'INNER JOIN ep_sale_details sd ON s.sale_id = sd.sale_id'
    : 'LEFT JOIN ep_sale_details sd ON s.sale_id = sd.sale_id';

  const result = {};
  let completed = 0;
  let hasError = false;
  const totalQueries = 4;

  const checkDone = () => {
    completed++;
    if (completed === totalQueries && !hasError) {
      callback(null, result);
    }
  };
  const handleError = (err) => {
    if (!hasError) {
      hasError = true;
      callback(err);
    }
  };

  // 1. Summary
  db.query(
    `SELECT
       COUNT(DISTINCT s.sale_id) AS total_orders,
       COALESCE(SUM(DISTINCT s.total_amount), 0) AS total_revenue,
       COALESCE(AVG(DISTINCT s.total_amount), 0) AS average_order_value,
       COALESCE(SUM(sd.quantity), 0) AS total_items_sold
     FROM ep_sales s
     ${detailJoin}
     ${wDetail.whereClause}`,
    wDetail.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.summary = rows[0];
      checkDone();
    }
  );

  // 2. Status breakdown
  const statusJoin = filters.item_id
    ? 'INNER JOIN ep_sale_details sd ON s.sale_id = sd.sale_id'
    : '';
  db.query(
    `SELECT s.status, COUNT(DISTINCT s.sale_id) AS count
     FROM ep_sales s
     ${statusJoin}
     ${wBase.whereClause}
     GROUP BY s.status`,
    wBase.params,
    (err, rows) => {
      if (err) return handleError(err);
      const orders_by_status = {};
      rows.forEach(r => { orders_by_status[r.status] = r.count; });
      if (!result.summary) result.summary = {};
      result.summary.orders_by_status = orders_by_status;
      checkDone();
    }
  );

  // 3. Details
  db.query(
    `SELECT
       s.sale_id, s.sales_number, s.order_date, s.delivery_date,
       s.status, s.total_amount, s.notes,
       c.company_name,
       COUNT(sd.detail_id) AS item_count
     FROM ep_sales s
     LEFT JOIN ep_customers c ON s.customer_id = c.customer_id
     ${detailJoin}
     ${wDetail.whereClause}
     GROUP BY s.sale_id
     ORDER BY s.order_date DESC`,
    wDetail.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.details = rows;
      checkDone();
    }
  );

  // 4. Grouped by customer
  db.query(
    `SELECT
       c.customer_id AS group_id,
       COALESCE(c.company_name, 'No Customer') AS group_key,
       COUNT(DISTINCT s.sale_id) AS order_count,
       COALESCE(SUM(DISTINCT s.total_amount), 0) AS total_revenue
     FROM ep_sales s
     LEFT JOIN ep_customers c ON s.customer_id = c.customer_id
     ${detailJoin}
     ${wDetail.whereClause}
     GROUP BY c.customer_id, c.company_name
     ORDER BY total_revenue DESC`,
    wDetail.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.grouped = rows;
      checkDone();
    }
  );
};

// ============================================
// Purchase Report
// ============================================
const getPurchaseReport = (filters, callback) => {
  const baseFieldMap = {
    start_date: 'po.order_date',
    end_date: 'po.order_date',
    supplier_id: 'po.supplier_id',
    status: 'po.status'
  };
  const detailFieldMap = { ...baseFieldMap, item_id: 'pod.item_id' };

  const wDetail = buildWhereClause(filters, detailFieldMap);
  const wBase = filters.item_id
    ? buildWhereClause(filters, detailFieldMap)
    : buildWhereClause(filters, baseFieldMap);

  const detailJoin = filters.item_id
    ? 'INNER JOIN ep_purchase_order_details pod ON po.purchaseorder_id = pod.purchaseorder_id'
    : 'LEFT JOIN ep_purchase_order_details pod ON po.purchaseorder_id = pod.purchaseorder_id';

  const result = {};
  let completed = 0;
  let hasError = false;
  const totalQueries = 4;

  const checkDone = () => {
    completed++;
    if (completed === totalQueries && !hasError) {
      callback(null, result);
    }
  };
  const handleError = (err) => {
    if (!hasError) {
      hasError = true;
      callback(err);
    }
  };

  // 1. Summary
  db.query(
    `SELECT
       COUNT(DISTINCT po.purchaseorder_id) AS total_orders,
       COALESCE(SUM(DISTINCT po.total_amount), 0) AS total_spend,
       COALESCE(AVG(DISTINCT po.total_amount), 0) AS average_order_value,
       COALESCE(SUM(pod.quantity), 0) AS total_items_ordered
     FROM ep_purchase_orders po
     ${detailJoin}
     ${wDetail.whereClause}`,
    wDetail.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.summary = rows[0];
      checkDone();
    }
  );

  // 2. Status breakdown
  const statusJoin = filters.item_id
    ? 'INNER JOIN ep_purchase_order_details pod ON po.purchaseorder_id = pod.purchaseorder_id'
    : '';
  db.query(
    `SELECT po.status, COUNT(DISTINCT po.purchaseorder_id) AS count
     FROM ep_purchase_orders po
     ${statusJoin}
     ${wBase.whereClause}
     GROUP BY po.status`,
    wBase.params,
    (err, rows) => {
      if (err) return handleError(err);
      const orders_by_status = {};
      rows.forEach(r => { orders_by_status[r.status] = r.count; });
      if (!result.summary) result.summary = {};
      result.summary.orders_by_status = orders_by_status;
      checkDone();
    }
  );

  // 3. Details
  db.query(
    `SELECT
       po.purchaseorder_id, po.po_number, po.order_date,
       po.expected_delivery, po.status, po.total_amount, po.notes,
       s.company_name,
       COUNT(pod.pod_id) AS item_count
     FROM ep_purchase_orders po
     LEFT JOIN ep_suppliers s ON po.supplier_id = s.supplier_id
     ${detailJoin}
     ${wDetail.whereClause}
     GROUP BY po.purchaseorder_id
     ORDER BY po.order_date DESC`,
    wDetail.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.details = rows;
      checkDone();
    }
  );

  // 4. Grouped by supplier
  db.query(
    `SELECT
       s.supplier_id AS group_id,
       COALESCE(s.company_name, 'No Supplier') AS group_key,
       COUNT(DISTINCT po.purchaseorder_id) AS order_count,
       COALESCE(SUM(DISTINCT po.total_amount), 0) AS total_spend
     FROM ep_purchase_orders po
     LEFT JOIN ep_suppliers s ON po.supplier_id = s.supplier_id
     ${detailJoin}
     ${wDetail.whereClause}
     GROUP BY s.supplier_id, s.company_name
     ORDER BY total_spend DESC`,
    wDetail.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.grouped = rows;
      checkDone();
    }
  );
};

// ============================================
// Inventory Report
// ============================================
const getInventoryReport = (filters, callback) => {
  const fieldMap = { item_id: 'inv.item_id' };
  const w = buildWhereClause(filters, fieldMap);

  const activeCondition = w.whereClause
    ? w.whereClause + ' AND i.active = 1'
    : 'WHERE i.active = 1';
  const activeParams = [...w.params];

  const result = {};
  let completed = 0;
  let hasError = false;
  const totalQueries = 4;

  const checkDone = () => {
    completed++;
    if (completed === totalQueries && !hasError) {
      callback(null, result);
    }
  };
  const handleError = (err) => {
    if (!hasError) {
      hasError = true;
      callback(err);
    }
  };

  // 1. Summary
  db.query(
    `SELECT
       COUNT(DISTINCT inv.item_id) AS total_items,
       COALESCE(SUM(inv.quantity), 0) AS total_quantity_on_hand,
       COALESCE(SUM(COALESCE(inv.reservation_qty, 0)), 0) AS total_reserved,
       COALESCE(SUM(inv.quantity - COALESCE(inv.reservation_qty, 0)), 0) AS total_available,
       COALESCE(SUM(inv.quantity * i.cost_price), 0) AS total_inventory_value_cost,
       COALESCE(SUM(inv.quantity * i.sales_price), 0) AS total_inventory_value_sales
     FROM ep_inventories inv
     LEFT JOIN ep_items i ON inv.item_id = i.item_id
     ${w.whereClause}`,
    w.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.summary = rows[0];
      checkDone();
    }
  );

  // 2. Items with negative/zero availability
  db.query(
    `SELECT COUNT(*) AS items_below_zero
     FROM (
       SELECT inv.item_id,
              SUM(inv.quantity) - SUM(COALESCE(inv.reservation_qty, 0)) AS available
       FROM ep_inventories inv
       ${w.whereClause}
       GROUP BY inv.item_id
       HAVING available <= 0
     ) sub`,
    w.params,
    (err, rows) => {
      if (err) return handleError(err);
      if (!result.summary) result.summary = {};
      result.summary.items_below_zero_available = rows[0].items_below_zero;
      checkDone();
    }
  );

  // 3. Details (grouped by item)
  db.query(
    `SELECT
       i.item_id, i.item_code, i.name,
       i.cost_price, i.sales_price,
       COALESCE(SUM(inv.quantity), 0) AS total_quantity,
       COALESCE(SUM(COALESCE(inv.reservation_qty, 0)), 0) AS total_reserved,
       COALESCE(SUM(inv.quantity - COALESCE(inv.reservation_qty, 0)), 0) AS available_quantity,
       COALESCE(SUM(inv.quantity), 0) * i.cost_price AS inventory_value_cost,
       COUNT(inv.inventory_id) AS batch_count,
       GROUP_CONCAT(DISTINCT inv.location ORDER BY inv.location SEPARATOR ', ') AS locations
     FROM ep_items i
     LEFT JOIN ep_inventories inv ON i.item_id = inv.item_id
     ${activeCondition}
     GROUP BY i.item_id
     ORDER BY i.item_code ASC`,
    activeParams,
    (err, rows) => {
      if (err) return handleError(err);
      result.details = rows;
      checkDone();
    }
  );

  // 4. Grouped by location
  db.query(
    `SELECT
       COALESCE(inv.location, 'Unassigned') AS group_key,
       COALESCE(SUM(inv.quantity), 0) AS total_quantity,
       COUNT(DISTINCT inv.item_id) AS item_count
     FROM ep_inventories inv
     ${w.whereClause}
     GROUP BY inv.location
     ORDER BY total_quantity DESC`,
    w.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.grouped = rows;
      checkDone();
    }
  );
};

// ============================================
// Production Report
// ============================================
const getProductionReport = (filters, callback) => {
  const fieldMap = {
    start_date: 'wo.planned_start_date',
    end_date: 'wo.planned_start_date',
    status: 'wo.status',
    item_id: 'wo.output_item_id'
  };
  const w = buildWhereClause(filters, fieldMap);

  const result = {};
  let completed = 0;
  let hasError = false;
  const totalQueries = 5;

  const checkDone = () => {
    completed++;
    if (completed === totalQueries && !hasError) {
      callback(null, result);
    }
  };
  const handleError = (err) => {
    if (!hasError) {
      hasError = true;
      callback(err);
    }
  };

  // 1. Summary
  db.query(
    `SELECT
       COUNT(*) AS total_work_orders,
       COALESCE(SUM(wo.quantity_ordered), 0) AS total_quantity_ordered,
       COALESCE(SUM(wo.quantity_completed), 0) AS total_quantity_completed,
       CASE
         WHEN SUM(wo.quantity_ordered) > 0
         THEN ROUND(SUM(wo.quantity_completed) / SUM(wo.quantity_ordered) * 100, 2)
         ELSE 0
       END AS completion_rate
     FROM ep_work_orders wo
     ${w.whereClause}`,
    w.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.summary = rows[0];
      checkDone();
    }
  );

  // 2. Status breakdown
  db.query(
    `SELECT wo.status, COUNT(*) AS count
     FROM ep_work_orders wo
     ${w.whereClause}
     GROUP BY wo.status`,
    w.params,
    (err, rows) => {
      if (err) return handleError(err);
      const orders_by_status = {};
      rows.forEach(r => { orders_by_status[r.status] = r.count; });
      if (!result.summary) result.summary = {};
      result.summary.orders_by_status = orders_by_status;
      checkDone();
    }
  );

  // 3. Priority breakdown
  db.query(
    `SELECT wo.priority, COUNT(*) AS count
     FROM ep_work_orders wo
     ${w.whereClause}
     GROUP BY wo.priority`,
    w.params,
    (err, rows) => {
      if (err) return handleError(err);
      const orders_by_priority = {};
      rows.forEach(r => { orders_by_priority[r.priority] = r.count; });
      if (!result.summary) result.summary = {};
      result.summary.orders_by_priority = orders_by_priority;
      checkDone();
    }
  );

  // 4. Details
  db.query(
    `SELECT
       wo.wo_id, wo.wo_number, wo.status, wo.priority,
       wo.quantity_ordered, wo.quantity_completed,
       wo.planned_start_date, wo.planned_end_date,
       wo.actual_start_date, wo.actual_end_date,
       i.name AS output_item_name,
       i.item_code AS output_item_code,
       COUNT(woc.woc_id) AS component_count
     FROM ep_work_orders wo
     LEFT JOIN ep_items i ON wo.output_item_id = i.item_id
     LEFT JOIN ep_work_order_components woc ON wo.wo_id = woc.wo_id
     ${w.whereClause}
     GROUP BY wo.wo_id
     ORDER BY wo.planned_start_date DESC`,
    w.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.details = rows;
      checkDone();
    }
  );

  // 5. Grouped by output item
  db.query(
    `SELECT
       i.item_id AS group_id,
       COALESCE(i.name, 'Unknown Item') AS group_key,
       COUNT(wo.wo_id) AS wo_count,
       COALESCE(SUM(wo.quantity_ordered), 0) AS total_ordered,
       COALESCE(SUM(wo.quantity_completed), 0) AS total_completed
     FROM ep_work_orders wo
     LEFT JOIN ep_items i ON wo.output_item_id = i.item_id
     ${w.whereClause}
     GROUP BY i.item_id, i.name
     ORDER BY total_ordered DESC`,
    w.params,
    (err, rows) => {
      if (err) return handleError(err);
      result.grouped = rows;
      checkDone();
    }
  );
};

// ============================================
// Company Info (for PDF header)
// ============================================
const getCompanyInfo = (callback) => {
  db.query('SELECT * FROM ep_company WHERE company_id = 1', (err, results) => {
    if (err) return callback(err);
    callback(null, results.length > 0 ? results[0] : null);
  });
};

module.exports = {
  getSalesReport,
  getPurchaseReport,
  getInventoryReport,
  getProductionReport,
  getCompanyInfo
};
