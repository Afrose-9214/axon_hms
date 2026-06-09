import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function InventoryDashboard() {
    const { user } = useContext(AuthContext);
    const [inventory, setInventory] = useState([]);
    
    // Form State
    const [formData, setFormData] = useState({
        itemName: '', batchNumber: '', expiryDate: '', hsnCode: '', 
        gstPercent: 12, mrpPerUnit: '', salePricePerUnit: '', stockQuantity: ''
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const response = await axios.get('/api/inventory', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setInventory(response.data);
        } catch (error) {
            console.error("Failed to fetch inventory", error);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/inventory/add', formData, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            alert("✅ Medicine added successfully!");
            setFormData({ itemName: '', batchNumber: '', expiryDate: '', hsnCode: '', gstPercent: 12, mrpPerUnit: '', salePricePerUnit: '', stockQuantity: '' });
            fetchInventory();
        } catch (error) {
            alert("Error adding item");
            console.error(error);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '40px auto', fontFamily: 'sans-serif' }}>
            <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>📦 Pharmacy Inventory Management</h2>

            {/* Add New Item Form */}
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                <h3 style={{ marginTop: 0 }}>Add New Medicine Arrival</h3>
                <form onSubmit={handleAddItem} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <input type="text" name="itemName" placeholder="Medicine Name (e.g., PARACETAMOL 500MG)" value={formData.itemName} onChange={handleInputChange} required style={{ padding: '8px' }} />
                    <input type="text" name="batchNumber" placeholder="Batch Number (e.g., BNO:12345)" value={formData.batchNumber} onChange={handleInputChange} required style={{ padding: '8px' }} />
                    <input type="text" name="expiryDate" placeholder="Expiry Date (e.g., 05/28)" value={formData.expiryDate} onChange={handleInputChange} required style={{ padding: '8px' }} />
                    <input type="text" name="hsnCode" placeholder="HSN Code (e.g., 3004)" value={formData.hsnCode} onChange={handleInputChange} required style={{ padding: '8px' }} />
                    
                    <div>
                        <label style={{ fontSize: '14px' }}>GST %: </label>
                        <select name="gstPercent" value={formData.gstPercent} onChange={handleInputChange} style={{ padding: '8px', width: '100%' }}>
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                        </select>
                    </div>
                    
                    <input type="number" step="0.01" name="mrpPerUnit" placeholder="MRP Per Unit (₹)" value={formData.mrpPerUnit} onChange={handleInputChange} required style={{ padding: '8px' }} />
                    <input type="number" step="0.01" name="salePricePerUnit" placeholder="Sale Price Per Unit (₹)" value={formData.salePricePerUnit} onChange={handleInputChange} required style={{ padding: '8px' }} />
                    <input type="number" name="stockQuantity" placeholder="Initial Stock Quantity" value={formData.stockQuantity} onChange={handleInputChange} required style={{ padding: '8px' }} />
                    
                    <button type="submit" style={{ gridColumn: 'span 2', padding: '12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
                        + Add to Database
                    </button>
                </form>
            </div>

            {/* Current Stock Table */}
            <h3>Current Stock Levels</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                        <th style={{ padding: '10px' }}>Item Name</th>
                        <th style={{ padding: '10px' }}>Batch / Exp</th>
                        <th style={{ padding: '10px' }}>HSN / GST</th>
                        <th style={{ padding: '10px' }}>MRP / Sale (₹)</th>
                        <th style={{ padding: '10px' }}>In Stock</th>
                    </tr>
                </thead>
                <tbody>
                    {inventory.map(item => (
                        <tr key={item._id} style={{ borderBottom: '1px solid #ccc', backgroundColor: item.stockQuantity < 20 ? '#fef2f2' : '#fff' }}>
                            <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.itemName}</td>
                            <td style={{ padding: '10px' }}>{item.batchNumber} <br/><small>Exp: {item.expiryDate}</small></td>
                            <td style={{ padding: '10px' }}>{item.hsnCode} <br/><small>{item.gstPercent}% GST</small></td>
                            <td style={{ padding: '10px' }}>MRP: {item.mrpPerUnit} <br/>Sale: {item.salePricePerUnit}</td>
                            <td style={{ padding: '10px', color: item.stockQuantity < 20 ? 'red' : 'green', fontWeight: 'bold' }}>
                                {item.stockQuantity} Units
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}