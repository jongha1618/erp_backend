const db = require('../config/db');

// 모든 PO 조회 (supplier 정보 포함)
const getPurchaseOrders = (callback) => {
  db.query(
    `SELECT po.*,
            s.company_name as supplier_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            COUNT(pod.pod_id) as item_count,
            SUM(pod.quantity) as total_items
     FROM ep_purchase_orders po
     LEFT JOIN ep_suppliers s ON po.supplier_id = s.supplier_id
     LEFT JOIN ep_users u ON po.created_by = u.user_id
     LEFT JOIN ep_purchase_order_details pod ON po.purchaseorder_id = pod.purchaseorder_id
     GROUP BY po.purchaseorder_id
     ORDER BY po.created_at DESC`,
    callback
  );
};

// 특정 PO 헤더 정보 조회
const getPurchaseOrderById = (id, callback) => {
  db.query(
    `SELECT po.*,
            s.company_name as supplier_name,
            s.contact_name as supplier_contact,
            s.contact_phone as supplier_phone,
            s.contact_email as supplier_email,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM ep_purchase_orders po
     LEFT JOIN ep_suppliers s ON po.supplier_id = s.supplier_id
     LEFT JOIN ep_users u ON po.created_by = u.user_id
     WHERE po.purchaseorder_id = ?`,
    [id],
    callback
  );
};

// 특정 PO의 상세 항목 조회
const getPurchaseOrderDetails = (purchaseOrderId, callback) => {
  db.query(
    `SELECT pod.*,
            i.name as item_name,
            i.part_number,
            i.item_code,
            CONCAT(ru.first_name, ' ', ru.last_name) as received_by_name
     FROM ep_purchase_order_details pod
     LEFT JOIN ep_items i ON pod.item_id = i.item_id
     LEFT JOIN ep_users ru ON pod.received_by = ru.user_id
     WHERE pod.purchaseorder_id = ?
     ORDER BY pod.pod_id`,
    [purchaseOrderId],
    callback
  );
};

// 새 PO 생성 (헤더만)
const addPurchaseOrder = (data, callback) => {
  const {
    supplier_id,
    po_number,
    order_date,
    expected_delivery,
    total_amount,
    status,
    notes,
    document_link,
    created_by
  } = data;

  // created_by가 없거나 빈 문자열이면 NULL로 처리
  const createdByValue = created_by && created_by !== '' ? created_by : null;

  const sql = `INSERT INTO ep_purchase_orders
              (supplier_id, po_number, order_date, expected_delivery, total_amount,
               status, notes, document_link, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

  db.query(
    sql,
    [supplier_id, po_number, order_date, expected_delivery, total_amount,
     status || 'pending', notes, document_link, createdByValue],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return callback(err, null);
      }
      callback(null, result.insertId);
    }
  );
};

// PO 상세 항목 추가
const addPurchaseOrderDetail = (data, callback) => {
  const {
    purchaseorder_id,
    item_id,
    quantity,
    unit_price,
    notes
  } = data;

  const sql = `INSERT INTO ep_purchase_order_details
              (purchaseorder_id, item_id, quantity, unit_price, notes)
              VALUES (?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [purchaseorder_id, item_id, quantity, unit_price, notes],
    callback
  );
};

// PO 헤더 정보 업데이트
const updatePurchaseOrder = (id, data, callback) => {
  const {
    supplier_id,
    po_number,
    order_date,
    expected_delivery,
    total_amount,
    status,
    notes,
    document_link
  } = data;

  db.query(
    `UPDATE ep_purchase_orders
     SET supplier_id = ?, po_number = ?, order_date = ?, expected_delivery = ?,
         total_amount = ?, status = ?, notes = ?, document_link = ?, updated_at = NOW()
     WHERE purchaseorder_id = ?`,
    [supplier_id, po_number, order_date, expected_delivery, total_amount,
     status, notes, document_link, id],
    callback
  );
};

// PO 상태 업데이트
const updatePurchaseOrderStatus = (id, status, callback) => {
  db.query(
    `UPDATE ep_purchase_orders
     SET status = ?, updated_at = NOW()
     WHERE purchaseorder_id = ?`,
    [status, id],
    callback
  );
};

// PO 상세 항목 업데이트
const updatePurchaseOrderDetail = (podId, data, callback) => {
  const {
    item_id,
    quantity,
    unit_price,
    notes
  } = data;

  db.query(
    `UPDATE ep_purchase_order_details
     SET item_id = ?, quantity = ?, unit_price = ?, notes = ?
     WHERE pod_id = ?`,
    [item_id, quantity, unit_price, notes, podId],
    callback
  );
};

// 품목 수령 처리
const receiveItem = (podId, data, callback) => {
  const {
    received_quantity,
    received_date,
    received_by,
    notes,
    batch_number,
    expiry_date,
    location
  } = data;

  // Validate received_by and allow NULL if no user is logged in
  const receivedByValue = (received_by !== null && received_by !== undefined && received_by !== '') ? received_by : null;

  db.getConnection((err, connection) => {
    if (err) { return callback(err); }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      // Check if received_by exists in ep_users, or proceed with NULL
      if (receivedByValue) {
        connection.query(
          'SELECT user_id FROM ep_users WHERE user_id = ?',
          [receivedByValue],
          (err, userResults) => {
            if (err) {
              connection.rollback(() => connection.release());
              return callback(err);
            }
            if (userResults.length === 0) {
              proceedWithTransaction(null);
            } else {
              proceedWithTransaction(receivedByValue);
            }
          }
        );
      } else {
        proceedWithTransaction(null);
      }

      function proceedWithTransaction(validReceivedBy) {
        // 1. Get item_id and purchaseorder_id from purchase order detail
        connection.query(
          'SELECT item_id, purchaseorder_id FROM ep_purchase_order_details WHERE pod_id = ?',
          [podId],
          (err, detailResults) => {
            if (err) {
              connection.rollback(() => connection.release());
              return callback(err);
            }
            if (detailResults.length === 0) {
              connection.rollback(() => connection.release());
              return callback(new Error('Purchase order detail not found'));
            }

            const { item_id, purchaseorder_id } = detailResults[0];

            // 2. Update purchase order detail received quantity
            connection.query(
              `UPDATE ep_purchase_order_details
               SET received_quantity = received_quantity + ?,
                   received_date = ?,
                   received_by = ?,
                   notes = ?
               WHERE pod_id = ?`,
              [received_quantity, received_date, validReceivedBy, notes, podId],
              (err) => {
                if (err) {
                  connection.rollback(() => connection.release());
                  return callback(err);
                }

                // 3. Always create a new inventory record for each receive
                // This allows tracking different batches with different batch_number/expiry_date
                connection.query(
                  `INSERT INTO ep_inventories
                   (item_id, batch_number, expiry_date, quantity, location, pod_id, created_at, updated_at, received_by)
                   VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
                  [item_id, batch_number || null, expiry_date || null, received_quantity, location || null, podId, validReceivedBy],
                  (err, insertResult) => {
                    if (err) {
                      connection.rollback(() => connection.release());
                      return callback(err);
                    }

                    const inventoryId = insertResult.insertId;

                    // 4. Create inventory transaction record
                    connection.query(
                      `INSERT INTO ep_inventory_transactions
                       (inventory_id, item_id, quantity, pod_id, transaction_type, transaction_date, notes, created_by, created_at)
                       VALUES (?, ?, ?, ?, 'purchase', ?, ?, ?, NOW())`,
                      [inventoryId, item_id, received_quantity, podId, received_date,
                       notes ? `Received from PO - ${notes}` : 'Received from PO', validReceivedBy],
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
                          callback(null, { success: true, inventory_id: inventoryId });
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
    });
  });
};

// PO 상세 항목 삭제
const deletePurchaseOrderDetail = (podId, callback) => {
  db.query(
    'DELETE FROM ep_purchase_order_details WHERE pod_id = ?',
    [podId],
    callback
  );
};

// PO 삭제 (상세 항목 먼저 삭제 필요)
const deletePurchaseOrder = (id, callback) => {
  // 먼저 상세 항목 삭제
  db.query(
    'DELETE FROM ep_purchase_order_details WHERE purchaseorder_id = ?',
    [id],
    (err) => {
      if (err) return callback(err);

      // 그 다음 헤더 삭제
      db.query(
        'DELETE FROM ep_purchase_orders WHERE purchaseorder_id = ?',
        [id],
        callback
      );
    }
  );
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseOrderDetails,
  addPurchaseOrder,
  addPurchaseOrderDetail,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  updatePurchaseOrderDetail,
  receiveItem,
  deletePurchaseOrderDetail,
  deletePurchaseOrder
};
