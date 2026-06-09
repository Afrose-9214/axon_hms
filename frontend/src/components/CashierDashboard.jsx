import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

// COLORS matched to your screenshot's dark theme
const COLORS = {
    bg: '#0F172A',
    sidebar: '#1E293B',
    primary: '#4F46E5',
    secondary: '#0EA5E9',
    border: '#334155',
    white: '#FFFFFF',
    muted: '#94A3B8',
    danger: '#EF4444',
    success: '#10B981'
};

export default function CashierDashboard() {
    const { user, logout } = useContext(AuthContext);
    
    // --- NAVIGATION & UI STATE ---
    // This is the key: 'view' determines which screen is shown
    const [view, setView] = useState('billing'); 
    const [mode, setMode] = useState('search'); 
    const [isCollapsed, setIsCollapsed] = useState(false);

    // --- DATA STATES (Verified with your previous logic) ---
    const [prescriptions, setPrescriptions] = useState([]);
    const [patientId, setPatientId] = useState('');
    const [patientRecord, setPatientRecord] = useState(null);
    const [reason, setReason] = useState('');
    const [regData, setRegData] = useState({ patientName: '', age: '', gender: 'Male', mobile: '' });

    // --- AUTO-REFRESH BILLING LIST ---
    useEffect(() => {
        const fetchBills = async () => {
            try {
                const res = await axios.get('/api/cashier/pending', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setPrescriptions(res.data || []);
            } catch (err) { console.error("Sync Error", err); }
        };
        fetchBills();
        const interval = setInterval(fetchBills, 10000);
        return () => clearInterval(interval);
    }, [user.token]);

    // --- SEARCH LOGIC (From your previous reference) ---
    const handleLookup = async () => {
        if (!patientId) return alert("Please enter a Patient ID");
        try {
            const res = await axios.get(`/api/patients/search?id=${patientId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setPatientRecord(res.data);
        } catch (err) {
            alert("ID not found. Switch to 'New Registration' tab.");
            setPatientRecord(null);
        }
    };

    // --- REGISTRATION LOGIC (From your previous reference) ---
    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/patients/register', regData, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            alert(`Registration Success! ID: ${res.data.patientId}`);
            setPatientRecord(res.data);
            setMode('search'); // Move to search to book appointment
        } catch (err) { alert("Registration Failed. Check backend."); }
    };

    // --- BOOKING LOGIC (Pushes to Doctor Dashboard) ---
    const handleBook = async () => {
        try {
            const payload = { ...patientRecord, reason, status: 'WAITING' };
            await axios.post('/api/appointments', payload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            alert(`Sent ${patientRecord.patientName} to Doctor Queue!`);
            setPatientRecord(null);
            setPatientId('');
            setReason('');
        } catch (err) { alert("Booking failed. Check /api/appointments route."); }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: COLORS.bg, color: 'white', overflow: 'hidden' }}>
            
            {/* 1. SIDEBAR (Ensures menu is always present) */}
            <aside style={{ width: isCollapsed ? '80px' : '260px', backgroundColor: COLORS.sidebar, padding: '25px 15px', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${COLORS.border}`, transition: '0.3s' }}>
                <div style={{ marginBottom: '40px', fontWeight: '800', textAlign: 'center', color: COLORS.secondary }}>
                    {!isCollapsed ? 'AXON HMS' : 'AX'}
                </div>
                
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <SidebarItem active={view === 'billing'} icon="💊" label="Pharmacy" onClick={() => setView('billing')} collapsed={isCollapsed} />
                    <SidebarItem active={view === 'scheduling'} icon="📅" label="Registration" onClick={() => setView('scheduling')} collapsed={isCollapsed} />
                </nav>

                <button onClick={logout} style={logoutBtnStyle}>
                    🚪 {!isCollapsed && "Logout"}
                </button>
            </aside>

            {/* 2. MAIN CONTENT AREA */}
            <main style={{ flex: 1, padding: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                
                {view === 'billing' ? (
                    /* THE PHARMACY SCREEN (Matches your screenshot) */
                    <div style={{ textAlign: 'center', width: '100%' }}>
                    <h1>{view === 'billing' ? 'NEW VERSION ACTIVE' : '📅 Patient Scheduling'}</h1>                        
                        <div style={cardStyle}>
                            <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Pending Prescriptions ({prescriptions.length})</h3>
                            <p style={{ color: COLORS.muted }}>No patients in the queue right now.</p>
                            
                            {prescriptions.length > 0 && (
                                <table style={{width: '100%', marginTop: '20px'}}>
                                    {/* Table rows would go here */}
                                </table>
                            )}
                        </div>
                    </div>
                ) : (
                    /* THE REGISTRATION & APPOINTMENT SCREEN (The Update) */
                    <div style={{ width: '100%', maxWidth: '700px' }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Appointment Scheduling</h2>
                        
                        {/* Tabs to switch between Search and Register */}
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', justifyContent: 'center' }}>
                            <button onClick={() => setMode('search')} style={mode === 'search' ? activeTab : inactiveTab}>Find Patient</button>
                            <button onClick={() => setMode('register')} style={mode === 'register' ? activeTab : inactiveTab}>New Registration</button>
                        </div>

                        {mode === 'search' ? (
                            <div style={cardStyle}>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <input placeholder="Enter ID (e.g. AX-1001)" style={inputStyle} value={patientId} onChange={e => setPatientId(e.target.value.toUpperCase())} />
                                    <button onClick={handleLookup} style={primaryBtn}>Search</button>
                                </div>
                                
                                {patientRecord && (
                                    <div style={confirmBox}>
                                        <h3 style={{ margin: '0 0 10px 0', color: COLORS.secondary }}>{patientRecord.patientName}</h3>
                                        <p style={{ margin: '0 0 15px 0', color: COLORS.muted }}>{patientRecord.patientId} | {patientRecord.gender} | {patientRecord.age}Y</p>
                                        <textarea placeholder="Reason for consultation..." style={{ ...inputStyle, minHeight: '80px', marginBottom: '15px' }} value={reason} onChange={e => setReason(e.target.value)} />
                                        <button onClick={handleBook} style={bookBtn}>Confirm Appointment ➔</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={cardStyle}>
                                <h3>Register New Walk-in</h3>
                                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                                    <input placeholder="Full Name" style={inputStyle} onChange={e => setRegData({...regData, patientName: e.target.value})} required />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input placeholder="Age" type="number" style={inputStyle} onChange={e => setRegData({...regData, age: e.target.value})} />
                                        <select style={inputStyle} onChange={e => setRegData({...regData, gender: e.target.value})}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <input placeholder="Mobile Number" style={inputStyle} onChange={e => setRegData({...regData, mobile: e.target.value})} required />
                                    <button type="submit" style={bookBtn}>Register & Generate ID</button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

// --- SHARED UI COMPONENTS ---
const SidebarItem = ({ active, icon, label, onClick, collapsed }) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: 'none', borderRadius: '10px', cursor: 'pointer', backgroundColor: active ? 'rgba(79, 70, 229, 0.2)' : 'transparent', color: active ? 'white' : COLORS.muted, width: '100%', textAlign: 'left' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span> {!collapsed && <span style={{ fontWeight: '600' }}>{label}</span>}
    </button>
);

const cardStyle = { backgroundColor: '#1E293B', padding: '30px', borderRadius: '20px', border: `1px solid ${COLORS.border}`, width: '100%' };
const inputStyle = { width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: '#0F172A', color: 'white', boxSizing: 'border-box' };
const primaryBtn = { backgroundColor: COLORS.primary, color: 'white', padding: '0 25px', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const bookBtn = { width: '100%', padding: '15px', backgroundColor: COLORS.success, color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const activeTab = { padding: '12px 25px', backgroundColor: COLORS.primary, color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const inactiveTab = { padding: '12px 25px', backgroundColor: '#1E293B', color: COLORS.muted, border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer' };
const confirmBox = { backgroundColor: '#0F172A', padding: '20px', borderRadius: '15px', border: `1px solid ${COLORS.secondary}`, marginTop: '10px' };
const logoutBtnStyle = { marginTop: 'auto', padding: '12px', backgroundColor: COLORS.danger, color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };