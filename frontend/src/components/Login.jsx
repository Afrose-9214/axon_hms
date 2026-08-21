// src/components/Login.jsx
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// shadcn UI components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            const response = await axios.post('/api/auth/login', {
                email,
                password
            });

            // Save user to Context
            login(response.data);

            // 🌟 NEW 3-LAYER ROUTING LOGIC
            const userRole = response.data.role;
            
            if (userRole === 'DOCTOR') {
                navigate('/doctor');
            } else if (userRole === 'NURSE' || userRole === 'RECEPTIONIST') {
                navigate('/nursing');
            } else if (userRole === 'CASHIER' || userRole === 'PHARMACY') {
                navigate('/pharmacy');
            } else {
                setError('Unrecognized user role');
            }
            
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-0">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900">
                        Axon HMS Clinic - Live Portal
                    </CardTitle>
                </CardHeader>
                
                <CardContent>
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm mb-4 text-center">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="doctor@hms.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                        </div>
                        
                        <Button type="submit" className="w-full mt-2">
                            Login
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}