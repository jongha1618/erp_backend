const KitItem = require('../models/kitItemModel');

// Get all kit items
const getAllKitItems = (req, res) => {
  KitItem.getKitItems((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

// Get kit item full details (header + components)
const getKitItemFullDetails = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Kit Item ID is required" });

  KitItem.getKitItemHeader(id, (err, headerResults) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (headerResults.length === 0) {
      return res.status(404).json({ error: "Kit Item not found" });
    }

    KitItem.getKitItemComponents(id, (err, componentResults) => {
      if (err) return res.status(500).json({ error: "Database error" });

      res.json({
        header: headerResults[0],
        components: componentResults
      });
    });
  });
};

// Create kit item (header + components)
const createKitItem = (req, res) => {
  const { header, components } = req.body;

  if (!header) {
    return res.status(400).json({ error: "Header is required" });
  }

  KitItem.addKitItem(header, (err, kitItemId) => {
    if (err) {
      console.error("Create kit item error:", err);
      return res.status(500).json({ error: "Failed to create kit item" });
    }

    if (!components || components.length === 0) {
      return res.status(201).json({
        message: "Kit item created successfully",
        kit_item_id: kitItemId
      });
    }

    let completedCount = 0;
    let hasError = false;

    components.forEach((component) => {
      const componentData = {
        kit_item_id: kitItemId,
        ...component
      };

      KitItem.addKitItemComponent(componentData, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error("Add component error:", err);
          return res.status(500).json({ error: "Failed to add kit components" });
        }

        completedCount++;

        if (completedCount === components.length && !hasError) {
          res.status(201).json({
            message: "Kit item created successfully",
            kit_item_id: kitItemId
          });
        }
      });
    });
  });
};

// Update kit item header
const updateKitItemHeader = (req, res) => {
  const { id } = req.params;

  if (!id || id === 'undefined') {
    return res.status(400).json({ error: "Valid Kit Item ID is required" });
  }

  KitItem.updateKitItem(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Kit item updated successfully" });
  });
};

// Update kit item status
const updateKitItemStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  KitItem.updateKitItemStatus(id, status, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Kit item status updated successfully" });
  });
};

// Update kit item component
const updateKitItemComponentItem = (req, res) => {
  const { component_id } = req.params;

  KitItem.updateKitItemComponent(component_id, req.body, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Component updated successfully" });
  });
};

// Add component to existing kit item
const addComponentToKitItem = (req, res) => {
  const { id } = req.params;
  const componentData = {
    kit_item_id: id,
    ...req.body
  };

  KitItem.addKitItemComponent(componentData, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to add component" });
    }
    res.status(201).json({
      message: "Component added successfully",
      component_id: result.insertId
    });
  });
};

// Delete kit item component
const deleteKitItemComponentItem = (req, res) => {
  const { component_id } = req.params;

  KitItem.deleteKitItemComponent(component_id, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Component deleted successfully" });
  });
};

// Delete entire kit item
const deleteKitItem = (req, res) => {
  const { id } = req.params;

  KitItem.deleteKitItem(id, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Kit item deleted successfully" });
  });
};

// Reserve components for kit building
const reserveComponents = (req, res) => {
  const { id } = req.params;

  KitItem.reserveComponents(id, (err, result) => {
    if (err) {
      console.error("Reserve components error:", err);
      return res.status(500).json({ error: err.message || "Failed to reserve components" });
    }
    res.json(result);
  });
};

// Complete kit build
const completeKitBuild = (req, res) => {
  const { id } = req.params;
  const { build_quantity } = req.body;

  if (!build_quantity || build_quantity <= 0) {
    return res.status(400).json({ error: "Build quantity is required" });
  }

  KitItem.completeKitBuild(id, build_quantity, (err, result) => {
    if (err) {
      console.error("Complete kit build error:", err);
      return res.status(500).json({ error: err.message || "Failed to complete kit build" });
    }
    res.json(result);
  });
};

// Get available inventory for item
const getInventoryForItem = (req, res) => {
  const { item_id } = req.params;

  KitItem.getInventoryForItem(item_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};

module.exports = {
  getAllKitItems,
  getKitItemFullDetails,
  createKitItem,
  updateKitItemHeader,
  updateKitItemStatus,
  updateKitItemComponentItem,
  addComponentToKitItem,
  deleteKitItemComponentItem,
  deleteKitItem,
  reserveComponents,
  completeKitBuild,
  getInventoryForItem
};
