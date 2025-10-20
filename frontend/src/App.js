import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Header from './components/Header'; 

// Lazy load components
const Auth = lazy(() => import('./pages/Auth'));
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const MedicationsList = lazy(() => import('./pages/Medications'));
const AddMedication = lazy(() => import('./pages/AddMedication'));
const EditMedication = lazy(() => import('./pages/EditMedication'));
const CustomerMedications = lazy(() => import('./pages/CustomerMedications'));
const UploadPrescription = lazy(() => import('./pages/UploadPrescription'));
const AdminPrescriptions = lazy(() => import('./pages/AdminPrescriptions'));
const AdminPrescriptionReview = lazy(() => import('./pages/AdminPrescriptionReview'));
const CartPage = lazy(() => import('./pages/Cart'));
const MyPrescriptions = lazy(() => import('./pages/MyPrescriptions')); // ✅ Add this line

function App() {
  const [cartCount, setCartCount] = useState(0);
  const token = localStorage.getItem('token'); 
  
  const getUserFromToken = () => {
    try {
      if (!token) return { role: 'customer' };
      const decoded = jwtDecode(token);
      return decoded;
    } catch (err) {
      return { role: 'customer' };
    }
  };

  const fetchCartCount = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCartCount(0);
      return;
    }

    try {
      const response = await axios.get('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const totalItems = response.data.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(totalItems);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartCount(0);
    }
  };

  useEffect(() => {
    fetchCartCount();
  }, [token]);

  const user = getUserFromToken();
  const isAuthenticated = !!token;
  const isAdmin = user.role === 'admin';

  return (
    <div className="app-container">
      <Header cartCount={cartCount} />
      
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Admin routes */}
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/medications" 
            element={isAuthenticated ? <MedicationsList /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/medications/add" 
            element={isAuthenticated && isAdmin ? <AddMedication /> : <Navigate to="/medications" />} 
          />
          <Route 
            path="/medications/edit/:id" 
            element={isAuthenticated && isAdmin ? <EditMedication /> : <Navigate to="/medications" />} 
          />
          <Route 
            path="/prescriptions" 
            element={isAuthenticated && isAdmin ? <AdminPrescriptions /> : <Navigate to="/dashboard" />} 
          />
          <Route
            path="/admin/prescriptions/review/:id"
            element={isAuthenticated && isAdmin ? <AdminPrescriptionReview /> : <Navigate to="/dashboard" />}
          />

          {/* Customer routes */}
          <Route 
            path="/customer/medications" 
            element={
              isAuthenticated ? 
              <CustomerMedications onCartUpdate={fetchCartCount} /> : 
              <Navigate to="/auth" />
            } 
          />
          
          <Route 
            path="/upload-prescription/:id" 
            element={isAuthenticated ? <UploadPrescription /> : <Navigate to="/auth" />} 
          />

          <Route 
            path="/cart" 
            element={
              isAuthenticated ? 
              <CartPage onCartUpdate={fetchCartCount} /> : 
              <Navigate to="/auth" />
            } 
          />

          {/* My Prescriptions */}
          <Route 
            path="/my-prescriptions" 
            element={isAuthenticated ? <MyPrescriptions /> : <Navigate to="/auth" />} 
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
