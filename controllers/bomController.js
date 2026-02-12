const BOM = require('../models/bomModel');

// Get all BOMs
const getAllBOMs = (req, res) => {
  BOM.getBOMs((err, results) => {
    if (err) {
      console.error("Error fetching BOMs:", err);
      return res.status(500).json({ error: "Failed to fetch BOMs" });
    }
    res.json(results);
  });
};

// Get BOM full details
const getBOMFullDetails = (req, res) => {
  const { id } = req.params;

  BOM.getBOMFullDetails(id, (err, result) => {
    if (err) {
      console.error("Error fetching BOM details:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch BOM details" });
    }
    res.json(result);
  });
};

// Get BOM components only
const getBOMComponents = (req, res) => {
  const { id } = req.params;

  BOM.getBOMComponents(id, (err, results) => {
    if (err) {
      console.error("Error fetching BOM components:", err);
      return res.status(500).json({ error: "Failed to fetch BOM components" });
    }
    res.json(results);
  });
};

// Create new BOM (header + components)
const createBOM = (req, res) => {
  const { header, components } = req.body;

  if (!header || !header.bom_number || !header.name || !header.output_item_id) {
    return res.status(400).json({
      error: "BOM number, name, and output item are required"
    });
  }

  // Validate that no component uses the same item as the output item
  if (components && components.length > 0) {
    const selfRef = components.find(c => String(c.item_id) === String(header.output_item_id));
    if (selfRef) {
      return res.status(400).json({
        error: "A component item cannot be the same as the output item"
      });
    }
  }

  // Create header first
  BOM.addBOM(header, (err, bomId) => {
    if (err) {
      console.error("Error creating BOM:", err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: "BOM number already exists" });
      }
      return res.status(500).json({ error: "Failed to create BOM" });
    }

    // If no components, return success
    if (!components || components.length === 0) {
      return res.status(201).json({
        message: "BOM created successfully",
        bom_id: bomId
      });
    }

    // Add components
    let completedCount = 0;
    let hasError = false;

    components.forEach((comp) => {
      if (hasError) return;

      BOM.addBOMComponent({
        bom_id: bomId,
        ...comp
      }, (err) => {
        if (hasError) return;

        if (err) {
          hasError = true;
          console.error("Error adding BOM component:", err);
          return res.status(500).json({ error: "Failed to add BOM component" });
        }

        completedCount++;
        if (completedCount === components.length) {
          res.status(201).json({
            message: "BOM created successfully with components",
            bom_id: bomId
          });
        }
      });
    });
  });
};

// Update BOM header
const updateBOMHeader = (req, res) => {
  const { id } = req.params;

  BOM.updateBOM(id, req.body, (err, result) => {
    if (err) {
      console.error("Error updating BOM:", err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: "BOM number already exists" });
      }
      return res.status(500).json({ error: "Failed to update BOM" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "BOM not found" });
    }

    res.json({ message: "BOM updated successfully" });
  });
};

// Delete BOM
const deleteBOM = (req, res) => {
  const { id } = req.params;

  BOM.deleteBOM(id, (err, result) => {
    if (err) {
      console.error("Error deleting BOM:", err);
      return res.status(500).json({ error: "Failed to delete BOM" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "BOM not found" });
    }

    res.json({ message: "BOM deleted successfully" });
  });
};

// Add component to BOM
const addComponentToBOM = (req, res) => {
  const { id } = req.params;
  const componentData = {
    bom_id: id,
    ...req.body
  };

  if (!req.body.item_id) {
    return res.status(400).json({ error: "Item ID is required" });
  }

  // Check that component item is not the same as the output item
  BOM.getBOMHeader(id, (err, headerResults) => {
    if (err) {
      console.error("Error fetching BOM header:", err);
      return res.status(500).json({ error: "Failed to verify BOM" });
    }
    if (headerResults.length > 0 && String(req.body.item_id) === String(headerResults[0].output_item_id)) {
      return res.status(400).json({ error: "A component item cannot be the same as the output item" });
    }

    BOM.addBOMComponent(componentData, (err, result) => {
      if (err) {
        console.error("Error adding BOM component:", err);
        return res.status(500).json({ error: "Failed to add component" });
      }
      res.status(201).json({
        message: "Component added successfully",
        component_id: result.insertId
      });
    });
  });
};

// Update BOM component
const updateBOMComponent = (req, res) => {
  const { component_id } = req.params;

  BOM.updateBOMComponent(component_id, req.body, (err, result) => {
    if (err) {
      console.error("Error updating BOM component:", err);
      return res.status(500).json({ error: "Failed to update component" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Component not found" });
    }

    res.json({ message: "Component updated successfully" });
  });
};

// Delete BOM component
const deleteBOMComponent = (req, res) => {
  const { component_id } = req.params;

  BOM.deleteBOMComponent(component_id, (err, result) => {
    if (err) {
      console.error("Error deleting BOM component:", err);
      return res.status(500).json({ error: "Failed to delete component" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Component not found" });
    }

    res.json({ message: "Component deleted successfully" });
  });
};

// Get BOMs by output item
const getBOMsByOutputItem = (req, res) => {
  const { item_id } = req.params;

  BOM.getBOMsByOutputItem(item_id, (err, results) => {
    if (err) {
      console.error("Error fetching BOMs by output item:", err);
      return res.status(500).json({ error: "Failed to fetch BOMs" });
    }
    res.json(results);
  });
};

// Get active BOMs (for dropdown)
const getActiveBOMs = (req, res) => {
  BOM.getActiveBOMs((err, results) => {
    if (err) {
      console.error("Error fetching active BOMs:", err);
      return res.status(500).json({ error: "Failed to fetch active BOMs" });
    }
    res.json(results);
  });
};

// Check if item has BOM
const checkItemHasBOM = (req, res) => {
  const { item_id } = req.params;

  BOM.checkItemHasBOM(item_id, (err, results) => {
    if (err) {
      console.error("Error checking item BOM:", err);
      return res.status(500).json({ error: "Failed to check item BOM" });
    }
    res.json({
      has_bom: results.length > 0,
      bom: results.length > 0 ? results[0] : null
    });
  });
};

module.exports = {
  getAllBOMs,
  getBOMFullDetails,
  getBOMComponents,
  createBOM,
  updateBOMHeader,
  deleteBOM,
  addComponentToBOM,
  updateBOMComponent,
  deleteBOMComponent,
  getBOMsByOutputItem,
  getActiveBOMs,
  checkItemHasBOM
};
