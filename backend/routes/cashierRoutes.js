const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const Billing = require('../models/Billing');
const Inventory = require('../models/Inventory');
const verifyTokenAndRole = require('../middleware/auth');

// GET all pending prescriptions for the pharmacy screen
router.get('/pending', verifyTokenAndRole(['CASHIER']), async (req, res) => {
    try {
        // ADDED .limit(50) TO PREVENT RAM CRASHES
        const pending = await Prescription.find({ status: 'PENDING' })
            .populate('doctorId', 'name')
            .sort({ createdAt: -1 }) // Gets the newest ones first
            .limit(50); // Hard limit to protect AWS memory
            
        res.json(pending);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST to generate the CMC-style itemized bill
router.post('/generate-bill', verifyTokenAndRole(['CASHIER']), async (req, res) => {
    try {
        const { prescriptionId } = req.body;
        // Populate the patient info if it exists
        const prescription = await Prescription.findById(prescriptionId);
        
        if (!prescription) return res.status(404).json({ message: "Prescription not found" });

        let itemizedMedicines = [];
        let totalTaxableValue = 0;
        let totalTaxAmount = 0;
        let rawGrandTotal = 0;

        for (let med of prescription.medicines) {
            // Pull the exact item from inventory to get Batch, HSN, and GST
            const item = await Inventory.findOne({ itemName: med.name });
            
            if (item) {
                // Formatting the long item name string just like the receipt
                const displayString = `${item.itemName} [BNO:${item.batchNumber}] [EXPDT:${item.expiryDate}]`;
                
                // Calculations per line item
                const qty = med.quantity;
                const totalMrp = item.mrpPerUnit * qty;
                
                // Assuming salePricePerUnit includes GST. Reverse-calculate taxable value:
                const saleAmount = item.salePricePerUnit * qty;
                const taxableValue = saleAmount / (1 + (item.gstPercent / 100));
                const taxAmount = saleAmount - taxableValue;

                totalTaxableValue += taxableValue;
                totalTaxAmount += taxAmount;
                rawGrandTotal += saleAmount;

                // Deduct from inventory sync
                item.stockQuantity -= qty;
                await item.save();

                itemizedMedicines.push({
                    displayString,
                    hsnCode: item.hsnCode,
                    gstPercent: item.gstPercent,
                    taxableValue: parseFloat(taxableValue.toFixed(2)),
                    qty: qty,
                    taxAmount: parseFloat(taxAmount.toFixed(2)),
                    totalMrp: parseFloat(totalMrp.toFixed(2)),
                    saleAmount: parseFloat(saleAmount.toFixed(2))
                });
            } else {
                // Fallback if the medicine is not found in the Inventory database yet
                itemizedMedicines.push({
                    displayString: `${med.name} (Not in Inventory)`,
                    hsnCode: "0000",
                    gstPercent: 0,
                    taxableValue: 0,
                    qty: med.quantity,
                    taxAmount: 0,
                    totalMrp: 0,
                    saleAmount: 0
                });
            }
        }

        // Add Doctor's Consultation Fee to the grand total
        rawGrandTotal += prescription.consultationFee;

        // Rounding logic 
        const grandTotal = Math.round(rawGrandTotal);
        const roundOff = parseFloat((grandTotal - rawGrandTotal).toFixed(2));
        
        // Split total tax into CGST and SGST (50/50 split)
        const halfTax = parseFloat((totalTaxAmount / 2).toFixed(2));

        const newBill = new Billing({
            prescriptionId: prescription._id,
            patientName: prescription.patientName,
            age: 25, // Fallback age
            gender: "M", // Fallback gender
            itemizedMedicines,
            totalTaxableValue: parseFloat(totalTaxableValue.toFixed(2)),
            totalCgst: halfTax,
            totalSgst: halfTax,
            roundOff,
            grandTotal,
            remainingBalance: grandTotal, // <-- ADD THIS
            payments: []                  // <-- ADD THIS
        });

        await newBill.save();
        prescription.status = 'DISPENSED';
        await prescription.save();

        res.json({ success: true, billData: newBill });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;