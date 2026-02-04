const db = require('../config/db');

// Get all sales (summary list with customer names)
const getSales = (callback) => {
  const sql = `
    SELECT 
      ep_sales.*, 
      ep_customers.company_name, 
      ep_customers.contact_name 
    FROM ep_sales 
    LEFT JOIN ep_customers ON ep_sales.customer_id = ep_customers.customer_id
    ORDER BY ep_sales.sale_date DESC
  `;
  
  db.query(sql, callback);
};

// Get details for a specific sale (line items with product info)
const getSaleById = (id, callback) => {
  console.log("Fetching details for Sales ID:", id);
  
  const sql = `
    SELECT 
      ep_sale_details.*, 
      ep_items.item_code, 
      ep_items.name AS item_name, 
      ep_items.description
    FROM ep_sale_details 
    LEFT JOIN ep_items ON ep_sale_details.item_id = ep_items.item_id
    WHERE ep_sale_details.sale_id = ?
  `;

  db.query(sql, [id], callback);
};

// Create a new sale (Transaction: Header + Details)
const addSale = (data, callback) => {
  const { customer_id, total_amount, payment_status, created_by, items } = data;

  const insertSaleSQL = `INSERT INTO ep_sales (customer_id, total_amount, payment_status, created_by) VALUES (?, ?, ?, ?)`;
  const insertDetailSQL = `INSERT INTO ep_sale_details (sale_id, item_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)`;

  // Start Database Transaction
  db.beginTransaction((err) => {
    if (err) return callback(err, null);

    // 1. Insert the Sale Header
    db.query(insertSaleSQL, [customer_id, total_amount, payment_status, created_by], (err, result) => {
      if (err) {
        console.error("Error inserting sale header:", err);
        return db.rollback(() => callback(err, null));
      }

      const saleId = result.insertId;

      // If no items, commit here
      if (!items || items.length === 0) {
        return db.commit((err) => {
          if (err) return db.rollback(() => callback(err, null));
          callback(null, saleId);
        });
      }

      // 2. Insert Sale Details (Line Items)
      const detailQueries = items.map((item) => {
        return new Promise((resolve, reject) => {
          db.query(insertDetailSQL, [saleId, item.item_id, item.quantity, item.unit_price, item.subtotal], (err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
        });
      });

      // Execute all item inserts
      Promise.all(detailQueries)
        .then(() => {
          db.commit((err) => {
            if (err) {
              console.error("Transaction commit error:", err);
              return db.rollback(() => callback(err, null));
            }
            callback(null, saleId);
          });
        })
        .catch((err) => {
          console.error("Error inserting sale details:", err);
          db.rollback(() => callback(err, null));
        });
    });
  });
};

module.exports = { getSales, getSaleById, addSale };