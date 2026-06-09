const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    patientId: { type: String, required: true }, // Unique ID like AX-102
    date: { type: Date, default: Date.now },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorName: String, // For the signature/footer
    
    // Patient Vitals
    vitals: {
        spo2: String,
        bp: String,
        temp: String,
        rbs: String,
        weight: String,
        height: String
    },
    
    diagnosis: String,
    medicines: [{
        name: String,
        quantity: Number,
        dosage: String // Added: e.g., "1-0-1" or "After Food"
    }],
    consultationFee: { type: Number, default: 500 },
    status: { type: String, enum: ['PENDING', 'DISPENSED'], default: 'PENDING' }
});

module.exports = mongoose.model('Prescription', prescriptionSchema);