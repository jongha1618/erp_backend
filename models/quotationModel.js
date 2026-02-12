const db = require('../config/db');

// Get all quotations (summary list with customer names)
const getQuotations = (callback) => {
  db.query(
    `SELECT q.*,
            c.company_name,
            c.contact_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            COUNT(qd.detail_id) as item_count,
            SUM(qd.quantity) as total_items
     FROM ep_quotations q
     LEFT JOIN ep_customers c ON q.customer_id = c.customer_id
     LEFT JOIN ep_users u ON q.created_by = u.user_id
     LEFT JOIN ep_quotation_details qd ON q.quotation_id = qd.quotation_id
     GROUP BY q.quotation_id
     ORDER BY q.created_at DESC`,
    callback
  );
};

// Get quotation header info only
const getQuotationHeader = (id, callback) => {
  db.query(
    `SELECT q.*,
            c.company_name,
            c.contact_name,
            c.contact_email,
            c.contact_phone,
            c.shipping_address,
            c.shipping_address_city,
            c.shipping_address_state,
            c.shipping_address_zip,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM ep_quotations q
     LEFT JOIN ep_customers c ON q.customer_id = c.customer_id
     LEFT JOIN ep_users u ON q.created_by = u.user_id
     WHERE q.quotation_id = ?`,
    [id],
    callback
  );
};

// Get quotation details (line items with product info)
const getQuotationDetails = (quotationId, callback) => {
  db.query(
    `SELECT qd.*,
            i.item_code,
            i.name AS item_name,
            i.description
     FROM ep_quotation_details qd
     LEFT JOIN ep_items i ON qd.item_id = i.item_id
     WHERE qd.quotation_id = ?
     ORDER BY qd.detail_id`,
    [quotationId],
    callback
  );
};

// Create a new quotation (Header only)
const addQuotation = (data, callback) => {
  const {
    customer_id,
    quotation_number,
    quotation_date,
    valid_until,
    total_amount,
    status,
    notes,
    shipping_address,
    created_by
  } = data;

  const createdByValue = created_by && created_by !== '' ? created_by : null;
  const validUntilValue = valid_until && valid_until !== '' ? valid_until : null;

  db.query(
    `INSERT INTO ep_quotations
     (customer_id, quotation_number, quotation_date, valid_until, total_amount, status, notes, shipping_address, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [customer_id, quotation_number, quotation_date, validUntilValue, total_amount, status || 'draft', notes, shipping_address, createdByValue],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return callback(err, null);
      }
      callback(null, result.insertId);
    }
  );
};

// Add quotation detail
const addQuotationDetail = (data, callback) => {
  const { quotation_id, item_id, quantity, unit_price, subtotal, notes } = data;

  db.query(
    `INSERT INTO ep_quotation_details (quotation_id, item_id, quantity, unit_price, subtotal, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [quotation_id, item_id, quantity, unit_price, subtotal, notes],
    callback
  );
};

// Update quotation header
const updateQuotation = (id, data, callback) => {
  const {
    customer_id,
    quotation_number,
    quotation_date,
    valid_until,
    total_amount,
    status,
    notes,
    shipping_address
  } = data;

  const validUntilValue = valid_until && valid_until !== '' ? valid_until : null;

  db.query(
    `UPDATE ep_quotations
     SET customer_id = ?, quotation_number = ?, quotation_date = ?, valid_until = ?,
         total_amount = ?, status = ?, notes = ?, shipping_address = ?, updated_at = NOW()
     WHERE quotation_id = ?`,
    [customer_id, quotation_number, quotation_date, validUntilValue, total_amount, status, notes, shipping_address, id],
    callback
  );
};

// Update quotation status only
const updateQuotationStatus = (id, status, callback) => {
  db.query(
    `UPDATE ep_quotations SET status = ?, updated_at = NOW() WHERE quotation_id = ?`,
    [status, id],
    callback
  );
};

// Update quotation detail
const updateQuotationDetail = (detailId, data, callback) => {
  const { item_id, quantity, unit_price, subtotal, notes } = data;

  db.query(
    `UPDATE ep_quotation_details
     SET item_id = ?, quantity = ?, unit_price = ?, subtotal = ?, notes = ?
     WHERE detail_id = ?`,
    [item_id, quantity, unit_price, subtotal, notes, detailId],
    callback
  );
};

// Delete quotation detail
const deleteQuotationDetail = (detailId, callback) => {
  db.query('DELETE FROM ep_quotation_details WHERE detail_id = ?', [detailId], callback);
};

// Delete entire quotation (cascade delete details first)
const deleteQuotation = (id, callback) => {
  db.query('DELETE FROM ep_quotation_details WHERE quotation_id = ?', [id], (err) => {
    if (err) return callback(err);
    db.query('DELETE FROM ep_quotations WHERE quotation_id = ?', [id], callback);
  });
};

// Convert quotation to sales order
const convertToSalesOrder = (quotationId, salesNumber, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      // 1. Get quotation header
      connection.query(
        'SELECT * FROM ep_quotations WHERE quotation_id = ?',
        [quotationId],
        (err, headerResults) => {
          if (err) {
            connection.rollback(() => connection.release());
            return callback(err);
          }
          if (headerResults.length === 0) {
            connection.rollback(() => connection.release());
            return callback(new Error('Quotation not found'));
          }

          const quotation = headerResults[0];

          if (quotation.status === 'converted') {
            connection.rollback(() => connection.release());
            return callback(new Error('Quotation has already been converted to a Sales Order'));
          }

          // 2. Create sales order header
          const deliveryDate = quotation.valid_until || null;
          connection.query(
            `INSERT INTO ep_sales
             (customer_id, sales_number, order_date, delivery_date, total_amount, status, notes, shipping_address, created_by, created_at)
             VALUES (?, ?, CURDATE(), ?, ?, 'draft', ?, ?, ?, NOW())`,
            [quotation.customer_id, salesNumber, deliveryDate, quotation.total_amount,
             quotation.notes ? `[From QT: ${quotation.quotation_number}] ${quotation.notes}` : `[From QT: ${quotation.quotation_number}]`,
             quotation.shipping_address, quotation.created_by],
            (err, saleResult) => {
              if (err) {
                connection.rollback(() => connection.release());
                return callback(err);
              }

              const saleId = saleResult.insertId;

              // 3. Get quotation details
              connection.query(
                'SELECT * FROM ep_quotation_details WHERE quotation_id = ?',
                [quotationId],
                (err, detailResults) => {
                  if (err) {
                    connection.rollback(() => connection.release());
                    return callback(err);
                  }

                  if (detailResults.length === 0) {
                    // No details, just update status
                    connection.query(
                      `UPDATE ep_quotations SET status = 'converted', converted_sale_id = ?, updated_at = NOW() WHERE quotation_id = ?`,
                      [saleId, quotationId],
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
                          callback(null, { sale_id: saleId, message: 'Quotation converted to Sales Order successfully' });
                        });
                      }
                    );
                    return;
                  }

                  // 4. Copy details to sale_details
                  let completedCount = 0;
                  let hasError = false;

                  detailResults.forEach((detail) => {
                    connection.query(
                      `INSERT INTO ep_sale_details (sale_id, item_id, quantity, unit_price, subtotal, notes)
                       VALUES (?, ?, ?, ?, ?, ?)`,
                      [saleId, detail.item_id, detail.quantity, detail.unit_price, detail.subtotal, detail.notes],
                      (err) => {
                        if (err && !hasError) {
                          hasError = true;
                          connection.rollback(() => connection.release());
                          return callback(err);
                        }

                        completedCount++;

                        if (completedCount === detailResults.length && !hasError) {
                          // 5. Update quotation status to 'converted'
                          connection.query(
                            `UPDATE ep_quotations SET status = 'converted', converted_sale_id = ?, updated_at = NOW() WHERE quotation_id = ?`,
                            [saleId, quotationId],
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
                                callback(null, { sale_id: saleId, message: 'Quotation converted to Sales Order successfully' });
                              });
                            }
                          );
                        }
                      }
                    );
                  });
                }
              );
            }
          );
        }
      );
    });
  });
};

module.exports = {
  getQuotations,
  getQuotationHeader,
  getQuotationDetails,
  addQuotation,
  addQuotationDetail,
  updateQuotation,
  updateQuotationStatus,
  updateQuotationDetail,
  deleteQuotationDetail,
  deleteQuotation,
  convertToSalesOrder
};
