import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
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
const MyPrescriptions = lazy(() => import('./pages/MyPrescriptions'));
const GuestMedications = lazy(() => import('./pages/GuestMedications'));
const GuestCheckout = lazy(() => import('./pages/GuestCheckout'));
const OrderStatusCheck = lazy(() => import('./pages/OrderStatusCheck'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// ✅ ADD: Simple Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-5 text-center">
          <div className="alert alert-danger">
            <h3>Something went wrong</h3>
            <p>Please refresh the page or try again later.</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isGuest: false,
    user: null,
    guest: null
  });

  const [loading, setLoading] = useState(true);

  // ✅ FIX: Memoize token values to prevent unnecessary re-renders
  const token = localStorage.getItem('token');
  const guestToken = localStorage.getItem('guestToken');

  // ✅ IMPROVED: Validate token function
  const validateToken = useCallback((tokenToValidate, type = 'user') => {
    try {
      const decoded = jwtDecode(tokenToValidate);
      
      // Check expiration
      if (decoded.exp * 1000 < Date.now()) {
        console.log(`${type} token expired`);
        return null;
      }
      
      // Check token type for guest tokens
      if (type === 'guest' && decoded.type !== 'guest') {
        console.log('Invalid guest token type');
        return null;
      }
      
      return decoded;
    } catch (err) {
      console.log(`Invalid ${type} token:`, err.message);
      return null;
    }
  }, []);

  // ✅ IMPROVED: Auth state calculation
  const getAuthState = useCallback(() => {
    // Check for regular user authentication first
    if (token) {
      const decoded = validateToken(token, 'user');
      if (decoded) {
        return {
          isAuthenticated: true,
          isGuest: false,
          user: decoded,
          guest: null
        };
      } else {
        // Clear invalid token
        localStorage.removeItem('token');
      }
    }
    
    // Check for guest session
    if (guestToken) {
      const decoded = validateToken(guestToken, 'guest');
      if (decoded) {
        return {
          isAuthenticated: false,
          isGuest: true,
          user: null,
          guest: decoded
        };
      } else {
        // Clear invalid guest token and cart
        localStorage.removeItem('guestToken');
        localStorage.removeItem('guestCart');
        localStorage.removeItem('guestData');
      }
    }
    
    // No valid authentication
    return {
      isAuthenticated: false,
      isGuest: false,
      user: null,
      guest: null
    };
  }, [token, guestToken, validateToken]);

  // ✅ FIX: Improved fetchCartCount with better dependency management
  const fetchCartCount = useCallback(async () => {
    try {
      let totalItems = 0;

      // For authenticated users
      if (token) {
        const response = await axios.get('/api/cart', {
          headers: { Authorization: `Bearer ${token}` }
        });
        totalItems = response.data.reduce((sum, item) => sum + item.quantity, 0);
      } 
      // For guests
      else if (guestToken) {
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
        totalItems = guestCart.reduce((sum, item) => sum + item.quantity, 0);
      }

      setCartCount(totalItems);
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCartCount(0);
    }
  }, [token, guestToken]);

  // ✅ FIX: Single useEffect with proper cleanup
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      
      // Set auth state
      const state = getAuthState();
      setAuthState(state);
      
      // Fetch cart count
      await fetchCartCount();
      
      setLoading(false);
    };

    initializeApp();

    // ✅ ADD: Listen for storage changes (for multiple tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'guestToken' || e.key === 'guestCart') {
        initializeApp();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [getAuthState, fetchCartCount]);

  // ✅ FIX: Improved auth state update function
  const updateAuthState = useCallback((newState = null) => {
    if (newState) {
      setAuthState(newState);
    } else {
      // Recalculate auth state
      const state = getAuthState();
      setAuthState(state);
    }
    fetchCartCount();
  }, [getAuthState, fetchCartCount]);

  const { isAuthenticated, isGuest, user } = authState;
  const isAdmin = user?.role === 'admin';

  // ✅ ADD: Route protection components for cleaner code
  const ProtectedRoute = ({ children, requireAuth = false, requireAdmin = false, requireGuest = false }) => {
    if (requireAdmin && !isAdmin) {
      return <Navigate to="/dashboard" />;
    }
    
    if (requireAuth && !isAuthenticated) {
      return <Navigate to="/auth" />;
    }
    
    if (requireGuest && !isGuest) {
      return <Navigate to="/auth" />;
    }
    
    return children;
  };

  const PublicOnlyRoute = ({ children }) => {
    if (isAuthenticated) {
      return <Navigate to="/dashboard" />;
    }
    if (isGuest) {
      return <Navigate to="/guest/medications" />;
    }
    return children;
  };

  // Show loading spinner during initial app load
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Header 
          cartCount={cartCount} 
          authState={authState}
          onAuthStateChange={updateAuthState}
        />
        
        <Suspense fallback={
          <div className="d-flex justify-content-center align-items-center min-vh-100">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        }>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route 
              path="/auth" 
              element={
                <PublicOnlyRoute>
                  <Auth />
                </PublicOnlyRoute>
              } 
            />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/order-status" element={<OrderStatusCheck />} />
            <Route 
  path="/order-confirmation" 
  element={<OrderConfirmation onCartUpdate={fetchCartCount} />} 
/>
            
            {/* Guest routes */}
            <Route 
              path="/guest/medications" 
              element={
                <ProtectedRoute requireGuest>
                  <GuestMedications onCartUpdate={fetchCartCount} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/guest/checkout" 
              element={
                <ProtectedRoute requireGuest>
                  <GuestCheckout onCartUpdate={fetchCartCount} />
                </ProtectedRoute>
              } 
            />

            {/* Admin routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requireAuth>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/medications" 
              element={
                <ProtectedRoute requireAuth>
                  <MedicationsList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/medications/add" 
              element={
                <ProtectedRoute requireAdmin>
                  <AddMedication />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/medications/edit/:id" 
              element={
                <ProtectedRoute requireAdmin>
                  <EditMedication />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prescriptions" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPrescriptions />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/admin/prescriptions/review/:id"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPrescriptionReview />
                </ProtectedRoute>
              }
            />

            {/* Customer routes */}
            <Route 
              path="/customer/medications" 
              element={
                <ProtectedRoute requireAuth>
                  <CustomerMedications onCartUpdate={fetchCartCount} />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/upload-prescription/:id" 
              element={
                <ProtectedRoute requireAuth>
                  <UploadPrescription />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/cart" 
              element={
                <ProtectedRoute requireAuth>
                  <CartPage onCartUpdate={fetchCartCount} />
                </ProtectedRoute>
              } 
            />

            {/* My Prescriptions */}
            <Route 
              path="/my-prescriptions" 
              element={
                <ProtectedRoute requireAuth>
                  <MyPrescriptions />
                </ProtectedRoute>
              } 
            />

            {/* Smart redirects */}
            <Route 
              path="/medications" 
              element={
                isAuthenticated ? 
                  <Navigate to="/customer/medications" /> :
                isGuest ? 
                  <Navigate to="/guest/medications" /> :
                  <Navigate to="/auth" />
              } 
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;