const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. IMPORT ALL ROUTES
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

// --- ADD THESE ROUTE CONNECTIONS ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/doctor', require('./routes/doctorRoutes'));
app.use('/api/cashier', require('./routes/cashierRoutes'));
app.use('/api/pos', require('./routes/posRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/consultations', require('./routes/consultationRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes')); // This maps the URL to the file

// -----------------------------------

const Inventory = require('./models/Inventory');
const seedInventory = async () => {
    const count = await Inventory.countDocuments();
    if (count === 0) {
        await Inventory.insertMany([
            { name: "Dolo 650", stock: 50, price: 30, category: "Tablet" },
            { name: "Paracetamol", stock: 5, price: 15, category: "Tablet" },
            { name: "Amoxicillin", stock: 100, price: 120, category: "Capsule" }
        ]);
        console.log("Inventory Seeded!");
    }
};
seedInventory();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.log('❌ MongoDB Connection Error: ', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));