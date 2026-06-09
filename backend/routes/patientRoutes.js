const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const verifyTokenAndRole = require('../middleware/auth');

// 1. Search Patient by ID (For Cashier Lookup)
// FIXED: Now allows the Doctor to search for E.H.R records
router.get('/search', verifyTokenAndRole(['CASHIER', 'ADMIN', 'DOCTOR']), async (req, res) => {
    try {
        // We use 'q' for a general query instead of just 'id'
        const query = req.query.q; 
        if (!query) return res.status(400).json({ message: "Search query required" });

        // Search using $or to check multiple fields, and $regex for partial, case-insensitive matches
        const patients = await Patient.find({
            $or: [
                { patientId: { $regex: query, $options: 'i' } },
                { patientName: { $regex: query, $options: 'i' } },
                { mobile: { $regex: query, $options: 'i' } }
            ]
        }).limit(10); // Limit to top 10 results so the UI doesn't get overwhelmed

        res.json(patients); // Note: This now returns an ARRAY of patients, not just one!
    } catch (err) {
        res.status(500).json(err);
    }
});

// 2. Register New Patient (Used by Cashier for first-time visitors)
// backend/routes/patientRoutes.js

// backend/routes/patientRoutes.js

router.post('/register', verifyTokenAndRole(['CASHIER']), async (req, res) => {
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