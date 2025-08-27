import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Auth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    login: { email: '', password: '' },
    register: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' }
  });

  const validate = (type) => {
    const newErrors = {};
    const data = formData[type];
    
    if (!data.email) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(data.email)) newErrors.email = 'Invalid email format';
    
    if (!data.password) newErrors.password = 'Password is required';
    else if (data.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    
    if (type === 'register') {
      if (data.password !== data.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      if (!data.firstName) newErrors.firstName = 'First name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (type, e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validate(type)) return;
    
    try {
      const endpoint = type === 'login' ? 'login' : 'register';
      
      let requestData = formData[type];
      
      if (type === 'register') {
        requestData = {
          email: formData.register.email,
          password: formData.register.password,
          username: formData.register.email,
          full_name: `${formData.register.firstName} ${formData.register.lastName}`
        };
      }
      
      console.log('Sending data:', requestData);
      const { data } = await axios.post(`/api/auth/${endpoint}`, requestData);
      
      if (type === 'login') {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        setSuccessMessage('Registration successful! Please login.');
        setActiveTab('login');
      }
    } catch (err) {
      console.log('Error response:', err.response?.data);
      setApiError(err.response?.data?.message || 'An error occurred');
    }
  };

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
      <div className="position-relative w-100 w-md-50">
        {/* OUTER AnimatePresence WITHOUT mode="wait" */}
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
            className="bg-white shadow-lg p-5 rounded-lg"
            key="formContainer"
          >
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
              {/* INNER AnimatePresence WITH mode="wait" to switch forms */}
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
                      className="btn btn-primary w-100 py-2"
                    >
                      Sign In
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
                      className="btn btn-primary w-100 py-2"
                    >
                      Create Account
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}