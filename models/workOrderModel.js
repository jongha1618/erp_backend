const db = require('../config/db');
const BOM = require('./bomModel');
const PurchaseRequest = require('./purchaseRequestModel');

// ============================================================
// Basic CRUD Operations
// ============================================================

// Get all work orders (flat list)
const getWorkOrders = (callback) => {
  db.query(
    `SELECT wo.*,
            i.item_code as output_item_code,
            i.name as output_item_name,
            b.bom_number,
            b.name as bom_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            parent.wo_number as parent_wo_number,
            (SELECT COUNT(*) FROM ep_work_order_components WHERE wo_id = wo.wo_id) as component_count,
            (SELECT COUNT(*) FROM ep_work_orders WHERE parent_wo_id = wo.wo_id) as child_count
     FROM ep_work_orders wo
     LEFT JOIN ep_items i ON wo.output_item_id = i.item_id
     LEFT JOIN ep_bom_structures b ON wo.bom_id = b.bom_id
     LEFT JOIN ep_users u ON wo.created_by = u.user_id
     LEFT JOIN ep_work_orders parent ON wo.parent_wo_id = parent.wo_id
     ORDER BY wo.created_at DESC`,
    callback
  );
};

// Get work order header by ID
const getWorkOrderHeader = (id, callback) => {
  db.query(
    `SELECT wo.*,
            i.item_code as output_item_code,
            i.name as output_item_name,
            b.bom_number,
            b.name as bom_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            parent.wo_number as parent_wo_number
     FROM ep_work_orders wo
     LEFT JOIN ep_items i ON wo.output_item_id = i.item_id
     LEFT JOIN ep_bom_structures b ON wo.bom_id = b.bom_id
     LEFT JOIN ep_users u ON wo.created_by = u.user_id
     LEFT JOIN ep_work_orders parent ON wo.parent_wo_id = parent.wo_id
     WHERE wo.wo_id = ?`,
    [id],
    callback
  );
};

// Get work order components
const getWorkOrderComponents = (woId, callback) => {
  db.query(
    `SELECT woc.*,
            i.item_code,
            i.name as item_name,
            i.description as item_description,
            inv.batch_number,
            inv.location,
            inv.quantity as inventory_quantity,
            (inv.quantity - COALESCE(inv.reservation_qty, 0)) as available_qty,
            child_wo.wo_number as child_wo_number,
            child_wo.status as child_wo_status,
            child_wo.quantity_completed as child_wo_completed
     FROM ep_work_order_components woc
     LEFT JOIN ep_items i ON woc.item_id = i.item_id
     LEFT JOIN ep_inventories inv ON woc.inventory_id = inv.inventory_id
     LEFT JOIN ep_work_orders child_wo ON woc.child_wo_id = child_wo.wo_id
     WHERE woc.wo_id = ?
     ORDER BY woc.sequence_order, woc.woc_id`,
    [woId],
    callback
  );
};

// Get work order full details
const getWorkOrderFullDetails = (id, callback) => {
  getWorkOrderHeader(id, (err, headerResults) => {
    if (err) return callback(err);
    if (headerResults.length === 0) {
      return callback(new Error('Work Order not found'));
    }

    const header = headerResults[0];

    getWorkOrderComponents(id, (err, components) => {
      if (err) return callback(err);

      // Get child work orders
      getChildWorkOrders(id, (err, children) => {
        if (err) return callback(err);

        callback(null, {
          header,
          components,
          children
        });
      });
    });
  });
};

// Get child work orders
const getChildWorkOrders = (parentWoId, callback) => {
  db.query(
    `SELECT wo.*,
            i.item_code as output_item_code,
            i.name as output_item_name
     FROM ep_work_orders wo
     LEFT JOIN ep_items i ON wo.output_item_id = i.item_id
     WHERE wo.parent_wo_id = ?
     ORDER BY wo.depth, wo.wo_id`,
    [parentWoId],
    callback
  );
};

// ============================================================
// Tree Structure Operations
// ============================================================

// Get work order tree (recursive)
const getWorkOrderTree = (rootWoId, callback) => {
  // First get the root
  getWorkOrderHeader(rootWoId, (err, rootResults) => {
    if (err) return callback(err);
    if (rootResults.length === 0) {
      return callback(new Error('Work Order not found'));
    }

    const root = rootResults[0];
    root.progress_percent = root.quantity_ordered > 0
      ? Math.round((root.quantity_completed / root.quantity_ordered) * 100)
      : 0;

    // Get all descendants
    db.query(
      `SELECT wo.*,
              i.item_code as output_item_code,
              i.name as output_item_name
       FROM ep_work_orders wo
       LEFT JOIN ep_items i ON wo.output_item_id = i.item_id
       WHERE wo.root_wo_id = ? AND wo.wo_id != ?
       ORDER BY wo.depth, wo.wo_id`,
      [rootWoId, rootWoId],
      (err, descendants) => {
        if (err) return callback(err);

        // Build tree structure
        const buildTree = (parentId, items) => {
          return items
            .filter(item => item.parent_wo_id === parentId)
            .map(item => ({
              ...item,
              progress_percent: item.quantity_ordered > 0
                ? Math.round((item.quantity_completed / item.quantity_ordered) * 100)
                : 0,
              children: buildTree(item.wo_id, items)
            }));
        };

        root.children = buildTree(rootWoId, descendants);
        callback(null, root);
      }
    );
  });
};

// Get all root work orders (for tree list view)
const getRootWorkOrders = (callback) => {
  db.query(
    `SELECT wo.*,
            i.item_code as output_item_code,
            i.name as output_item_name,
            b.bom_number,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            (SELECT COUNT(*) FROM ep_work_orders WHERE root_wo_id = wo.wo_id AND wo_id != wo.wo_id) as descendant_count
     FROM ep_work_orders wo
     LEFT JOIN ep_items i ON wo.output_item_id = i.item_id
     LEFT JOIN ep_bom_structures b ON wo.bom_id = b.bom_id
     LEFT JOIN ep_users u ON wo.created_by = u.user_id
     WHERE wo.parent_wo_id IS NULL
     ORDER BY wo.created_at DESC`,
    callback
  );
};

// ============================================================
// Create Operations
// ============================================================

// Generate WO number (optionally using a specific connection to see uncommitted rows)
const generateWONumber = (connectionOrCallback, callback) => {
  let queryFn;
  if (typeof connectionOrCallback === 'function') {
    // Called as generateWONumber(callback) - use pool
    callback = connectionOrCallback;
    queryFn = (sql, params, cb) => db.query(sql, params, cb);
  } else {
    // Called as generateWONumber(connection, callback) - use transaction connection
    queryFn = (sql, params, cb) => connectionOrCallback.query(sql, params, cb);
  }

  const year = new Date().getFullYear();
  queryFn(
    `SELECT MAX(CAST(SUBSTRING(wo_number, 9) AS UNSIGNED)) as max_num
     FROM ep_work_orders
     WHERE wo_number LIKE ?`,
    [`WO-${year}-%`],
    (err, results) => {
      if (err) return callback(err);
      const nextNum = (results[0].max_num || 0) + 1;
      const woNumber = `WO-${year}-${String(nextNum).padStart(4, '0')}`;
      callback(null, woNumber);
    }
  );
};

// Create work order (manual)
const addWorkOrder = (data, callback) => {
  const {
    wo_number,
    bom_id,
    output_item_id,
    quantity_ordered,
    parent_wo_id,
    root_wo_id,
    depth,
    status,
    planned_start_date,
    planned_end_date,
    priority,
    notes,
    created_by
  } = data;

  db.query(
    `INSERT INTO ep_work_orders
     (wo_number, bom_id, output_item_id, quantity_ordered, parent_wo_id, root_wo_id, depth,
      status, planned_start_date, planned_end_date, priority, notes, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      wo_number,
      bom_id || null,
      output_item_id,
      quantity_ordered,
      parent_wo_id || null,
      root_wo_id || null,
      depth || 0,
      status || 'draft',
      planned_start_date || null,
      planned_end_date || null,
      priority || 'normal',
      notes,
      created_by || null
    ],
    (err, result) => {
      if (err) return callback(err);
      callback(null, result.insertId);
    }
  );
};

// Add work order component
const addWorkOrderComponent = (data, callback) => {
  const {
    wo_id,
    item_id,
    inventory_id,
    quantity_required,
    is_subassembly,
    child_wo_id,
    sequence_order,
    notes
  } = data;

  db.query(
    `INSERT INTO ep_work_order_components
     (wo_id, item_id, inventory_id, quantity_required, is_subassembly, child_wo_id, sequence_order, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      wo_id,
      item_id,
      inventory_id || null,
      quantity_required,
      is_subassembly || 0,
      child_wo_id || null,
      sequence_order || 0,
      notes
    ],
    callback
  );
};

// ============================================================
// Create from BOM (Auto-generate child WOs)
// ============================================================

const createFromBOM = (bomId, quantity, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const { parent_wo_id, root_wo_id, depth, created_by, planned_start_date, planned_end_date, priority } = options;

  // If a connection is passed via options, reuse it (recursive call within same transaction)
  const existingConnection = options._connection;

  const doWork = async (connection, isRoot) => {
    // Get BOM details
    const bomDetails = await new Promise((resolve, reject) => {
      BOM.getBOMFullDetails(bomId, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // Generate WO number (use transaction connection to see uncommitted inserts)
    const woNumber = await new Promise((resolve, reject) => {
      generateWONumber(connection, (err, number) => {
        if (err) reject(err);
        else resolve(number);
      });
    });

    // Create work order
    const woResult = await new Promise((resolve, reject) => {
      connection.query(
        `INSERT INTO ep_work_orders
         (wo_number, bom_id, output_item_id, quantity_ordered, parent_wo_id, root_wo_id, depth,
          status, planned_start_date, planned_end_date, priority, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, NOW())`,
        [
          woNumber,
          bomId,
          bomDetails.header.output_item_id,
          quantity,
          parent_wo_id || null,
          root_wo_id || null,
          depth || 0,
          planned_start_date || null,
          planned_end_date || null,
          priority || 'normal',
          created_by || null
        ],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    const woId = woResult.insertId;
    const currentRootId = root_wo_id || woId;

    // Update root_wo_id if this is the root
    if (!root_wo_id) {
      await new Promise((resolve, reject) => {
        connection.query(
          'UPDATE ep_work_orders SET root_wo_id = ? WHERE wo_id = ?',
          [woId, woId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Process components
    const childWOs = [];
    for (const comp of bomDetails.components) {
      const componentQty = comp.quantity_per_unit * quantity;

      if (comp.is_subassembly && comp.subassembly_bom_id) {
        // Recursively create child WO for subassembly (reuse same connection)
        const childWO = await new Promise((resolve, reject) => {
          createFromBOM(
            comp.subassembly_bom_id,
            componentQty,
            {
              parent_wo_id: woId,
              root_wo_id: currentRootId,
              depth: (depth || 0) + 1,
              created_by,
              planned_start_date,
              planned_end_date,
              priority,
              _connection: connection
            },
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });

        childWOs.push(childWO);

        // Add component with child_wo_id reference
        await new Promise((resolve, reject) => {
          connection.query(
            `INSERT INTO ep_work_order_components
             (wo_id, item_id, quantity_required, is_subassembly, child_wo_id, sequence_order)
             VALUES (?, ?, ?, 1, ?, ?)`,
            [woId, comp.item_id, componentQty, childWO.wo_id, comp.sequence_order || 0],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      } else {
        // Regular component
        await new Promise((resolve, reject) => {
          connection.query(
            `INSERT INTO ep_work_order_components
             (wo_id, item_id, quantity_required, is_subassembly, sequence_order)
             VALUES (?, ?, ?, 0, ?)`,
            [woId, comp.item_id, componentQty, comp.sequence_order || 0],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }

    // Determine initial status
    const initialStatus = childWOs.length > 0 ? 'blocked' : 'draft';
    if (initialStatus !== 'draft') {
      await new Promise((resolve, reject) => {
        connection.query(
          'UPDATE ep_work_orders SET status = ? WHERE wo_id = ?',
          [initialStatus, woId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    return {
      wo_id: woId,
      wo_number: woNumber,
      status: initialStatus,
      child_wos: childWOs
    };
  };

  if (existingConnection) {
    // Recursive call: reuse the existing connection, no new transaction
    doWork(existingConnection, false)
      .then((result) => callback(null, result))
      .catch((error) => callback(error));
  } else {
    // Root call: get a new connection and manage the transaction
    db.getConnection((err, connection) => {
      if (err) return callback(err);

      connection.beginTransaction(async (err) => {
        if (err) {
          connection.release();
          return callback(err);
        }

        try {
          const result = await doWork(connection, true);

          connection.commit((err) => {
            connection.release();
            if (err) return callback(err);
            callback(null, result);
          });
        } catch (error) {
          connection.rollback(() => {
            connection.release();
            callback(error);
          });
        }
      });
    });
  }
};

// ============================================================
// Update Operations
// ============================================================

// Update work order header
const updateWorkOrder = (id, data, callback) => {
  const {
    quantity_ordered,
    planned_start_date,
    planned_end_date,
    priority,
    notes
  } = data;

  db.query(
    `UPDATE ep_work_orders
     SET quantity_ordered = ?, planned_start_date = ?, planned_end_date = ?,
         priority = ?, notes = ?, updated_at = NOW()
     WHERE wo_id = ?`,
    [quantity_ordered, planned_start_date, planned_end_date, priority, notes, id],
    callback
  );
};

// Update work order status
const updateWorkOrderStatus = (id, status, callback) => {
  const updates = { status };

  if (status === 'in_progress') {
    updates.actual_start_date = new Date();
  } else if (status === 'completed') {
    updates.actual_end_date = new Date();
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), id];

  db.query(
    `UPDATE ep_work_orders SET ${setClauses}, updated_at = NOW() WHERE wo_id = ?`,
    values,
    callback
  );
};

// Update work order component
const updateWorkOrderComponent = (wocId, data, callback) => {
  const { item_id, inventory_id, quantity_required, sequence_order, notes } = data;

  db.query(
    `UPDATE ep_work_order_components
     SET item_id = ?, inventory_id = ?, quantity_required = ?, sequence_order = ?, notes = ?
     WHERE woc_id = ?`,
    [item_id, inventory_id, quantity_required, sequence_order, notes, wocId],
    callback
  );
};

// Delete work order component
const deleteWorkOrderComponent = (wocId, callback) => {
  db.query('DELETE FROM ep_work_order_components WHERE woc_id = ?', [wocId], callback);
};

// Delete work order (cascade to children)
const deleteWorkOrder = (id, callback) => {
  db.query('DELETE FROM ep_work_orders WHERE wo_id = ?', [id], callback);
};

// ============================================================
// Status Machine Operations
// ============================================================

// Check if work order can be Ready
const checkWorkOrderReady = (woId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    // Check child WOs
    connection.query(
      `SELECT COUNT(*) as incomplete_children
       FROM ep_work_orders
       WHERE parent_wo_id = ? AND status != 'completed'`,
      [woId],
      (err, childResults) => {
        if (err) {
          connection.release();
          return callback(err);
        }

        if (childResults[0].incomplete_children > 0) {
          connection.release();
          return callback(null, {
            ready: false,
            reason: 'blocked',
            message: `${childResults[0].incomplete_children} child work order(s) not completed`
          });
        }

        // Check material availability (non-subassembly components)
        connection.query(
          `SELECT woc.*, i.item_code, i.name as item_name,
                  COALESCE(SUM(inv.quantity - COALESCE(inv.reservation_qty, 0)), 0) as total_available
           FROM ep_work_order_components woc
           LEFT JOIN ep_items i ON woc.item_id = i.item_id
           LEFT JOIN ep_inventories inv ON woc.item_id = inv.item_id
           WHERE woc.wo_id = ? AND woc.is_subassembly = 0
           GROUP BY woc.woc_id`,
          [woId],
          (err, compResults) => {
            connection.release();
            if (err) return callback(err);

            const shortages = compResults.filter(c =>
              c.total_available < (c.quantity_required - c.quantity_allocated)
            );

            if (shortages.length > 0) {
              return callback(null, {
                ready: false,
                reason: 'blocked',
                message: 'Insufficient materials',
                shortages: shortages.map(s => ({
                  item_code: s.item_code,
                  item_name: s.item_name,
                  required: s.quantity_required,
                  allocated: s.quantity_allocated,
                  available: s.total_available,
                  shortage: (s.quantity_required - s.quantity_allocated) - s.total_available
                }))
              });
            }

            callback(null, {
              ready: true,
              reason: 'ready',
              message: 'All prerequisites met'
            });
          }
        );
      }
    );
  });
};

// Auto-update parent WO status when child completes
const updateParentStatus = (childWoId, callback) => {
  db.query(
    'SELECT parent_wo_id FROM ep_work_orders WHERE wo_id = ?',
    [childWoId],
    (err, results) => {
      if (err) return callback(err);
      if (results.length === 0 || !results[0].parent_wo_id) {
        return callback(null, { updated: false });
      }

      const parentWoId = results[0].parent_wo_id;

      checkWorkOrderReady(parentWoId, (err, readyResult) => {
        if (err) return callback(err);

        if (readyResult.ready) {
          updateWorkOrderStatus(parentWoId, 'ready', (err) => {
            if (err) return callback(err);
            callback(null, { updated: true, parent_wo_id: parentWoId, new_status: 'ready' });
          });
        } else {
          callback(null, { updated: false, parent_wo_id: parentWoId });
        }
      });
    }
  );
};

// ============================================================
// Inventory Allocation (Soft Allocation)
// ============================================================

const allocateComponents = (woId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      // Get WO and components
      connection.query(
        `SELECT wo.*, woc.*,
                i.item_code, i.name as item_name
         FROM ep_work_orders wo
         JOIN ep_work_order_components woc ON wo.wo_id = woc.wo_id
         JOIN ep_items i ON woc.item_id = i.item_id
         WHERE wo.wo_id = ? AND woc.is_subassembly = 0`,
        [woId],
        async (err, components) => {
          if (err) {
            connection.rollback(() => connection.release());
            return callback(err);
          }

          if (components.length === 0) {
            connection.rollback(() => connection.release());
            return callback(null, { success: true, message: 'No components to allocate' });
          }

          const warnings = [];
          const allocations = [];

          try {
            for (const comp of components) {
              const needed = comp.quantity_required - comp.quantity_allocated;
              if (needed <= 0) continue;

              // Find best inventory (FIFO)
              const inventories = await new Promise((resolve, reject) => {
                connection.query(
                  `SELECT inv.*,
                          (inv.quantity - COALESCE(inv.reservation_qty, 0)) as available_qty
                   FROM ep_inventories inv
                   WHERE inv.item_id = ? AND (inv.quantity - COALESCE(inv.reservation_qty, 0)) > 0
                   ORDER BY inv.created_at ASC`,
                  [comp.item_id],
                  (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                  }
                );
              });

              let remaining = needed;
              let totalAllocated = 0;

              for (const inv of inventories) {
                if (remaining <= 0) break;

                const allocQty = Math.min(remaining, inv.available_qty);

                // Update inventory reservation
                await new Promise((resolve, reject) => {
                  connection.query(
                    `UPDATE ep_inventories
                     SET reservation_qty = COALESCE(reservation_qty, 0) + ?,
                         updated_at = NOW()
                     WHERE inventory_id = ?`,
                    [allocQty, inv.inventory_id],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });

                // Update component allocation
                await new Promise((resolve, reject) => {
                  connection.query(
                    `UPDATE ep_work_order_components
                     SET quantity_allocated = COALESCE(quantity_allocated, 0) + ?,
                         inventory_id = ?
                     WHERE woc_id = ?`,
                    [allocQty, inv.inventory_id, comp.woc_id],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });

                totalAllocated += allocQty;
                remaining -= allocQty;

                allocations.push({
                  item_code: comp.item_code,
                  inventory_id: inv.inventory_id,
                  batch_number: inv.batch_number,
                  allocated: allocQty
                });
              }

              // Check for shortage
              if (remaining > 0) {
                warnings.push({
                  item_code: comp.item_code,
                  item_name: comp.item_name,
                  item_id: comp.item_id,
                  needed: needed,
                  allocated: totalAllocated,
                  shortage: remaining
                });
              }
            }

            // Create PO Requests for shortages
            const createdRequests = [];
            for (const warning of warnings) {
              await new Promise((resolve, reject) => {
                PurchaseRequest.addOrUpdateRequest({
                  item_id: warning.item_id,
                  quantity_needed: warning.shortage,
                  source_type: 'work_order',
                  source_id: woId,
                  priority: 'normal',
                  notes: `Auto-generated: WO #${woId} needs ${warning.needed} of ${warning.item_code}, only ${warning.allocated} available`
                }, (err, result) => {
                  if (!err && result) {
                    createdRequests.push({
                      request_id: result.request_id,
                      item_code: warning.item_code,
                      shortage: warning.shortage
                    });
                  }
                  resolve();
                });
              });
            }

            // Check and update status
            const readyResult = await new Promise((resolve, reject) => {
              checkWorkOrderReady(woId, (err, result) => {
                if (err) reject(err);
                else resolve(result);
              });
            });

            const newStatus = readyResult.ready ? 'ready' : 'blocked';
            await new Promise((resolve, reject) => {
              connection.query(
                'UPDATE ep_work_orders SET status = ?, updated_at = NOW() WHERE wo_id = ?',
                [newStatus, woId],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });

            connection.commit((err) => {
              connection.release();
              if (err) return callback(err);

              callback(null, {
                success: true,
                status: newStatus,
                allocations,
                warnings,
                purchase_requests: createdRequests
              });
            });

          } catch (error) {
            connection.rollback(() => connection.release());
            callback(error);
          }
        }
      );
    });
  });
};

// ============================================================
// Work Order Completion (Backflushing)
// ============================================================

const completeWorkOrder = (woId, completedQuantity, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      try {
        // Get WO details
        const woResults = await new Promise((resolve, reject) => {
          connection.query(
            'SELECT * FROM ep_work_orders WHERE wo_id = ?',
            [woId],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        });

        if (woResults.length === 0) {
          throw new Error('Work Order not found');
        }

        const wo = woResults[0];

        // Get components
        const components = await new Promise((resolve, reject) => {
          connection.query(
            `SELECT woc.*, i.item_code, i.name as item_name,
                    inv.quantity as inv_quantity
             FROM ep_work_order_components woc
             LEFT JOIN ep_items i ON woc.item_id = i.item_id
             LEFT JOIN ep_inventories inv ON woc.inventory_id = inv.inventory_id
             WHERE woc.wo_id = ? AND woc.is_subassembly = 0`,
            [woId],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        });

        const shortages = [];

        // Process each component (backflush)
        for (const comp of components) {
          const usageRatio = completedQuantity / wo.quantity_ordered;
          const toConsume = comp.quantity_required * usageRatio;

          if (comp.inventory_id) {
            // Deduct from inventory
            await new Promise((resolve, reject) => {
              connection.query(
                `UPDATE ep_inventories
                 SET quantity = quantity - ?,
                     reservation_qty = GREATEST(COALESCE(reservation_qty, 0) - ?, 0),
                     updated_at = NOW()
                 WHERE inventory_id = ?`,
                [toConsume, toConsume, comp.inventory_id],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });

            // Check if went negative
            const invCheck = await new Promise((resolve, reject) => {
              connection.query(
                'SELECT quantity FROM ep_inventories WHERE inventory_id = ?',
                [comp.inventory_id],
                (err, results) => {
                  if (err) reject(err);
                  else resolve(results);
                }
              );
            });

            if (invCheck[0].quantity < 0) {
              shortages.push({
                item_id: comp.item_id,
                item_code: comp.item_code,
                item_name: comp.item_name,
                shortage: Math.abs(invCheck[0].quantity)
              });
            }

            // Create inventory transaction
            await new Promise((resolve, reject) => {
              connection.query(
                `INSERT INTO ep_inventory_transactions
                 (inventory_id, item_id, quantity, transaction_type, transaction_date, notes, created_at)
                 VALUES (?, ?, ?, 'kit_usage', NOW(), ?, NOW())`,
                [comp.inventory_id, comp.item_id, -toConsume, `Used for WO #${wo.wo_number}`],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          }

          // Update component consumed quantity
          await new Promise((resolve, reject) => {
            connection.query(
              `UPDATE ep_work_order_components
               SET quantity_consumed = COALESCE(quantity_consumed, 0) + ?,
                   quantity_allocated = GREATEST(COALESCE(quantity_allocated, 0) - ?, 0)
               WHERE woc_id = ?`,
              [toConsume, toConsume, comp.woc_id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }

        // Update WO completed quantity and status
        const newCompleted = (wo.quantity_completed || 0) + completedQuantity;
        const newStatus = newCompleted >= wo.quantity_ordered ? 'completed' : 'in_progress';

        await new Promise((resolve, reject) => {
          connection.query(
            `UPDATE ep_work_orders
             SET quantity_completed = ?,
                 status = ?,
                 actual_end_date = CASE WHEN ? = 'completed' THEN NOW() ELSE actual_end_date END,
                 updated_at = NOW()
             WHERE wo_id = ?`,
            [newCompleted, newStatus, newStatus, woId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Create output inventory if WO is completed
        let outputInventoryId = null;
        if (wo.output_item_id) {
          const outputResult = await new Promise((resolve, reject) => {
            connection.query(
              `INSERT INTO ep_inventories
               (item_id, quantity, batch_number, location, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                wo.output_item_id,
                completedQuantity,
                `WO-${wo.wo_number}-${Date.now()}`,
                'Production',
                `Produced from Work Order #${wo.wo_number}`
              ],
              (err, result) => {
                if (err) reject(err);
                else resolve(result);
              }
            );
          });

          outputInventoryId = outputResult.insertId;

          // Create production transaction
          await new Promise((resolve, reject) => {
            connection.query(
              `INSERT INTO ep_inventory_transactions
               (inventory_id, item_id, quantity, transaction_type, transaction_date, notes, created_at)
               VALUES (?, ?, ?, 'kit_production', NOW(), ?, NOW())`,
              [outputInventoryId, wo.output_item_id, completedQuantity, `Produced from WO #${wo.wo_number}`],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }

        // Create PO Requests for shortages
        const createdRequests = [];
        for (const shortage of shortages) {
          await new Promise((resolve, reject) => {
            PurchaseRequest.addOrUpdateRequest({
              item_id: shortage.item_id,
              quantity_needed: shortage.shortage,
              source_type: 'work_order',
              source_id: woId,
              priority: 'urgent',
              notes: `Auto-generated (Complete): WO #${wo.wo_number} - ${shortage.item_code} went negative by ${shortage.shortage}`
            }, (err, result) => {
              if (!err && result) {
                createdRequests.push({
                  request_id: result.request_id,
                  item_code: shortage.item_code,
                  shortage: shortage.shortage
                });
              }
              resolve();
            });
          });
        }

        connection.commit((err) => {
          if (err) {
            connection.rollback(() => connection.release());
            return callback(err);
          }
          connection.release();

          // Update parent WO status if this WO completed
          if (newStatus === 'completed' && wo.parent_wo_id) {
            updateParentStatus(woId, () => {});
          }

          callback(null, {
            success: true,
            status: newStatus,
            quantity_completed: newCompleted,
            output_inventory_id: outputInventoryId,
            warnings: shortages,
            purchase_requests: createdRequests
          });
        });

      } catch (error) {
        connection.rollback(() => connection.release());
        callback(error);
      }
    });
  });
};

// ============================================================
// Start Work Order
// ============================================================

const startWorkOrder = (woId, callback) => {
  checkWorkOrderReady(woId, (err, readyResult) => {
    if (err) return callback(err);

    if (!readyResult.ready) {
      return callback(null, {
        success: false,
        message: readyResult.message,
        reason: readyResult.reason,
        shortages: readyResult.shortages
      });
    }

    updateWorkOrderStatus(woId, 'in_progress', (err) => {
      if (err) return callback(err);
      callback(null, {
        success: true,
        status: 'in_progress',
        message: 'Work order started'
      });
    });
  });
};

// ============================================================
// Cancel Work Order
// ============================================================

const cancelWorkOrder = (woId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      try {
        // Release allocations
        const components = await new Promise((resolve, reject) => {
          connection.query(
            'SELECT * FROM ep_work_order_components WHERE wo_id = ? AND quantity_allocated > 0',
            [woId],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        });

        for (const comp of components) {
          if (comp.inventory_id && comp.quantity_allocated > 0) {
            await new Promise((resolve, reject) => {
              connection.query(
                `UPDATE ep_inventories
                 SET reservation_qty = GREATEST(COALESCE(reservation_qty, 0) - ?, 0),
                     updated_at = NOW()
                 WHERE inventory_id = ?`,
                [comp.quantity_allocated, comp.inventory_id],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          }
        }

        // Update WO status
        await new Promise((resolve, reject) => {
          connection.query(
            `UPDATE ep_work_orders SET status = 'cancelled', updated_at = NOW() WHERE wo_id = ?`,
            [woId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Cancel child WOs
        await new Promise((resolve, reject) => {
          connection.query(
            `UPDATE ep_work_orders SET status = 'cancelled', updated_at = NOW() WHERE parent_wo_id = ?`,
            [woId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        connection.commit((err) => {
          connection.release();
          if (err) return callback(err);
          callback(null, { success: true, message: 'Work order cancelled' });
        });

      } catch (error) {
        connection.rollback(() => connection.release());
        callback(error);
      }
    });
  });
};

// ============================================================
// Utility Functions
// ============================================================

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
  // Basic CRUD
  getWorkOrders,
  getWorkOrderHeader,
  getWorkOrderComponents,
  getWorkOrderFullDetails,
  getChildWorkOrders,
  addWorkOrder,
  addWorkOrderComponent,
  updateWorkOrder,
  updateWorkOrderStatus,
  updateWorkOrderComponent,
  deleteWorkOrderComponent,
  deleteWorkOrder,
  generateWONumber,

  // Tree operations
  getWorkOrderTree,
  getRootWorkOrders,

  // Create from BOM
  createFromBOM,

  // Lifecycle
  allocateComponents,
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,

  // Status
  checkWorkOrderReady,
  updateParentStatus,

  // Utility
  getInventoryForItem
};
