import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';

// Components
import Login from './components/Login';
import DoctorDashboard from './components/DoctorDashboard';
import PharmacyDashboard from './components/PharmacyDashboard';
import InventoryDashboard from './components/InventoryDashboard';
import CashierDashboard from './components/CashierDashboard';

// --- PROTECTED ROUTE (Handles Session Persistence) ---
const ProtectedRoute = ({ children, allowedRole }) => {
    const { user, loading } = useContext(AuthContext);
    
    // While checking localStorage, show nothing or a spinner
    if (loading) return null; 
    
    // If no user found after loading, go to login
    if (!user) return <Navigate to="/" />;
    
    // If role doesn't match
    if (user.role !== allowedRole) {
        return (
            <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                if (user.role !== allowedRole) return <h2>Access Denied: Required {allowedRole}</h2>;
                <p>You do not have permission to view this department.</p>
                <button onClick={() => window.location.href = '/'} style={{ padding: '10px 20px', cursor: 'pointer' }}>Return to Login</button>
            </div>
        );
    }
    
    return children;
};

export default function App() {
    return (
        // 1. Router must wrap EVERYTHING
        <Router>
            <AuthProvider>
                {/* 2. Main Wrapper: Forces 100% True Width */}
                <div style={{ 
                    width: '100vw', 
                    minHeight: '100vh', 
                    margin: 0, 
                    padding: 0, 
                    overflowX: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <Routes>
                        {/* Public Route */}
                        <Route path="/" element={<Login />} />
                        
                        {/* Doctor's Workspace */}
                        <Route path="/doctor" element={
                            <ProtectedRoute allowedRole="DOCTOR">
                                <DoctorDashboard />
                            </ProtectedRoute>
                        } />
                        
                        {/* Pharmacy Section */}
                        <Route path="/pharmacy" element={
                            <ProtectedRoute allowedRole="CASHIER">
                                <PharmacyDashboard />
                            </ProtectedRoute>
                        } />

                        <Route path="/pharmacy" element={
                            <ProtectedRoute allowedRole="CASHIER">
                                <CashierDashboard /> 
                            </ProtectedRoute>
                        } />

                        {/* Inventory Section */}
                        <Route path="/inventory" element={
                            <ProtectedRoute allowedRole="CASHIER">
                                <InventoryDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Fallback Route */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </AuthProvider>
        </Router>
    );
}