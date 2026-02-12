const db = require('../config/db');

// Get all card statistics in parallel
const getCardStats = (callback) => {
  const stats = {};
  let completed = 0;
  let hasError = false;
  const totalQueries = 6;

  const checkDone = () => {
    completed++;
    if (completed === totalQueries && !hasError) {
      callback(null, stats);
    }
  };

  const handleError = (err) => {
    if (!hasError) {
      hasError = true;
      callback(err);
    }
  };

  db.query('SELECT COUNT(*) AS count FROM ep_items WHERE active = 1', (err, results) => {
    if (err) return handleError(err);
    stats.totalActiveItems = results[0].count;
    checkDone();
  });

  db.query('SELECT COALESCE(SUM(quantity), 0) AS total FROM ep_inventories', (err, results) => {
    if (err) return handleError(err);
    stats.totalInventoryQty = Number(results[0].total);
    checkDone();
  });

  db.query(
    "SELECT COUNT(*) AS count FROM ep_sales WHERE status IN ('draft','confirmed','shipped')",
    (err, results) => {
      if (err) return handleError(err);
      stats.openSalesOrders = results[0].count;
      checkDone();
    }
  );

  db.query(
    "SELECT COUNT(*) AS count FROM ep_purchase_orders WHERE status IN ('Pending','Approved','Shipped')",
    (err, results) => {
      if (err) return handleError(err);
      stats.openPurchaseOrders = results[0].count;
      checkDone();
    }
  );

  db.query(
    "SELECT COUNT(*) AS count FROM ep_work_orders WHERE status IN ('draft','blocked','ready','in_progress')",
    (err, results) => {
      if (err) return handleError(err);
      stats.activeWorkOrders = results[0].count;
      checkDone();
    }
  );

  db.query(
    "SELECT COUNT(*) AS count FROM ep_purchase_requests WHERE status = 'pending'",
    (err, results) => {
      if (err) return handleError(err);
      stats.pendingPurchaseRequests = results[0].count;
      checkDone();
    }
  );
};

// Monthly Sales totals (last 6 months)
const getMonthlySales = (callback) => {
  db.query(
    `SELECT
       DATE_FORMAT(order_date, '%b') AS month_label,
       DATE_FORMAT(order_date, '%Y-%m') AS month_sort,
       COALESCE(SUM(total_amount), 0) AS total
     FROM ep_sales
     WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       AND status NOT IN ('cancelled')
     GROUP BY month_sort, month_label
     ORDER BY month_sort ASC`,
    callback
  );
};

// Monthly PO totals (last 6 months)
const getMonthlyPurchaseOrders = (callback) => {
  db.query(
    `SELECT
       DATE_FORMAT(order_date, '%b') AS month_label,
       DATE_FORMAT(order_date, '%Y-%m') AS month_sort,
       COALESCE(SUM(total_amount), 0) AS total
     FROM ep_purchase_orders
     WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       AND status NOT IN ('Cancelled')
     GROUP BY month_sort, month_label
     ORDER BY month_sort ASC`,
    callback
  );
};

// Monthly Inventory Transaction count (last 6 months)
const getMonthlyInventoryTransactions = (callback) => {
  db.query(
    `SELECT
       DATE_FORMAT(transaction_date, '%b') AS month_label,
       DATE_FORMAT(transaction_date, '%Y-%m') AS month_sort,
       COUNT(*) AS total
     FROM ep_inventory_transactions
     WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY month_sort, month_label
     ORDER BY month_sort ASC`,
    callback
  );
};

// Recent Sales Orders (last 10)
const getRecentSalesOrders = (callback) => {
  db.query(
    `SELECT s.sale_id, s.sales_number, s.order_date, s.total_amount, s.status,
            c.company_name,
            COUNT(sd.detail_id) AS item_count
     FROM ep_sales s
     LEFT JOIN ep_customers c ON s.customer_id = c.customer_id
     LEFT JOIN ep_sale_details sd ON s.sale_id = sd.sale_id
     GROUP BY s.sale_id
     ORDER BY s.created_at DESC
     LIMIT 10`,
    callback
  );
};

// Recent Activity across all modules (last 10)
const getRecentActivity = (callback) => {
  db.query(
    `(
       SELECT 'sale' AS type,
              CONCAT('Sales Order ', sales_number, ' - ', status) AS description,
              created_at AS timestamp,
              'shopping_cart' AS icon,
              'success' AS color
       FROM ep_sales
       ORDER BY created_at DESC LIMIT 5
     )
     UNION ALL
     (
       SELECT 'purchase' AS type,
              CONCAT('PO ', po_number, ' - ', status) AS description,
              created_at AS timestamp,
              'local_shipping' AS icon,
              'info' AS color
       FROM ep_purchase_orders
       ORDER BY created_at DESC LIMIT 5
     )
     UNION ALL
     (
       SELECT 'work_order' AS type,
              CONCAT('Work Order ', wo_number, ' - ', status) AS description,
              created_at AS timestamp,
              'engineering' AS icon,
              'warning' AS color
       FROM ep_work_orders
       ORDER BY created_at DESC LIMIT 5
     )
     ORDER BY timestamp DESC
     LIMIT 10`,
    callback
  );
};

module.exports = {
  getCardStats,
  getMonthlySales,
  getMonthlyPurchaseOrders,
  getMonthlyInventoryTransactions,
  getRecentSalesOrders,
  getRecentActivity
};
