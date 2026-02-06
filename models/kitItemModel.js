const db = require('../config/db');
const PurchaseRequest = require('./purchaseRequestModel');

// Get all kit items
const getKitItems = (callback) => {
  db.query(
    `SELECT k.*,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            COUNT(c.component_id) as component_count
     FROM ep_kit_items k
     LEFT JOIN ep_users u ON k.created_by = u.user_id
     LEFT JOIN ep_kit_item_components c ON k.kit_item_id = c.kit_item_id
     GROUP BY k.kit_item_id
     ORDER BY k.created_at DESC`,
    callback
  );
};

// Get kit item header
const getKitItemHeader = (id, callback) => {
  db.query(
    `SELECT k.*,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            oi.item_code as output_item_code,
            oi.name as output_item_name
     FROM ep_kit_items k
     LEFT JOIN ep_users u ON k.created_by = u.user_id
     LEFT JOIN ep_items oi ON k.output_item_id = oi.item_id
     WHERE k.kit_item_id = ?`,
    [id],
    callback
  );
};

// Get kit item components
const getKitItemComponents = (kitItemId, callback) => {
  db.query(
    `SELECT c.*,
            i.item_code,
            i.name AS item_name,
            i.description AS item_description,
            inv.batch_number,
            inv.location,
            inv.quantity AS inventory_quantity,
            (inv.quantity - COALESCE(inv.reservation_qty, 0)) AS available_qty
     FROM ep_kit_item_components c
     LEFT JOIN ep_items i ON c.item_id = i.item_id
     LEFT JOIN ep_inventories inv ON c.inventory_id = inv.inventory_id
     WHERE c.kit_item_id = ?
     ORDER BY c.component_id`,
    [kitItemId],
    callback
  );
};

// Create kit item header
const addKitItem = (data, callback) => {
  const {
    kit_number,
    name,
    description,
    quantity_to_build,
    status,
    notes,
    created_by,
    output_item_id
  } = data;

  const createdByValue = created_by && created_by !== '' ? created_by : null;
  const outputItemIdValue = output_item_id && output_item_id !== '' ? output_item_id : null;

  db.query(
    `INSERT INTO ep_kit_items
     (kit_number, name, description, quantity_to_build, status, notes, created_by, output_item_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [kit_number, name, description, quantity_to_build || 1, status || 'draft', notes, createdByValue, outputItemIdValue],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return callback(err, null);
      }
      callback(null, result.insertId);
    }
  );
};

// Add kit item component
const addKitItemComponent = (data, callback) => {
  const { kit_item_id, item_id, quantity_per_kit, inventory_id, notes } = data;

  db.query(
    `INSERT INTO ep_kit_item_components (kit_item_id, item_id, quantity_per_kit, inventory_id, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [kit_item_id, item_id, quantity_per_kit || 1, inventory_id || null, notes],
    callback
  );
};

// Update kit item header
const updateKitItem = (id, data, callback) => {
  const {
    kit_number,
    name,
    description,
    quantity_to_build,
    status,
    notes,
    output_item_id
  } = data;

  const outputItemIdValue = output_item_id && output_item_id !== '' ? output_item_id : null;

  db.query(
    `UPDATE ep_kit_items
     SET kit_number = ?, name = ?, description = ?, quantity_to_build = ?,
         status = ?, notes = ?, output_item_id = ?, updated_at = NOW()
     WHERE kit_item_id = ?`,
    [kit_number, name, description, quantity_to_build, status, notes, outputItemIdValue, id],
    callback
  );
};

// Update kit item status
const updateKitItemStatus = (id, status, callback) => {
  db.query(
    `UPDATE ep_kit_items SET status = ?, updated_at = NOW() WHERE kit_item_id = ?`,
    [status, id],
    callback
  );
};

// Update kit item component
const updateKitItemComponent = (componentId, data, callback) => {
  const { item_id, quantity_per_kit, inventory_id, notes } = data;

  db.query(
    `UPDATE ep_kit_item_components
     SET item_id = ?, quantity_per_kit = ?, inventory_id = ?, notes = ?
     WHERE component_id = ?`,
    [item_id, quantity_per_kit, inventory_id, notes, componentId],
    callback
  );
};

// Delete kit item component
const deleteKitItemComponent = (componentId, callback) => {
  db.query('DELETE FROM ep_kit_item_components WHERE component_id = ?', [componentId], callback);
};

// Delete entire kit item
const deleteKitItem = (id, callback) => {
  db.query('DELETE FROM ep_kit_item_components WHERE kit_item_id = ?', [id], (err) => {
    if (err) return callback(err);
    db.query('DELETE FROM ep_kit_items WHERE kit_item_id = ?', [id], callback);
  });
};

// Reserve components for kit building (allows negative available with warning)
const reserveComponents = (kitItemId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      // Get kit item info
      connection.query(
        'SELECT quantity_to_build FROM ep_kit_items WHERE kit_item_id = ?',
        [kitItemId],
        (err, kitResults) => {
          if (err) {
            connection.rollback(() => connection.release());
            return callback(err);
          }
          if (kitResults.length === 0) {
            connection.rollback(() => connection.release());
            return callback(new Error('Kit item not found'));
          }

          const quantityToBuild = kitResults[0].quantity_to_build;

          // Get all components with inventory info
          connection.query(
            `SELECT c.*, i.item_code, i.name as item_name,
                    inv.quantity as inv_quantity,
                    COALESCE(inv.reservation_qty, 0) as inv_reservation_qty,
                    (inv.quantity - COALESCE(inv.reservation_qty, 0)) as available_qty
             FROM ep_kit_item_components c
             LEFT JOIN ep_items i ON c.item_id = i.item_id
             LEFT JOIN ep_inventories inv ON c.inventory_id = inv.inventory_id
             WHERE c.kit_item_id = ?`,
            [kitItemId],
            (err, components) => {
              if (err) {
                connection.rollback(() => connection.release());
                return callback(err);
              }

              if (components.length === 0) {
                connection.rollback(() => connection.release());
                return callback(new Error('No components found for this kit'));
              }

              // Check for insufficient inventory and collect warnings
              const warnings = [];
              components.forEach((comp) => {
                const totalNeeded = comp.quantity_per_kit * quantityToBuild;
                if (comp.available_qty < totalNeeded) {
                  warnings.push({
                    item_code: comp.item_code,
                    item_name: comp.item_name,
                    needed: totalNeeded,
                    available: comp.available_qty,
                    shortage: totalNeeded - comp.available_qty
                  });
                }
              });

              let completedCount = 0;
              let hasError = false;

              components.forEach((comp) => {
                if (hasError) return;

                const totalNeeded = comp.quantity_per_kit * quantityToBuild;

                // Reserve inventory (no available check - allow negative)
                connection.query(
                  `UPDATE ep_inventories
                   SET reservation_qty = COALESCE(reservation_qty, 0) + ?,
                       updated_at = NOW()
                   WHERE inventory_id = ?`,
                  [totalNeeded, comp.inventory_id],
                  (err, result) => {
                    if (hasError) return;

                    if (err) {
                      hasError = true;
                      connection.rollback(() => connection.release());
                      return callback(err);
                    }

                    // Update component reserved quantity
                    connection.query(
                      `UPDATE ep_kit_item_components
                       SET reserved_quantity = ?
                       WHERE component_id = ?`,
                      [totalNeeded, comp.component_id],
                      (err) => {
                        if (hasError) return;

                        if (err) {
                          hasError = true;
                          connection.rollback(() => connection.release());
                          return callback(err);
                        }

                        completedCount++;

                        if (completedCount === components.length) {
                          // Update kit status to in_progress
                          connection.query(
                            `UPDATE ep_kit_items SET status = 'in_progress', updated_at = NOW() WHERE kit_item_id = ?`,
                            [kitItemId],
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

                                // Auto-create PO Requests for insufficient inventory
                                const createdRequests = [];
                                if (warnings.length > 0) {
                                  let requestCount = 0;
                                  warnings.forEach((warning) => {
                                    const requestData = {
                                      item_id: components.find(c => c.item_code === warning.item_code)?.item_id,
                                      quantity_needed: warning.shortage,
                                      source_type: 'kit_reserve',
                                      source_id: kitItemId,
                                      priority: 'normal',
                                      notes: `Auto-generated: Kit #${kitItemId} needs ${warning.needed} of ${warning.item_code} (${warning.item_name}), only ${warning.available} available`
                                    };

                                    PurchaseRequest.addOrUpdateRequest(requestData, (err, result) => {
                                      requestCount++;
                                      if (!err && result) {
                                        createdRequests.push({
                                          request_id: result.request_id,
                                          item_code: warning.item_code,
                                          shortage: warning.shortage,
                                          updated: result.updated
                                        });
                                      }

                                      // All requests processed
                                      if (requestCount === warnings.length) {
                                        const resultData = {
                                          success: true,
                                          message: 'Components reserved with insufficient inventory warnings. PO Requests created.',
                                          warnings: warnings,
                                          purchase_requests: createdRequests
                                        };
                                        callback(null, resultData);
                                      }
                                    });
                                  });
                                } else {
                                  // No warnings, return success
                                  const result = {
                                    success: true,
                                    message: 'Components reserved successfully',
                                    warnings: []
                                  };
                                  callback(null, result);
                                }
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

// Complete kit building - deduct from inventory and create output inventory
const completeKitBuild = (kitItemId, buildQuantity, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      // Get kit item info including output_item_id
      connection.query(
        'SELECT * FROM ep_kit_items WHERE kit_item_id = ?',
        [kitItemId],
        (err, kitResults) => {
          if (err) {
            connection.rollback(() => connection.release());
            return callback(err);
          }
          if (kitResults.length === 0) {
            connection.rollback(() => connection.release());
            return callback(new Error('Kit item not found'));
          }

          const kitItem = kitResults[0];
          const outputItemId = kitItem.output_item_id;

          // Get all components with inventory info for shortage detection
          connection.query(
            `SELECT c.*, i.item_code, i.name as item_name,
                    inv.quantity as inv_quantity
             FROM ep_kit_item_components c
             LEFT JOIN ep_items i ON c.item_id = i.item_id
             LEFT JOIN ep_inventories inv ON c.inventory_id = inv.inventory_id
             WHERE c.kit_item_id = ?`,
            [kitItemId],
            (err, components) => {
              if (err) {
                connection.rollback(() => connection.release());
                return callback(err);
              }

              let completedCount = 0;
              let hasError = false;
              const shortages = []; // Track items that will go negative

              // Pre-calculate shortages before processing
              components.forEach((comp) => {
                const totalUsed = comp.quantity_per_kit * buildQuantity;
                const afterDeduct = (comp.inv_quantity || 0) - totalUsed;
                if (afterDeduct < 0) {
                  shortages.push({
                    item_id: comp.item_id,
                    item_code: comp.item_code,
                    item_name: comp.item_name,
                    needed: totalUsed,
                    current_qty: comp.inv_quantity || 0,
                    shortage: Math.abs(afterDeduct)
                  });
                }
              });

              const processComponents = () => {
                components.forEach((comp) => {
                  if (hasError) return;

                  const totalUsed = comp.quantity_per_kit * buildQuantity;

                  // Deduct from inventory and reduce reservation
                  connection.query(
                    `UPDATE ep_inventories
                     SET quantity = quantity - ?,
                         reservation_qty = GREATEST(COALESCE(reservation_qty, 0) - ?, 0),
                         updated_at = NOW()
                     WHERE inventory_id = ?`,
                    [totalUsed, totalUsed, comp.inventory_id],
                    (err) => {
                      if (hasError) return;

                      if (err) {
                        hasError = true;
                        connection.rollback(() => connection.release());
                        return callback(err);
                      }

                      // Create inventory transaction for component usage
                      connection.query(
                        `INSERT INTO ep_inventory_transactions
                         (inventory_id, item_id, quantity, transaction_type, transaction_date, notes, created_at)
                         VALUES (?, ?, ?, 'kit_usage', NOW(), ?, NOW())`,
                        [comp.inventory_id, comp.item_id, -totalUsed, `Used for Kit Build #${kitItemId} (${kitItem.kit_number})`],
                        (err) => {
                          if (hasError) return;

                          if (err) {
                            hasError = true;
                            connection.rollback(() => connection.release());
                            return callback(err);
                          }

                          // Update component used quantity
                          connection.query(
                            `UPDATE ep_kit_item_components
                             SET used_quantity = COALESCE(used_quantity, 0) + ?,
                                 reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - ?, 0)
                             WHERE component_id = ?`,
                            [totalUsed, totalUsed, comp.component_id],
                            (err) => {
                              if (hasError) return;

                              if (err) {
                                hasError = true;
                                connection.rollback(() => connection.release());
                                return callback(err);
                              }

                              completedCount++;

                              if (completedCount === components.length) {
                                finalizeKitBuild();
                              }
                            }
                          );
                        }
                      );
                    }
                  );
                });
              };

              const finalizeKitBuild = () => {
                // Update kit completed quantity
                connection.query(
                  `UPDATE ep_kit_items
                   SET completed_quantity = COALESCE(completed_quantity, 0) + ?,
                       status = CASE
                         WHEN COALESCE(completed_quantity, 0) + ? >= quantity_to_build THEN 'completed'
                         ELSE status
                       END,
                       updated_at = NOW()
                   WHERE kit_item_id = ?`,
                  [buildQuantity, buildQuantity, kitItemId],
                  (err) => {
                    if (err) {
                      connection.rollback(() => connection.release());
                      return callback(err);
                    }

                    // If output_item_id exists, create inventory for the output item
                    if (outputItemId) {
                      createOutputInventory();
                    } else {
                      commitTransaction();
                    }
                  }
                );
              };

              const createOutputInventory = () => {
                // Create new inventory entry for the output item
                connection.query(
                  `INSERT INTO ep_inventories
                   (item_id, quantity, batch_number, location, notes, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                  [
                    outputItemId,
                    buildQuantity,
                    `KIT-${kitItem.kit_number}-${Date.now()}`,
                    'Assembly',
                    `Produced from Kit Build #${kitItemId} (${kitItem.kit_number})`
                  ],
                  (err, inventoryResult) => {
                    if (err) {
                      connection.rollback(() => connection.release());
                      return callback(err);
                    }

                    const newInventoryId = inventoryResult.insertId;

                    // Create inventory transaction for kit production
                    connection.query(
                      `INSERT INTO ep_inventory_transactions
                       (inventory_id, item_id, quantity, transaction_type, transaction_date, notes, created_at)
                       VALUES (?, ?, ?, 'kit_production', NOW(), ?, NOW())`,
                      [
                        newInventoryId,
                        outputItemId,
                        buildQuantity,
                        `Produced from Kit Build #${kitItemId} (${kitItem.kit_number})`
                      ],
                      (err) => {
                        if (err) {
                          connection.rollback(() => connection.release());
                          return callback(err);
                        }

                        commitTransaction();
                      }
                    );
                  }
                );
              };

              const commitTransaction = () => {
                connection.commit((err) => {
                  if (err) {
                    connection.rollback(() => connection.release());
                    return callback(err);
                  }
                  connection.release();

                  // Auto-create PO Requests for items that went negative
                  if (shortages.length > 0) {
                    const createdRequests = [];
                    let requestCount = 0;

                    shortages.forEach((shortage) => {
                      const requestData = {
                        item_id: shortage.item_id,
                        quantity_needed: shortage.shortage,
                        source_type: 'kit_reserve',
                        source_id: kitItemId,
                        priority: 'urgent', // Urgent because inventory is already negative
                        notes: `Auto-generated (Complete Build): Kit #${kitItemId} (${kitItem.kit_number}) - ${shortage.item_code} (${shortage.item_name}) inventory went negative. Needed: ${shortage.needed}, Had: ${shortage.current_qty}, Shortage: ${shortage.shortage}`
                      };

                      PurchaseRequest.addOrUpdateRequest(requestData, (err, result) => {
                        requestCount++;
                        if (!err && result) {
                          createdRequests.push({
                            request_id: result.request_id,
                            item_code: shortage.item_code,
                            shortage: shortage.shortage,
                            updated: result.updated
                          });
                        }

                        // All requests processed
                        if (requestCount === shortages.length) {
                          callback(null, {
                            success: true,
                            message: outputItemId
                              ? 'Kit build completed and output inventory created'
                              : 'Kit build completed successfully',
                            warnings: shortages,
                            purchase_requests: createdRequests
                          });
                        }
                      });
                    });
                  } else {
                    callback(null, {
                      success: true,
                      message: outputItemId
                        ? 'Kit build completed and output inventory created'
                        : 'Kit build completed successfully'
                    });
                  }
                });
              };

              // Start processing components
              if (components.length === 0) {
                finalizeKitBuild();
              } else {
                processComponents();
              }
            }
          );
        }
      );
    });
  });
};

// Get available inventory for an item
const getInventoryForItem = (itemId, callback) => {
  db.query(
    `SELECT inv.*,
            (inv.quantity - COALESCE(inv.reservation_qty, 0)) as available_qty,
            CONCAT(u.first_name, ' ', u.last_name) as received_by_name
     FROM ep_inventories inv
     LEFT JOIN ep_users u ON inv.received_by = u.user_id
     WHERE inv.item_id = ? AND (inv.quantity - COALESCE(inv.reservation_qty, 0)) > 0
     ORDER BY inv.created_at ASC`,
    [itemId],
    callback
  );
};

module.exports = {
  getKitItems,
  getKitItemHeader,
  getKitItemComponents,
  addKitItem,
  addKitItemComponent,
  updateKitItem,
  updateKitItemStatus,
  updateKitItemComponent,
  deleteKitItemComponent,
  deleteKitItem,
  reserveComponents,
  completeKitBuild,
  getInventoryForItem
};
