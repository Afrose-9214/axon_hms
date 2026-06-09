const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Secret route to create test users easily
router.post('/seed', async (req, res) => {
    try {
        const hashedPwd = await bcrypt.hash('password123', 10);
        await User.create([
            { name: "Dr. Smith", email: "doctor@hms.com", password: hashedPwd, role: "DOCTOR" },
            { name: "Cashier Jane", email: "cashier@hms.com", password: hashedPwd, role: "CASHIER" }
        ]);
        res.json({ message: "Test users created successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Users might already exist" });
    }
});

// Real Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Create the JWT Badge
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ token, role: user.role, name: user.name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;