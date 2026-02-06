const db = require('../config/db');

// Get all purchase requests
const getPurchaseRequests = (callback) => {
  db.query(
    `SELECT pr.*,
            i.item_code,
            i.name as item_name,
            i.part_number,
            s.company_name as supplier_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            po.po_number as converted_po_number
     FROM ep_purchase_requests pr
     LEFT JOIN ep_items i ON pr.item_id = i.item_id
     LEFT JOIN ep_suppliers s ON pr.suggested_supplier_id = s.supplier_id
     LEFT JOIN ep_users u ON pr.created_by = u.user_id
     LEFT JOIN ep_purchase_orders po ON pr.converted_po_id = po.purchaseorder_id
     ORDER BY
       CASE pr.priority WHEN 'urgent' THEN 0 ELSE 1 END,
       pr.created_at DESC`,
    callback
  );
};

// Get purchase requests by status
const getPurchaseRequestsByStatus = (status, callback) => {
  db.query(
    `SELECT pr.*,
            i.item_code,
            i.name as item_name,
            i.part_number,
            s.company_name as supplier_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM ep_purchase_requests pr
     LEFT JOIN ep_items i ON pr.item_id = i.item_id
     LEFT JOIN ep_suppliers s ON pr.suggested_supplier_id = s.supplier_id
     LEFT JOIN ep_users u ON pr.created_by = u.user_id
     WHERE pr.status = ?
     ORDER BY
       CASE pr.priority WHEN 'urgent' THEN 0 ELSE 1 END,
       pr.created_at DESC`,
    [status],
    callback
  );
};

// Get purchase request by ID
const getPurchaseRequestById = (id, callback) => {
  db.query(
    `SELECT pr.*,
            i.item_code,
            i.name as item_name,
            i.part_number,
            i.unit_price,
            s.company_name as supplier_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            po.po_number as converted_po_number
     FROM ep_purchase_requests pr
     LEFT JOIN ep_items i ON pr.item_id = i.item_id
     LEFT JOIN ep_suppliers s ON pr.suggested_supplier_id = s.supplier_id
     LEFT JOIN ep_users u ON pr.created_by = u.user_id
     LEFT JOIN ep_purchase_orders po ON pr.converted_po_id = po.purchaseorder_id
     WHERE pr.request_id = ?`,
    [id],
    callback
  );
};

// Create new purchase request
const addPurchaseRequest = (data, callback) => {
  const {
    item_id,
    quantity_needed,
    source_type,
    source_id,
    suggested_supplier_id,
    priority,
    notes,
    created_by
  } = data;

  const createdByValue = created_by && created_by !== '' ? created_by : null;
  const supplierIdValue = suggested_supplier_id && suggested_supplier_id !== '' ? suggested_supplier_id : null;

  db.query(
    `INSERT INTO ep_purchase_requests
     (item_id, quantity_needed, source_type, source_id, suggested_supplier_id, priority, notes, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [item_id, quantity_needed, source_type || 'manual', source_id || null, supplierIdValue, priority || 'normal', notes, createdByValue],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return callback(err, null);
      }
      callback(null, result.insertId);
    }
  );
};

// Update purchase request
const updatePurchaseRequest = (id, data, callback) => {
  const {
    item_id,
    quantity_needed,
    suggested_supplier_id,
    priority,
    notes
  } = data;

  const supplierIdValue = suggested_supplier_id && suggested_supplier_id !== '' ? suggested_supplier_id : null;

  db.query(
    `UPDATE ep_purchase_requests
     SET item_id = ?, quantity_needed = ?, suggested_supplier_id = ?, priority = ?, notes = ?, updated_at = NOW()
     WHERE request_id = ?`,
    [item_id, quantity_needed, supplierIdValue, priority, notes, id],
    callback
  );
};

// Update purchase request status
const updatePurchaseRequestStatus = (id, status, callback) => {
  db.query(
    `UPDATE ep_purchase_requests SET status = ?, updated_at = NOW() WHERE request_id = ?`,
    [status, id],
    callback
  );
};

// Delete purchase request
const deletePurchaseRequest = (id, callback) => {
  db.query('DELETE FROM ep_purchase_requests WHERE request_id = ?', [id], callback);
};

// Convert purchase requests to Purchase Order
const convertToPurchaseOrder = (requestIds, poData, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      const {
        supplier_id,
        po_number,
        order_date,
        expected_delivery,
        notes,
        created_by
      } = poData;

      const createdByValue = created_by && created_by !== '' ? created_by : null;

      // 1. Create Purchase Order header
      connection.query(
        `INSERT INTO ep_purchase_orders
         (supplier_id, po_number, order_date, expected_delivery, status, notes, created_by, created_at)
         VALUES (?, ?, ?, ?, 'Pending', ?, ?, NOW())`,
        [supplier_id, po_number, order_date, expected_delivery, notes, createdByValue],
        (err, poResult) => {
          if (err) {
            connection.rollback(() => connection.release());
            return callback(err);
          }

          const purchaseOrderId = poResult.insertId;

          // 2. Get purchase request details
          connection.query(
            `SELECT pr.*, i.unit_price
             FROM ep_purchase_requests pr
             LEFT JOIN ep_items i ON pr.item_id = i.item_id
             WHERE pr.request_id IN (?)`,
            [requestIds],
            (err, requests) => {
              if (err) {
                connection.rollback(() => connection.release());
                return callback(err);
              }

              if (requests.length === 0) {
                connection.rollback(() => connection.release());
                return callback(new Error('No purchase requests found'));
              }

              // 3. Create PO details and update requests
              let completedCount = 0;
              let totalAmount = 0;
              let hasError = false;

              requests.forEach((req) => {
                if (hasError) return;

                const unitPrice = req.unit_price || 0;
                const lineTotal = req.quantity_needed * unitPrice;
                totalAmount += lineTotal;

                // Insert PO detail
                connection.query(
                  `INSERT INTO ep_purchase_order_details
                   (purchaseorder_id, item_id, quantity, unit_price, notes)
                   VALUES (?, ?, ?, ?, ?)`,
                  [purchaseOrderId, req.item_id, req.quantity_needed, unitPrice, req.notes],
                  (err) => {
                    if (hasError) return;

                    if (err) {
                      hasError = true;
                      connection.rollback(() => connection.release());
                      return callback(err);
                    }

                    // Update purchase request status
                    connection.query(
                      `UPDATE ep_purchase_requests
                       SET status = 'converted_to_po', converted_po_id = ?, updated_at = NOW()
                       WHERE request_id = ?`,
                      [purchaseOrderId, req.request_id],
                      (err) => {
                        if (hasError) return;

                        if (err) {
                          hasError = true;
                          connection.rollback(() => connection.release());
                          return callback(err);
                        }

                        completedCount++;

                        if (completedCount === requests.length) {
                          // 4. Update PO total amount
                          connection.query(
                            `UPDATE ep_purchase_orders SET total_amount = ? WHERE purchaseorder_id = ?`,
                            [totalAmount, purchaseOrderId],
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
                                callback(null, {
                                  success: true,
                                  purchaseorder_id: purchaseOrderId,
                                  po_number: po_number,
                                  total_amount: totalAmount
                                });
                              });
                            }
                          );
                        }
                      }
                    );
                  }
                );
              });
            }
          );
        }
      );
    });
  });
};

// Check for existing pending request for same item (to avoid duplicates)
const findExistingRequest = (itemId, callback) => {
  db.query(
    `SELECT * FROM ep_purchase_requests
     WHERE item_id = ? AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
    [itemId],
    callback
  );
};

// Add quantity to existing request or create new one
const addOrUpdateRequest = (data, callback) => {
  const { item_id, quantity_needed, source_type, source_id, notes } = data;

  findExistingRequest(item_id, (err, results) => {
    if (err) return callback(err);

    if (results.length > 0) {
      // Update existing request
      const existingRequest = results[0];
      const newQuantity = parseFloat(existingRequest.quantity_needed) + parseFloat(quantity_needed);
      const newNotes = existingRequest.notes
        ? `${existingRequest.notes}\n${notes}`
        : notes;

      db.query(
        `UPDATE ep_purchase_requests
         SET quantity_needed = ?, notes = ?, updated_at = NOW()
         WHERE request_id = ?`,
        [newQuantity, newNotes, existingRequest.request_id],
        (err) => {
          if (err) return callback(err);
          callback(null, { request_id: existingRequest.request_id, updated: true });
        }
      );
    } else {
      // Create new request
      addPurchaseRequest(data, (err, requestId) => {
        if (err) return callback(err);
        callback(null, { request_id: requestId, updated: false });
      });
    }
  });
};

module.exports = {
  getPurchaseRequests,
  getPurchaseRequestsByStatus,
  getPurchaseRequestById,
  addPurchaseRequest,
  updatePurchaseRequest,
  updatePurchaseRequestStatus,
  deletePurchaseRequest,
  convertToPurchaseOrder,
  findExistingRequest,
  addOrUpdateRequest
};
