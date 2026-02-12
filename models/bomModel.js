const db = require('../config/db');

// Get all BOMs
const getBOMs = (callback) => {
  db.query(
    `SELECT b.*,
            i.item_code as output_item_code,
            i.name as output_item_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            COUNT(c.bom_component_id) as component_count
     FROM ep_bom_structures b
     LEFT JOIN ep_items i ON b.output_item_id = i.item_id
     LEFT JOIN ep_users u ON b.created_by = u.user_id
     LEFT JOIN ep_bom_components c ON b.bom_id = c.bom_id
     GROUP BY b.bom_id
     ORDER BY b.created_at DESC`,
    callback
  );
};

// Get BOM header by ID
const getBOMHeader = (id, callback) => {
  db.query(
    `SELECT b.*,
            i.item_code as output_item_code,
            i.name as output_item_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM ep_bom_structures b
     LEFT JOIN ep_items i ON b.output_item_id = i.item_id
     LEFT JOIN ep_users u ON b.created_by = u.user_id
     WHERE b.bom_id = ?`,
    [id],
    callback
  );
};

// Get BOM components
const getBOMComponents = (bomId, callback) => {
  db.query(
    `SELECT c.*,
            i.item_code,
            i.name as item_name,
            i.description as item_description,
            sub_bom.bom_number as subassembly_bom_number,
            sub_bom.name as subassembly_bom_name
     FROM ep_bom_components c
     LEFT JOIN ep_items i ON c.item_id = i.item_id
     LEFT JOIN ep_bom_structures sub_bom ON c.subassembly_bom_id = sub_bom.bom_id
     WHERE c.bom_id = ?
     ORDER BY c.sequence_order, c.bom_component_id`,
    [bomId],
    callback
  );
};

// Get BOM full details (header + components)
const getBOMFullDetails = (id, callback) => {
  getBOMHeader(id, (err, headerResults) => {
    if (err) return callback(err);
    if (headerResults.length === 0) {
      return callback(new Error('BOM not found'));
    }

    const header = headerResults[0];

    getBOMComponents(id, (err, components) => {
      if (err) return callback(err);

      callback(null, {
        header,
        components
      });
    });
  });
};

// Create BOM header
const addBOM = (data, callback) => {
  const {
    bom_number,
    name,
    description,
    output_item_id,
    output_quantity,
    version,
    is_active,
    notes,
    created_by
  } = data;

  const createdByValue = created_by && created_by !== '' ? created_by : null;

  db.query(
    `INSERT INTO ep_bom_structures
     (bom_number, name, description, output_item_id, output_quantity, version, is_active, notes, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      bom_number,
      name,
      description,
      output_item_id,
      output_quantity || 1,
      version || '1.0',
      is_active !== undefined ? is_active : 1,
      notes,
      createdByValue
    ],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return callback(err, null);
      }
      callback(null, result.insertId);
    }
  );
};

// Add BOM component
const addBOMComponent = (data, callback) => {
  const {
    bom_id,
    item_id,
    quantity_per_unit,
    is_subassembly,
    subassembly_bom_id,
    sequence_order,
    notes
  } = data;

  db.query(
    `INSERT INTO ep_bom_components
     (bom_id, item_id, quantity_per_unit, is_subassembly, subassembly_bom_id, sequence_order, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      bom_id,
      item_id,
      quantity_per_unit || 1,
      is_subassembly || 0,
      subassembly_bom_id || null,
      sequence_order || 0,
      notes
    ],
    callback
  );
};

// Update BOM header
const updateBOM = (id, data, callback) => {
  const {
    bom_number,
    name,
    description,
    output_item_id,
    output_quantity,
    version,
    is_active,
    notes
  } = data;

  db.query(
    `UPDATE ep_bom_structures
     SET bom_number = ?, name = ?, description = ?, output_item_id = ?,
         output_quantity = ?, version = ?, is_active = ?, notes = ?, updated_at = NOW()
     WHERE bom_id = ?`,
    [
      bom_number,
      name,
      description,
      output_item_id,
      output_quantity,
      version,
      is_active,
      notes,
      id
    ],
    callback
  );
};

// Update BOM component
const updateBOMComponent = (componentId, data, callback) => {
  const {
    item_id,
    quantity_per_unit,
    is_subassembly,
    subassembly_bom_id,
    sequence_order,
    notes
  } = data;

  db.query(
    `UPDATE ep_bom_components
     SET item_id = ?, quantity_per_unit = ?, is_subassembly = ?,
         subassembly_bom_id = ?, sequence_order = ?, notes = ?
     WHERE bom_component_id = ?`,
    [
      item_id,
      quantity_per_unit,
      is_subassembly || 0,
      subassembly_bom_id || null,
      sequence_order || 0,
      notes,
      componentId
    ],
    callback
  );
};

// Delete BOM component
const deleteBOMComponent = (componentId, callback) => {
  db.query(
    'DELETE FROM ep_bom_components WHERE bom_component_id = ?',
    [componentId],
    callback
  );
};

// Delete BOM (components will cascade delete)
const deleteBOM = (id, callback) => {
  db.query(
    'DELETE FROM ep_bom_structures WHERE bom_id = ?',
    [id],
    callback
  );
};

// Get BOMs by output item (find BOMs that produce a specific item)
const getBOMsByOutputItem = (itemId, callback) => {
  db.query(
    `SELECT b.*,
            i.item_code as output_item_code,
            i.name as output_item_name
     FROM ep_bom_structures b
     LEFT JOIN ep_items i ON b.output_item_id = i.item_id
     WHERE b.output_item_id = ? AND b.is_active = 1
     ORDER BY b.version DESC`,
    [itemId],
    callback
  );
};

// Check if item has a BOM (for determining if it's a subassembly)
const checkItemHasBOM = (itemId, callback) => {
  db.query(
    `SELECT bom_id, bom_number, name
     FROM ep_bom_structures
     WHERE output_item_id = ? AND is_active = 1
     LIMIT 1`,
    [itemId],
    callback
  );
};

// Get all active BOMs for dropdown selection
const getActiveBOMs = (callback) => {
  db.query(
    `SELECT b.bom_id, b.bom_number, b.name, b.output_item_id,
            i.item_code as output_item_code, i.name as output_item_name
     FROM ep_bom_structures b
     LEFT JOIN ep_items i ON b.output_item_id = i.item_id
     WHERE b.is_active = 1
     ORDER BY b.name`,
    callback
  );
};

module.exports = {
  getBOMs,
  getBOMHeader,
  getBOMComponents,
  getBOMFullDetails,
  addBOM,
  addBOMComponent,
  updateBOM,
  updateBOMComponent,
  deleteBOMComponent,
  deleteBOM,
  getBOMsByOutputItem,
  checkItemHasBOM,
  getActiveBOMs
};
