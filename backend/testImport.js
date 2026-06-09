// backend/testImport.js
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const mongoose = require('mongoose');

// --- 1. MONGODB MODELS ---
const PatientSchema = new mongoose.Schema({
    patientId: String,
    patientName: String,
    age: Number,
    gender: String,
    mobile: String,
    address: String,
    email: String
});
const Patient = mongoose.model('Patient', PatientSchema);

const ConsultationSchema = new mongoose.Schema({
    patientId: String,
    patientName: String,
    diagnosis: String,
    advice: String,
    medicines: [{ name: String, dosage: String, qty: Number }],
    status: { type: String, default: 'PAID' }
}, { timestamps: true });
const Consultation = mongoose.model('Consultation', ConsultationSchema);

// --- 2. ADVANCED DATA EXTRACTION LOGIC ---
const extractData = (text) => {
    // Clean up weird whitespace/newlines
    const cleanText = text.replace(/\r\n/g, '\n');

    // Extract Demographics
    const nameMatch = cleanText.match(/Name\s*:\s*([^\n]+)/i);
    const contactMatch = cleanText.match(/Contact\s*:\s*([\d]+)(?:,\s*([^\n]+))?/i);
    const ageMatch = cleanText.match(/Age\s*:\s*(\d+)/i);
    const sexMatch = cleanText.match(/Sex\s*:\s*([A-Za-z]+)/i);

    // Extract Core Clinical Text
    const diagnosisMatch = cleanText.match(/Diagnosis\s*:\s*([\s\S]+?)(?=\n\s*Advice|\n\s*Treatment)/i);
    const adviceMatch = cleanText.match(/Advice\s*:\s*([\s\S]+?)(?=\n\s*Treatment)/i);

    // Extract Medicines (Table Parsing)
    const treatmentSection = cleanText.match(/Treatment\s*:([\s\S]+?)(?=\n\s*उपचार|\n\s*Physiotherapy)/i);
    const medicines = [];
    if (treatmentSection) {
        // Split by line and remove empty gaps
        const lines = treatmentSection[1].split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        lines.forEach(line => {
            // Looks for the dosage pattern at the end of the line (e.g., "1 -x-x" or "x-x-1")
            const dosageMatch = line.match(/(.+?)\s+([\d×xX\-\s]+)$/i);
            
            if (dosageMatch) {
                // If we find a dosage pattern, separate the name and dosage
                medicines.push({ 
                    name: dosageMatch[1].trim(), 
                    dosage: dosageMatch[2].replace(/\s+/g, '').trim(), // Cleans "1 -x-x" to "1-x-x"
                    qty: 1 
                });
            } else if (line.length > 3 && !line.toLowerCase().includes('sos for pain')) {
                // Fallback for medicines without standard dosage patterns (like Myaxyl oil)
                medicines.push({ name: line, dosage: "As prescribed", qty: 1 });
            }
        });
    }

    // Capture everything from Physiotherapy to the end (Labs, MRIs, Past Vitals)
    const historyMatch = cleanText.match(/(Physiotherapy\s*:[\s\S]+)/i);
    const extraNotes = historyMatch ? historyMatch[1].trim() : "";

    // Combine Advice with Extra Notes
    const finalAdvice = (adviceMatch ? adviceMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() : "") 
        + (extraNotes ? `\n\n--- PAST CLINICAL HISTORY & LABS ---\n${extraNotes}` : "");

    return {
        name: nameMatch ? nameMatch[1].trim() : "Unknown",
        mobile: contactMatch ? contactMatch[1].trim() : "0000000000",
        address: contactMatch && contactMatch[2] ? contactMatch[2].trim() : "Unknown",
        age: ageMatch ? parseInt(ageMatch[1]) : 0,
        gender: sexMatch ? sexMatch[1].trim() : "Other",
        diagnosis: diagnosisMatch ? diagnosisMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() : "No diagnosis recorded",
        advice: finalAdvice,
        medicines: medicines
    };
};

// --- 3. RUN IMPORT ---
const runTest = async () => {
    try {
        await mongoose.connect('mongodb+srv://hms_admin:ba19U3WtbzBGfJGa@clusteraxonhms.wwwvfqn.mongodb.net/?appName=Clusteraxonhms');
        console.log("🟢 Connected to Database.");

        const directoryPath = path.join(__dirname, 'legacy_reports');
        const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.docx'));

        if (files.length === 0) {
            console.log("⚠️ No .docx files found in legacy_reports folder!");
            process.exit();
        }

        const file = files[0]; 
        const filePath = path.join(directoryPath, file);
        
        console.log(`\n📄 Reading File: ${file}...`);
        const result = await mammoth.extractRawText({ path: filePath });
        
        // Process text through new advanced parser
        const extracted = extractData(result.value);

        // ID Generator
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        // Adds a random number to the end so it never duplicates during testing!
const testPatientId = `AX${mm}${yy}TEST${Math.floor(Math.random() * 9999)}`;

        // Save Patient
        const newPatient = new Patient({
            patientId: testPatientId,
            patientName: extracted.name,
            age: extracted.age,
            gender: extracted.gender,
            mobile: extracted.mobile,
            address: extracted.address
        });
        await newPatient.save();

        // Save Consultation History
        const newConsultation = new Consultation({
            patientId: testPatientId,
            patientName: extracted.name,
            diagnosis: extracted.diagnosis,
            advice: extracted.advice,
            medicines: extracted.medicines,
            createdAt: new Date("2024-10-08T10:00:00Z") // Fake past date
        });
        await newConsultation.save();

        console.log("\n=========================================");
        console.log("✅ IMPORT SUCCESSFUL (ADVANCED PARSER)!");
        console.log(`👤 Patient: ${extracted.name}`);
        console.log(`🏠 Address: ${extracted.address}`);
        console.log(`💊 Medicines Found: ${extracted.medicines.length}`);
        console.log(`🔑 AXON ID: ${testPatientId} <--- COPY THIS ID`);
        console.log("=========================================\n");

        process.exit();
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

runTest();