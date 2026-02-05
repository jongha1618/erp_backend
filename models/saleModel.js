const db = require('../config/db');

// Get all sales (summary list with customer names)
const getSales = (callback) => {
  db.query(
    `SELECT s.*,
            c.company_name,
            c.contact_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            COUNT(sd.detail_id) as item_count,
            SUM(sd.quantity) as total_items
     FROM ep_sales s
     LEFT JOIN ep_customers c ON s.customer_id = c.customer_id
     LEFT JOIN ep_users u ON s.created_by = u.user_id
     LEFT JOIN ep_sale_details sd ON s.sale_id = sd.sale_id
     GROUP BY s.sale_id
     ORDER BY s.created_at DESC`,
    callback
  );
};

// Get sale header info only
const getSaleHeader = (id, callback) => {
  db.query(
    `SELECT s.*,
            c.company_name,
            c.contact_name,
            c.contact_email,
            c.contact_phone,
            c.shipping_address,
            c.shipping_address_city,
            c.shipping_address_state,
            c.shipping_address_zip,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM ep_sales s
     LEFT JOIN ep_customers c ON s.customer_id = c.customer_id
     LEFT JOIN ep_users u ON s.created_by = u.user_id
     WHERE s.sale_id = ?`,
    [id],
    callback
  );
};

// Get sale details (line items with product info)
const getSaleDetails = (saleId, callback) => {
  db.query(
    `SELECT sd.*,
            i.item_code,
            i.name AS item_name,
            i.description,
            CONCAT(u.first_name, ' ', u.last_name) as shipped_by_name
     FROM ep_sale_details sd
     LEFT JOIN ep_items i ON sd.item_id = i.item_id
     LEFT JOIN ep_users u ON sd.shipped_by = u.user_id
     WHERE sd.sale_id = ?
     ORDER BY sd.detail_id`,
    [saleId],
    callback
  );
};

// Create a new sale (Header only)
const addSale = (data, callback) => {
  const {
    customer_id,
    sales_number,
    order_date,
    delivery_date,
    total_amount,
    status,
    notes,
    shipping_address,
    created_by
  } = data;

  const createdByValue = created_by && created_by !== '' ? created_by : null;

  db.query(
    `INSERT INTO ep_sales
     (customer_id, sales_number, order_date, delivery_date, total_amount, status, notes, shipping_address, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [customer_id, sales_number, order_date, delivery_date, total_amount, status || 'draft', notes, shipping_address, createdByValue],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return callback(err, null);
      }
      callback(null, result.insertId);
    }
  );
};

// Add sale detail
const addSaleDetail = (data, callback) => {
  const { sale_id, item_id, quantity, unit_price, subtotal, notes } = data;

  db.query(
    `INSERT INTO ep_sale_details (sale_id, item_id, quantity, unit_price, subtotal, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sale_id, item_id, quantity, unit_price, subtotal, notes],
    callback
  );
};

// Update sale header
const updateSale = (id, data, callback) => {
  const {
    customer_id,
    sales_number,
    order_date,
    delivery_date,
    total_amount,
    status,
    notes,
    shipping_address
  } = data;

  db.query(
    `UPDATE ep_sales
     SET customer_id = ?, sales_number = ?, order_date = ?, delivery_date = ?,
         total_amount = ?, status = ?, notes = ?, shipping_address = ?, updated_at = NOW()
     WHERE sale_id = ?`,
    [customer_id, sales_number, order_date, delivery_date, total_amount, status, notes, shipping_address, id],
    callback
  );
};

// Update sale status only
const updateSaleStatus = (id, status, callback) => {
  db.query(
    `UPDATE ep_sales SET status = ?, updated_at = NOW() WHERE sale_id = ?`,
    [status, id],
    callback
  );
};

// Update sale detail
const updateSaleDetail = (detailId, data, callback) => {
  const { item_id, quantity, unit_price, subtotal, notes } = data;

  db.query(
    `UPDATE ep_sale_details
     SET item_id = ?, quantity = ?, unit_price = ?, subtotal = ?, notes = ?
     WHERE detail_id = ?`,
    [item_id, quantity, unit_price, subtotal, notes, detailId],
    callback
  );
};

// Delete sale detail
const deleteSaleDetail = (detailId, callback) => {
  db.query('DELETE FROM ep_sale_details WHERE detail_id = ?', [detailId], callback);
};

// Delete entire sale (cascade delete details first)
const deleteSale = (id, callback) => {
  db.query('DELETE FROM ep_sale_details WHERE sale_id = ?', [id], (err) => {
    if (err) return callback(err);
    db.query('DELETE FROM ep_sales WHERE sale_id = ?', [id], callback);
  });
};

// Ship item - deduct from inventory and create transaction
const shipItem = (detailId, data, callback) => {
  const {
    shipped_quantity,
    shipped_date,
    shipped_by,
    inventory_id,
    notes
  } = data;

  const shippedByValue = shipped_by && shipped_by !== '' ? shipped_by : null;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      // 1. Get item_id and sale_id from sale detail
      connection.query(
        'SELECT item_id, sale_id FROM ep_sale_details WHERE detail_id = ?',
        [detailId],
        (err, detailResults) => {
          if (err) {
            connection.rollback(() => connection.release());
            return callback(err);
          }
          if (detailResults.length === 0) {
            connection.rollback(() => connection.release());
            return callback(new Error('Sale detail not found'));
          }

          const { item_id, sale_id } = detailResults[0];

          // 2. Check inventory has enough quantity
          connection.query(
            'SELECT quantity FROM ep_inventories WHERE inventory_id = ?',
            [inventory_id],
            (err, invResults) => {
              if (err) {
                connection.rollback(() => connection.release());
                return callback(err);
              }
              if (invResults.length === 0) {
                connection.rollback(() => connection.release());
                return callback(new Error('Inventory not found'));
              }
              if (invResults[0].quantity < shipped_quantity) {
                connection.rollback(() => connection.release());
                return callback(new Error('Insufficient inventory quantity'));
              }

              // 3. Deduct from inventory quantity and reduce reservation_qty
              connection.query(
                `UPDATE ep_inventories
                 SET quantity = quantity - ?,
                     reservation_qty = GREATEST(COALESCE(reservation_qty, 0) - ?, 0),
                     updated_at = NOW()
                 WHERE inventory_id = ?`,
                [shipped_quantity, shipped_quantity, inventory_id],
                (err) => {
                  if (err) {
                    connection.rollback(() => connection.release());
                    return callback(err);
                  }

                  // 4. Create inventory transaction record (negative quantity for sale)
                  connection.query(
                    `INSERT INTO ep_inventory_transactions
                     (inventory_id, item_id, quantity, transaction_type, transaction_date, notes, created_by, created_at)
                     VALUES (?, ?, ?, 'sale', ?, ?, ?, NOW())`,
                    [inventory_id, item_id, -shipped_quantity, shipped_date,
                     notes ? `Shipped for Sale - ${notes}` : 'Shipped for Sale', shippedByValue],
                    (err) => {
                      if (err) {
                        connection.rollback(() => connection.release());
                        return callback(err);
                      }

                      // 5. Update sale detail shipped quantity
                      connection.query(
                        `UPDATE ep_sale_details
                         SET shipped_quantity = COALESCE(shipped_quantity, 0) + ?,
                             shipped_date = ?,
                             shipped_by = ?
                         WHERE detail_id = ?`,
                        [shipped_quantity, shipped_date, shippedByValue, detailId],
                        (err) => {
                          if (err) {
                            connection.rollback(() => connection.release());
                            return callback(err);
                          }

                          connection.commit((err) => {
                            if (err) {
                              connection.rollback(() => connection.release());
                              return callback(err);
                            }
                            connection.release();
                            callback(null, { success: true, message: 'Item shipped successfully' });
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
};

// Get available inventory for an item (for ship dialog)
// Shows quantity minus reservation_qty as available
const getInventoryByItemId = (itemId, callback) => {
  db.query(
    `SELECT inv.*,
            (inv.quantity - COALESCE(inv.reservation_qty, 0)) as available_qty,
            CONCAT(u.first_name, ' ', u.last_name) as received_by_name
     FROM ep_inventories inv
     LEFT JOIN ep_users u ON inv.received_by = u.user_id
     WHERE inv.item_id = ? AND (inv.quantity - COALESCE(inv.reservation_qty, 0)) > 0
     ORDER BY inv.created_at ASC`,
    [itemId],
    callback
  );
};

// Reserve inventory for a sale detail
const reserveInventory = (inventoryId, quantity, callback) => {
  db.query(
    `UPDATE ep_inventories
     SET reservation_qty = COALESCE(reservation_qty, 0) + ?,
         updated_at = NOW()
     WHERE inventory_id = ?
       AND (quantity - COALESCE(reservation_qty, 0)) >= ?`,
    [quantity, inventoryId, quantity],
    (err, result) => {
      if (err) return callback(err);
      if (result.affectedRows === 0) {
        return callback(new Error('Insufficient available inventory for reservation'));
      }
      callback(null, result);
    }
  );
};

// Release reservation (when sale is cancelled or item removed)
const releaseReservation = (inventoryId, quantity, callback) => {
  db.query(
    `UPDATE ep_inventories
     SET reservation_qty = GREATEST(COALESCE(reservation_qty, 0) - ?, 0),
         updated_at = NOW()
     WHERE inventory_id = ?`,
    [quantity, inventoryId],
    callback
  );
};

module.exports = {
  getSales,
  getSaleHeader,
  getSaleDetails,
  addSale,
  addSaleDetail,
  updateSale,
  updateSaleStatus,
  updateSaleDetail,
  deleteSaleDetail,
  deleteSale,
  shipItem,
  getInventoryByItemId,
  reserveInventory,
  releaseReservation
};
