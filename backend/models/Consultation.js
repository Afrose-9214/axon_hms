const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
    appointmentId: String,
    patientId: String,
    patientName: String,
    diagnosis: String,
    advice: String,
    followUpDate: String,
    consultationFee: { type: Number, default: 500 },
    status: { type: String, default: 'PENDING_PAYMENT' }, // or PAID
    paymentMethod: String,

    // ADD THIS NEW VITALS OBJECT:
    vitals: {
        bp: String, pulse: String, spo2: String, temp: String, rbs: String, weight: String
    },
    
    // THIS IS THE CRITICAL PART:
    medicines: [{ 
        name: String, 
        qty: Number, 
        dosage: String,
        price: Number,
        hsnCode: String,
        gstPercent: Number,
        batchNumber: String,
        expiryDate: String 
    }]
}, { timestamps: true });

module.exports = mongoose.model('Consultation', consultationSchema);