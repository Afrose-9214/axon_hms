const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const verifyTokenAndRole = require('../middleware/auth');

// 1. Search Patient by ID (For Cashier Lookup)
// FIXED: Now allows the Doctor to search for E.H.R records
router.get('/search', verifyTokenAndRole(['CASHIER', 'PHARMACY', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']), async (req, res) => {
    try {
        const query = req.query.q; 
        if (!query) return res.status(400).json({ message: "Search query required" });

        // 🌟 NEW: Split the search query into separate words (e.g., ["James", "AX042"])
        const searchTerms = query.split(' ').filter(term => term.trim() !== '');

        // 🌟 NEW: Create a rule that says "Every word they typed must match AT LEAST ONE of these fields"
        const searchConditions = searchTerms.map(term => ({
            $or: [
                { patientId: { $regex: term, $options: 'i' } },
                { patientName: { $regex: term, $options: 'i' } },
                { mobile: { $regex: term, $options: 'i' } }
            ]
        }));

        // Use $and to ensure all words typed in the box are found in the patient's record
        const patients = await Patient.find({
            $and: searchConditions
        }).limit(10); 

        res.json(patients); 
    } catch (err) {
        console.error("Search API Error:", err);
        res.status(500).json(err);
    }
});

// 2. Register New Patient (Used by Cashier for first-time visitors)
// backend/routes/patientRoutes.js

// backend/routes/patientRoutes.js

router.post('/register', verifyTokenAndRole(['CASHIER', 'PHARMACY', 'NURSE', 'RECEPTIONIST', 'ADMIN']), async (req, res) => {
    try {
        const { patientName, age, gender, mobile } = req.body;

        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // "04"
        const year = String(now.getFullYear()).slice(-2);          // "26"
        
        // Sequence logic: AX + Month + Year + TotalCount
        const count = await Patient.countDocuments();
        const sequence = String(count + 1).padStart(3, '0'); // "001"

        const generatedId = `AX${month}${year}${sequence}`; // Results in AX0426001

        const newPatient = new Patient({
            patientId: generatedId,
            patientName,
            age,
            gender,
            mobile
        });

        await newPatient.save();
        res.status(201).json(newPatient);
    } catch (error) {
        res.status(400).json({ message: "Registration failed", error: error.message });
    }
});

module.exports = router;