import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Phone, ShoppingCart } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Auth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    login: { email: '', password: '' },
    register: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
    guest: { name: '', phone: '', email: '' } // ✅ ADD GUEST FORM DATA
  });

  // In your frontend Auth.js - update the guest checkout function
// In your Auth.js - update handleGuestCheckout
const handleGuestCheckout = async (e) => {
  e.preventDefault();
  setApiError('');
  setLoading(true);

  const { name, phone, email } = formData.guest;
  
  // Basic validation
  if (!name || !phone) {
    setApiError('Name and phone number are required for guest checkout');
    setLoading(false);
    return;
  }

  try {
    console.log('🔄 Starting guest checkout...');
    
    const { data } = await axios.post('/api/guest/initiate', {
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      email: email.trim() || null
    });

    console.log('✅ Guest session created:', data);

    // Save guest token and data
    localStorage.setItem('guestToken', data.guestToken);
    localStorage.setItem('guestData', JSON.stringify(data.guestData));
    
    // Navigate to medications page
    navigate('/guest/medications', { 
      state: { 
        message: 'Guest session started! You can now browse and order.',
        isGuest: true 
      }
    });

  } catch (err) {
    console.log('Guest checkout error:', err.response?.data);
    
    // ✅ HANDLE EMAIL ALREADY REGISTERED CASE
    if (err.response?.data?.code === 'EMAIL_ALREADY_REGISTERED') {
      setApiError(err.response.data.message);
      setSuccessMessage('Please login with your existing account.');
      setActiveTab('login'); // Switch to login tab
      
      // Pre-fill the login form with the email
      setFormData({
        ...formData,
        login: {
          ...formData.login,
          email: formData.guest.email // Auto-fill the email from guest form
        },
        guest: {
          ...formData.guest,
          email: '' // Clear the email from guest form
        }
      });
    } else {
      setApiError(err.response?.data?.message || 'Failed to start guest session');
    }
  } finally {
    setLoading(false);
  }
};
  // ✅ UPDATE: Handle login success with guest session cleanup
  const handleSubmit = async (type, e) => {
  e.preventDefault();
  setApiError('');
  setSuccessMessage('');
  setLoading(true);

  console.log('🔄 Starting auth process for:', type);
  console.log('📧 Email being used:', formData[type].email);

  // Validate form
  if (!validate(type)) {
    console.log('❌ Form validation failed');
    setLoading(false);
    return;
  }
  
  try {
    const endpoint = type === 'login' ? 'login' : 'register';
    
    // Prepare request data
    let requestData;
    if (type === 'register') {
      requestData = {
        email: formData.register.email.trim(),
        password: formData.register.password,
        username: formData.register.email.trim(),
        full_name: `${formData.register.firstName.trim()} ${formData.register.lastName.trim()}`
      };
    } else {
      requestData = {
        email: formData.login.email.trim(),
        password: formData.login.password
      };
    }
    
    console.log('📤 Sending request to:', `/api/auth/${endpoint}`);
    console.log('📦 Request data:', { ...requestData, password: '***' }); // Hide password in logs
    
    // Make API call
    const response = await axios.post(`/api/auth/${endpoint}`, requestData, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response received:', {
      status: response.status,
      data: response.data,
      hasToken: !!response.data.token,
      hasUser: !!response.data.user
    });
    
    // ✅ CLEAR GUEST SESSION IF EXISTS
    if (response.data.clearGuestSession) {
      localStorage.removeItem('guestToken');
      localStorage.removeItem('guestData');
      localStorage.removeItem('guestCart');
      console.log('🧹 Cleared guest session during login/registration');
    }
    
    if (type === 'login') {
      console.log('🔐 Processing login success...');
      
      // Store authentication data
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        console.log('✅ Token stored in localStorage');
      }
      
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('✅ User data stored in localStorage');
      }
      
      // Verify storage worked
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      console.log('📋 Verification - Token in localStorage:', !!storedToken);
      console.log('👤 Verification - User in localStorage:', !!storedUser);
      
      if (!storedToken) {
        throw new Error('Failed to store authentication token');
      }
      
      // Determine where to navigate
      let redirectPath = '/medications'; // Default path
      
      // Role-based redirection (if you have different user roles)
      if (response.data.user?.role === 'admin') {
        redirectPath = '/admin/dashboard';
      } else if (response.data.user?.role === 'pharmacist') {
        redirectPath = '/pharmacist/dashboard';
      }
      
      console.log('🧭 Navigating to:', redirectPath);
      
      // Small delay to ensure state updates and storage is complete
      setTimeout(() => {
        console.log('🚀 Executing navigation...');
        navigate(redirectPath, { 
          replace: true,
          state: { 
            fromAuth: true,
            timestamp: new Date().toISOString()
          }
        });
        
        // Force reload if navigation seems stuck (fallback)
        setTimeout(() => {
          if (window.location.pathname === '/auth') {
            console.log('⚠️ Navigation might be stuck, forcing reload...');
            window.location.href = redirectPath;
          }
        }, 1000);
        
      }, 50);
      
    } else {
      // Registration success
      console.log('✅ Registration successful');
      setSuccessMessage('Registration successful! Please check your email to verify your account.');
      setActiveTab('login');
      
      // Clear registration form
      setFormData({
        ...formData,
        register: { 
          firstName: '', 
          lastName: '', 
          email: '', 
          password: '', 
          confirmPassword: '' 
        }
      });
      
      // Pre-fill login email for convenience
      setFormData(prev => ({
        ...prev,
        login: {
          ...prev.login,
          email: requestData.email
        }
      }));
    }
    
  } catch (err) {
    console.log('❌ Auth error details:', {
      name: err.name,
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      code: err.code
    });
    
    // Handle specific error cases
    if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED') {
      setApiError('Network error. Please check your connection and try again.');
    } 
    else if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
      setApiError(err.response.data.message);
      setSuccessMessage('A new verification email has been sent. Please check your inbox.');
    } 
    else if (err.response?.status === 401) {
      setApiError('Invalid email or password. Please try again.');
    } 
    else if (err.response?.status === 400) {
      setApiError(err.response.data.message || 'Please check your input and try again.');
    }
    else if (err.response?.status === 403) {
      setApiError(err.response.data.message || 'Access denied. Please verify your account.');
    }
    else if (err.response?.status === 409) {
      setApiError(err.response.data.message || 'An account with this email already exists.');
    }
    else if (err.response?.status === 500) {
      setApiError('Server error. Please try again later.');
    }
    else {
      setApiError(err.response?.data?.message || 'An unexpected error occurred. Please try again.');
    }
    
    // Clear sensitive data on error
    if (type === 'login') {
      setFormData(prev => ({
        ...prev,
        login: {
          ...prev.login,
          password: ''
        }
      }));
    }
    
  } finally {
    setLoading(false);
    console.log('🏁 Auth process completed');
  }
};
  const validate = (type) => {
  const newErrors = {};
  const data = formData[type];
  
  // Email validation
  if (!data.email?.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) {
    newErrors.email = 'Invalid email format';
  }
  
  // Password validation
  if (!data.password) {
    newErrors.password = 'Password is required';
  } else if (data.password.length < 8) {
    newErrors.password = 'Password must be at least 8 characters';
  }
  
  // Registration-specific validations
  if (type === 'register') {
    if (!data.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!data.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
  }
  
  setErrors(newErrors);
  
  if (Object.keys(newErrors).length > 0) {
    console.log('❌ Validation errors:', newErrors);
    return false;
  }
  
  console.log('✅ Form validation passed');
  return true;
};

  // ✅ ADD: Check for existing guest session on component mount
  useEffect(() => {
    const guestToken = localStorage.getItem('guestToken');
    if (guestToken) {
      console.log('Existing guest session found');
    }
  }, []);

  useEffect(() => {
    setErrors({});
    setApiError('');
  }, [activeTab]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-vh-100 bg-gradient-to-br from-blue-50 via-white to-blue-50 d-flex align-items-center justify-content-center py-4"
    >
      <div className="position-relative w-100 w-md-75 w-lg-50">
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-3 bg-danger text-white rounded"
              key="apiError"
            >
              {apiError}
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-3 bg-success text-white rounded"
              key="successMessage"
            >
              {successMessage}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white shadow-lg p-4 p-md-5 rounded-lg"
            key="formContainer"
          >
            {/* ✅ ADD: Guest Checkout Section */}
            <div className="text-center mb-4 pb-4 border-bottom">
              <div className="mb-3">
                <ShoppingCart size={32} className="text-primary mb-2" />
                <h4 className="text-muted mb-2">Quick Checkout</h4>
                <p className="text-muted small">
                  No account needed. Order now and track with confirmation code.
                </p>
              </div>
              
              <form onSubmit={handleGuestCheckout}>
                <div className="row g-2 mb-3">
                  <div className="col-12">
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text"><User size={18} /></span>
                      </div>
                      <input
                        type="text"
                        placeholder="Your Full Name"
                        value={formData.guest.name}
                        onChange={(e) => setFormData({
                          ...formData,
                          guest: { ...formData.guest, name: e.target.value }
                        })}
                        className="form-control"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="col-12 col-md-6">
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text"><Phone size={18} /></span>
                      </div>
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={formData.guest.phone}
                        onChange={(e) => setFormData({
                          ...formData,
                          guest: { ...formData.guest, phone: e.target.value }
                        })}
                        className="form-control"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="col-12 col-md-6">
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text"><Mail size={18} /></span>
                      </div>
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={formData.guest.email}
                        onChange={(e) => setFormData({
                          ...formData,
                          guest: { ...formData.guest, email: e.target.value }
                        })}
                        className="form-control"
                      />
                    </div>
                  </div>
                </div>
                
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.95 }}
                  disabled={loading}
                  className="btn btn-outline-primary w-100 py-2"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Starting...
                    </>
                  ) : (
                    'Continue as Guest'
                  )}
                </motion.button>
              </form>

              <div className="mt-3">
                <small className="text-muted">
                  By continuing, you agree to our Terms of Service
                </small>
              </div>
            </div>

            {/* Divider */}
            <div className="position-relative text-center mb-4">
              <hr />
              <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted">
                Or
              </span>
            </div>

            {/* Tab switching buttons */}
            <div className="pb-4">
              <div className="d-flex bg-light rounded p-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className={`flex-grow-1 py-2 rounded ${activeTab === 'login' ? 'bg-white shadow-sm' : ''}`}
                  onClick={() => setActiveTab('login')}
                >
                  Sign In
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className={`flex-grow-1 py-2 rounded ${activeTab === 'register' ? 'bg-white shadow-sm' : ''}`}
                  onClick={() => setActiveTab('register')}
                >
                  Sign Up
                </motion.button>
              </div>
            </div>

            <div className="pt-4">
              <AnimatePresence mode="wait">
                {activeTab === 'login' ? (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={(e) => handleSubmit('login', e)}
                    className="space-y-4"
                  >
                    {/* Email Field */}
                    <div className="form-group">
                      <label htmlFor="login-email" className="text-gray-700 font-medium">
                        Email Address
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text"><Mail /></span>
                        </div>
                        <input
                          id="login-email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.login.email}
                          onChange={(e) => setFormData({
                            ...formData,
                            login: { ...formData.login, email: e.target.value }
                          })}
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          required
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                      <label htmlFor="login-password" className="text-gray-700 font-medium">
                        Password
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text"><Lock /></span>
                        </div>
                        <input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.login.password}
                          onChange={(e) => setFormData({
                            ...formData,
                            login: { ...formData.login, password: e.target.value }
                          })}
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          required
                        />
                        <div className="input-group-append">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="input-group-text"
                          >
                            {showPassword ? <EyeOff /> : <Eye />}
                          </button>
                        </div>
                      </div>
                      {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary w-100 py-2"
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Signing In...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={(e) => handleSubmit('register', e)}
                    className="space-y-4"
                  >
                    {/* First Name Field */}
                    <div className="form-group">
                      <label htmlFor="register-firstName" className="text-gray-700 font-medium">
                        First Name
                      </label>
                      <input
                        id="register-firstName"
                        type="text"
                        placeholder="Enter your first name"
                        value={formData.register.firstName}
                        onChange={(e) => setFormData({
                          ...formData,
                          register: { ...formData.register, firstName: e.target.value }
                        })}
                        className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                        required
                      />
                      {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
                    </div>

                    {/* Last Name Field */}
                    <div className="form-group">
                      <label htmlFor="register-lastName" className="text-gray-700 font-medium">
                        Last Name
                      </label>
                      <input
                        id="register-lastName"
                        type="text"
                        placeholder="Enter your last name"
                        value={formData.register.lastName}
                        onChange={(e) => setFormData({
                          ...formData,
                          register: { ...formData.register, lastName: e.target.value }
                        })}
                        className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                      />
                      {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
                    </div>

                    {/* Email Field */}
                    <div className="form-group">
                      <label htmlFor="register-email" className="text-gray-700 font-medium">
                        Email Address
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text"><Mail /></span>
                        </div>
                        <input
                          id="register-email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.register.email}
                          onChange={(e) => setFormData({
                            ...formData,
                            register: { ...formData.register, email: e.target.value }
                          })}
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          required
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                      <label htmlFor="register-password" className="text-gray-700 font-medium">
                        Password
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text"><Lock /></span>
                        </div>
                        <input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={formData.register.password}
                          onChange={(e) => setFormData({
                            ...formData,
                            register: { ...formData.register, password: e.target.value }
                          })}
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          required
                        />
                        <div className="input-group-append">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="input-group-text"
                          >
                            {showPassword ? <EyeOff /> : <Eye />}
                          </button>
                        </div>
                      </div>
                      {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="form-group">
                      <label htmlFor="register-confirmPassword" className="text-gray-700 font-medium">
                        Confirm Password
                      </label>
                      <input
                        id="register-confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.register.confirmPassword}
                        onChange={(e) => setFormData({
                          ...formData,
                          register: { ...formData.register, confirmPassword: e.target.value }
                        })}
                        className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                        required
                      />
                      {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary w-100 py-2"
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* ✅ ADD: Order Status Check Link */}
            <div className="text-center mt-4 pt-3 border-top">
              <small className="text-muted">
                Already have a confirmation code?{' '}
                <button 
                  type="button"
                  className="btn btn-link p-0 text-primary"
                  onClick={() => navigate('/order-status')}
                >
                  Check Order Status
                </button>
              </small>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}