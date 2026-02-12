const db = require('../config/db');

const getItems = (callback) => {
  db.query(
    `SELECT ep_items.*,
            CONCAT(ep_users.first_name, ' ', ep_users.last_name) as instock_by_name,
            COALESCE(inv.on_hand_quantity, 0) as on_hand_quantity
     FROM ep_items
     LEFT JOIN ep_users ON ep_items.instock_by = ep_users.user_id
     LEFT JOIN (
       SELECT item_id, SUM(quantity) as on_hand_quantity
       FROM ep_inventories
       GROUP BY item_id
     ) inv ON ep_items.item_id = inv.item_id
     WHERE ep_items.active = 1
     ORDER BY ep_items.in_stock_date DESC`, callback);
};

const getItemById = (id, callback) => {
  db.query('SELECT * FROM ep_items WHERE item_id = ?', [id], callback);
};

const updateItem = (id, data, callback) => {
  const { item_code, name, part_number, description, serial_number, instock_quantity, document_link, cost_price, sales_price } = data;
  const instockValue = instock_quantity !== '' && instock_quantity != null ? instock_quantity : 0;
  const costPriceValue = cost_price !== '' && cost_price != null ? cost_price : 0;
  const salesPriceValue = sales_price !== '' && sales_price != null ? sales_price : 0;
  db.query(
    `UPDATE ep_items SET item_code = ?, name = ?, part_number = ?, description = ?, serial_number = ?,
      instock_quantity = ?, document_link = ?, cost_price = ?, sales_price = ? WHERE item_id =?`,
    [item_code, name, part_number, description, serial_number, instockValue, document_link, costPriceValue, salesPriceValue, id ],
    callback
  );
};

const addItem = (data, callback) => {
  const {
    item_code, name, part_number, description, serial_number, instock_quantity, document_link, cost_price, sales_price
  } = data;

  const sql = `INSERT INTO ep_items
              (item_code, name, part_number, description, serial_number, instock_quantity, document_link, cost_price, sales_price)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const instockValue = instock_quantity !== '' && instock_quantity != null ? instock_quantity : 0;
  const costPriceValue = cost_price !== '' && cost_price != null ? cost_price : 0;
  const salesPriceValue = sales_price !== '' && sales_price != null ? sales_price : 0;
  db.query(sql, [
    item_code, name, part_number, description, serial_number, instockValue, document_link, costPriceValue, salesPriceValue
  ], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return callback(err, null);
    }
    callback(null, result.insertId);
  });
};

module.exports = { getItems, getItemById, updateItem, addItem };
