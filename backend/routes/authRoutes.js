const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// --- REAL USER CREATION ROUTE ---
// ⚠️ Leave this unprotected for now so you can create your first Admin & Nurse.
// Later, we will add: verifyTokenAndRole(['ADMIN'])
router.post('/create', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        // 1. Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        // 2. Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create the user
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role.toUpperCase() // Forces roles like 'NURSE' to be uppercase
        });

        res.status(201).json({ 
            message: "User created successfully", 
            user: { id: newUser._id, name: newUser.name, role: newUser.role } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REAL LOGIN ROUTE ---
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