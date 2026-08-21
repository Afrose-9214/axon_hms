import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';

// Components
import Login from './components/Login';
import DoctorDashboard from './components/DoctorDashboard';
import PharmacyDashboard from './components/PharmacyDashboard';
import NursingDashboard from './components/NursingDashboard'; // 🌟 NEW IMPORT

// --- PROTECTED ROUTE (Handles Session Persistence) ---
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);
    
    // While checking localStorage, show nothing or a spinner
    if (loading) return null; 
    
    // If no user found after loading, go to login
    if (!user) return <Navigate to="/" />;
    
    // Check if the user's role is included in the allowedRoles array
    const hasAccess = allowedRoles.includes(user.role);

    // If role doesn't match
    if (!hasAccess) {
        return (
            <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <h2>Access Denied</h2>
                <p>You do not have permission to view this department.</p>
                <button onClick={() => window.location.href = '/'} style={{ padding: '10px 20px', cursor: 'pointer', marginTop: '10px' }}>Return to Login</button>
            </div>
        );
    }
    
    return children;
};

export default function App() {
    return (
        <Router>
            <AuthProvider>
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
                        
                        {/* 1. Nursing / Reception Workspace */}
                        <Route path="/nursing" element={
                            <ProtectedRoute allowedRoles={['NURSE', 'RECEPTIONIST']}>
                                <NursingDashboard />
                            </ProtectedRoute>
                        } />

                        {/* 2. Doctor's Workspace */}
                        <Route path="/doctor" element={
                            <ProtectedRoute allowedRoles={['DOCTOR']}>
                                <DoctorDashboard />
                            </ProtectedRoute>
                        } />
                        
                        {/* 3. Pharmacy & Billing Workspace (Merged) */}
                        <Route path="/pharmacy" element={
                            <ProtectedRoute allowedRoles={['CASHIER', 'PHARMACY']}>
                                <PharmacyDashboard />
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