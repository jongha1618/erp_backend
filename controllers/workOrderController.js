const WorkOrder = require('../models/workOrderModel');

// ============================================================
// List and Read Operations
// ============================================================

// Get all work orders (flat list)
const getAllWorkOrders = (req, res) => {
  WorkOrder.getWorkOrders((err, results) => {
    if (err) {
      console.error("Error fetching work orders:", err);
      return res.status(500).json({ error: "Failed to fetch work orders" });
    }
    res.json(results);
  });
};

// Get root work orders (for tree list)
const getRootWorkOrders = (req, res) => {
  WorkOrder.getRootWorkOrders((err, results) => {
    if (err) {
      console.error("Error fetching root work orders:", err);
      return res.status(500).json({ error: "Failed to fetch root work orders" });
    }
    res.json(results);
  });
};

// Get work order tree
const getWorkOrderTree = (req, res) => {
  const { root_wo_id } = req.params;

  WorkOrder.getWorkOrderTree(root_wo_id, (err, result) => {
    if (err) {
      console.error("Error fetching work order tree:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch work order tree" });
    }
    res.json(result);
  });
};

// Get work order full details
const getWorkOrderFullDetails = (req, res) => {
  const { id } = req.params;

  WorkOrder.getWorkOrderFullDetails(id, (err, result) => {
    if (err) {
      console.error("Error fetching work order details:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch work order details" });
    }
    res.json(result);
  });
};

// Get work order components
const getWorkOrderComponents = (req, res) => {
  const { id } = req.params;

  WorkOrder.getWorkOrderComponents(id, (err, results) => {
    if (err) {
      console.error("Error fetching work order components:", err);
      return res.status(500).json({ error: "Failed to fetch work order components" });
    }
    res.json(results);
  });
};

// ============================================================
// Create Operations
// ============================================================

// Create work order manually
const createWorkOrder = (req, res) => {
  const { header, components } = req.body;

  if (!header || !header.output_item_id || !header.quantity_ordered) {
    return res.status(400).json({
      error: "Output item and quantity are required"
    });
  }

  // Generate WO number
  WorkOrder.generateWONumber((err, woNumber) => {
    if (err) {
      console.error("Error generating WO number:", err);
      return res.status(500).json({ error: "Failed to generate WO number" });
    }

    header.wo_number = woNumber;

    WorkOrder.addWorkOrder(header, (err, woId) => {
      if (err) {
        console.error("Error creating work order:", err);
        return res.status(500).json({ error: "Failed to create work order" });
      }

      // Update root_wo_id if this is a root WO
      if (!header.parent_wo_id) {
        WorkOrder.updateWorkOrder(woId, { root_wo_id: woId }, () => {});
      }

      // Add components if provided
      if (!components || components.length === 0) {
        return res.status(201).json({
          message: "Work order created successfully",
          wo_id: woId,
          wo_number: woNumber
        });
      }

      let completedCount = 0;
      let hasError = false;

      components.forEach((comp) => {
        if (hasError) return;

        WorkOrder.addWorkOrderComponent({
          wo_id: woId,
          ...comp
        }, (err) => {
          if (hasError) return;

          if (err) {
            hasError = true;
            console.error("Error adding WO component:", err);
            return res.status(500).json({ error: "Failed to add work order component" });
          }

          completedCount++;
          if (completedCount === components.length) {
            res.status(201).json({
              message: "Work order created successfully with components",
              wo_id: woId,
              wo_number: woNumber
            });
          }
        });
      });
    });
  });
};

// Create work order from BOM
const createWorkOrderFromBOM = (req, res) => {
  const { bom_id, quantity, planned_start_date, planned_end_date, priority, created_by } = req.body;

  if (!bom_id || !quantity) {
    return res.status(400).json({ error: "BOM ID and quantity are required" });
  }

  WorkOrder.createFromBOM(bom_id, quantity, {
    planned_start_date,
    planned_end_date,
    priority,
    created_by
  }, (err, result) => {
    if (err) {
      console.error("Error creating WO from BOM:", err);
      return res.status(500).json({ error: err.message || "Failed to create work order from BOM" });
    }
    res.status(201).json({
      message: "Work order created from BOM successfully",
      ...result
    });
  });
};

// ============================================================
// Update Operations
// ============================================================

// Update work order header
const updateWorkOrderHeader = (req, res) => {
  const { id } = req.params;

  WorkOrder.updateWorkOrder(id, req.body, (err, result) => {
    if (err) {
      console.error("Error updating work order:", err);
      return res.status(500).json({ error: "Failed to update work order" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Work order not found" });
    }

    res.json({ message: "Work order updated successfully" });
  });
};

// Delete work order
const deleteWorkOrder = (req, res) => {
  const { id } = req.params;

  WorkOrder.deleteWorkOrder(id, (err, result) => {
    if (err) {
      console.error("Error deleting work order:", err);
      return res.status(500).json({ error: "Failed to delete work order" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Work order not found" });
    }

    res.json({ message: "Work order deleted successfully" });
  });
};

// ============================================================
// Component Operations
// ============================================================

// Add component to work order
const addComponent = (req, res) => {
  const { id } = req.params;

  if (!req.body.item_id || !req.body.quantity_required) {
    return res.status(400).json({ error: "Item ID and quantity are required" });
  }

  WorkOrder.addWorkOrderComponent({
    wo_id: id,
    ...req.body
  }, (err, result) => {
    if (err) {
      console.error("Error adding WO component:", err);
      return res.status(500).json({ error: "Failed to add component" });
    }
    res.status(201).json({
      message: "Component added successfully",
      woc_id: result.insertId
    });
  });
};

// Update component
const updateComponent = (req, res) => {
  const { woc_id } = req.params;

  WorkOrder.updateWorkOrderComponent(woc_id, req.body, (err, result) => {
    if (err) {
      console.error("Error updating WO component:", err);
      return res.status(500).json({ error: "Failed to update component" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Component not found" });
    }

    res.json({ message: "Component updated successfully" });
  });
};

// Delete component
const deleteComponent = (req, res) => {
  const { woc_id } = req.params;

  WorkOrder.deleteWorkOrderComponent(woc_id, (err, result) => {
    if (err) {
      console.error("Error deleting WO component:", err);
      return res.status(500).json({ error: "Failed to delete component" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Component not found" });
    }

    res.json({ message: "Component deleted successfully" });
  });
};

// ============================================================
// Lifecycle Operations
// ============================================================

// Allocate components (soft allocation)
const allocateComponents = (req, res) => {
  const { id } = req.params;

  WorkOrder.allocateComponents(id, (err, result) => {
    if (err) {
      console.error("Error allocating components:", err);
      return res.status(500).json({ error: err.message || "Failed to allocate components" });
    }
    res.json(result);
  });
};

// Start work order
const startWorkOrder = (req, res) => {
  const { id } = req.params;

  WorkOrder.startWorkOrder(id, (err, result) => {
    if (err) {
      console.error("Error starting work order:", err);
      return res.status(500).json({ error: err.message || "Failed to start work order" });
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  });
};

// Complete work order
const completeWorkOrder = (req, res) => {
  const { id } = req.params;
  const { completed_quantity } = req.body;

  if (!completed_quantity || completed_quantity <= 0) {
    return res.status(400).json({ error: "Valid completed quantity is required" });
  }

  WorkOrder.completeWorkOrder(id, completed_quantity, (err, result) => {
    if (err) {
      console.error("Error completing work order:", err);
      return res.status(500).json({ error: err.message || "Failed to complete work order" });
    }
    res.json(result);
  });
};

// Cancel work order
const cancelWorkOrder = (req, res) => {
  const { id } = req.params;

  WorkOrder.cancelWorkOrder(id, (err, result) => {
    if (err) {
      console.error("Error cancelling work order:", err);
      return res.status(500).json({ error: err.message || "Failed to cancel work order" });
    }
    res.json(result);
  });
};

// ============================================================
// Status Operations
// ============================================================

// Check if work order is ready
const checkWorkOrderReady = (req, res) => {
  const { id } = req.params;

  WorkOrder.checkWorkOrderReady(id, (err, result) => {
    if (err) {
      console.error("Error checking work order status:", err);
      return res.status(500).json({ error: "Failed to check work order status" });
    }
    res.json(result);
  });
};

// ============================================================
// Utility Operations
// ============================================================

// Get inventory for item
const getInventoryForItem = (req, res) => {
  const { item_id } = req.params;

  WorkOrder.getInventoryForItem(item_id, (err, results) => {
    if (err) {
      console.error("Error fetching inventory:", err);
      return res.status(500).json({ error: "Failed to fetch inventory" });
    }
    res.json(results);
  });
};

module.exports = {
  // List and Read
  getAllWorkOrders,
  getRootWorkOrders,
  getWorkOrderTree,
  getWorkOrderFullDetails,
  getWorkOrderComponents,

  // Create
  createWorkOrder,
  createWorkOrderFromBOM,

  // Update
  updateWorkOrderHeader,
  deleteWorkOrder,

  // Components
  addComponent,
  updateComponent,
  deleteComponent,

  // Lifecycle
  allocateComponents,
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,

  // Status
  checkWorkOrderReady,

  // Utility
  getInventoryForItem
};
