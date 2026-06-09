import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function POSCheckout({ billData, onComplete, onCancel }) {
    const { user } = useContext(AuthContext);
    
    // Track the live balance as payments are made
    const [currentBill, setCurrentBill] = useState(billData);
    const [paymentAmount, setPaymentAmount] = useState(billData.grandTotal);
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = async () => {
        if (paymentAmount <= 0) return alert("Please enter a valid amount.");
        if (paymentAmount > currentBill.remainingBalance) return alert("Amount exceeds the remaining balance!");

        setIsProcessing(true);
        try {
            const response = await axios.post('/api/pos/process-payment', {
                billId: currentBill._id,
                amount: paymentAmount,
                method: paymentMethod
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            // Update the UI with the new balance from the database
            setCurrentBill(response.data.updatedBill);
            
            // Auto-fill the input with whatever balance is left
            setPaymentAmount(response.data.updatedBill.remainingBalance);
            
        } catch (error) {
            alert(error.response?.data?.message || "Payment Failed");
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={{ border: '2px solid #2563eb', padding: '30px', borderRadius: '8px', backgroundColor: '#f8fafc', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#1e293b' }}>💳 POS Payment Terminal</h2>
                <h2 style={{ margin: 0, color: '#dc2626' }}>Balance Due: ₹{currentBill.remainingBalance}</h2>
            </div>

            {currentBill.status === 'PAID' ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <h1 style={{ color: '#16a34a', fontSize: '40px', margin: '0 0 10px 0' }}>✅ PAID IN FULL</h1>
                    <p>All payments successfully recorded.</p>
                    <button onClick={onComplete} style={{ padding: '12px 24px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', marginTop: '10px' }}>
                        Close Terminal & Return to Queue
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '30px' }}>
                    {/* Left Side: Payment Controls */}
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Amount to Collect (₹)</label>
                        <input 
                            type="number" 
                            value={paymentAmount ?? ''}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            style={{ width: '100%', padding: '12px', fontSize: '18px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />

                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Payment Method</label>
                        <select 
                            value={paymentMethod} 
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            style={{ width: '100%', padding: '12px', fontSize: '18px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="UPI">UPI (QR Code)</option>
                            <option value="CARD">Credit/Debit Card</option>
                            <option value="CASH">Cash Drawer</option>
                        </select>

                        <button 
                            onClick={handlePayment} 
                            disabled={isProcessing}
                            style={{ width: '100%', padding: '15px', backgroundColor: paymentMethod === 'CASH' ? '#16a34a' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
                        >
                            {isProcessing ? "Processing..." : `Process ₹${paymentAmount} via ${paymentMethod}`}
                        </button>
                        
                        <button onClick={onCancel} style={{ width: '100%', padding: '10px', marginTop: '15px', backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}>
                            Cancel & Return to Receipt
                        </button>
                    </div>

                    {/* Right Side: Transaction History */}
                    <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Transaction Log</h3>
                        <p style={{ margin: '5px 0' }}><strong>Grand Total:</strong> ₹{currentBill.grandTotal}</p>
                        
                        // NEW CRASH-PROOF CODE
                            {(!currentBill.payments || currentBill.payments.length === 0) ? (
                                <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '20px' }}>No payments recorded yet.</p>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
                                    {currentBill.payments.map((pmt, idx) => (
                                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', marginBottom: '5px' }}>
                                        <span><strong style={{ color: pmt.method === 'CASH' ? '#16a34a' : '#2563eb' }}>{pmt.method}</strong></span>
                                        <span>₹{pmt.amount}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}