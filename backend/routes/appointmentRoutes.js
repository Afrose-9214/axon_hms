const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const verifyTokenAndRole = require('../middleware/auth'); // Adjust path if needed

// Handles POST /api/appointments
router.post('/', verifyTokenAndRole(['CASHIER']), async (req, res) => {
    try {
        const { patientName, patientId, age, gender, reason, vitals } = req.body;

        const newAppointment = new Appointment({
            patientName,
            patientId,
            age,
            gender,
            reason,
            vitals, // Saving the BP, Pulse, SpO2, RBS, Temp
            status: 'WAITING'
        });

        const savedAppointment = await newAppointment.save();
        res.status(201).json(savedAppointment);
    } catch (error) {
        console.error("Booking Error:", error);
        res.status(400).json({ message: "Failed to save appointment", error: error.message });
    }
});

// GET route for the Doctor Dashboard to fetch the queue
router.get('/today', verifyTokenAndRole(['DOCTOR', 'CASHIER']), async (req, res) => {
    try {
        const queue = await Appointment.find({ status: 'WAITING' }).sort({ date: 1 });
        res.json(queue);
    } catch (error) {
        res.status(500).json({ message: "Error fetching queue" });
    }
});

module.exports = router;