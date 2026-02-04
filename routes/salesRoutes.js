const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.get('/', salesController.getAllSales);
router.get('/:sales_id', salesController.getSalesDetails);

// router.get('/', (req, res) => {
//   const query = `SELECT * FROM ep_item_details WHERE transaction_type = "sale"`;

//   db.query(query, (err, results) => {
//     if (err) {
//       console.error('Error fetching sales:', err);
//       return res.status(500).send('Server error');
//     }
//     res.json(results);
//   });
// });

// router.get('/details', (req, res) => {
//   const { item_id } = req.query;

//   if (!item_id) return res.status(400).send('item_id is required');

//   const query = `
//     SELECT * 
//     FROM ep_item_details 
//     LEFT JOIN ep_items ON ep_item_details.item_id = ep_items.item_id
//     WHERE ep_item_details.transaction_type = 'sale' 
//     AND ep_item_details.item_id = ?
//     ORDER BY ep_item_details.updated_date DESC`;

//   db.query(query, [item_id], (err, results) => {
//     if (err) {
//       console.error('Error fetching sales details:', err);
//       return res.status(500).send('Server error');
//     }
//     res.json(results);
//   });
// });

module.exports = router;


