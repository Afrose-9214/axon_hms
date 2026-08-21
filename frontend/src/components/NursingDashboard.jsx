import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { Activity, LogOut, ClipboardList, Search, UserPlus } from 'lucide-react';

export default function NursingDashboard() {
    const { user, logout } = useContext(AuthContext);
    
    const [view, setView] = useState('triage'); 
    const [mode, setMode] = useState('search'); 
    
    // --- TRIAGE STATES ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [patientRecord, setPatientRecord] = useState(null);
    const [reason, setReason] = useState('');
    const [regData, setRegData] = useState({ patientName: '', age: '', gender: 'Male', mobile: '' });
    const [vitals, setVitals] = useState({ bp: '', pulse: '', spo2: '', temp: '', weight: '', rbs: '' });

    // --- HISTORY STATES ---
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [historySearchResults, setHistorySearchResults] = useState([]);
    const [selectedHistoryPatient, setSelectedHistoryPatient] = useState(null);
    const [patientHistoryList, setPatientHistoryList] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // --- TRIAGE FUNCTIONS ---
    const handleLookup = async () => {
        if (!searchQuery) return toast.error("Enter a Name, ID, or Phone");
        try {
            const res = await axios.get(`/api/patients/search?q=${searchQuery}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            if (res.data.length === 0) {
                toast.error("Patient not found. Switch to New Registration.");
                setSearchResults([]);
                setPatientRecord(null);
                return;
            }
            if (res.data.length === 1) {
                setPatientRecord(res.data[0]);
                setSearchResults([]);
                toast.success("Patient found!");
            } else {
                setSearchResults(res.data);
                setPatientRecord(null);
            }
        } catch (err) {
            console.error("Search Error:", err);
            toast.error("Error searching for patient.");
            setPatientRecord(null);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/patients/register', regData, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            toast.success(`Registered! ID: ${res.data.patientId}`);
            setPatientRecord(res.data);
            setMode('search'); 
        } catch (err) { toast.error("Registration Failed."); }
    };

    const handleBook = async () => {
        if(!reason) return toast.error("Please enter a reason for visit.");
        try {
            const payload = { ...patientRecord, reason, vitals, status: 'WAITING' };
            await axios.post('/api/appointments', payload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            toast.success(`Sent ${patientRecord.patientName} to Doctor Queue!`);
            setPatientRecord(null); setSearchQuery(''); setReason('');
            setVitals({ bp: '', pulse: '', spo2: '', temp: '', weight: '', rbs: '' });
        } catch (err) { toast.error("Booking failed."); }
    };

    // --- HISTORY FUNCTIONS ---
    const handleHistorySearch = async () => {
        if (!historySearchQuery) return toast.error("Enter a search term");
        try {
            const res = await axios.get(`/api/patients/search?q=${historySearchQuery}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            if (res.data.length === 0) {
                toast.error("No patient found.");
                setHistorySearchResults([]);
            } else {
                setHistorySearchResults(res.data);
            }
            setSelectedHistoryPatient(null);
            setPatientHistoryList([]);
        } catch (err) { toast.error("Search failed"); }
    };

    const fetchPatientHistory = async (patient) => {
        setSelectedHistoryPatient(patient);
        setHistorySearchResults([]);
        setIsHistoryLoading(true);
        try {
            const res = await axios.get(`/api/consultations/history/${patient.patientId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setPatientHistoryList(res.data);
        } catch (err) {
            toast.error("Failed to load history.");
        } finally {
            setIsHistoryLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-zinc-50 overflow-hidden text-zinc-900">
            <Toaster position="top-center" />

            <header className="md:hidden flex items-center justify-between p-4 bg-white border-b z-20 shadow-sm">
                <div className="font-black text-blue-600 tracking-wide text-lg">NURSING STATION</div>
                <button onClick={logout} className="text-red-500"><LogOut size={20} /></button>
            </header>

            <aside className="hidden md:flex w-[260px] bg-white flex-col p-6 border-r z-20 shadow-sm">
                <div className="mb-10 font-black text-center text-blue-600 tracking-wide text-xl">NURSING STATION</div>
                <nav className="flex-1 flex flex-col gap-3">
                    <button onClick={() => setView('triage')} className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${view === 'triage' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                        <Activity size={20} /> Triage & Vitals
                    </button>
                    <button onClick={() => setView('history')} className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${view === 'history' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                        <ClipboardList size={20} /> Patient Records
                    </button>
                </nav>
                <button onClick={logout} className="mt-auto p-4 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                    <LogOut size={18} /> Sign Out
                </button>
            </aside>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                
                {/* --------------------------- */}
                {/* TRIAGE VIEW                 */}
                {/* --------------------------- */}
                {view === 'triage' && (
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="flex justify-center gap-4 mb-8">
                            <button onClick={() => setMode('search')} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-colors ${mode === 'search' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-zinc-500 border hover:bg-zinc-50'}`}><Search size={18}/> Find Patient</button>
                            <button onClick={() => setMode('register')} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-colors ${mode === 'register' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-zinc-500 border hover:bg-zinc-50'}`}><UserPlus size={18}/> New Registration</button>
                        </div>

                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-200">
                            {mode === 'search' ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input 
                                            placeholder="Search by Name, ID, or Phone..." 
                                            className="flex-1 p-4 border border-zinc-200 rounded-xl bg-zinc-50 outline-none focus:border-blue-500 font-medium" 
                                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLookup()}
                                        />
                                        <button onClick={handleLookup} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 sm:py-0 rounded-xl font-bold shadow-sm transition-colors">Search</button>
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
                                            <div className="p-3 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase">Select a Patient:</div>
                                            {searchResults.map(p => (
                                                <div key={p._id} onClick={() => { setPatientRecord(p); setSearchResults([]); }} className="p-4 bg-white hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors">
                                                    <div>
                                                        <div className="font-bold text-slate-800">{p.patientName}</div>
                                                        <div className="text-xs text-slate-500 mt-1">{p.age} Yrs / {p.gender}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-blue-600">{p.patientId}</div>
                                                        <div className="text-xs text-slate-500 mt-1">📞 {p.mobile}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {patientRecord && (
                                        <div className="p-6 border border-blue-100 bg-blue-50/50 rounded-2xl space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-2xl font-black text-slate-800">{patientRecord.patientName}</h3>
                                                    <p className="text-sm font-bold text-blue-600 mt-1">{patientRecord.patientId} <span className="text-slate-400 mx-2">|</span> {patientRecord.gender} <span className="text-slate-400 mx-2">|</span> {patientRecord.age} Yrs</p>
                                                </div>
                                                <button onClick={() => setPatientRecord(null)} className="text-xs text-slate-400 hover:text-red-500 font-bold underline">Change</button>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason for Visit</label>
                                                <textarea placeholder="Describe symptoms or reason for visit..." className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white" rows="2" value={reason} onChange={e => setReason(e.target.value)} />
                                            </div>
                                            
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Record Vitals</label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    <input placeholder="BP (120/80)" className="p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-blue-500" value={vitals.bp} onChange={e=>setVitals({...vitals, bp: e.target.value})} />
                                                    <input placeholder="Pulse (bpm)" className="p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-blue-500" value={vitals.pulse} onChange={e=>setVitals({...vitals, pulse: e.target.value})} />
                                                    <input placeholder="SpO2 (%)" className="p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-blue-500" value={vitals.spo2} onChange={e=>setVitals({...vitals, spo2: e.target.value})} />
                                                    <input placeholder="Temp (°F)" className="p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-blue-500" value={vitals.temp} onChange={e=>setVitals({...vitals, temp: e.target.value})} />
                                                    <input placeholder="Weight (kg)" className="p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-blue-500" value={vitals.weight} onChange={e=>setVitals({...vitals, weight: e.target.value})} />
                                                    <input placeholder="RBS" className="p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-blue-500" value={vitals.rbs} onChange={e=>setVitals({...vitals, rbs: e.target.value})} />
                                                </div>
                                            </div>

                                            <button onClick={handleBook} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-xl shadow-md shadow-emerald-200 transition-all active:scale-95">Send to Doctor Queue ➔</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <h3 className="text-xl font-bold mb-6 text-slate-800">Register New Patient</h3>
                                    <input placeholder="Full Name" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500" onChange={e => setRegData({...regData, patientName: e.target.value})} required />
                                    <div className="flex gap-4">
                                        <input placeholder="Age" type="number" className="w-1/2 p-4 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500" onChange={e => setRegData({...regData, age: e.target.value})} />
                                        <select className="w-1/2 p-4 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500" onChange={e => setRegData({...regData, gender: e.target.value})}>
                                            <option value="Male">Male</option><option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <input placeholder="Mobile Number" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500" onChange={e => setRegData({...regData, mobile: e.target.value})} required />
                                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl mt-4 shadow-md shadow-blue-200 transition-all active:scale-95">Register & Generate ID</button>
                                </form>
                            )}
                        </div>
                    </div>
                )}
                
                {/* --------------------------- */}
                {/* PATIENT HISTORY VIEW        */}
                {/* --------------------------- */}
                {view === 'history' && (
                    <div className="max-w-4xl mx-auto w-full">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Patient Records System</h2>
                        
                        {/* Search Box for History */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 mb-6">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input 
                                    placeholder="Search Patient by Name, ID, or Phone..." 
                                    className="flex-1 p-4 border border-zinc-200 rounded-xl bg-zinc-50 outline-none focus:border-blue-500 font-medium" 
                                    value={historySearchQuery} 
                                    onChange={e => setHistorySearchQuery(e.target.value)} 
                                    onKeyDown={e => e.key === 'Enter' && handleHistorySearch()}
                                />
                                <button onClick={handleHistorySearch} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 sm:py-0 rounded-xl font-bold shadow-sm transition-colors">Search</button>
                            </div>

                            {/* Dropdown for multiple results */}
                            {historySearchResults.length > 0 && (
                                <div className="mt-4 border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
                                    <div className="p-3 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase">Select Patient Profile:</div>
                                    {historySearchResults.map(p => (
                                        <div key={p._id} onClick={() => fetchPatientHistory(p)} className="p-4 bg-white hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors">
                                            <div>
                                                <div className="font-bold text-slate-800">{p.patientName}</div>
                                                <div className="text-xs text-slate-500 mt-1">{p.age} Yrs / {p.gender}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-blue-600">{p.patientId}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* History Timeline */}
                        {selectedHistoryPatient && (
                            <div className="space-y-6">
                                {/* Selected Patient Header */}
                                <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800">{selectedHistoryPatient.patientName}</h3>
                                        <p className="text-sm font-bold text-blue-600 mt-1">{selectedHistoryPatient.patientId}</p>
                                    </div>
                                    <button onClick={() => setSelectedHistoryPatient(null)} className="text-sm text-blue-600 font-bold underline">Clear Profile</button>
                                </div>

                                {/* Timeline List */}
                                <div className="space-y-4 pb-8">
                                    <h4 className="font-bold text-slate-500 uppercase tracking-wider text-sm">Consultation History</h4>
                                    
                                    {isHistoryLoading ? (
                                        <p className="text-slate-500 font-medium">Loading history...</p>
                                    ) : patientHistoryList.length === 0 ? (
                                        <div className="bg-white p-8 text-center rounded-2xl border border-zinc-200 text-slate-500 font-medium">
                                            No previous consultations found for this patient.
                                        </div>
                                    ) : (
                                        patientHistoryList.map((visit, index) => (
                                            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 hover:border-blue-300 transition-colors">
                                                <div className="flex justify-between items-start mb-4 border-b pb-4">
                                                    <div>
                                                        <div className="font-bold text-lg text-slate-800">{new Date(visit.createdAt).toLocaleDateString()}</div>
                                                        <div className="text-xs font-bold text-slate-400 mt-1">{new Date(visit.createdAt).toLocaleTimeString()}</div>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-md text-[10px] font-black tracking-wider ${visit.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {visit.status}
                                                    </span>
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnosis / Doctor Notes</div>
                                                    <p className="text-slate-700 mt-1 font-medium">{visit.diagnosis || visit.notes || 'No specific notes recorded.'}</p>
                                                </div>
                                                
                                                {visit.medicines && visit.medicines.length > 0 && (
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prescribed Medicines</div>
                                                        <ul className="list-disc pl-5 text-sm text-slate-700 font-medium space-y-1">
                                                            {visit.medicines.map((m, i) => (
                                                                <li key={i}>{m.name} <span className="text-slate-400 ml-1">(Qty: {m.qty})</span> - {m.dosage}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-50 pb-safe">
                <button onClick={() => setView('triage')} className={`flex flex-col items-center gap-1 ${view === 'triage' ? 'text-blue-600' : 'text-slate-400'}`}><Activity size={20} /><span className="text-[10px] font-bold">Triage</span></button>
                <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1 ${view === 'history' ? 'text-blue-600' : 'text-slate-400'}`}><ClipboardList size={20} /><span className="text-[10px] font-bold">Records</span></button>
            </nav>
        </div>
    );
}