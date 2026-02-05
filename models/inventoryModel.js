const db = require('../config/db');

// 모든 인벤토리 조회 (ep_inventories) - item_code 그룹, FIFO 순서
const getInventories = (callback) => {
  db.query(
    `SELECT inv.*,
            i.name as item_name,
            i.item_code,
            i.part_number,
            CONCAT(u.first_name, ' ', u.last_name) as received_by_name,
            CONCAT(a.first_name, ' ', a.last_name) as assigned_to_name,
            (inv.quantity - COALESCE(inv.reservation_qty, 0)) as available_qty
     FROM ep_inventories inv
     LEFT JOIN ep_items i ON inv.item_id = i.item_id
     LEFT JOIN ep_users u ON inv.received_by = u.user_id
     LEFT JOIN ep_users a ON inv.assigned_to = a.user_id
     ORDER BY i.item_code ASC, inv.created_at ASC`,
    callback
  );
};

// 특정 인벤토리 조회
const getInventoryById = (id, callback) => {
  db.query(
    `SELECT inv.*,
            i.name as item_name,
            i.item_code,
            i.part_number,
            CONCAT(u.first_name, ' ', u.last_name) as received_by_name,
            CONCAT(a.first_name, ' ', a.last_name) as assigned_to_name
     FROM ep_inventories inv
     LEFT JOIN ep_items i ON inv.item_id = i.item_id
     LEFT JOIN ep_users u ON inv.received_by = u.user_id
     LEFT JOIN ep_users a ON inv.assigned_to = a.user_id
     WHERE inv.inventory_id = ?`,
    [id],
    callback
  );
};

// 특정 아이템의 인벤토리 조회 - FIFO 순서
const getInventoryByItemId = (itemId, callback) => {
  db.query(
    `SELECT inv.*,
            i.name as item_name,
            i.item_code,
            CONCAT(u.first_name, ' ', u.last_name) as received_by_name,
            (inv.quantity - COALESCE(inv.reservation_qty, 0)) as available_qty
     FROM ep_inventories inv
     LEFT JOIN ep_items i ON inv.item_id = i.item_id
     LEFT JOIN ep_users u ON inv.received_by = u.user_id
     WHERE inv.item_id = ?
     ORDER BY inv.created_at ASC`,
    [itemId],
    callback
  );
};

// 인벤토리 수량 조정 (with transaction logging)
const adjustInventory = (id, data, callback) => {
  const {
    quantity,
    location,
    batch_number,
    expiry_date,
    transaction_type,
    notes,
    assigned_to,
    created_by
  } = data;

  // First get the current inventory to calculate quantity change
  db.query(
    `SELECT * FROM ep_inventories WHERE inventory_id = ?`,
    [id],
    (err, results) => {
      if (err) return callback(err);
      if (results.length === 0) return callback(new Error('Inventory not found'));

      const currentInventory = results[0];
      const quantityChange = quantity - currentInventory.quantity;

      // Begin transaction
      db.beginTransaction((err) => {
        if (err) return callback(err);

        // Update inventory
        db.query(
          `UPDATE ep_inventories
           SET quantity = ?,
               location = ?,
               batch_number = ?,
               expiry_date = ?,
               assigned_to = ?,
               updated_at = NOW()
           WHERE inventory_id = ?`,
          [quantity, location, batch_number, expiry_date, assigned_to, id],
          (err) => {
            if (err) {
              return db.rollback(() => callback(err));
            }

            // Insert transaction record
            db.query(
              `INSERT INTO ep_inventory_transactions
               (inventory_id, item_id, quantity, transaction_type, transaction_date, notes, created_by, created_at)
               VALUES (?, ?, ?, ?, NOW(), ?, ?, NOW())`,
              [id, currentInventory.item_id, quantityChange, transaction_type || 'adjustment', notes, created_by],
              (err) => {
                if (err) {
                  return db.rollback(() => callback(err));
                }

                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => callback(err));
                  }
                  callback(null, { message: 'Inventory adjusted successfully', quantityChange });
                });
              }
            );
          }
        );
      });
    }
  );
};

// 모든 사용자 조회
const getUsers = (callback) => {
  db.query(
    `SELECT user_id, first_name, last_name, email,
            CONCAT(first_name, ' ', last_name) as full_name
     FROM ep_users
     ORDER BY first_name, last_name`,
    callback
  );
};

module.exports = {
  getInventories,
  getInventoryById,
  getInventoryByItemId,
  adjustInventory,
  getUsers
};
