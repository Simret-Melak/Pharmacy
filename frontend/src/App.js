import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { jwtDecode } from 'jwt-decode';

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

function App() {
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

  const user = getUserFromToken();
  const isAuthenticated = !!token;
  const isAdmin = user.role === 'admin';

  return (
    <div className="app-container">
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

          {/* Customer routes */}
          <Route path="/customer/medications" element={<CustomerMedications />} />
          <Route 
            path="/upload-prescription/:id" 
            element={isAuthenticated ? <UploadPrescription /> : <Navigate to="/auth" />} 
          />

          

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
