import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast, { Toaster } from 'react-hot-toast';

// --- PREMIUM UI/UX THEME PALETTES ---
const LIGHT_COLORS = { 
    bg: '#F3F4F6', sidebar: '#FFFFFF', primary: '#2563EB', secondary: '#0D9488', 
    border: '#E5E7EB', text: '#111827', muted: '#6B7280', danger: '#EF4444', success: '#10B981', 
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
};

const DARK_COLORS = { 
    bg: '#0F172A', sidebar: '#1E293B', primary: '#3B82F6', secondary: '#2DD4BF', 
    border: '#334155', text: '#F8FAFC', muted: '#94A3B8', danger: '#F87171', success: '#34D399', 
    shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
};

export default function DoctorDashboard() {
    const { user, logout } = useContext(AuthContext);

    const [isDarkMode, setIsDarkMode] = useState(false);
    const COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
    const S = getStyles(COLORS);

    const [view, setView] = useState('queue'); 
    const [appointments, setAppointments] = useState([]);
    const [activeApt, setActiveApt] = useState(null);

    // E.H.R (RECORDS) STATES
    const [recordSearchId, setRecordSearchId] = useState('');
    const [recordPatient, setRecordPatient] = useState(null);
    const [recordHistory, setRecordHistory] = useState([]);

    useEffect(() => {
        const fetchQueue = async () => {
            try {
                const res = await axios.get('/api/appointments/today', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const waiting = res.data.filter(apt => apt.status === 'WAITING');
                setAppointments(waiting);
            } catch (err) { console.error("Queue Error", err); }
        };
        if (view === 'queue') {
            fetchQueue();
            const interval = setInterval(fetchQueue, 10000); 
            return () => clearInterval(interval);
        }
    }, [view, user.token]);

    const startConsultation = (apt) => {
        setActiveApt(apt);
        setView('consult');
    };

    const fetchPatientHistory = async () => {
        if (!recordSearchId) return alert("Please enter an AXON ID, Name, or Phone");
        
        try {
            // 1. We changed ?id= to ?q= to match the new Multi-Search backend
            const patientRes = await axios.get(`/api/patients/search?q=${recordSearchId}`, { 
                headers: { Authorization: `Bearer ${user.token}` } 
            });
            
            // 2. Since the backend now returns an array, we must check if it's empty
            if (patientRes.data.length === 0) {
                return alert("No patient found with that ID, Name, or Phone.");
            }

            // 3. Grab the first matching patient from the array
            const matchedPatient = patientRes.data[0];
            setRecordPatient(matchedPatient);

            // 4. Use their exact ID to fetch the timeline history safely
            const historyRes = await axios.get(`/api/consultations/history/${encodeURIComponent(matchedPatient.patientId)}`, { 
                headers: { Authorization: `Bearer ${user.token}` } 
            });
            setRecordHistory(historyRes.data);

        } catch (err) { 
            console.error(err);
            alert("Error fetching records. Please check your connection."); 
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: COLORS.bg, color: COLORS.text, overflow: 'hidden', transition: 'background-color 0.3s ease' }}>
            
            {/* ADD THIS EXACTLY HERE */}
            <Toaster position="top-center" reverseOrder={false} />

            <aside style={{ width: '280px', backgroundColor: COLORS.sidebar, padding: '30px 20px', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${COLORS.border}`, transition: 'background-color 0.3s ease' }}>
                <div style={{ marginBottom: '40px', fontWeight: '800', textAlign: 'center', color: COLORS.primary, letterSpacing: '1px', fontSize: '20px' }}>AXON DOCTOR</div>
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={() => setView('queue')} style={view === 'queue' ? S.activeSide : S.inactiveSide}>🩺 Patient Queue</button>
                    <button onClick={() => setView('records')} style={view === 'records' ? S.activeSide : S.inactiveSide}>📁 Search Records</button>
                </nav>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={S.themeBtnStyle}>{isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
                <button onClick={logout} style={S.logoutBtn}>Sign Out</button>
            </aside>

            <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
                
                {view === 'queue' && (
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <h2 style={{ marginBottom: '25px', fontSize: '24px' }}>Patients Waiting</h2>
                        <div style={S.cardStyle}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ color: COLORS.muted, borderBottom: `2px solid ${COLORS.border}` }}>
                                        <th style={S.tdStyle}>TOKEN</th>
                                        <th style={S.tdStyle}>PATIENT DETAILS</th>
                                        <th style={S.tdStyle}>REASON</th>
                                        <th style={S.tdStyle}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.length > 0 ? appointments.map((apt, idx) => (
                                        <tr key={apt._id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                                            <td style={{ ...S.tdStyle, fontWeight: 'bold', color: COLORS.primary }}>#{idx + 1}</td>
                                            <td style={S.tdStyle}><b style={{ fontSize: '16px' }}>{apt.patientName}</b><br/><small style={{ color: COLORS.muted }}>{apt.patientId} | {apt.gender}</small></td>
                                            <td style={S.tdStyle}>{apt.reason || 'Not specified'}</td>
                                            <td style={S.tdStyle}><button onClick={() => startConsultation(apt)} style={S.primaryBtn}>Start Consult ➔</button></td>
                                        </tr>
                                    )) : <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: COLORS.muted }}>No patients waiting.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'consult' && (
                    <ConsultationWorkspace appointment={activeApt} onBack={() => setView('queue')} user={user} COLORS={COLORS} S={S} />
                )}

                {view === 'records' && (
                    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                        <h2 style={{ marginBottom: '25px', fontSize: '24px' }}>Medical Records Search</h2>
                        <div style={{ ...S.cardStyle, marginBottom: '25px', display: 'flex', gap: '15px' }}>
                            <input placeholder="Enter Patient AX ID" style={{ ...S.inputStyle, marginBottom: 0, flex: 1 }} value={recordSearchId} onChange={e => setRecordSearchId(e.target.value.toUpperCase())} />
                            <button onClick={fetchPatientHistory} style={S.primaryBtn}>🔍 Search History</button>
                        </div>

                        {recordPatient && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px' }}>
                                <div>
                                    <div style={{ ...S.cardStyle, position: 'sticky', top: '0' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `${COLORS.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary, fontSize: '32px', fontWeight: 'bold', marginBottom: '15px' }}>{recordPatient.patientName.charAt(0)}</div>
                                        <h2 style={{ margin: '0 0 5px 0' }}>{recordPatient.patientName}</h2>
                                        <p style={{ margin: '0 0 20px 0', color: COLORS.secondary, fontWeight: 'bold' }}>{recordPatient.patientId}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '8px' }}><span style={{ color: COLORS.muted }}>Age / Gender</span><span style={{ fontWeight: '600' }}>{recordPatient.age} Yrs / {recordPatient.gender}</span></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '8px' }}><span style={{ color: COLORS.muted }}>Phone</span><span style={{ fontWeight: '600' }}>{recordPatient.mobile}</span></div>
                                            <div><span style={{ color: COLORS.muted, display: 'block', marginBottom: '5px' }}>Address</span><span style={{ fontWeight: '500', lineHeight: '1.4' }}>{recordPatient.address || 'Not provided'}</span></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <PatientHistoryTimeline history={recordHistory} COLORS={COLORS} S={S} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

// --- PREMIUM DICTATION FIELD COMPONENT ---
const DictationField = ({ label, placeholder, value, onChange, fieldName, activeMic, startDictation, COLORS, S, minHeight = '80px' }) => {
    const isActive = activeMic === fieldName;

    return (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.muted, display: 'block', marginBottom: '8px' }}>
                {label}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <textarea 
                    placeholder={placeholder} 
                    style={{ 
                        ...S.input, 
                        minHeight: minHeight, 
                        width: '100%', 
                        marginBottom: 0, 
                        paddingRight: '55px', // Keeps text from hiding behind the mic button
                        border: isActive ? `2px solid ${COLORS.danger}50` : `1px solid ${COLORS.border}`,
                        transition: 'border 0.2s ease'
                    }} 
                    value={value} 
                    onChange={e => onChange(e.target.value)} 
                />
                
                {/* The Microphone Button */}
                <button 
                    type="button" 
                    onClick={() => startDictation(fieldName)} 
                    style={{ 
                        position: 'absolute', right: '12px', top: '12px', 
                        background: isActive ? `${COLORS.danger}15` : `${COLORS.primary}15`, 
                        color: isActive ? COLORS.danger : COLORS.primary, 
                        border: isActive ? `1px solid ${COLORS.danger}50` : `1px solid ${COLORS.primary}40`, 
                        borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.2s ease',
                        boxShadow: isActive ? `0 0 12px ${COLORS.danger}40` : 'none'
                    }}
                    title={isActive ? "Stop Recording" : `Dictate ${label}`}
                >
                    {isActive ? '🛑' : '🎤'}
                </button>
            </div>
            
            {/* Active Recording Status Indicator */}
            {isActive && (
                <div style={{ fontSize: '11px', color: COLORS.danger, fontWeight: 'bold', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                        display: 'inline-block', width: '8px', height: '8px', background: COLORS.danger, borderRadius: '50%', 
                        boxShadow: `0 0 5px ${COLORS.danger}` // Fakes a glowing pulse
                    }}></span>
                    Recording {label.toLowerCase()}... Speak clearly.
                </div>
            )}
        </div>
    );
};

// --- SUB-SCREEN: CONSULTATION WORKSPACE ---
function ConsultationWorkspace({ appointment, onBack, user, COLORS, S }) {
    const [diagnosis, setDiagnosis] = useState('');
    const [advice, setAdvice] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [inventory, setInventory] = useState([]);
    const [pastHistory, setPastHistory] = useState([]);
    //--const [isListening, setIsListening] = useState(false); --
    const [activeMic, setActiveMic] = useState(null); // Tracks WHICH mic is currently listening
    const [investigationNotes, setInvestigationNotes] = useState(''); // Stores the typed/spoken notes

    const [medicines, setMedicines] = useState([
        { name: '', qty: '', dosage: '', price: 0, hsnCode: '', gstPercent: 0, batchNumber: '', expiryDate: '' }
    ]);

    // --- LAB TESTS & SCANS STATE ---
    const [prescribedTests, setPrescribedTests] = useState([]);
    const [selectedTest, setSelectedTest] = useState('');
    const [isTestDropdownOpen, setIsTestDropdownOpen] = useState(false);

    // Predefined list of common investigations
    // NEW: Highly organized, categorized medical data
    const INVESTIGATION_CATEGORIES = [
        { category: "Lab Order (Blood & Urine)", tests: ["CBC", "LFT", "KFT", "Lipid Profile", "Thyroid Profile (T3, T4, TSH)", "HbA1c", "Fasting Blood Sugar (FBS)", "Urine Routine & Microscopy", "CRP", "Vitamin B12 & D3"] },
        { category: "X-Ray", tests: ["Chest PA", "Joint AP/LAT", "Spine AP/LAT", "Knee AP/LAT", "Abdomen Erect", "KUB"] },
        { category: "USG (Ultrasound)", tests: ["Abdomen & Pelvis", "KUB", "TVS", "Neck", "Scrotum", "Soft Tissue"] },
        { category: "MRI", tests: ["Brain", "Cervical Spine", "Lumbar Spine", "Knee", "Pelvis", "Shoulder"] },
        { category: "CT Scan", tests: ["Brain (NCCT)", "Abdomen (CECT)", "Chest (HRCT)", "KUB", "PNS"] },
        { category: "Cardiac & Others", tests: ["ECG", "ECHO", "TMT", "Holter Monitor", "PFT", "EEG"] }
    ];

    // NEW: Toggles a test on and off without needing an "Add" button
    const toggleTest = (testName) => {
        if (prescribedTests.includes(testName)) {
            setPrescribedTests(prescribedTests.filter(t => t !== testName));
        } else {
            setPrescribedTests([...prescribedTests, testName]);
        }
    };

    const handleRemoveTest = (testToRemove) => {
        setPrescribedTests(prescribedTests.filter(t => t !== testToRemove));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const invRes = await axios.get('/api/inventory', { headers: { Authorization: `Bearer ${user.token}` } });
                setInventory(invRes.data);

                if (appointment?.patientId) {
                    const histRes = await axios.get(`/api/consultations/history/${encodeURIComponent(appointment.patientId)}`, { headers: { Authorization: `Bearer ${user.token}` } });
                    setPastHistory(histRes.data);
                }
            } catch (err) { console.error("Fetch Error", err); }
        };
        fetchData();
    }, [user.token, appointment]);

    const handleMedicineChange = (index, field, value) => {
        const newMeds = [...medicines];
        newMeds[index][field] = value;
        if (field === 'name') {
            const matchedItem = inventory.find(item => (item.itemName || item.name || "").toLowerCase() === value.toLowerCase());
            if (matchedItem) {
                newMeds[index].price = matchedItem.salePricePerUnit || matchedItem.price || 0;
                newMeds[index].hsnCode = matchedItem.hsnCode || '0000';
                newMeds[index].gstPercent = matchedItem.gstPercent || 0;
            } else { newMeds[index].price = 0; }
        }
        setMedicines(newMeds);
    };

    // This ensures the calendar prevents any date before today
    const today = new Date().toISOString().split('T')[0];
    
    // --- SPEECH TO TEXT FUNCTION ---
// --- UPGRADED SPEECH TO TEXT FUNCTION ---
const startDictation = (fieldName) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        toast.error("Your browser doesn't support speech-to-text.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        setActiveMic(fieldName); // Tell the UI which button should glow red
        toast.success("Listening... Speak now.", { duration: 2000, icon: '🎤' });
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        
        // Check which field triggered the mic, and append the text to that specific state
        if (fieldName === 'diagnosis') {
            setDiagnosis(prev => prev ? `${prev} ${transcript}` : transcript);
        } else if (fieldName === 'investigation') {
            setInvestigationNotes(prev => prev ? `${prev} ${transcript}` : transcript);
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech error:", event.error);
        setActiveMic(null);
        if (event.error === 'not-allowed') {
            toast.error("🎤 Microphone blocked! Please click the icon in your URL bar to allow access.", { duration: 6000 });
        } else if (event.error === 'no-speech') {
            toast.error("No speech detected. Please try again.");
        }
    };

    recognition.onend = () => {
        setActiveMic(null); // Turn off the red glowing button
    };

    recognition.start();
};

    const submitPrescription = async () => {
        // Filter out blank rows
        const activeMeds = medicines.filter(m => m.name.trim() !== '' || m.dosage.trim() !== '');

        // Validation Guard
        const hasInvalidMedicine = activeMeds.some(m => !m.name.trim() || !m.dosage.trim() || !m.qty || m.qty < 1);
        
        if (hasInvalidMedicine) {
            // 🚨 REPLACED ALERT WITH TOAST ERROR
            toast.error("Incomplete Prescription! Please ensure every medicine has a Name, Dosage, and Qty.", {
                duration: 4000,
                style: { borderRadius: '10px', background: '#333', color: '#fff' }
            });
            return; 
        }

            // 2. Validate Follow-up Date
        if (!followUp) {
            toast.error("Please select a follow-up date for the patient.");
            return;
        }

        try {
            // Show a loading toast while waiting for the database
            const loadingToast = toast.loading('Saving prescription...');

            const payload = {
                appointmentId: appointment._id, 
                patientId: appointment.patientId, 
                patientName: appointment.patientName,
                diagnosis, advice, 
                followUpDate: followUp, 
                medicines: activeMeds, 
                labTests: prescribedTests, // <--- ADD THIS LINE TO SAVE TO DATABASE
                investigationNotes: investigationNotes, // <--- ADD THIS
                consultationFee: 500,
                vitals: appointment.vitals 
            };
            
            await axios.post('/api/consultations/complete', payload, { 
                headers: { Authorization: `Bearer ${user.token}` } 
            });

            // --- Generate PDF ---
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' }); 
            const v = appointment.vitals || {};
            
            doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(79, 70, 229); 
            doc.text("AXON MEDICAL CENTER", 74, 15, { align: "center" });
            doc.setFontSize(9); doc.setTextColor(100); doc.text("CLINICAL PRESCRIPTION (Rx)", 74, 22, { align: "center" });
            doc.line(10, 25, 138, 25); 
            doc.setFont("helvetica", "normal"); doc.setTextColor(0); doc.setFontSize(10);
            doc.text(`Patient: ${appointment.patientName.toUpperCase()}`, 10, 32);
            doc.text(`ID: ${appointment.patientId}  |  Date: ${new Date().toLocaleDateString()}`, 10, 38);
            
            doc.setFontSize(8); doc.setFillColor(240, 240, 240); doc.rect(10, 42, 128, 12, 'F');
            doc.text(`BP: ${v.bp || '--'}  |  Pulse: ${v.pulse || '--'}  |  SpO2: ${v.spo2 || '--'}  |  Temp: ${v.temp || '--'}  |  Weight: ${v.weight || '--'}`, 12, 49);
            
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("Diagnosis:", 10, 62);
            doc.setFont("helvetica", "normal"); doc.text(diagnosis || "Routine Checkup", 32, 62);
            
            let currentY = 72; // Create a dynamic Y marker

            // --- ADD INVESTIGATIONS TO PDF ---
            // --- ADD INVESTIGATIONS TO PDF ---
            if (prescribedTests.length > 0 || investigationNotes.trim() !== '') {
                doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("Investigations Advised:", 10, currentY);
                doc.setFont("helvetica", "normal"); 
                
                // Add the tags
                let splitTests = [];
                if (prescribedTests.length > 0) {
                    splitTests = doc.splitTextToSize(prescribedTests.join(", "), 90);
                    doc.text(splitTests, 50, currentY);
                    currentY += (splitTests.length * 5);
                }
                
                // Add the dictated notes below the tags
                if (investigationNotes) {
                    const splitNotes = doc.splitTextToSize(`Notes: ${investigationNotes}`, 130);
                    doc.text(splitNotes, 10, currentY + 5);
                    currentY += (splitNotes.length * 5) + 5;
                } else {
                    currentY += 5; // Just add padding if no notes
                }
            }

            // Rx and Medicines Table
            doc.setFont("times", "bolditalic"); doc.setFontSize(18); doc.text("Rx", 10, currentY);
            
            autoTable(doc, {
                startY: currentY + 5, // Start table below dynamic Rx
                head: [['Medicine Name', 'Dosage', 'Qty']], 
                body: activeMeds.map(m => [m.name.toUpperCase(), m.dosage, m.qty]), 
                styles: { fontSize: 9, cellPadding: 3 }, 
                headStyles: { fillStyle: [79, 70, 229], textColor: [255, 255, 255] }, 
                margin: { left: 10, right: 10 }, 
                theme: 'grid'
            });

            let finalY = doc.lastAutoTable.finalY + 10;
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Advice / Remarks:", 10, finalY);
            doc.setFont("helvetica", "normal"); doc.text(advice || "Please complete the course of medicines.", 10, finalY + 6, { maxWidth: 128 });
            
            doc.save(`Prescription_${appointment.patientId}.pdf`);
            
            // Dismiss the loading toast and show success
            toast.dismiss(loadingToast);
            toast.success('Prescription Saved & PDF Downloaded!', {
                duration: 3000,
                icon: '🎉'
            });
            
            setTimeout(() => {
                onBack(); // Wait a second before navigating away so they see the success message
            }, 1000);
            
        } catch (err) { 
            console.error(err);
            toast.dismiss(); // Clear the loading toast
            toast.error("Failed to save consultation. Check your connection.");
        }
    };

    const v = appointment.vitals || {};

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <button onClick={onBack} style={{ background: 'none', color: COLORS.secondary, border: 'none', cursor: 'pointer', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>← Back to Queue</button>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    {/* VITALS CARD WITH NEW HISTORY SCROLL */}
                    <div style={S.cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: COLORS.text, fontSize: '22px' }}>{appointment.patientName}</h3>
                            <span style={{ color: COLORS.muted, fontWeight: 'bold' }}>{appointment.patientId}</span>
                        </div>
                        <p style={{ color: COLORS.secondary, fontSize: '14px', marginTop: '8px', fontWeight: '600' }}>Reason: {appointment.reason}</p>
                        
                        {/* Current Vitals (Grid) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginTop: '20px' }}>
                            <VitalBox label="BP" val={v.bp} C={COLORS} /> <VitalBox label="Pulse" val={v.pulse} C={COLORS} />
                            <VitalBox label="SpO2" val={v.spo2} C={COLORS} /> <VitalBox label="Temp" val={v.temp} C={COLORS} />
                            <VitalBox label="RBS" val={v.rbs} C={COLORS} /> <VitalBox label="Weight" val={v.weight} C={COLORS} />
                        </div>

                        {/* --- NEW: SCROLLABLE PAST VITALS --- */}
                        {pastHistory.some(visit => visit.vitals) && (
                            <div style={{ marginTop: '25px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '15px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: COLORS.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Previous Vitals History
                                </h4>
                                <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pastHistory.filter(visit => visit.vitals).map((visit, i) => (
                                        <div key={i} style={{ background: COLORS.bg, padding: '12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.secondary, minWidth: '85px' }}>
                                                {new Date(visit.createdAt).toLocaleDateString()}
                                            </span>
                                            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: COLORS.text, flex: 1, justifyContent: 'flex-end' }}>
                                                <span><b>BP:</b> {visit.vitals.bp || '--'}</span>
                                                <span><b>PR:</b> {visit.vitals.pulse || '--'}</span>
                                                <span><b>SpO2:</b> {visit.vitals.spo2 || '--'}</span>
                                                <span><b>Temp:</b> {visit.vitals.temp || '--'}</span>
                                                <span><b>RBS:</b> {visit.vitals.rbs || '--'}</span>
                                                <span><b>Weight:</b> {visit.vitals.weight || '--'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={S.cardStyle}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.muted, display: 'block', marginBottom: '8px' }}>Current Diagnosis</label>
                            {/* Diagnosis Field */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <textarea 
                                        placeholder="Type or dictate the diagnosis..." 
                                        style={{ ...S.input, minHeight: '180px', width: '100%', marginBottom: 0, paddingRight: '50px', padding: '10px', maxWidth: '100%', lineHeight: '1.5', borderRadius: '5px', border: '1px solid #ccc', boxShadow: '1px 1px 1px #999', background: 'white', color: 'black' }} 
                                        value={diagnosis} 
                                        onChange={e => setDiagnosis(e.target.value)} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => startDictation('diagnosis')} // <--- UPDATED
                                        style={{ 
                                            position: 'absolute', right: '12px', top: '12px', 
                                            background: activeMic === 'diagnosis' ? `${COLORS.danger}15` : `${COLORS.primary}15`, 
                                            color: activeMic === 'diagnosis' ? COLORS.danger : COLORS.primary, 
                                            border: activeMic === 'diagnosis' ? `1px solid ${COLORS.danger}50` : `1px solid ${COLORS.primary}40`, 
                                            borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.2s ease',
                                            boxShadow: activeMic === 'diagnosis' ? `0 0 10px ${COLORS.danger}40` : 'none'
                                        }}
                                    >
                                        {activeMic === 'diagnosis' ? '🛑' : '🎤'}
                                    </button>
                                </div>
                            
                            {activeMic === 'diagnosis' && (
                                <span style={{ fontSize: '11px', color: COLORS.danger, fontWeight: 'bold', marginTop: '4px', display: 'block' }}>
                                    Recording... Click the red button to stop, or just stop speaking.
                                </span>
                            )}
                    </div>

{/* --- INVESTIGATIONS & SCANS MODULE --- */}
{/* --- UPGRADED MULTI-SELECT INVESTIGATIONS MODULE --- */}
                    <div style={S.cardStyle}>
                        <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🔬 Advise:
                        </h4>
        
            {/* Custom Dropdown Trigger */}
            <div style={{ position: 'relative' }}>
                <div onClick={() => setIsTestDropdownOpen(!isTestDropdownOpen)}
                style={{ ...S.input, marginBottom: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isTestDropdownOpen ? COLORS.sidebar : '#fff', border: isTestDropdownOpen ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`, borderRadius: '10px', padding:'10px' }} >
                <span style={{ color: prescribedTests.length > 0 ? COLORS.text : COLORS.muted, fontWeight: prescribedTests.length > 0 ? 'bold' : 'normal' }}>
                    {prescribedTests.length > 0 ? `${prescribedTests.length} Investigation(s) Selected` : "Select Lab, X-Ray, MRI, CT..."}
                </span>
                <span style={{ fontSize: '12px', transform: isTestDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}></span>
                {/* 🌟 NEW PREMIUM SVG ARROW 🌟 */}
                <svg 
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ 
                        color: isTestDropdownOpen ? COLORS.primary : COLORS.muted,
                        transform: isTestDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'all 0.2s ease' 
                    }}
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>

            {/* Custom Dropdown Menu */}
            {isTestDropdownOpen && (
                <div style={{ 
                    position: 'absolute', 
                    top: '100%', left: 0, right: 0, 
                    zIndex: 100, 
                    background: COLORS.sidebar, 
                    border: `1px solid ${COLORS.border}`, 
                    borderRadius: '10px', 
                    marginTop: '8px', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', 
                    maxHeight: '350px', 
                    overflowY: 'auto' 
                }}>
                    {INVESTIGATION_CATEGORIES.map(group => (
                        <div key={group.category}>
                            {/* Sticky Category Header */}
                            <div style={{ 
                                background: `${COLORS.primary}15`, 
                                color: COLORS.primary, 
                                padding: '8px 15px', 
                                fontWeight: 'bold', 
                                fontSize: '11px', 
                                textTransform: 'uppercase', 
                                position: 'sticky', 
                                top: 0,
                                zIndex: 2
                            }}>
                                {group.category}
                            </div>
                            
                            {/* Checkbox Rows */}
                            {group.tests.map(test => {
                                const isSelected = prescribedTests.includes(test);
                                return (
                                    <div 
                                        key={test}
                                        onClick={() => toggleTest(test)}
                                        style={{ 
                                            padding: '12px 15px', 
                                            cursor: 'pointer', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '12px', 
                                            borderBottom: `1px solid ${COLORS.border}`, 
                                            background: isSelected ? `${COLORS.success}10` : 'transparent' 
                                        }}
                                        onMouseOver={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = `${COLORS.primary}08` }}
                                        onMouseOut={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                                    >
                                        {/* Custom Checkbox */}
                                        <div style={{ 
                                            width: '18px', height: '18px', 
                                            border: `2px solid ${isSelected ? COLORS.success : COLORS.muted}`, 
                                            borderRadius: '4px', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                            background: isSelected ? COLORS.success : 'transparent',
                                            transition: 'all 0.1s'
                                        }}>
                                            {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                                        </div>
                                        <span style={{ color: COLORS.text, fontSize: '14px', fontWeight: isSelected ? 'bold' : 'normal' }}>
                                            {test}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    
                    {/* Sticky Footer */}
                    <div style={{ position: 'sticky', bottom: 0, background: COLORS.sidebar, padding: '12px', borderTop: `1px solid ${COLORS.border}`, zIndex: 2 }}>
                        <button 
                            type="button" 
                            onClick={() => setIsTestDropdownOpen(false)} 
                            style={{ width: '100%', background: COLORS.primary, color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Done ({prescribedTests.length} Selected)
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* --- NEW: Free-text Investigation Notes with Mic --- */}
        <div style={{ marginTop: '15px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.muted, display: 'block', marginBottom: '8px' }}>
                Additional Investigation Notes / Details
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <textarea 
                    placeholder="Type or dictate specific instructions (e.g., 'Fasting required', 'Focus on lower back')..." 
                    style={{ ...S.input, minHeight: '180px', width: '100%', marginBottom: 0, paddingRight: '50px', padding: '10px', maxWidth: '100%', lineHeight: '1.5', borderRadius: '5px', border: '1px solid #ccc', boxShadow: '1px 1px 1px #999', background: 'white', color: 'black' }} 
                    value={investigationNotes} 
                    onChange={e => setInvestigationNotes(e.target.value)} 
                />
                <button 
                    type="button" 
                    onClick={() => startDictation('investigation')} // <--- UNIQUE ID
                    style={{ 
                        position: 'absolute', right: '12px', top: '12px', 
                        background: activeMic === 'investigation' ? `${COLORS.danger}15` : `${COLORS.primary}15`, 
                        color: activeMic === 'investigation' ? COLORS.danger : COLORS.primary, 
                        border: activeMic === 'investigation' ? `1px solid ${COLORS.danger}50` : `1px solid ${COLORS.primary}40`, 
                        borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.2s ease',
                        boxShadow: activeMic === 'investigation' ? `0 0 10px ${COLORS.danger}40` : 'none'
                    }}
                >
                    {activeMic === 'investigation' ? '🛑' : '🎤'}
                </button>
            </div>
            {activeMic === 'investigation' && (
                <span style={{ fontSize: '11px', color: COLORS.danger, fontWeight: 'bold', marginTop: '4px', display: 'block' }}>
                    Recording Investigation Notes...
                </span>
            )}
        </div>
        
        {/* Selected Tests Display (Pills) */}
        {prescribedTests.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
                {prescribedTests.map(test => (
                    <span key={test} style={{ 
                        background: '#fff', 
                        color: COLORS.text, 
                        border: `1px solid ${COLORS.border}`,
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        {test}
                        <button 
                            type="button" 
                            onClick={() => toggleTest(test)} 
                            style={{ background: 'none', border: 'none', color: COLORS.danger, cursor: 'pointer', fontWeight: '900', padding: 0, fontSize: '14px' }}
                        >×</button>
                    </span>
                ))}
            </div>
        )}
    </div>

                    <div style={S.cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: COLORS.text }}>Prescription (Rx)</h3>
                            <button onClick={() => setMedicines([...medicines, { name: '', qty: '', dosage: '', price: 0 }])} style={S.smallBtn}>➕ Add Medicine</button>
                        </div>

    


                        {medicines.map((m, i) => {
    const suggestions = inventory.filter(item => (item.itemName || item.name || "").toLowerCase().includes(m.name.toLowerCase()));
    const showDropdown = m.name.length > 0 && m.price === 0 && suggestions.length > 0;
    
    return (
        // Notice the grid layout now has 5 columns: '3fr 1fr 1.5fr 1fr 45px' to fit the button
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 1fr 45px', gap: '12px', marginBottom: '15px', alignItems: 'center' }}>
            
            {/* 1. Name Input with Inventory Dropdown */}
            <div style={{ position: 'relative' }}>
                <input 
                    autoComplete="off" 
                    placeholder="Type medicine name..." 
                    style={{...S.inputStyle, marginBottom: 0}} 
                    value={m.name} 
                    onChange={e => handleMedicineChange(i, 'name', e.target.value)} 
                />
                {showDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, backgroundColor: COLORS.sidebar, border: `1px solid ${COLORS.primary}`, borderRadius: '10px', maxHeight: '200px', overflowY: 'auto', boxShadow: COLORS.shadow }}>
                        {suggestions.map((item, idx) => (
                            <div key={idx} onClick={() => handleMedicineChange(i, 'name', item.itemName || item.name)} style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', color: COLORS.text }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = `${COLORS.primary}20`} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <div style={{ fontWeight: 'bold' }}>{item.itemName || item.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* 2. Quantity */}
            <input 
                type="number" 
                placeholder="Qty" 
                style={{...S.inputStyle, marginBottom: 0}} 
                value={m.qty} 
                onChange={e => handleMedicineChange(i, 'qty', e.target.value)} 
            />
            
            {/* 3. NEW: Dosage Dropdown with AF/BF */}
            <select 
                style={{...S.inputStyle, marginBottom: 0, cursor: 'pointer'}} 
                value={m.dosage} 
                onChange={e => handleMedicineChange(i, 'dosage', e.target.value)}
            >
                <option value="" disabled>Dosage</option>
                <optgroup label="After Food (AF)">
                    <option value="1-0-0 AF">1-0-0 AF</option>
                    <option value="0-1-0 AF">0-1-0 AF</option>
                    <option value="0-0-1 AF">0-0-1 AF</option>
                    <option value="1-0-1 AF">1-0-1 AF</option>
                    <option value="1-1-1 AF">1-1-1 AF</option>
                </optgroup>
                <optgroup label="Before Food (BF)">
                    <option value="1-0-0 BF">1-0-0 BF</option>
                    <option value="0-1-0 BF">0-1-0 BF</option>
                    <option value="0-0-1 BF">0-0-1 BF</option>
                    <option value="1-0-1 BF">1-0-1 BF</option>
                    <option value="1-1-1 BF">1-1-1 BF</option>
                </optgroup>
                <optgroup label="Other">
                    <option value="SOS">SOS (As Needed)</option>
                    <option value="STAT">STAT (Immediately)</option>
                </optgroup>
            </select>

            {/* 4. Price Display */}
            <div style={{ padding: '14px', background: COLORS.bg, borderRadius: '10px', color: m.price > 0 ? COLORS.success : COLORS.muted, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                {m.price > 0 ? `₹${m.price}` : '--'}
            </div>

            {/* 5. NEW: Delete Button */}
            <button 
                type="button" 
                onClick={() => {
                    // Filters out the medicine at the current index (i)
                    const updatedMedicines = medicines.filter((_, idx) => idx !== i);
                    setMedicines(updatedMedicines); 
                }} 
                style={{ background: COLORS.danger, color: '#fff', border: 'none', borderRadius: '10px', height: '100%', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Remove Medicine"
            >
                ✕
            </button>
            
        </div>
    );
})}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={S.cardStyle}>
                        <h3 style={{ marginBottom: '15px', color: COLORS.text }}>Advice & Notes</h3>
                        <textarea placeholder="Special instructions..." style={{ ...S.inputStyle, minHeight: '120px' }} value={advice} onChange={e => setAdvice(e.target.value)} />
                        <h3 style={{ marginTop: '25px', marginBottom: '15px', color: COLORS.text }}>Follow-up Date</h3>
                        <input type="date" min={today} style={S.inputStyle} value={followUp} onChange={e => setFollowUp(e.target.value)} />
                    </div>
                    <button onClick={submitPrescription} style={S.completeBtn}>🖨️ COMPLETE & PRINT</button>
                </div>
            </div>

            <div style={{ borderTop: `2px dashed ${COLORS.border}`, paddingTop: '30px' }}>
                <h2 style={{ marginBottom: '20px', color: COLORS.text, fontSize: '22px' }}>Patient Medical History</h2>
                {pastHistory.length > 0 ? (
                    <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '15px' }}>
                        <PatientHistoryTimeline history={pastHistory} COLORS={COLORS} S={S} />
                    </div>
                ) : (
                    <div style={{ ...S.cardStyle, textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '30px', marginBottom: '10px' }}>📄</div>
                        <p style={{ color: COLORS.muted }}>No past visit history found for this patient.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- REUSABLE TIMELINE COMPONENT ---
// (Extracted so it can be used in both the E.H.R Search tab AND the Consultation tab)
function PatientHistoryTimeline({ history, COLORS, S }) {
    if (!history || history.length === 0) {
        return (
            <div style={{ ...S.cardStyle, textAlign: 'center', color: COLORS.muted, padding: '40px 20px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📂</div>
                No prior medical history found for this patient.
            </div>
        );
    }

    return (
        <div style={S.cardStyle}>
            <h3 style={{ color: COLORS.text, margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🕒 Previous Medical History
            </h3>
            
            {/* The Main Vertical Timeline Line */}
            <div style={{ 
                marginLeft: '10px', 
                paddingLeft: '25px', 
                borderLeft: `3px solid ${COLORS.border}`, 
                position: 'relative' 
            }}>
                {history.map((visit, idx) => (
                    <div key={visit._id} style={{ position: 'relative', marginBottom: '25px' }}>
                        
                        {/* The Timeline Dot */}
                        <div style={{ 
                            position: 'absolute', 
                            left: '-32px', // Pulls the dot perfectly onto the vertical line
                            top: '4px', 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '50%', 
                            backgroundColor: idx === 0 ? COLORS.success : COLORS.primary, // Most recent is green
                            border: `3px solid ${COLORS.sidebar}` // Creates a cutout/ring effect
                        }}></div>

                        {/* The Hoverable Content Card */}
                        <div style={{ 
                            background: COLORS.bg, 
                            border: `1px solid ${COLORS.border}`, 
                            borderRadius: '12px', 
                            padding: '16px',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateX(5px)'; e.currentTarget.style.boxShadow = COLORS.shadow; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            {/* Header: Date */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontWeight: 'bold', color: idx === 0 ? COLORS.success : COLORS.secondary, fontSize: '14px' }}>
                                    {new Date(visit.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                                {idx === 0 && (
                                    <span style={{ fontSize: '10px', background: `${COLORS.success}20`, color: COLORS.success, padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        Latest
                                    </span>
                                )}
                            </div>
                            
                            {/* Body: Diagnosis & Advice */}
                            <div style={{ marginBottom: '12px' }}>
                                <span style={{ textAlign: 'left', color: COLORS.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                                    Diagnosis
                                </span>
                                <div style={{ textAlign: 'left', fontWeight: '600', fontSize: '14px', color: COLORS.text }}>
                                    {visit.diagnosis || 'No formal diagnosis recorded.'}
                                </div>
                            </div>

                            {visit.advice && (
                                <div style={{ textAlign: 'left', marginBottom: '12px', fontStyle: 'italic', fontSize: '13px', color: COLORS.muted, background: `${COLORS.primary}05`, padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${COLORS.primary}40` }}>
                                    "{visit.advice}"
                                </div>
                            )}

                            {/* Footer: Medicines as Tags */}
                            <div style={{ borderTop: `1px dashed ${COLORS.border}`, paddingTop: '12px', marginTop: '4px' }}>
                                <span style={{ textAlign: 'left', color: COLORS.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                                    Medications Prescribed
                                </span>
                                
                                {visit.medicines && visit.medicines.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {visit.medicines.map((m, i) => (
                                            <span key={i} style={{ 
                                                fontSize: '12px', 
                                                fontWeight: '600',
                                                background: `${COLORS.primary}10`, 
                                                color: COLORS.primary, 
                                                padding: '5px 10px', 
                                                borderRadius: '8px', 
                                                border: `1px solid ${COLORS.primary}30`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                {m.name} 
                                                <span style={{ opacity: 0.7, fontSize: '11px', borderLeft: `1px solid ${COLORS.primary}40`, paddingLeft: '6px' }}>
                                                    {m.dosage} ({m.qty})
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', color: COLORS.muted }}>None prescribed.</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- DYNAMIC STYLES GENERATOR ---
const getStyles = (COLORS) => ({
    cardStyle: { backgroundColor: COLORS.sidebar, padding: '30px', borderRadius: '20px', border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow, transition: 'all 0.3s ease' },
    inputStyle: { width: '100%', padding: '14px', borderRadius: '10px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, marginBottom: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '14px', transition: 'border 0.2s ease' },
    primaryBtn: { background: COLORS.primary, color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' },
    completeBtn: { width: '100%', padding: '20px', background: COLORS.success, color: '#FFFFFF', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' },
    smallBtn: { background: `${COLORS.secondary}20`, color: COLORS.secondary, border: `1px solid ${COLORS.secondary}`, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    activeSide: { background: `${COLORS.primary}20`, color: COLORS.primary, border: 'none', padding: '16px 20px', textAlign: 'left', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s ease', width: '100%' },
    inactiveSide: { background: 'transparent', color: COLORS.muted, border: 'none', padding: '16px 20px', textAlign: 'left', borderRadius: '12px', cursor: 'pointer', fontWeight: '500', width: '100%' },
    tdStyle: { padding: '18px 15px', verticalAlign: 'middle' },
    logoutBtn: { marginTop: '15px', background: `${COLORS.danger}15`, color: COLORS.danger, border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' },
    themeBtnStyle: { marginTop: 'auto', background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center' }
});

const VitalBox = ({ label, val, C }) => (
    <div style={{ textAlign: 'center', background: C.bg, padding: '12px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
        <small style={{ color: C.muted, display: 'block', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>{label}</small>
        <div style={{ fontWeight: '900', fontSize: '15px', color: C.text }}>{val || '--'}</div>
    </div>
);