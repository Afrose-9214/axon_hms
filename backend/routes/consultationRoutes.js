const express = require('express');
const router = express.Router();
const Consultation = require('../models/Consultation');
const Inventory = require('../models/Inventory'); // Add this at the top of the file
const Appointment = require('../models/Appointment');
const verifyTokenAndRole = require('../middleware/auth');

// GET: Fetch pending bills for Cashier
router.get('/pending', verifyTokenAndRole(['CASHIER', 'ADMIN']), async (req, res) => {
    try {
        const pending = await Consultation.find({ status: 'PENDING_PAYMENT' });
        res.json(pending);
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

// POST: Save from Doctor
router.post('/complete', verifyTokenAndRole(['DOCTOR']), async (req, res) => {
    try {
        const newConsult = new Consultation({ ...req.body, status: 'PENDING_PAYMENT' });
        await newConsult.save();
        await Appointment.findByIdAndUpdate(req.body.appointmentId, { status: 'COMPLETED' });
        res.status(201).json({ message: "Sent to Billing" });
    } catch (err) { res.status(400).json(err); }
});


// PATCH: Mark as Paid and Deduct Inventory
router.patch('/:id', verifyTokenAndRole(['CASHIER', 'ADMIN']), async (req, res) => {
    try {
        const { status, paymentMethod, consultationFee } = req.body;
        
        // 1. Find the consultation
        const consultation = await Consultation.findById(req.params.id);
        if (!consultation) return res.status(404).json({ message: "Bill not found" });

        // 2. If transitioning to PAID, deduct the stock
        if (status === 'PAID' && consultation.status !== 'PAID') {
            for (let med of consultation.medicines) {
                await Inventory.findOneAndUpdate(
                    { itemName: new RegExp('^' + med.name + '$', 'i') }, 
                    { $inc: { stockQuantity: -med.qty } }                
                );
            }
        }

        // 3. 🚨 THE FIX: Actually update the bill and SAVE it to the database
        consultation.status = status || consultation.status;
        consultation.paymentMethod = paymentMethod || consultation.paymentMethod;
        if (consultationFee) {
            consultation.consultationFee = consultationFee;
        }
        await consultation.save();

        // 4. 🚨 THE FIX: Tell the frontend the job is done so the modal can close!
        res.json({ message: "Payment processed successfully!", consultation });

    } catch (err) {
        console.error("Backend Error:", err);
        res.status(500).json({ message: "Server error during payment processing." });
    }
});

// GET: Fetch entire medical history for a specific patient
router.get('/history/:patientId', verifyTokenAndRole(['DOCTOR', 'ADMIN', 'CASHIER', 'NURSE', 'RECEPTIONIST']), async (req, res) => {
    try {
        // Find all consultations for this ID and sort by newest first (-1)
        const history = await Consultation.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: "Error fetching patient history" });
    }
});

module.exports = router;    