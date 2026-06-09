import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// --- PREMIUM UI/UX THEME PALETTES ---
const LIGHT_COLORS = { 
    bg: '#F3F4F6',          // Soft clinical gray
    sidebar: '#FFFFFF',     // Crisp white
    primary: '#2563EB',     // Trustworthy Royal Blue
    secondary: '#0D9488',   // Medical Teal
    border: '#E5E7EB',      // Soft divider
    text: '#111827',        // Deep ink (easier to read than pure black)
    muted: '#6B7280',       // Accessible gray
    danger: '#EF4444',      // Alert Red
    success: '#10B981',     // Emerald Green
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // Floating effect
};

const DARK_COLORS = { 
    bg: '#0F172A',          // Deep Slate
    sidebar: '#1E293B',     // Charcoal
    primary: '#3B82F6',     // Vibrant Blue for contrast
    secondary: '#2DD4BF',   // Bright Teal
    border: '#334155',      // Subtle dark divider
    text: '#F8FAFC',        // Crisp off-white
    muted: '#94A3B8',       // Soft slate
    danger: '#F87171',      // Softened Red
    success: '#34D399',     // Softened Green
    shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' // Deep shadow
};

export default function PharmacyDashboard() {
    const { user, logout } = useContext(AuthContext);

    // --- THEME STATE ---
    const [isDarkMode, setIsDarkMode] = useState(false); // Defaulting to Light Mode for a clean look
    const COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
    const S = getStyles(COLORS); // <--- Add this single line here

    // --- NAVIGATION STATES ---
    const [view, setView] = useState('scheduling'); 
    const [mode, setMode] = useState('search'); 

    // --- DATA STATES ---
    const [pendingBills, setPendingBills] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [patientRecord, setPatientRecord] = useState(null);
    const [reason, setReason] = useState('');
    
    const [vitals, setVitals] = useState({ bp: '', pulse: '', spo2: '', rbs: '', temp: '', weight: '' });
    const [regData, setRegData] = useState({ patientName: '', age: '', gender: 'Male', mobile: '', address: '', email: '' });
    
    const [isBooking, setIsBooking] = useState(false);
    // Payment Modal States
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'CASH', 'UPI', 'CARD', 'SPLIT'
    const [splitDetails, setSplitDetails] = useState({ cash: '', online: '' });
    const [customConsultFee, setCustomConsultFee] = useState(0);
    const [tenderAmount, setTenderAmount] = useState('');

    // --- POS PAYMENT STATES ---
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [activeBill, setActiveBill] = useState(null);
    const [amountTendered, setAmountTendered] = useState('');
    const [splitPayments, setSplitPayments] = useState({ CASH: '', UPI: '', CARD: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = { Authorization: `Bearer ${user.token}` };
                if (view === 'billing') {
                    const res = await axios.get('/api/consultations/pending', { headers });
                    setPendingBills(res.data);
                } else if (view === 'inventory') {
                    const res = await axios.get('/api/inventory', { headers });
                    setInventory(res.data);
                }
            } catch (err) { console.error("Fetch error", err); }
        };
        fetchData();
    }, [view, user.token]);

    const handleLookup = async () => {
        try {
        const res = await axios.get(`/api/patients/search?q=${searchQuery}`, {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        
        if (res.data.length === 0) {
            alert("No patient found with that Name, ID, or Phone.");
            setSearchResults([]);
        } else if (res.data.length === 1) {
            // If only one exact match, auto-select them
            setPatientRecord(res.data[0]);
            setSearchResults([]);
        } else {
            // If multiple matches (like searching "John"), show the list
            setSearchResults(res.data);
            setPatientRecord(null);
        }
    } catch (err) { 
        alert("Search failed."); 
    }
    };

   // --- PAYMENT PROCESSING FUNCTION ---
   // 1. Opens the POS Modal and sets the active bill
    const openPaymentModal = (bill) => {
        setSelectedBill(bill);
        setPaymentMethod('Cash');
        setTenderAmount('');
        setSplitDetails({ cash: '', online: '' });
        setCustomConsultFee(bill.consultationFee || 500); 
        setShowPaymentModal(true); // This tells React to show the modal!
    };

    // 2. Submits the finalized payment (BULLETPROOF VERSION)
    

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/patients/register', regData, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            alert(`Success! ID: ${res.data.patientId}`);
            setPatientId(res.data.patientId);
            setPatientRecord(res.data);
            setMode('search');
        } catch (err) { alert("Registration failed."); }
    };

    const handleBook = async () => {
        if (isBooking) return; // Completely prevents double-clicks
        setIsBooking(true);

        try {
            // CRITICAL FIX: Strip out the internal MongoDB '_id' so the 
            // Appointments database can generate its own fresh, unique ID.
            const { _id, createdAt, updatedAt, __v, ...cleanPatientRecord } = patientRecord;

            const payload = { 
                ...cleanPatientRecord, 
                reason, 
                vitals: { ...vitals }, 
                status: 'WAITING' 
            };

           await axios.post('/api/appointments', payload, {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        
        alert("Booking Success! Sent to Doctor.");
        
        // Reset the UI
        setPatientRecord(null); 
        setSearchQuery(''); // <--- Fixed line
        setReason('');
        setVitals({ bp: '', pulse: '', spo2: '', rbs: '', temp: '', weight: '' });

    } catch (err) { 
        // 🚨 NEW: This will catch the EXACT error from your backend!
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
        console.error("Full Backend Error Details:", err.response || err);
        
        alert(`❌ Backend Rejected Booking:\n\n${errorMessage}\n\nPlease check your VS Code Backend Terminal for more details.`); 
    } finally {
        setIsBooking(false); 
    }
    };

    const triggerPaymentModal = (bill) => {
        setSelectedBill(bill);
        setShowPaymentModal(true);
        setPaymentMethod('Cash'); 
        setSplitDetails({ cash: '', online: '' }); 
        setTenderAmount(''); 
        setCustomConsultFee(bill.consultationFee || 500);
    };

    const processFinalPayment = async () => {
        // 1. Safety Check
        if (!selectedBill) return alert("No bill selected.");

        const medTotal = selectedBill.medicines ? selectedBill.medicines.reduce((acc, m) => acc + (m.price || 0) * (m.qty || 1), 0) : 0;
        const consultFee = Number(customConsultFee);
        const grandTotal = consultFee + medTotal;

        // 2. The Try Block
        try {
            const finalMethod = paymentMethod === 'Split' 
                ? `Split (Cash: ${splitDetails.cash}, Online: ${splitDetails.online})` 
                : paymentMethod;

            // Update Database
            await axios.patch(`/api/consultations/${selectedBill._id}`, { 
                status: 'PAID',
                paymentMethod: finalMethod,
                consultationFee: consultFee 
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            // 3. GENERATE PDF (Wait for DB success)
            generateInvoicePDF(selectedBill, consultFee, grandTotal);

            // 4. Update UI
            setPendingBills(prev => prev.filter(b => b._id !== selectedBill._id));
            setShowPaymentModal(false);
            alert("✅ Payment Success & Receipt Generated!");

        } catch (err) {
            // 🚨 THIS WAS MISSING: The Catch Clause
            console.error("Payment Error:", err);
            alert("❌ Payment Failed. Check console for details.");
        } 
    }; // <--- This closes the function

    const modalMedTotal = selectedBill && selectedBill.medicines ? selectedBill.medicines.reduce((acc, m) => acc + (m.price || 0) * (m.qty || 1), 0) : 0;
    const modalGrandTotal = Number(customConsultFee) + modalMedTotal;

    // --- DYNAMIC PREMIUM STYLES ---
    const sidebarBtn = (active) => ({ 
        background: active ? `${COLORS.primary}20` : 'transparent', // 20% opacity of primary color
        color: active ? COLORS.primary : COLORS.text, 
        border: 'none', padding: '16px 20px', textAlign: 'left', 
        cursor: 'pointer', borderRadius: '12px', width: '100%', 
        fontWeight: active ? 'bold' : '500', transition: 'all 0.2s ease' 
    });
    const cardStyle = { backgroundColor: COLORS.sidebar, padding: '30px', borderRadius: '20px', border: `1px solid ${COLORS.border}`, color: COLORS.text, boxShadow: COLORS.shadow, transition: 'all 0.3s ease' };
    const inputStyle = { width: '100%', padding: '14px', borderRadius: '10px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, marginBottom: '12px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s ease', fontSize: '14px' };
    const primaryBtn = { background: COLORS.primary, color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' };
    const bookBtn = { width: '100%', padding: '14px', background: COLORS.success, color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' };
    const payBtn = { width: '100%', padding: '14px', background: COLORS.secondary, color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.3)' };
    const activeTab = { padding: '12px 30px', background: COLORS.primary, color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' };
    const inactiveTab = { padding: '12px 30px', background: 'transparent', color: COLORS.muted, border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', fontWeight: '500' };
    const confirmBox = { marginTop: '25px', padding: '20px', background: COLORS.bg, borderRadius: '15px', border: `1px solid ${COLORS.border}` };
    const logoutBtnStyle = { marginTop: '15px', background: `${COLORS.danger}15`, color: COLORS.danger, border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' };
    const miniLabel = { fontSize: '11px', fontWeight: '700', color: COLORS.secondary, marginTop: '20px', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px' };
    const tinyLabel = { fontSize: '10px', color: COLORS.muted, textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: '600' };
    
    const modalOverlay = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
    const modalContent = { backgroundColor: COLORS.sidebar, color: COLORS.text, padding: '30px', borderRadius: '24px', width: '420px', border: `1px solid ${COLORS.border}`, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' };
    const methodActive = { padding: '14px', background: COLORS.primary, color: '#FFFFFF', border: `2px solid ${COLORS.primary}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' };
    const methodInactive = { padding: '14px', background: 'transparent', color: COLORS.muted, border: `2px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', fontWeight: '600' };
    const themeBtnStyle = { marginTop: 'auto', background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };

    // --- CLEAN SUBMIT FUNCTION ---
    const submitPayment = async () => {
        if (!selectedBill) return alert("Critical Error: Bill is missing.");

        try {
            await axios.patch(`/api/consultations/${selectedBill._id}`, 
                { 
                    status: 'PAID', 
                    paymentMethod: paymentMethod.toUpperCase(),
                    consultationFee: customConsultFee, 
                    paymentDetails: paymentMethod === 'Split' ? splitDetails : { amount: activeTotal }
                }, 
                { headers: { Authorization: `Bearer ${user.token}` } }
            );

            alert("✅ Payment successful! Inventory updated.");
            
            setPendingBills(prevBills => prevBills.filter(bill => bill._id !== selectedBill._id));
            setShowPaymentModal(false);
            setSelectedBill(null); 

        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            alert(`❌ Payment failed: \n\n${errorMsg}`);
        }
    };

    // --- POS MATH ENGINE ---
    const activeMedsTotal = selectedBill?.medicines ? selectedBill.medicines.reduce((sum, m) => sum + (m.price * m.qty), 0) : 0;
    const activeTotal = parseFloat(customConsultFee || 0) + activeMedsTotal;

    let totalTendered = 0;
    if (paymentMethod === 'Cash') totalTendered = parseFloat(tenderAmount) || 0;
    else if (paymentMethod === 'Split') totalTendered = (parseFloat(splitDetails.cash) || 0) + (parseFloat(splitDetails.online) || 0);
    else totalTendered = activeTotal;

    const isInsufficient = totalTendered < activeTotal;
    const changeDue = totalTendered > activeTotal ? totalTendered - activeTotal : 0;
    const remainingBalance = activeTotal - totalTendered;
    // -----------------------

    
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: COLORS.bg, color: COLORS.text, overflow: 'hidden', transition: 'background-color 0.3s ease' }}>
            
            <aside style={{ width: '280px', backgroundColor: COLORS.sidebar, padding: '30px 20px', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${COLORS.border}`, transition: 'background-color 0.3s ease' }}>
                <h2 style={{ color: COLORS.primary, textAlign: 'center', marginBottom: '40px', letterSpacing: '1px', fontWeight: '800' }}>AXON HMS</h2>
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={() => setView('scheduling')} style={sidebarBtn(view === 'scheduling')}>📅 Appointments</button>
                    <button onClick={() => setView('billing')} style={sidebarBtn(view === 'billing')}>💳 Patient Billing</button>
                    <button onClick={() => setView('inventory')} style={sidebarBtn(view === 'inventory')}>📦 Inventory</button>
                </nav>
                
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={themeBtnStyle}>
                    {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
                
                <button onClick={logout} style={logoutBtnStyle}>Sign Out</button>
            </aside>

            <main style={{ flex: 1, padding: '50px', overflowY: 'auto', position: 'relative' }}>
                
                {/* APPOINTMENT MODULE */}
                {view === 'scheduling' && (
                    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', justifyContent: 'center' }}>
                            <button onClick={() => setMode('search')} style={mode === 'search' ? activeTab : inactiveTab}>🔍 Search Patient</button>
                            <button onClick={() => setMode('register')} style={mode === 'register' ? activeTab : inactiveTab}>➕ New Registration</button>
                        </div>
                        <div style={cardStyle}>
                            {mode === 'search' ? (
                                <>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                        <input 
                                            placeholder="Search by Name, Phone, or AX ID..." 
                                            style={{ ...inputStyle, marginBottom: 0 }} 
                                            value={searchQuery} 
                                            onChange={e => setSearchQuery(e.target.value)} 
                                            onKeyDown={e => e.key === 'Enter' && handleLookup()} // Lets them press Enter to search
                                        />
                                        <button onClick={handleLookup} style={primaryBtn}>🔍 Search</button>
                                    </div>

                                    {/* NEW: Display Multiple Search Results to pick from */}
                                    {searchResults.length > 0 && (
                                        <div style={{ background: COLORS.bg, borderRadius: '10px', padding: '10px', marginBottom: '20px', border: `1px solid ${COLORS.border}` }}>
                                            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: COLORS.muted }}>Multiple patients found. Please select one:</p>
                                            {searchResults.map(p => (
                                                <div 
                                                    key={p._id} 
                                                    onClick={() => { setPatientRecord(p); setSearchResults([]); }}
                                                    style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = `${COLORS.primary}20`}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <div>
                                                        <span style={{ fontWeight: 'bold', color: COLORS.text }}>{p.patientName}</span>
                                                        <span style={{ color: COLORS.muted, fontSize: '12px', marginLeft: '10px' }}>{p.age} Yrs / {p.gender}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: COLORS.secondary, fontWeight: 'bold', fontSize: '13px' }}>{p.patientId}</div>
                                                        <div style={{ color: COLORS.muted, fontSize: '12px' }}>📞 {p.mobile}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {patientRecord && (
                                        <div style={confirmBox}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h3 style={{ color: COLORS.text, margin: 0, fontSize: '20px' }}>{patientRecord.patientName}</h3>
                                                    <p style={{ fontSize: '13px', color: COLORS.secondary, fontWeight: 'bold', margin: '4px 0 0 0' }}>{patientRecord.patientId}</p>
                                                </div>
                                            </div>
                                            <label style={miniLabel}>Reason for Visit</label>
                                            <textarea placeholder="Describe symptoms..." style={{ ...inputStyle, minHeight: '80px' }} value={reason} onChange={e => setReason(e.target.value)} />
                                            <label style={miniLabel}>Clinical Vitals</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                                <div><span style={tinyLabel}>Blood Pressure</span><input placeholder="120/80" style={inputStyle} onChange={e => setVitals({...vitals, bp: e.target.value})} /></div>
                                                <div><span style={tinyLabel}>Pulse Rate</span><input placeholder="bpm" style={inputStyle} onChange={e => setVitals({...vitals, pulse: e.target.value})} /></div>
                                                <div><span style={tinyLabel}>SpO2</span><input placeholder="%" style={inputStyle} onChange={e => setVitals({...vitals, spo2: e.target.value})} /></div>
                                                <div><span style={tinyLabel}>Temperature</span><input placeholder="°F" style={inputStyle} onChange={e => setVitals({...vitals, temp: e.target.value})} /></div>
                                                <div><span style={tinyLabel}>RBS</span><input placeholder="mg/dL" style={inputStyle} onChange={e => setVitals({...vitals, rbs: e.target.value})} /></div>
                                                <div><span style={tinyLabel}>Weight</span><input placeholder="kg" style={inputStyle} onChange={e => setVitals({...vitals, weight: e.target.value})} /></div>
                                            </div>
                                            <button onClick={handleBook} disabled={isBooking} style={{ ...bookBtn, marginTop: '25px', opacity: isBooking ? 0.5 : 1 }} >
                                                {isBooking ? 'Processing...' : 'Confirm Booking ➔'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <h3 style={{ color: COLORS.text, marginBottom: '15px' }}>Patient Registration</h3>
                                    <input placeholder="Full Legal Name" style={inputStyle} onChange={e => setRegData({...regData, patientName: e.target.value})} required />
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <input placeholder="Age" type="number" style={inputStyle} onChange={e => setRegData({...regData, age: e.target.value})} required />
                                        <select style={inputStyle} onChange={e => setRegData({...regData, gender: e.target.value})}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <input placeholder="Mobile Number" style={inputStyle} onChange={e => setRegData({...regData, mobile: e.target.value})} required />
                                        <input placeholder="Email Address" style={inputStyle} onChange={e => setRegData({...regData, email: e.target.value})} />
                                    </div>
                                    <textarea placeholder="Complete Residential Address" style={{ ...inputStyle, minHeight: '80px' }} onChange={e => setRegData({...regData, address: e.target.value})} />
                                    <button type="submit" style={{ ...bookBtn, marginTop: '15px' }}>Register & Generate ID</button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* BILLING MODULE */}
                {view === 'billing' && (
                    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                        <h2 style={{ marginBottom: '25px', fontSize: '24px', color: COLORS.text }}>Pending Payments</h2>
                        
                        <div style={S.cardStyle}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ color: COLORS.muted, borderBottom: `2px solid ${COLORS.border}`, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' }}>
                                        <th style={S.tdStyle}>Date / Time</th>
                                        <th style={S.tdStyle}>Patient Details</th>
                                        <th style={S.tdStyle}>Bill Breakdown</th>
                                        <th style={S.tdStyle}>Total Amount</th>
                                        <th style={S.tdStyle}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingBills.length > 0 ? pendingBills.map((bill) => {
                                        // Calculate the total medicine cost
                                        const medsTotal = bill.medicines ? bill.medicines.reduce((sum, m) => sum + (m.price * m.qty), 0) : 0;
                                        const grandTotal = (bill.consultationFee || 500) + medsTotal;

                                        return (
                                            <tr key={bill._id} style={{ borderBottom: `1px solid ${COLORS.border}`, transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = `${COLORS.primary}08`} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                
                                                {/* 1. Date & Time */}
                                                <td style={S.tdStyle}>
                                                    <div style={{ fontWeight: '600', color: COLORS.text }}>{new Date(bill.createdAt).toLocaleDateString()}</div>
                                                    <div style={{ fontSize: '12px', color: COLORS.muted }}>{new Date(bill.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                </td>

                                                {/* 2. Patient Details */}
                                                <td style={S.tdStyle}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: COLORS.primary }}>{bill.patientName}</div>
                                                    <div style={{ fontSize: '13px', color: COLORS.muted }}>{bill.patientId}</div>
                                                </td>

                                                {/* 3. Bill Breakdown */}
                                                <td style={S.tdStyle}>
                                                    <div style={{ fontSize: '13px', color: COLORS.text }}>Consultation: ₹{bill.consultationFee || 500}</div>
                                                    <div style={{ fontSize: '13px', color: COLORS.text }}>Pharmacy: ₹{medsTotal}</div>
                                                </td>

                                                {/* 4. Grand Total */}
                                                <td style={S.tdStyle}>
                                                    <div style={{ fontWeight: '900', fontSize: '18px', color: COLORS.text }}>₹{grandTotal}</div>
                                                    <span style={{ display: 'inline-block', marginTop: '4px', padding: '3px 8px', borderRadius: '10px', background: `${COLORS.danger}20`, color: COLORS.danger, fontSize: '11px', fontWeight: 'bold' }}>
                                                        UNPAID
                                                    </span>
                                                </td>

                                                {/* 5. Action Column */}
                                                <td style={S.tdStyle}>
                                                    <button 
                                                        onClick={() => openPaymentModal(bill)} // Replace with your actual payment function
                                                        style={{
                                                            background: COLORS.success,
                                                            color: '#FFF',
                                                            border: 'none',
                                                            padding: '10px 18px',
                                                            borderRadius: '8px',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            boxShadow: `0 4px 6px -1px ${COLORS.success}40`,
                                                            transition: 'transform 0.1s'
                                                        }}
                                                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                                                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                    >
                                                        💳 Collect Payment
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: COLORS.muted }}>
                                                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎉</div>
                                                No pending bills to collect.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* INVENTORY MODULE */}
                {view === 'inventory' && (
                    <div style={cardStyle}>
                        <h3 style={{ marginBottom: '25px', color: COLORS.text, fontSize: '22px' }}>Medicine Stock</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                            {inventory.map(item => (
                                <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: COLORS.bg, borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                                    <div>
                                        <span style={{ fontWeight: '700', fontSize: '15px' }}>{item.itemName}</span><br/>
                                        <small style={{ color: COLORS.muted }}>Batch: {item.batchNumber} | Exp: {item.expiryDate}</small>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: item.stockQuantity < 10 ? COLORS.danger : COLORS.success, fontWeight: 'bold', fontSize: '13px' }}>
                                            {item.stockQuantity} in stock
                                        </div>
                                        <div style={{ fontWeight: '800', color: COLORS.text }}>₹{item.salePricePerUnit}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- PAYMENT MODAL OVERLAY --- */}
                {showPaymentModal && selectedBill && (
                    <div style={modalOverlay}>
                        <div style={modalContent}>
                            <h2 style={{ margin: '0 0 5px 0', fontSize: '22px' }}>Finalize Payment</h2>
                            <p style={{ color: COLORS.secondary, fontWeight: 'bold', margin: '0 0 25px 0' }}>{selectedBill.patientName}</p>
                            
                            <div style={{ background: COLORS.bg, padding: '20px', borderRadius: '12px', marginBottom: '25px', border: `1px solid ${COLORS.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <span style={{ fontWeight: '500' }}>Consultation Fee:</span>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ marginRight: '8px', fontWeight: 'bold' }}>₹</span>
                                        <input 
                                            type="number" 
                                            value={customConsultFee} 
                                            onChange={(e) => setCustomConsultFee(e.target.value)} 
                                            style={{ ...inputStyle, width: '90px', marginBottom: 0, padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }} 
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: COLORS.muted }}>
                                    <span style={{ fontWeight: '500' }}>Pharmacy Charges:</span>
                                    <span style={{ fontWeight: 'bold' }}>₹{modalMedTotal}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: `2px dashed ${COLORS.border}`, paddingTop: '15px' }}>
                                    <span style={{ fontSize: '16px' }}>GRAND TOTAL:</span>
                                    <span style={{ color: COLORS.primary, fontSize: '22px', fontWeight: '900' }}>₹{modalGrandTotal}</span>
                                </div>
                            </div>

                            <label style={miniLabel}>Payment Method</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                {['Cash', 'UPI', 'Card', 'Split'].map(method => (
                                    <button 
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        style={paymentMethod === method ? methodActive : methodInactive}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'Cash' && (
                                <div style={{ marginBottom: '20px', background: `${COLORS.success}15`, border: `1px solid ${COLORS.success}40`, padding: '16px', borderRadius: '12px' }}>
                                    <label style={{...miniLabel, color: COLORS.success, marginTop: 0}}>Cash Tendered</label>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ marginRight: '10px', fontSize: '20px', fontWeight: 'bold', color: COLORS.success }}>₹</span>
                                        <input 
                                            type="number" 
                                            placeholder={`Min. ₹${modalGrandTotal}`} 
                                            style={{ ...inputStyle, marginBottom: 0, fontSize: '16px', fontWeight: 'bold' }} 
                                            value={tenderAmount} 
                                            onChange={e => setTenderAmount(e.target.value)} 
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: `1px solid ${COLORS.success}40`, paddingTop: '12px' }}>
                                        <span style={{ color: COLORS.text }}>Change to Return:</span>
                                        {Number(tenderAmount) - modalGrandTotal >= 0 ? (
                                            <span style={{ color: COLORS.success, fontSize: '18px', fontWeight: '900' }}>
                                                ₹{Number(tenderAmount) - modalGrandTotal}
                                            </span>
                                        ) : (
                                            <span style={{ color: COLORS.danger }}>Requires more cash</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'Split' && (
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                    <input placeholder="Cash Amount" type="number" style={inputStyle} onChange={e => setSplitDetails({...splitDetails, cash: e.target.value})} />
                                    <input placeholder="Online Amount" type="number" style={inputStyle} onChange={e => setSplitDetails({...splitDetails, online: e.target.value})} />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button onClick={() => setShowPaymentModal(false)} style={{ ...primaryBtn, background: 'transparent', color: COLORS.text, border: `1px solid ${COLORS.border}`, boxShadow: 'none', flex: 1 }}>Cancel</button>
                                <button onClick={processFinalPayment} style={{ ...primaryBtn, background: COLORS.success, flex: 2, fontSize: '16px' }}>💳 Process & Print</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* ========================================= */}
                {/* POS PAYMENT MODAL                */}
                {/* ========================================= */}
                {/* ========================================= */}
{/* POS PAYMENT MODAL (CLEAN REACT VERSION)   */}
{/* ========================================= */}
{showPaymentModal && selectedBill && (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
        <div style={{ backgroundColor: COLORS.sidebar, width: '550px', borderRadius: '20px', padding: '30px', boxShadow: COLORS.shadow, color: COLORS.text }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '15px' }}>
                <h2 style={{ margin: 0 }}>Payment Checkout</h2>
                <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.muted }}>✖</button>
            </div>

            {/* Patient Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                <div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: COLORS.primary }}>{selectedBill.patientName}</div>
                    <div style={{ color: COLORS.muted, fontSize: '13px' }}>ID: {selectedBill.patientId}</div>
                </div>
                
                {/* Editable Bill Breakdown */}
                <div style={{ textAlign: 'right', background: COLORS.bg, padding: '10px 15px', borderRadius: '10px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', color: COLORS.muted }}>Consultation Fee:</span>
                        <input type="number" value={customConsultFee} onChange={(e) => setCustomConsultFee(e.target.value)} style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontWeight: 'bold' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: COLORS.muted, marginBottom: '8px' }}>Pharmacy: ₹{activeMedsTotal}</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.text, borderTop: `1px dashed ${COLORS.border}`, paddingTop: '5px' }}>Total: ₹{activeTotal}</div>
                </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '25px' }}>
                {['Cash', 'UPI', 'Card', 'Split'].map(method => (
                    <button key={method} onClick={() => { setPaymentMethod(method); setTenderAmount(''); }} style={{ padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', border: `2px solid ${paymentMethod === method ? COLORS.primary : COLORS.border}`, background: paymentMethod === method ? `${COLORS.primary}15` : 'transparent', color: paymentMethod === method ? COLORS.primary : COLORS.muted }}>
                        {method}
                    </button>
                ))}
            </div>

            {/* Dynamic Inputs based on Method */}
            <div style={{ marginBottom: '25px', background: COLORS.bg, padding: '20px', borderRadius: '15px', border: `1px solid ${COLORS.border}` }}>
                {paymentMethod === 'Cash' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: COLORS.muted }}>Amount Given by Patient (₹)</label>
                        <input type="number" placeholder={`Enter amount (e.g. ${activeTotal})`} value={tenderAmount} onChange={e => setTenderAmount(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '18px', fontWeight: 'bold', boxSizing: 'border-box' }} autoFocus />
                    </div>
                )}
                {(paymentMethod === 'UPI' || paymentMethod === 'Card') && (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>{paymentMethod === 'UPI' ? '📱' : '💳'}</div>
                        <div style={{ fontWeight: 'bold', color: COLORS.text }}>Collect exactly ₹{activeTotal} via {paymentMethod}</div>
                    </div>
                )}
                {paymentMethod === 'Split' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '60px', fontWeight: 'bold', color: COLORS.text }}>Cash</div>
                            <input type="number" placeholder="₹0" value={splitDetails.cash} onChange={e => setSplitDetails({...splitDetails, cash: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '16px' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '60px', fontWeight: 'bold', color: COLORS.text }}>Online</div>
                            <input type="number" placeholder="₹0" value={splitDetails.online} onChange={e => setSplitDetails({...splitDetails, online: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '16px' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Calculation Summary Box */}
            {(paymentMethod === 'Cash' || paymentMethod === 'Split') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderRadius: '10px', background: isInsufficient && totalTendered > 0 ? `${COLORS.danger}15` : changeDue > 0 ? `${COLORS.success}15` : COLORS.bg, border: `1px solid ${isInsufficient && totalTendered > 0 ? COLORS.danger : changeDue > 0 ? COLORS.success : COLORS.border}`, marginBottom: '25px' }}>
                    <div>
                        <div style={{ color: COLORS.muted, fontSize: '12px', fontWeight: 'bold' }}>Tendered</div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: COLORS.text }}>₹{totalTendered}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        {isInsufficient && totalTendered > 0 ? (
                            <>
                                <div style={{ color: COLORS.danger, fontSize: '12px', fontWeight: 'bold' }}>Shortfall</div>
                                <div style={{ fontWeight: '900', fontSize: '18px', color: COLORS.danger }}>- ₹{remainingBalance}</div>
                            </>
                        ) : (
                            <>
                                <div style={{ color: COLORS.success, fontSize: '12px', fontWeight: 'bold' }}>Change to Return</div>
                                <div style={{ fontWeight: '900', fontSize: '20px', color: COLORS.success }}>₹{changeDue}</div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <button 
                onClick={submitPayment}
                disabled={isInsufficient} 
                style={{ width: '100%', padding: '18px', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: isInsufficient ? 'not-allowed' : 'pointer', background: isInsufficient ? COLORS.border : COLORS.success, color: isInsufficient ? COLORS.muted : '#FFF' }}
            >
                {isInsufficient ? 'Insufficient Payment' : `Complete Payment (₹${activeTotal}) ➔`}
            </button>

        </div>
    </div>
)}

        </div>
    );
}

// Paste this at the bottom of the file
const getStyles = (COLORS) => ({
    cardStyle: { backgroundColor: COLORS.sidebar, padding: '30px', borderRadius: '20px', border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow, transition: 'all 0.3s ease' },
    tdStyle: { padding: '18px 15px', verticalAlign: 'middle' }
});