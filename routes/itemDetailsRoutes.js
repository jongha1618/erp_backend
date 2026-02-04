const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.get('/', (req, res) => {
  const query = `
    SELECT * 
    FROM ep_item_details 
    LEFT JOIN ep_items ON ep_item_details.item_id = ep_items.item_id
    WHERE ep_item_details.transaction_type = 'sale' 
    ORDER BY ep_item_details.updated_date DESC`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching item details:', err);
      return res.status(500).send('Server error');
    }
    res.json(results);
  });
});

module.exports = router;
