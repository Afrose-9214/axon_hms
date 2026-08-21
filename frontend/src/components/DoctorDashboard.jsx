import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast, { Toaster } from 'react-hot-toast';
import { Users, Search, LogOut, Sun, Moon, Stethoscope } from 'lucide-react'; // Added icons for Bottom Nav

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
            const patientRes = await axios.get(`/api/patients/search?q=${recordSearchId}`, { 
                headers: { Authorization: `Bearer ${user.token}` } 
            });
            
            if (patientRes.data.length === 0) {
                return alert("No patient found with that ID, Name, or Phone.");
            }

            const matchedPatient = patientRes.data[0];
            setRecordPatient(matchedPatient);

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
        // flex-col on mobile to stack the header, row on desktop for the sidebar
        <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden transition-colors duration-300" style={{ backgroundColor: COLORS.bg, color: COLORS.text }}>
            
            <Toaster position="top-center" reverseOrder={false} />

            {/* --- MOBILE TOP APP HEADER --- */}
            <header className="md:hidden flex items-center justify-between p-4 shadow-sm z-20" style={{ backgroundColor: COLORS.sidebar, borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ fontWeight: '800', color: COLORS.primary, letterSpacing: '1px', fontSize: '18px' }}>AXON DOCTOR</div>
                <button onClick={logout} style={{ color: COLORS.danger }}><LogOut size={20} /></button>
            </header>

            {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
            <aside className="hidden md:flex w-[280px] flex-col p-6 z-20" style={{ backgroundColor: COLORS.sidebar, borderRight: `1px solid ${COLORS.border}`, transition: 'background-color 0.3s ease' }}>
                <div style={{ marginBottom: '40px', fontWeight: '800', textAlign: 'center', color: COLORS.primary, letterSpacing: '1px', fontSize: '20px' }}>AXON DOCTOR</div>
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={() => setView('queue')} style={view === 'queue' ? S.activeSide : S.inactiveSide}>🩺 Patient Queue</button>
                    <button onClick={() => setView('records')} style={view === 'records' ? S.activeSide : S.inactiveSide}>📁 Search Records</button>
                </nav>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={S.themeBtnStyle}>{isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
                <button onClick={logout} style={S.logoutBtn}>Sign Out</button>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            {/* pb-24 ensures content doesn't hide behind the mobile bottom nav */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 w-full relative">
                
                {view === 'queue' && (
                    <div className="max-w-5xl mx-auto w-full">
                        <h2 style={{ marginBottom: '25px', fontSize: '24px', fontWeight: 'bold' }}>Patients Waiting</h2>
                        <div style={S.cardStyle} className="overflow-hidden">
                            {/* overflow-x-auto allows the table to swipe on phones */}
                            <div className="overflow-x-auto w-full">
                                <table className="w-full min-w-[600px] border-collapse text-left">
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
                                                <td style={S.tdStyle}><button onClick={() => startConsultation(apt)} style={S.primaryBtn} className="whitespace-nowrap">Start Consult ➔</button></td>
                                            </tr>
                                        )) : <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: COLORS.muted }}>No patients waiting.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'consult' && (
                    <ConsultationWorkspace appointment={activeApt} onBack={() => setView('queue')} user={user} COLORS={COLORS} S={S} />
                )}

                {view === 'records' && (
                    <div className="max-w-6xl mx-auto w-full">
                        <h2 style={{ marginBottom: '25px', fontSize: '24px', fontWeight: 'bold' }}>Medical Records Search</h2>
                        
                        <div style={S.cardStyle} className="mb-6 flex flex-col sm:flex-row gap-4">
                            <input placeholder="Enter Patient AX ID" style={{ ...S.inputStyle, marginBottom: 0, flex: 1 }} value={recordSearchId} onChange={e => setRecordSearchId(e.target.value.toUpperCase())} />
                            <button onClick={fetchPatientHistory} style={S.primaryBtn} className="whitespace-nowrap flex justify-center items-center gap-2"><Search size={18}/> Search History</button>
                        </div>

                        {recordPatient && (
                            // Stack columns on mobile, side-by-side on desktop
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="w-full lg:w-1/3">
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
                                <div className="w-full lg:w-2/3">
                                    <PatientHistoryTimeline history={recordHistory} COLORS={COLORS} S={S} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* --- MOBILE BOTTOM NAVIGATION (Hidden on Desktop) --- */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-around items-center z-50 pb-safe" style={{ backgroundColor: COLORS.sidebar, borderTop: `1px solid ${COLORS.border}` }}>
                <NavButton icon={<Stethoscope size={24} />} label="Queue" isActive={view === 'queue' || view === 'consult'} onClick={() => setView('queue')} COLORS={COLORS} />
                <NavButton icon={<Search size={24} />} label="Records" isActive={view === 'records'} onClick={() => setView('records')} COLORS={COLORS} />
                <NavButton icon={isDarkMode ? <Sun size={24} /> : <Moon size={24} />} label="Theme" isActive={false} onClick={() => setIsDarkMode(!isDarkMode)} COLORS={COLORS} />
            </nav>

        </div>
    );
}

// Reusable Bottom Nav Button Component
function NavButton({ icon, label, isActive, onClick, COLORS }) {
    return (
        <button onClick={onClick} className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors" style={{ color: isActive ? COLORS.primary : COLORS.muted }}>
            <div className={`${isActive ? 'scale-110 transition-transform' : ''}`}>{icon}</div>
            <span style={{ fontSize: '10px', fontWeight: isActive ? 'bold' : '500' }}>{label}</span>
        </button>
    );
}

// --- SUB-SCREEN: CONSULTATION WORKSPACE ---
function ConsultationWorkspace({ appointment, onBack, user, COLORS, S }) {
    const [diagnosis, setDiagnosis] = useState('');
    const [advice, setAdvice] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [inventory, setInventory] = useState([]);
    const [pastHistory, setPastHistory] = useState([]);
    const [activeMic, setActiveMic] = useState(null); 
    const [investigationNotes, setInvestigationNotes] = useState(''); 

    const [medicines, setMedicines] = useState([
        { name: '', qty: '', dosage: '', price: 0, hsnCode: '', gstPercent: 0, batchNumber: '', expiryDate: '' }
    ]);

    const [prescribedTests, setPrescribedTests] = useState([]);
    const [isTestDropdownOpen, setIsTestDropdownOpen] = useState(false);

    const INVESTIGATION_CATEGORIES = [
        { category: "Lab Order (Blood & Urine)", tests: ["CBC", "LFT", "KFT", "Lipid Profile", "Thyroid Profile", "HbA1c", "FBS", "Urine Routine", "CRP", "Vit B12 & D3"] },
        { category: "X-Ray", tests: ["Chest PA", "Joint AP/LAT", "Spine AP/LAT", "Knee AP/LAT", "Abdomen Erect", "KUB"] },
        { category: "USG (Ultrasound)", tests: ["Abdomen & Pelvis", "KUB", "TVS", "Neck", "Scrotum", "Soft Tissue"] },
        { category: "MRI & CT", tests: ["Brain MRI", "Spine MRI", "Knee MRI", "Brain (NCCT)", "Abdomen (CECT)", "Chest (HRCT)"] },
        { category: "Cardiac & Others", tests: ["ECG", "ECHO", "TMT", "Holter Monitor", "PFT", "EEG"] }
    ];

    const toggleTest = (testName) => {
        if (prescribedTests.includes(testName)) {
            setPrescribedTests(prescribedTests.filter(t => t !== testName));
        } else {
            setPrescribedTests([...prescribedTests, testName]);
        }
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

    const today = new Date().toISOString().split('T')[0];
    
    // --- SPEECH TO TEXT FUNCTION ---
    const startDictation = (fieldName) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { toast.error("Browser doesn't support speech-to-text."); return; }

        const recognition = new SpeechRecognition();
        recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';

        recognition.onstart = () => { setActiveMic(fieldName); toast.success("Listening...", { duration: 2000, icon: '🎤' }); };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (fieldName === 'diagnosis') setDiagnosis(prev => prev ? `${prev} ${transcript}` : transcript);
            else if (fieldName === 'investigation') setInvestigationNotes(prev => prev ? `${prev} ${transcript}` : transcript);
        };
        recognition.onerror = (event) => { setActiveMic(null); toast.error("Mic issue detected."); };
        recognition.onend = () => setActiveMic(null);
        recognition.start();
    };

    const submitPrescription = async () => {
        const activeMeds = medicines.filter(m => m.name.trim() !== '' || m.dosage.trim() !== '');
        const hasInvalidMedicine = activeMeds.some(m => !m.name.trim() || !m.dosage.trim() || !m.qty || m.qty < 1);
        
        if (hasInvalidMedicine) return toast.error("Incomplete Prescription! Please fill Name, Dosage, and Qty.");
        if (!followUp) return toast.error("Please select a follow-up date.");

        try {
            const loadingToast = toast.loading('Saving prescription...');
            const payload = {
                appointmentId: appointment._id, patientId: appointment.patientId, patientName: appointment.patientName,
                diagnosis, advice, followUpDate: followUp, medicines: activeMeds, labTests: prescribedTests, investigationNotes, consultationFee: 500, vitals: appointment.vitals 
            };
            
            await axios.post('/api/consultations/complete', payload, { headers: { Authorization: `Bearer ${user.token}` } });

            // Generate PDF
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
            
            let currentY = 72; 
            if (prescribedTests.length > 0 || investigationNotes.trim() !== '') {
                doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("Investigations Advised:", 10, currentY);
                doc.setFont("helvetica", "normal"); 
                let splitTests = [];
                if (prescribedTests.length > 0) {
                    splitTests = doc.splitTextToSize(prescribedTests.join(", "), 90);
                    doc.text(splitTests, 50, currentY);
                    currentY += (splitTests.length * 5);
                }
                if (investigationNotes) {
                    const splitNotes = doc.splitTextToSize(`Notes: ${investigationNotes}`, 130);
                    doc.text(splitNotes, 10, currentY + 5);
                    currentY += (splitNotes.length * 5) + 5;
                } else currentY += 5; 
            }

            doc.setFont("times", "bolditalic"); doc.setFontSize(18); doc.text("Rx", 10, currentY);
            autoTable(doc, {
                startY: currentY + 5, head: [['Medicine Name', 'Dosage', 'Qty']], body: activeMeds.map(m => [m.name.toUpperCase(), m.dosage, m.qty]), 
                styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillStyle: [79, 70, 229], textColor: [255, 255, 255] }, margin: { left: 10, right: 10 }, theme: 'grid'
            });

            let finalY = doc.lastAutoTable.finalY + 10;
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Advice / Remarks:", 10, finalY);
            doc.setFont("helvetica", "normal"); doc.text(advice || "Please complete the course of medicines.", 10, finalY + 6, { maxWidth: 128 });
            
            doc.save(`Prescription_${appointment.patientId}.pdf`);
            toast.dismiss(loadingToast); toast.success('Prescription Saved & PDF Downloaded!', { duration: 3000, icon: '🎉' });
            setTimeout(() => { onBack(); }, 1000);
            
        } catch (err) { 
            console.error(err); toast.dismiss(); toast.error("Failed to save consultation.");
        }
    };

    const v = appointment.vitals || {};

    return (
        <div className="max-w-6xl mx-auto w-full">
            <button onClick={onBack} className="flex items-center gap-2 mb-6 font-bold bg-transparent border-none cursor-pointer" style={{ color: COLORS.secondary }}>← Back to Queue</button>

            {/* Stack on mobile, side-by-side on desktop */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
                
                {/* LEFT COLUMN: Vitals, Diagnosis, Advise */}
                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    <div style={S.cardStyle}>
                        <div className="flex justify-between items-center">
                            <h3 className="m-0 text-xl md:text-2xl font-bold" style={{ color: COLORS.text }}>{appointment.patientName}</h3>
                            <span style={{ color: COLORS.muted, fontWeight: 'bold' }}>{appointment.patientId}</span>
                        </div>
                        <p style={{ color: COLORS.secondary, fontSize: '14px', marginTop: '8px', fontWeight: '600' }}>Reason: {appointment.reason}</p>
                        
                        {/* Vitals Grid: 3 cols on mobile, 6 cols on tablet/desktop */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5">
                            <VitalBox label="BP" val={v.bp} C={COLORS} /> <VitalBox label="Pulse" val={v.pulse} C={COLORS} />
                            <VitalBox label="SpO2" val={v.spo2} C={COLORS} /> <VitalBox label="Temp" val={v.temp} C={COLORS} />
                            <VitalBox label="RBS" val={v.rbs} C={COLORS} /> <VitalBox label="Weight" val={v.weight} C={COLORS} />
                        </div>

                        {pastHistory.some(visit => visit.vitals) && (
                            <div style={{ marginTop: '25px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '15px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: COLORS.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Previous Vitals History</h4>
                                <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pastHistory.filter(visit => visit.vitals).map((visit, i) => (
                                        <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-lg" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.secondary, minWidth: '85px', marginBottom: '4px' }}>
                                                {new Date(visit.createdAt).toLocaleDateString()}
                                            </span>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: COLORS.text }}>
                                                <span><b>BP:</b> {visit.vitals.bp || '--'}</span>
                                                <span><b>PR:</b> {visit.vitals.pulse || '--'}</span>
                                                <span><b>SpO2:</b> {visit.vitals.spo2 || '--'}</span>
                                                <span><b>Temp:</b> {visit.vitals.temp || '--'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={S.cardStyle}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.muted, display: 'block', marginBottom: '8px' }}>Current Diagnosis</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <textarea placeholder="Type or dictate the diagnosis..." style={{ ...S.inputStyle, minHeight: '120px', width: '100%', marginBottom: 0, paddingRight: '50px' }} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                            <button type="button" onClick={() => startDictation('diagnosis')} style={{ position: 'absolute', right: '12px', top: '12px', background: activeMic === 'diagnosis' ? `${COLORS.danger}15` : `${COLORS.primary}15`, color: activeMic === 'diagnosis' ? COLORS.danger : COLORS.primary, border: activeMic === 'diagnosis' ? `1px solid ${COLORS.danger}50` : `1px solid ${COLORS.primary}40`, borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                {activeMic === 'diagnosis' ? '🛑' : '🎤'}
                            </button>
                        </div>
                    </div>

                    <div style={S.cardStyle}>
                        <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>🔬 Advise Investigations:</h4>
                        
                        <div style={{ position: 'relative' }}>
                            <div onClick={() => setIsTestDropdownOpen(!isTestDropdownOpen)} style={{ ...S.inputStyle, marginBottom: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} >
                                <span className="truncate" style={{ color: prescribedTests.length > 0 ? COLORS.text : COLORS.muted, fontWeight: prescribedTests.length > 0 ? 'bold' : 'normal' }}>
                                    {prescribedTests.length > 0 ? `${prescribedTests.length} Investigation(s) Selected` : "Select Lab, X-Ray, MRI, CT..."}
                                </span>
                                <span style={{ fontSize: '12px', transform: isTestDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                            </div>

                            {isTestDropdownOpen && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: COLORS.sidebar, border: `1px solid ${COLORS.border}`, borderRadius: '10px', marginTop: '8px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', maxHeight: '350px', overflowY: 'auto' }}>
                                    {INVESTIGATION_CATEGORIES.map(group => (
                                        <div key={group.category}>
                                            <div style={{ background: `${COLORS.primary}15`, color: COLORS.primary, padding: '8px 15px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 2 }}>{group.category}</div>
                                            {group.tests.map(test => {
                                                const isSelected = prescribedTests.includes(test);
                                                return (
                                                    <div key={test} onClick={() => toggleTest(test)} className="flex items-center gap-3 p-3 cursor-pointer border-b" style={{ borderColor: COLORS.border, background: isSelected ? `${COLORS.success}10` : 'transparent' }}>
                                                        <div style={{ width: '18px', height: '18px', border: `2px solid ${isSelected ? COLORS.success : COLORS.muted}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? COLORS.success : 'transparent' }}>
                                                            {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                                                        </div>
                                                        <span style={{ color: COLORS.text, fontSize: '14px', fontWeight: isSelected ? 'bold' : 'normal' }}>{test}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                    <div style={{ position: 'sticky', bottom: 0, background: COLORS.sidebar, padding: '12px', borderTop: `1px solid ${COLORS.border}`, zIndex: 2 }}>
                                        <button type="button" onClick={() => setIsTestDropdownOpen(false)} style={{ width: '100%', background: COLORS.primary, color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Done ({prescribedTests.length} Selected)</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {prescribedTests.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {prescribedTests.map(test => (
                                    <span key={test} style={{ background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {test} <button type="button" onClick={() => toggleTest(test)} style={{ background: 'none', border: 'none', color: COLORS.danger, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Prescription Table Area */}
                    <div style={S.cardStyle}>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-5 gap-3">
                            <h3 style={{ margin: 0, color: COLORS.text }}>Prescription (Rx)</h3>
                            <button onClick={() => setMedicines([...medicines, { name: '', qty: '', dosage: '', price: 0 }])} style={S.smallBtn}>➕ Add Medicine</button>
                        </div>

                        {medicines.map((m, i) => {
                            const suggestions = inventory.filter(item => (item.itemName || item.name || "").toLowerCase().includes(m.name.toLowerCase()));
                            const showDropdown = m.name.length > 0 && m.price === 0 && suggestions.length > 0;
                            
                            return (
                                // Responsive grid: Stack inputs on mobile, horizontal row on larger screens
                                <div key={i} className="flex flex-col sm:grid sm:grid-cols-[3fr_1fr_1.5fr_1fr_auto] gap-3 mb-4 p-4 sm:p-0 border sm:border-none rounded-lg" style={{ borderColor: COLORS.border }}>
                                    
                                    <div className="relative w-full">
                                        <input placeholder="Medicine Name..." style={{...S.inputStyle, marginBottom: 0}} value={m.name} onChange={e => handleMedicineChange(i, 'name', e.target.value)} />
                                        {showDropdown && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, backgroundColor: COLORS.sidebar, border: `1px solid ${COLORS.primary}`, borderRadius: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                                                {suggestions.map((item, idx) => (
                                                    <div key={idx} onClick={() => handleMedicineChange(i, 'name', item.itemName || item.name)} className="p-3 border-b cursor-pointer" style={{ borderColor: COLORS.border, color: COLORS.text }}>
                                                        <div className="font-bold">{item.itemName || item.name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <input type="number" placeholder="Qty" style={{...S.inputStyle, marginBottom: 0}} value={m.qty} onChange={e => handleMedicineChange(i, 'qty', e.target.value)} />
                                    
                                    <select style={{...S.inputStyle, marginBottom: 0, cursor: 'pointer'}} value={m.dosage} onChange={e => handleMedicineChange(i, 'dosage', e.target.value)}>
                                        <option value="" disabled>Dosage</option>
                                        <optgroup label="After Food (AF)"><option value="1-0-0 AF">1-0-0 AF</option><option value="0-1-0 AF">0-1-0 AF</option><option value="0-0-1 AF">0-0-1 AF</option><option value="1-0-1 AF">1-0-1 AF</option><option value="1-1-1 AF">1-1-1 AF</option></optgroup>
                                        <optgroup label="Before Food (BF)"><option value="1-0-0 BF">1-0-0 BF</option><option value="0-1-0 BF">0-1-0 BF</option><option value="0-0-1 BF">0-0-1 BF</option><option value="1-0-1 BF">1-0-1 BF</option><option value="1-1-1 BF">1-1-1 BF</option></optgroup>
                                        <optgroup label="Other"><option value="SOS">SOS (As Needed)</option><option value="STAT">STAT (Immediately)</option></optgroup>
                                    </select>

                                    <div className="flex items-center justify-center font-bold p-3 rounded-lg border" style={{ background: COLORS.bg, borderColor: COLORS.border, color: m.price > 0 ? COLORS.success : COLORS.muted }}>
                                        {m.price > 0 ? `₹${m.price}` : '--'}
                                    </div>

                                    <button type="button" onClick={() => setMedicines(medicines.filter((_, idx) => idx !== i))} className="w-full sm:w-11 h-11 flex items-center justify-center rounded-lg font-bold text-white transition-opacity hover:opacity-80" style={{ background: COLORS.danger }}>
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT COLUMN: Advice & Print */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <div style={S.cardStyle}>
                        <h3 style={{ marginBottom: '15px', color: COLORS.text }}>Advice & Notes</h3>
                        <textarea placeholder="Special instructions..." style={{ ...S.inputStyle, minHeight: '120px' }} value={advice} onChange={e => setAdvice(e.target.value)} />
                        
                        <h3 style={{ marginTop: '25px', marginBottom: '15px', color: COLORS.text }}>Follow-up Date</h3>
                        <input type="date" min={today} style={S.inputStyle} value={followUp} onChange={e => setFollowUp(e.target.value)} />
                    </div>
                    <button onClick={submitPrescription} style={S.completeBtn}>🖨️ COMPLETE & PRINT</button>
                </div>
            </div>

            {/* History Section Below */}
            <div style={{ borderTop: `2px dashed ${COLORS.border}`, paddingTop: '30px', marginTop: '20px' }}>
                <h2 style={{ marginBottom: '20px', color: COLORS.text, fontSize: '22px', fontWeight: 'bold' }}>Patient Medical History</h2>
                {pastHistory.length > 0 ? (
                    <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
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
function PatientHistoryTimeline({ history, COLORS, S }) {
    if (!history || history.length === 0) return null;

    return (
        <div style={S.cardStyle}>
            <h3 style={{ color: COLORS.text, margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🕒 Previous Medical History
            </h3>
            
            <div style={{ marginLeft: '10px', paddingLeft: '25px', borderLeft: `3px solid ${COLORS.border}`, position: 'relative' }}>
                {history.map((visit, idx) => (
                    <div key={visit._id} style={{ position: 'relative', marginBottom: '25px' }}>
                        <div style={{ position: 'absolute', left: '-32px', top: '4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: idx === 0 ? COLORS.success : COLORS.primary, border: `3px solid ${COLORS.sidebar}` }}></div>

                        <div className="p-4 rounded-xl transition-transform duration-200 hover:translate-x-1" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                                <span style={{ fontWeight: 'bold', color: idx === 0 ? COLORS.success : COLORS.secondary, fontSize: '14px' }}>
                                    {new Date(visit.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                                {idx === 0 && (
                                    <span className="self-start sm:self-auto" style={{ fontSize: '10px', background: `${COLORS.success}20`, color: COLORS.success, padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        Latest
                                    </span>
                                )}
                            </div>
                            
                            <div style={{ marginBottom: '12px' }}>
                                <span style={{ color: COLORS.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Diagnosis</span>
                                <div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{visit.diagnosis || 'No formal diagnosis recorded.'}</div>
                            </div>

                            {visit.advice && (
                                <div style={{ marginBottom: '12px', fontStyle: 'italic', fontSize: '13px', color: COLORS.muted, background: `${COLORS.primary}05`, padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${COLORS.primary}40` }}>
                                    "{visit.advice}"
                                </div>
                            )}

                            <div style={{ borderTop: `1px dashed ${COLORS.border}`, paddingTop: '12px', marginTop: '4px' }}>
                                <span style={{ color: COLORS.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Medications Prescribed</span>
                                {visit.medicines && visit.medicines.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {visit.medicines.map((m, i) => (
                                            <span key={i} style={{ fontSize: '12px', fontWeight: '600', background: `${COLORS.primary}10`, color: COLORS.primary, padding: '5px 10px', borderRadius: '8px', border: `1px solid ${COLORS.primary}30`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {m.name} 
                                                <span style={{ opacity: 0.7, fontSize: '11px', borderLeft: `1px solid ${COLORS.primary}40`, paddingLeft: '6px' }}>{m.dosage} ({m.qty})</span>
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
    cardStyle: { backgroundColor: COLORS.sidebar, padding: '24px', borderRadius: '20px', border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow, transition: 'all 0.3s ease' },
    inputStyle: { width: '100%', padding: '14px', borderRadius: '10px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, marginBottom: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '14px', transition: 'border 0.2s ease' },
    primaryBtn: { background: COLORS.primary, color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' },
    completeBtn: { width: '100%', padding: '20px', background: COLORS.success, color: '#FFFFFF', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' },
    smallBtn: { background: `${COLORS.secondary}20`, color: COLORS.secondary, border: `1px solid ${COLORS.secondary}`, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    activeSide: { background: `${COLORS.primary}20`, color: COLORS.primary, border: 'none', padding: '16px 20px', textAlign: 'left', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s ease', width: '100%' },
    inactiveSide: { background: 'transparent', color: COLORS.muted, border: 'none', padding: '16px 20px', textAlign: 'left', borderRadius: '12px', cursor: 'pointer', fontWeight: '500', width: '100%' },
    tdStyle: { padding: '18px 15px', verticalAlign: 'middle', whiteSpace: 'nowrap' },
    logoutBtn: { marginTop: '15px', background: `${COLORS.danger}15`, color: COLORS.danger, border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' },
    themeBtnStyle: { marginTop: 'auto', background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center' }
});

const VitalBox = ({ label, val, C }) => (
    <div className="flex flex-col items-center justify-center" style={{ background: C.bg, padding: '10px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
        <small style={{ color: C.muted, display: 'block', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>{label}</small>
        <div style={{ fontWeight: '900', fontSize: '14px', color: C.text }}>{val || '--'}</div>
    </div>
);