const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    patientId: { type: String, required: true, unique: true },
    patientName: { type: String, required: true },
    age: Number,
    gender: String,
    mobile: String,
    mobile: String,
    address: String, // Added
    email: String,   // Added
    // Ensure timestamps are enabled or createdAt is defined
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', patientSchema);