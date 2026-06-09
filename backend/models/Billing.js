const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    patientName: String,
    age: Number,
    gender: String,
    
    // The CMC-style line items
    itemizedMedicines: [{
        displayString: String,
        hsnCode: String,
        gstPercent: Number,
        taxableValue: Number,
        qty: Number,
        taxAmount: Number,
        totalMrp: Number,
        saleAmount: Number
    }],
    
    // Footer Calculations
    totalTaxableValue: Number,
    totalCgst: Number,
    totalSgst: Number,
    roundOff: Number,
    grandTotal: Number, 
    
    // --- THE MISSING POS FIELDS ADDED BACK ---
    remainingBalance: Number,
    payments: [{
        method: { type: String, enum: ['CASH', 'CARD', 'UPI'] },
        amount: Number,
        transactionId: String,
        date: { type: Date, default: Date.now }
    }],
    // -----------------------------------------

    status: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' }
});

module.exports = mongoose.model('Billing', billingSchema);