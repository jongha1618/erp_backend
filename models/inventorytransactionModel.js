const db = require('../config/db');

const getInventorytransactions = (callback) => {
  db.query(
    `SELECT t.*,
            t.inventory_transaction_id as trans_id,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            i.name as item_name,
            i.item_code,
            inv.quantity as inventory_quantity,
            po.po_number,
            po.supplier_id as po_supplier_id,
            s.company_name as supplier_name,
            pod.quantity as ordered_quantity,
            pod.received_quantity
     FROM ep_inventory_transactions t
     LEFT JOIN ep_users u ON t.created_by = u.user_id
     LEFT JOIN ep_items i ON t.item_id = i.item_id
     LEFT JOIN ep_inventories inv ON t.inventory_id = inv.inventory_id
     LEFT JOIN ep_purchase_order_details pod ON t.pod_id = pod.pod_id
     LEFT JOIN ep_purchase_orders po ON pod.purchaseorder_id = po.purchaseorder_id
     LEFT JOIN ep_suppliers s ON po.supplier_id = s.supplier_id
     ORDER BY t.created_at DESC`, callback);
};

const getInventorytransactionById = (id, callback) => {
  db.query(`SELECT * FROM ep_inventory_transaction_details 
            LEFT JOIN ep_items ON ep_inventory_transaction_details.item_id = ep_items.item_id
            WHERE inventory_transaction_detail_id = ?`, 
            [id], callback);
};

const updateInventorytransaction = (id, data, callback) => {
  const { item_code, name, part_number, description, serial_number, instock_quantity, document_link,} = data;
  db.query(
    `UPDATE ep_items SET item_code = ?, name = ?, part_number = ?, description = ?, serial_number = ?,
      instock_quantity = ?, document_link = ? WHERE item_id =?`,
    [item_code, name, part_number, description, serial_number, instock_quantity, document_link, id ],
    callback
  );
};

const addInventorytransaction = (data, callback) => {
  // items is array of objects.
  const {
    purchase_order_id, supplier_id, transaction_type, transaction_date, 
    reference_number, total_amount, created_at, created_by, items
  } = data;

  const insertTransactionSQL = `
    INSERT INTO ep_inventory_transactions 
    (purchase_order_id, supplier_id, transaction_type, transaction_date, reference_number, total_amount, created_at, created_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const insertDetailsSQL = `
    INSERT INTO ep_inventory_transaction_details 
    (transaction_id, item_id, quantity, unit_price, subtotal) 
    VALUES (?, ?, ?, ?, ?)
  `;

  // Start a database transaction
  db.beginTransaction((err) => {
    if (err) {
      console.error("Transaction error:", err);
      return callback(err, null);
    }

    // Insert into ep_inventory_transactions (HEAD TABLE)
    db.query(insertTransactionSQL, [
      purchase_order_id, supplier_id, transaction_type, transaction_date, 
      reference_number, total_amount, created_at, created_by
    ], (err, result) => {
      if (err) {
        console.error("Error inserting inventory transaction:", err);
        return db.rollback(() => callback(err, null));
      }

      const transactionId = result.insertId;

      // If there are no items, commit and return
      if (!items || items.length === 0) {
        return db.commit((err) => {
          if (err) {
            console.error("Transaction commit error:", err);
            return db.rollback(() => callback(err, null));
          }
          callback(null, transactionId);
        });
      }

      // Insert multiple rows into ep_inventory_transaction_details
      const detailQueries = items.map((item) => {
        return new Promise((resolve, reject) => {
          db.query(insertDetailsSQL, [
            transactionId, item.item_id, item.quantity, item.unit_price, item.subtotal
          ], (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
      });

      // Execute all detail inserts
      Promise.all(detailQueries)
        .then(() => {
          db.commit((err) => {
            if (err) {
              console.error("Transaction commit error:", err);
              return db.rollback(() => callback(err, null));
            }
            callback(null, transactionId);
          });
        })
        .catch((err) => {
          console.error("Error inserting inventory transaction details:", err);
          return db.rollback(() => callback(err, null));
        });
    });
  });
};



module.exports = { getInventorytransactions, getInventorytransactionById, updateInventorytransaction, addInventorytransaction };
