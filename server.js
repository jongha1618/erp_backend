const express = require('express');
const corsMiddleware = require('./middleware/corsMiddleware');

const customerRoutes = require('./routes/customerRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const itemRoutes = require('./routes/itemRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const inventorytransactionRoutes = require('./routes/inventorytransactionRoutes');
const salesRoutes = require('./routes/salesRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const purchaseRequestRoutes = require('./routes/purchaseRequestRoutes');
const kitItemRoutes = require('./routes/kitItemRoutes');
const companyRoutes = require('./routes/companyRoutes');
// const itemDetailsRoutes = require('./routes/itemDetailsRoutes');

const app = express();
const PORT = 5000;

app.use(corsMiddleware);
app.use(express.json());

// Modularized route usage
app.use('/customers', customerRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/items', itemRoutes);
app.use('/inventories', inventoryRoutes);
app.use('/inventorytransactions', inventorytransactionRoutes);
app.use('/sales', salesRoutes);
app.use('/purchase-orders', purchaseOrderRoutes);
app.use('/purchase-requests', purchaseRequestRoutes);
app.use('/kit-items', kitItemRoutes);
app.use('/company', companyRoutes);
// app.use('/item_details', itemDetailsRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
