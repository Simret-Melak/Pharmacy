import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css'; // Ensure you have this for the loading spinner styles

// Lazy load components
const Auth = lazy(() => import('./pages/Auth'));
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail')); // Add this line

function App() {
  return (
    <div className="app-container">
      <Suspense fallback={
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Loading page...</p>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Add the verify-email route */}
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Optional: Add a 404 catch-all route */}
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;