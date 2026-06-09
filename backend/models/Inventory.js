// models/Inventory.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    batchNumber: { type: String, required: true },
    expiryDate: { type: String, required: true }, // e.g., "06/30"
    hsnCode: { type: String, required: true },
    gstPercent: { type: Number, required: true }, // e.g., 5, 12, 18
    mrpPerUnit: { type: Number, required: true },
    salePricePerUnit: { type: Number, required: true }, // Sometimes same as MRP, or discounted
    stockQuantity: { type: Number, required: true, default: 0 }
});

module.exports = mongoose.model('Inventory', inventorySchema);