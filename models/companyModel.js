const db = require('../config/db');

// Get company info (usually just one record)
const getCompany = (callback) => {
  db.query('SELECT * FROM ep_company WHERE company_id = 1', callback);
};

// Update company info
const updateCompany = (data, callback) => {
  const {
    company_name,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    phone,
    fax,
    email,
    website,
    tax_id,
    logo_url
  } = data;

  db.query(
    `UPDATE ep_company SET
      company_name = ?,
      address_line1 = ?,
      address_line2 = ?,
      city = ?,
      state = ?,
      postal_code = ?,
      country = ?,
      phone = ?,
      fax = ?,
      email = ?,
      website = ?,
      tax_id = ?,
      logo_url = ?,
      updated_at = NOW()
    WHERE company_id = 1`,
    [
      company_name,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      phone,
      fax,
      email,
      website,
      tax_id,
      logo_url
    ],
    callback
  );
};

module.exports = {
  getCompany,
  updateCompany
};
