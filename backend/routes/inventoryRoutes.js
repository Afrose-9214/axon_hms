const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const verifyTokenAndRole = require('../middleware/auth');

// GET: Fetch all inventory items
router.get('/', verifyTokenAndRole(['CASHIER', 'DOCTOR']), async (req, res) => {
    try {
        const items = await Inventory.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: "Error fetching inventory" });
    }
});

// POST: Add new medicine (Optional, for testing)
router.post('/add', verifyTokenAndRole(['CASHIER']), async (req, res) => {
    try {
        const newItem = new Inventory(req.body);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(400).json({ message: "Error adding item" });
    }
});

module.exports = router;