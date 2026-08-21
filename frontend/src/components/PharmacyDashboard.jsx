import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast, { Toaster } from 'react-hot-toast';
import { Receipt, Package, LogOut, CheckCircle, X, CreditCard, Banknote, Smartphone, SplitSquareHorizontal } from 'lucide-react';

export default function PharmacyDashboard() {
    const { user, logout } = useContext(AuthContext);
    
    const [view, setView] = useState('billing'); 

    // DATA STATES
    const [pendingBills, setPendingBills] = useState([]);
    const [inventory, setInventory] = useState([]);
    
    // INVENTORY FORM STATE
    const [formData, setFormData] = useState({
        itemName: '', batchNumber: '', expiryDate: '', hsnCode: '', 
        gstPercent: 12, mrpPerUnit: '', salePricePerUnit: '', stockQuantity: ''
    });

    // POS CHECKOUT STATES
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Cash'); 
    const [splitDetails, setSplitDetails] = useState({ cash: '', online: '' });
    const [customConsultFee, setCustomConsultFee] = useState(0);
    const [tenderAmount, setTenderAmount] = useState('');

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            if(view === 'billing') fetchData();
        }, 10000);
        return () => clearInterval(interval);
    }, [view, user.token]);

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

    // --- INVENTORY FUNCTIONS ---
    const handleInventoryChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/inventory/add', formData, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            toast.success("Medicine added to inventory!");
            setFormData({ itemName: '', batchNumber: '', expiryDate: '', hsnCode: '', gstPercent: 12, mrpPerUnit: '', salePricePerUnit: '', stockQuantity: '' });
            fetchData();
        } catch (error) {
            toast.error("Failed to add inventory item.");
        }
    };

    // --- POS CHECKOUT FUNCTIONS ---
    const openPaymentModal = (bill) => {
        setSelectedBill(bill);
        setPaymentMethod('Cash');
        setTenderAmount('');
        setSplitDetails({ cash: '', online: '' });
        setCustomConsultFee(bill.consultationFee || 500); 
        setShowPaymentModal(true);
    };

    const generateInvoicePDF = (bill, consultFee, grandTotal) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.text("AXON MEDICAL CENTER - RECEIPT", 74, 15, { align: "center" });
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Patient: ${bill.patientName} (${bill.patientId})`, 10, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 36);
        
        let currentY = 45;
        if (bill.medicines && bill.medicines.length > 0) {
            autoTable(doc, {
                startY: currentY,
                head: [['Medicine', 'Qty', 'Price', 'Total']],
                body: bill.medicines.map(m => [m.name, m.qty, `Rs.${m.price}`, `Rs.${(m.price * m.qty)}`]),
                theme: 'grid', styles: { fontSize: 9 }
            });
            currentY = doc.lastAutoTable.finalY + 10;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`Consultation Fee: Rs.${consultFee}`, 10, currentY);
        doc.text(`Grand Total: Rs.${grandTotal}`, 10, currentY + 8);
        doc.text(`Payment Method: ${paymentMethod.toUpperCase()}`, 10, currentY + 16);
        doc.save(`Invoice_${bill.patientId}.pdf`);
    };

    const submitPayment = async () => {
        if (!selectedBill) return toast.error("Bill is missing.");
        try {
            toast.loading("Processing payment...");
            await axios.patch(`/api/consultations/${selectedBill._id}`, { 
                status: 'PAID', 
                paymentMethod: paymentMethod.toUpperCase(),
                consultationFee: customConsultFee, 
                paymentDetails: paymentMethod === 'Split' ? splitDetails : { amount: activeTotal }
            }, { headers: { Authorization: `Bearer ${user.token}` } });

            generateInvoicePDF(selectedBill, customConsultFee, activeTotal);
            
            toast.dismiss();
            toast.success("Payment successful! Inventory updated & PDF Generated.");
            
            setPendingBills(prev => prev.filter(b => b._id !== selectedBill._id));
            setShowPaymentModal(false);
            setSelectedBill(null); 
        } catch (err) {
            toast.dismiss();
            toast.error(err.response?.data?.message || "Payment failed");
        }
    };

    // POS Math Setup
    const activeMedsTotal = selectedBill?.medicines ? selectedBill.medicines.reduce((sum, m) => sum + ((m.price || 0) * (m.qty || 1)), 0) : 0;
    const activeTotal = parseFloat(customConsultFee || 0) + activeMedsTotal;

    let totalTendered = 0;
    if (paymentMethod === 'Cash') totalTendered = parseFloat(tenderAmount) || 0;
    else if (paymentMethod === 'Split') totalTendered = (parseFloat(splitDetails.cash) || 0) + (parseFloat(splitDetails.online) || 0);
    else totalTendered = activeTotal;

    const isInsufficient = totalTendered < activeTotal;
    const changeDue = totalTendered > activeTotal ? totalTendered - activeTotal : 0;
    const remainingBalance = activeTotal - totalTendered;

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 overflow-hidden text-slate-900">
            <Toaster position="top-center" />

            <header className="md:hidden flex items-center justify-between p-4 bg-white border-b z-20 shadow-sm">
                <div className="font-black text-emerald-600 tracking-wide text-lg">AXON PHARMACY</div>
                <button onClick={logout} className="text-red-500"><LogOut size={20} /></button>
            </header>

            <aside className="hidden md:flex w-[260px] bg-white flex-col p-6 border-r z-20 shadow-sm">
                <div className="mb-10 font-black text-center text-emerald-600 tracking-wider text-xl">AXON PHARMACY</div>
                <nav className="flex-1 flex flex-col gap-3">
                    <button onClick={() => setView('billing')} className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${view === 'billing' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Receipt size={20} /> Pending Bills
                    </button>
                    <button onClick={() => setView('inventory')} className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${view === 'inventory' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Package size={20} /> Inventory
                    </button>
                </nav>
                <button onClick={logout} className="mt-auto p-4 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                    <LogOut size={18}/> Sign Out
                </button>
            </aside>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                
                {/* BILLING MODULE */}
                {view === 'billing' && (
                    <div className="max-w-6xl mx-auto w-full">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800">Pending Payments</h2>
                        
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full min-w-[800px] text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="p-5 font-semibold">Date / Time</th>
                                            <th className="p-5 font-semibold">Patient Details</th>
                                            <th className="p-5 font-semibold">Bill Breakdown</th>
                                            <th className="p-5 font-semibold">Total Amount</th>
                                            <th className="p-5 font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pendingBills.length > 0 ? pendingBills.map((bill) => {
                                            const medsTotal = bill.medicines ? bill.medicines.reduce((sum, m) => sum + ((m.price||0) * (m.qty||1)), 0) : 0;
                                            const grandTotal = (bill.consultationFee || 500) + medsTotal;

                                            return (
                                                <tr key={bill._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-5">
                                                        <div className="font-bold text-slate-700">{new Date(bill.createdAt).toLocaleDateString()}</div>
                                                        <div className="text-xs text-slate-400">{new Date(bill.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="font-bold text-emerald-600 text-base">{bill.patientName}</div>
                                                        <div className="text-xs text-slate-500 font-medium">{bill.patientId}</div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="text-sm text-slate-600">Consultation: ₹{bill.consultationFee || 500}</div>
                                                        <div className="text-sm text-slate-600">Pharmacy: ₹{medsTotal}</div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="font-black text-xl text-slate-800">₹{grandTotal}</div>
                                                        <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-md tracking-wider">UNPAID</span>
                                                    </td>
                                                    <td className="p-5">
                                                        <button onClick={() => openPaymentModal(bill)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm shadow-emerald-200 transition-transform active:scale-95 whitespace-nowrap">
                                                            💳 Collect Payment
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="5" className="p-16 text-center text-slate-400">
                                                    <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                                                    <div className="text-lg font-semibold">Queue is clear!</div>
                                                    <p className="text-sm">No pending bills to collect.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* INVENTORY MODULE */}
                {view === 'inventory' && (
                    <div className="max-w-6xl mx-auto w-full space-y-8">
                        
                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Package className="text-emerald-500"/> Add New Medicine Arrival</h3>
                            
                            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <input type="text" name="itemName" placeholder="Medicine Name" value={formData.itemName} onChange={handleInventoryChange} required className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 lg:col-span-2" />
                                <input type="text" name="batchNumber" placeholder="Batch No (BNO:123)" value={formData.batchNumber} onChange={handleInventoryChange} required className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                                <input type="text" name="expiryDate" placeholder="Exp Date (MM/YY)" value={formData.expiryDate} onChange={handleInventoryChange} required className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                                
                                <input type="text" name="hsnCode" placeholder="HSN Code" value={formData.hsnCode} onChange={handleInventoryChange} required className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                                <select name="gstPercent" value={formData.gstPercent} onChange={handleInventoryChange} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500">
                                    <option value="0">0% GST</option><option value="5">5% GST</option><option value="12">12% GST</option><option value="18">18% GST</option>
                                </select>
                                
                                <input type="number" step="0.01" name="mrpPerUnit" placeholder="MRP (₹)" value={formData.mrpPerUnit} onChange={handleInventoryChange} required className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                                <input type="number" step="0.01" name="salePricePerUnit" placeholder="Sale Price (₹)" value={formData.salePricePerUnit} onChange={handleInventoryChange} required className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                                
                                <input type="number" name="stockQuantity" placeholder="Initial Stock Qty" value={formData.stockQuantity} onChange={handleInventoryChange} required className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 lg:col-span-2" />
                                
                                <button type="submit" className="lg:col-span-2 p-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm transition-colors">
                                    + Add to Database
                                </button>
                            </form>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-800">Current Stock Levels</h3>
                            </div>
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-semibold">Item Name</th>
                                            <th className="p-4 font-semibold">Batch / Exp</th>
                                            <th className="p-4 font-semibold">HSN / GST</th>
                                            <th className="p-4 font-semibold">Pricing (₹)</th>
                                            <th className="p-4 font-semibold">In Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {inventory.map(item => (
                                            <tr key={item._id} className={`${item.stockQuantity < 20 ? 'bg-red-50/50' : 'hover:bg-slate-50'} transition-colors`}>
                                                <td className="p-4 font-bold text-slate-700">{item.itemName}</td>
                                                <td className="p-4 text-sm text-slate-600">{item.batchNumber} <br/><span className="text-xs text-slate-400">Exp: {item.expiryDate}</span></td>
                                                <td className="p-4 text-sm text-slate-600">{item.hsnCode} <br/><span className="text-xs text-slate-400">{item.gstPercent}% GST</span></td>
                                                <td className="p-4 text-sm text-slate-600">MRP: {item.mrpPerUnit} <br/><span className="font-semibold text-emerald-600">Sale: {item.salePricePerUnit}</span></td>
                                                <td className="p-4">
                                                    <span className={`font-black text-lg ${item.stockQuantity < 20 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {item.stockQuantity}
                                                    </span>
                                                    <span className="text-xs ml-1 text-slate-500">Units</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* --- POS CHECKOUT MODAL OVERLAY --- */}
            {showPaymentModal && selectedBill && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        
                        <button onClick={() => setShowPaymentModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-black text-slate-800 mb-1">Payment Checkout</h2>
                        <p className="text-emerald-600 font-bold mb-6">{selectedBill.patientName} <span className="text-slate-400 font-normal ml-2">({selectedBill.patientId})</span></p>
                        
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-semibold text-slate-600">Consultation Fee:</span>
                                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-3 py-1">
                                    <span className="text-slate-400 font-bold">₹</span>
                                    <input type="number" value={customConsultFee} onChange={(e) => setCustomConsultFee(e.target.value)} className="w-16 text-right font-bold outline-none text-slate-700 bg-transparent" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 border-dashed">
                                <span className="text-sm font-semibold text-slate-600">Pharmacy Charges:</span>
                                <span className="font-bold text-slate-700">₹{activeMedsTotal}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-black text-slate-800">GRAND TOTAL:</span>
                                <span className="text-3xl font-black text-emerald-600">₹{activeTotal}</span>
                            </div>
                        </div>

                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Method</label>
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {[
                                { name: 'Cash', icon: <Banknote size={16}/> },
                                { name: 'UPI', icon: <Smartphone size={16}/> },
                                { name: 'Card', icon: <CreditCard size={16}/> },
                                { name: 'Split', icon: <SplitSquareHorizontal size={16}/> }
                            ].map(method => (
                                <button key={method.name} onClick={() => { setPaymentMethod(method.name); setTenderAmount(''); }} 
                                    className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 font-bold text-xs gap-1 transition-all
                                    ${paymentMethod === method.name ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}>
                                    {method.icon}
                                    {method.name}
                                </button>
                            ))}
                        </div>

                        <div className="mb-6">
                            {paymentMethod === 'Cash' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount Given by Patient (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-emerald-500">₹</span>
                                        <input type="number" placeholder={activeTotal.toString()} value={tenderAmount} onChange={e => setTenderAmount(e.target.value)} className="w-full p-4 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-slate-800 outline-none focus:border-emerald-500 transition-colors" autoFocus />
                                    </div>
                                </div>
                            )}
                            {(paymentMethod === 'UPI' || paymentMethod === 'Card') && (
                                <div className="text-center p-6 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="text-4xl mb-2">{paymentMethod === 'UPI' ? '📱' : '💳'}</div>
                                    <div className="font-bold text-slate-700">Collect exactly <span className="text-emerald-600 font-black">₹{activeTotal}</span> via {paymentMethod}</div>
                                </div>
                            )}
                            {paymentMethod === 'Split' && (
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cash (₹)</label>
                                        <input type="number" placeholder="0" value={splitDetails.cash} onChange={e => setSplitDetails({...splitDetails, cash: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Online (₹)</label>
                                        <input type="number" placeholder="0" value={splitDetails.online} onChange={e => setSplitDetails({...splitDetails, online: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-emerald-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {(paymentMethod === 'Cash' || paymentMethod === 'Split') && (
                            <div className={`flex justify-between p-5 rounded-xl border mb-6 transition-colors
                                ${isInsufficient && totalTendered > 0 ? 'bg-red-50 border-red-200' : changeDue > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tendered</div>
                                    <div className="font-black text-lg text-slate-800">₹{totalTendered}</div>
                                </div>
                                <div className="text-right">
                                    {isInsufficient && totalTendered > 0 ? (
                                        <>
                                            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Shortfall</div>
                                            <div className="font-black text-xl text-red-600">- ₹{remainingBalance}</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Change to Return</div>
                                            <div className="font-black text-2xl text-emerald-600">₹{changeDue}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <button onClick={submitPayment} disabled={isInsufficient} 
                            className={`w-full p-4 rounded-xl font-black text-lg transition-all shadow-md active:scale-95
                            ${isInsufficient ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'}`}>
                            {isInsufficient ? 'Insufficient Payment' : `Complete Payment (₹${activeTotal}) ➔`}
                        </button>
                    </div>
                </div>
            )}

            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-50 pb-safe">
                <button onClick={() => setView('billing')} className={`flex flex-col items-center gap-1 ${view === 'billing' ? 'text-emerald-600' : 'text-slate-400'}`}><Receipt size={20} /><span className="text-[10px] font-bold">Billing</span></button>
                <button onClick={() => setView('inventory')} className={`flex flex-col items-center gap-1 ${view === 'inventory' ? 'text-emerald-600' : 'text-slate-400'}`}><Package size={20} /><span className="text-[10px] font-bold">Inventory</span></button>
            </nav>
        </div>
    );
}