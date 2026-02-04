const db = require('../config/db');

const getSuppliers = (callback) => {
  db.query('SELECT * FROM ep_suppliers WHERE active = 1', callback);
};

const getSupplierById = (id, callback) => {
  db.query('SELECT * FROM ep_suppliers WHERE supplier_id = ?', [id], callback);
};

const updateSupplier = (id, data, callback) => {
  const { company_name, contact_name, contact_email, contact_phone,
    billing_contact_name, billing_contact_phone, billing_contact_email, billing_address,
    billing_address_city, billing_address_state, billing_address_country, billing_address_zip,
    shipping_contact_name, shipping_contact_phone, shipping_contact_email, shipping_address,
    shipping_address_city, shipping_address_state, shipping_address_country, shipping_address_zip,
    website, tax_id, modified_by
  } = data;

  // modified_by가 없거나 빈 문자열이면 NULL로 처리
  const modifiedByValue = modified_by && modified_by !== '' ? modified_by : null;

  db.query(
    `UPDATE ep_suppliers SET
      company_name = ?, contact_name = ?, contact_email = ?, contact_phone = ?,
      billing_contact_name = ?, billing_contact_phone = ?, billing_contact_email = ?,
      billing_address = ?, billing_address_city = ?, billing_address_state = ?, billing_address_country = ?, billing_address_zip = ?,
      shipping_contact_name = ?, shipping_contact_phone = ?, shipping_contact_email = ?,
      shipping_address = ?, shipping_address_city = ?, shipping_address_state = ?, shipping_address_country = ?, shipping_address_zip = ?,
      website = ?, tax_id = ?, modified_at = NOW(), modified_by = ?
      WHERE supplier_id = ?`,
    [company_name, contact_name, contact_email, contact_phone,
     billing_contact_name, billing_contact_phone, billing_contact_email,
     billing_address, billing_address_city, billing_address_state, billing_address_country, billing_address_zip,
     shipping_contact_name, shipping_contact_phone, shipping_contact_email,
     shipping_address, shipping_address_city, shipping_address_state, shipping_address_country, shipping_address_zip,
     website, tax_id, modifiedByValue, id],
    callback
  );
};

const addSupplier = (data, callback) => {
  const {
    company_name, contact_name, contact_email, contact_phone,
    billing_contact_name, billing_contact_phone, billing_contact_email,
    billing_address, billing_address_city, billing_address_state, billing_address_country, billing_address_zip,
    shipping_contact_name, shipping_contact_phone, shipping_contact_email,
    shipping_address, shipping_address_city, shipping_address_state, shipping_address_country, shipping_address_zip,
    website, tax_id, created_by
  } = data;

  // created_by가 없거나 빈 문자열이면 NULL로 처리
  const createdByValue = created_by && created_by !== '' ? created_by : null;

  const sql = `INSERT INTO ep_suppliers
              (company_name, contact_name, contact_email, contact_phone,
               billing_contact_name, billing_contact_phone, billing_contact_email,
               billing_address, billing_address_city, billing_address_state, billing_address_country, billing_address_zip,
               shipping_contact_name, shipping_contact_phone, shipping_contact_email,
               shipping_address, shipping_address_city, shipping_address_state, shipping_address_country, shipping_address_zip,
               website, tax_id, created_at, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`;

  db.query(sql, [
    company_name, contact_name, contact_email, contact_phone,
    billing_contact_name, billing_contact_phone, billing_contact_email,
    billing_address, billing_address_city, billing_address_state, billing_address_country, billing_address_zip,
    shipping_contact_name, shipping_contact_phone, shipping_contact_email,
    shipping_address, shipping_address_city, shipping_address_state, shipping_address_country, shipping_address_zip,
    website, tax_id, createdByValue
  ], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return callback(err, null);
    }
    callback(null, result.insertId);
  });
};

module.exports = { getSuppliers, getSupplierById, updateSupplier, addSupplier };
