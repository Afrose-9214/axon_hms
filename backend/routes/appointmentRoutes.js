const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const verifyTokenAndRole = require('../middleware/auth'); 

// 🌟 UPDATED: Allow NURSE and RECEPTIONIST to book appointments
router.post('/', verifyTokenAndRole(['NURSE', 'RECEPTIONIST', 'CASHIER']), async (req, res) => {
    try {
        const { patientName, patientId, age, gender, reason, vitals } = req.body;

        const newAppointment = new Appointment({
            patientName,
            patientId,
            age,
            gender,
            reason,
            vitals, // BP, Pulse, SpO2, RBS, Temp
            status: 'WAITING'
        });

        const savedAppointment = await newAppointment.save();
        res.status(201).json(savedAppointment);
    } catch (error) {
        console.error("Booking Error:", error);
        res.status(400).json({ message: "Failed to save appointment", error: error.message });
    }
});

// 🌟 UPDATED: Allow Nurse to also view the queue if needed
router.get('/today', verifyTokenAndRole(['DOCTOR', 'NURSE', 'CASHIER', 'RECEPTIONIST']), async (req, res) => {
    try {
        const queue = await Appointment.find({ status: 'WAITING' }).sort({ date: 1 });
        res.json(queue);
    } catch (error) {
        res.status(500).json({ message: "Error fetching queue" });
    }
});

module.exports = router;