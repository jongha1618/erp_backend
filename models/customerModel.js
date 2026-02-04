const db = require('../config/db');

const getCustomers = (callback) => {
  db.query('SELECT * FROM ep_customers WHERE active = 1', callback);
};

const getCustomerById = (id, callback) => {
  db.query('SELECT * FROM ep_customers WHERE customer_id = ?', [id], callback);
};

const updateCustomer = (id, data, callback) => {
  const { company_name, contact_name, contact_email, contact_phone, 
    billing_contact_name, billing_phone, billing_address, billing_address_city, 
    billing_address_state, billing_address_zip, shipping_contact_name, shipping_phone, 
    shipping_address, shipping_address_city, shipping_address_state, shipping_address_zip 
} = data;
  db.query(
    `UPDATE ep_customers SET company_name = ?,  contact_name = ?, contact_email = ?, 
    contact_phone = ?, billing_contact_name = ?, billing_phone = ?, billing_address = ?, 
    billing_address_city = ?, billing_address_state = ?, billing_address_zip = ?,
    shipping_contact_name = ?, shipping_phone = ?, shipping_address = ?, shipping_address_city = ?,
    shipping_address_state = ?, shipping_address_zip = ? WHERE customer_id =?`,
    [company_name, contact_name, contact_email, contact_phone, billing_contact_name, billing_phone,
      billing_address, billing_address_city, billing_address_state, billing_address_zip, 
      shipping_contact_name, shipping_phone, shipping_address, shipping_address_city, 
      shipping_address_state, shipping_address_zip, id],
    callback
  );
};

const addCustomer = (data, callback) => {
  const {
    company_name, contact_name, contact_email, contact_phone,
    billing_contact_name, billing_phone, billing_address, billing_address_city, billing_address_state, billing_address_zip,
    shipping_contact_name, shipping_phone, shipping_address, shipping_address_city, shipping_address_state, shipping_address_zip
  } = data;

  const sql = `INSERT INTO ep_customers 
              (company_name, contact_name, contact_email, contact_phone, 
              billing_contact_name, billing_phone, billing_address, billing_address_city, billing_address_state, billing_address_zip, 
              shipping_contact_name, shipping_phone, shipping_address, shipping_address_city, shipping_address_state, shipping_address_zip) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [
    company_name, contact_name, contact_email, contact_phone,
    billing_contact_name, billing_phone, billing_address, billing_address_city, billing_address_state, billing_address_zip,
    shipping_contact_name, shipping_phone, shipping_address, shipping_address_city, shipping_address_state, shipping_address_zip
  ], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return callback(err, null);
    }
    callback(null, result.insertId);
  });
};

module.exports = { getCustomers, getCustomerById, updateCustomer, addCustomer };
