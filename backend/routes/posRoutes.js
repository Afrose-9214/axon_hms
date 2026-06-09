const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const verifyTokenAndRole = require('../middleware/auth');

// POST to process a payment (Split or Full)
router.post('/process-payment', verifyTokenAndRole(['CASHIER']), async (req, res) => {
    try {
        const { billId, amount, method } = req.body;
        
        // Find the active bill
        const bill = await Billing.findById(billId);
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        if (bill.remainingBalance <= 0) return res.status(400).json({ message: "Bill is already fully paid." });

        // --- AXON POS HARDWARE TRIGGER SIMULATION ---
        // If method is UPI or CARD, this is where you would make an axios call 
        // to the Axon hardware API to light up the terminal screen.
        console.log(`[AXON POS] Triggering ${method} terminal for ₹${amount}...`);
        // --------------------------------------------
// 🛡️ CRASH-PROOF FIX 1: If the array doesn't exist, create it!
        if (!bill.payments) {
            bill.payments = [];
        }

        // Record the payment
        bill.payments.push({
            method: method,
            amount: Number(amount),
            transactionId: `TXN_${Math.floor(Math.random() * 100000000)}` 
        });

        // 🛡️ CRASH-PROOF FIX 2: If remainingBalance is missing or broken (NaN), reset it to the Grand Total!
        if (typeof bill.remainingBalance === 'undefined' || isNaN(bill.remainingBalance)) {
            bill.remainingBalance = bill.grandTotal || bill.totalAmount;
        }

        // Deduct from balance
        bill.remainingBalance -= Number(amount);

        // Check if fully paid
        if (bill.remainingBalance <= 0) {
            bill.status = 'PAID';
            bill.remainingBalance = 0; // Prevent negative numbers
        } else {
            bill.status = 'PARTIAL';
        }

        await bill.save();

        res.json({ 
            success: true, 
            message: `${method} Payment of ₹${amount} successful!`,
            updatedBill: bill 
        });

    } catch (error) {
        // ADD THIS CONSOLE.LOG SO WE CAN SEE THE EXACT CRASH REASON
        console.error("POS PAYMENT CRASH:", error); 
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;