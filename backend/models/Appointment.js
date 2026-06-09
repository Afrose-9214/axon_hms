const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    patientId: { type: String, required: true },
    age: Number,
    gender: String,
    mobile: String,
    reason: String,
    // UPDATED: Added vitals object to store clinical data from reception
    vitals: {
        bp: String,
        pulse: String,
        spo2: String,
        rbs: String,
        temp: String,
        weight: String // Added
    },
    status: { type: String, default: 'WAITING' },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);