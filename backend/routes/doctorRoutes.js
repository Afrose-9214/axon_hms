const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const Inventory = require('../models/Inventory');
const verifyTokenAndRole = require('../middleware/auth');

// POST a new prescription (With Vitals, Diagnosis, and Auto-ID)
router.post('/prescribe', verifyTokenAndRole(['DOCTOR']), async (req, res) => {
    try {
        const { 
            patientName, 
            notes, 
            medicines, 
            consultationFee, 
            vitals, 
            diagnosis, 
            doctorName 
        } = req.body;

        // --- 1. GENERATE SEQUENTIAL PATIENT ID (AXMMYY001) ---
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // e.g., "04"
        const year = String(now.getFullYear()).slice(-2); // e.g., "26"
        const prefix = `AX${month}${year}`; // Result: "AX0426"

        // Count how many patients already exist with this month's prefix
        const count = await Prescription.countDocuments({
            patientId: { $regex: new RegExp(`^${prefix}`) }
        });

        // Create the new ID (e.g., AX0426001, AX0426002...)
        const generatedPatientId = `${prefix}${String(count + 1).padStart(3, '0')}`;

        // --- 2. SECURE STOCK VALIDATION ---
        for (let med of medicines) {
            const inventoryItem = await Inventory.findOne({ 
                itemName: med.name.trim().toUpperCase() 
            });
            
            if (!inventoryItem) {
                return res.status(400).json({ 
                    message: `Error: ${med.name} is not found in the Pharmacy Inventory.` 
                });
            }

            if (inventoryItem.stockQuantity <= 0) {
                return res.status(400).json({ 
                    message: `⛔ STOP: ${inventoryItem.itemName} is Out of Stock.` 
                });
            }

            if (inventoryItem.stockQuantity < med.quantity) {
                return res.status(400).json({ 
                    message: `⚠️ Only ${inventoryItem.stockQuantity} units of ${inventoryItem.itemName} left. You requested ${med.quantity}.` 
                });
            }
        }

        // --- 3. SAVE THE FULL CLINICAL PRESCRIPTION ---
        const newPrescription = new Prescription({
            patientName,
            patientId: generatedPatientId, // Use our generated ID
            doctorId: req.user.id,
            doctorName, // Used for the signature footer
            notes,
            vitals, // Stores Spo2, BP, Temp, etc.
            diagnosis,
            medicines,
            consultationFee
        });

        await newPrescription.save();

        // Return the generated ID so the Frontend can print it on the PDF
        res.status(201).json({ 
            success: true, 
            message: "Prescription synced to Pharmacy!",
            generatedId: generatedPatientId 
        });
        
    } catch (error) {
        console.error("PRESCRIPTION CRASH:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- ADD THIS ROUTE ---
// GET all prescriptions for the Doctor Dashboard (Records & Analytics)
router.get('/records', verifyTokenAndRole(['DOCTOR']), async (req, res) => {
    try {
        // Fetch all prescriptions, sorted by newest first
        const records = await Prescription.find().sort({ date: -1 });
        res.json(records);
    } catch (error) {
        console.error("Fetch Records Error:", error);
        res.status(500).json({ message: "Failed to fetch medical records" });
    }
});

module.exports = router;