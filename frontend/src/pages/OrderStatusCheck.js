// src/pages/OrderStatusCheck.js
import React, { useState } from 'react';
import axios from 'axios';

const OrderStatusCheck = () => {
  const [searchMethod, setSearchMethod] = useState('code'); // 'code' or 'details'
  const [confirmationCode, setConfirmationCode] = useState('');
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [order, setOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // API base URL for backend running on port 5001
  const API_BASE_URL = 'http://localhost:5001/api';

  const checkStatusByCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Checking order by code:', confirmationCode);
      const response = await axios.get(`${API_BASE_URL}/guest/order/${confirmationCode}`);
      setOrder(response.data);
      setOrders([]);
    } catch (err) {
      console.error('💥 Order check error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      const errorMessage = err.response?.data?.message || 'Order not found. Please check your confirmation code.';
      setError(errorMessage);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const findOrdersByDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      if (!customerDetails.name.trim() || !customerDetails.phone.trim()) {
        throw new Error('Name and phone number are required');
      }

      console.log('🔍 Searching orders by customer details:', customerDetails);

      const response = await axios.post(`${API_BASE_URL}/orders/find-by-customer`, {
        customerName: customerDetails.name.trim(),
        customerPhone: customerDetails.phone.trim(),
        customerEmail: customerDetails.email.trim()
      });

      console.log('✅ Search response:', response.data);

      if (response.data.success) {
        setOrders(response.data.orders);
        if (response.data.orders.length === 0) {
          setError('No orders found with the provided information. Please check your details and try again.');
        } else if (response.data.orders.length === 1) {
          // Auto-select if only one order found
          console.log('🔄 Single order found, loading details...');
          const orderResponse = await axios.get(`${API_BASE_URL}/guest/order/${response.data.orders[0].confirmation_code}`);
          setOrder(orderResponse.data);
        }
      } else {
        throw new Error(response.data.message || 'Failed to search for orders');
      }

    } catch (error) {
      console.error('💥 Search error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Failed to search for orders';
      
      if (error.response?.status === 404) {
        errorMessage = 'Search service is currently unavailable. Please try using your confirmation code instead.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderByCode = async (confirmationCode) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Loading order details for:', confirmationCode);
      const response = await axios.get(`${API_BASE_URL}/guest/order/${confirmationCode}`);
      setOrder(response.data);
      setOrders([]);
    } catch (err) {
      console.error('💥 Load order error:', err);
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'bg-warning', text: 'Pending' },
      confirmed: { class: 'bg-info', text: 'Confirmed' },
      processing: { class: 'bg-primary', text: 'Processing' },
      ready: { class: 'bg-success', text: 'Ready for Pickup' },
      completed: { class: 'bg-success', text: 'Completed' },
      cancelled: { class: 'bg-danger', text: 'Cancelled' }
    };
    
    const config = statusConfig[status] || { class: 'bg-secondary', text: status };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getPrescriptionStatusBadge = (status) => {
    if (!status) return null;
    
    const statusConfig = {
      pending: { class: 'bg-warning', text: 'Under Review' },
      approved: { class: 'bg-success', text: 'Approved' },
      rejected: { class: 'bg-danger', text: 'Rejected' }
    };
    
    const config = statusConfig[status] || { class: 'bg-secondary', text: 'Not Required' };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  // Helper to clear all states
  const clearSearch = () => {
    setConfirmationCode('');
    setCustomerDetails({ name: '', phone: '', email: '' });
    setOrder(null);
    setOrders([]);
    setError('');
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white text-center">
              <h2 className="mb-0">📱 Track Your Order</h2>
            </div>
            <div className="card-body">
              
              {/* Search Method Toggle */}
              <div className="text-center mb-4">
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn ${searchMethod === 'code' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => {
                      setSearchMethod('code');
                      clearSearch();
                    }}
                  >
                    🔍 I Have My Code
                  </button>
                  <button
                    type="button"
                    className={`btn ${searchMethod === 'details' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => {
                      setSearchMethod('details');
                      clearSearch();
                    }}
                  >
                    📋 Find My Code
                  </button>
                </div>
              </div>

              {/* Search by Code Form */}
              {searchMethod === 'code' && (
                <form onSubmit={checkStatusByCode} className="mb-4">
                  <div className="mb-3">
                    <label htmlFor="confirmationCode" className="form-label fw-semibold">
                      Enter Your Confirmation Code
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id="confirmationCode"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                      placeholder="e.g., A1B2C3D4"
                      required
                      style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}
                    />
                    <div className="form-text">
                      Enter the confirmation code you received when placing your order.
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 py-3 fw-semibold"
                    disabled={loading || !confirmationCode.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Checking Status...
                      </>
                    ) : (
                      'Track Order'
                    )}
                  </button>
                </form>
              )}

              {/* Search by Details Form */}
              {searchMethod === 'details' && (
                <form onSubmit={findOrdersByDetails} className="mb-4">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={customerDetails.name}
                        onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                        required
                        placeholder="Enter your full name as used in order"
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        value={customerDetails.phone}
                        onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                        required
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      Email Address <span className="text-muted">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={customerDetails.email}
                      onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
                      placeholder="Enter your email address if provided"
                    />
                    <div className="form-text">
                      Providing your email may help us find your order faster
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 py-3 fw-semibold"
                    disabled={loading || !customerDetails.name.trim() || !customerDetails.phone.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Searching for Orders...
                      </>
                    ) : (
                      'Find My Orders'
                    )}
                  </button>
                </form>
              )}

              {error && (
                <div className="alert alert-warning alert-dismissible fade show" role="alert">
                  <strong>⚠️ </strong> {error}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setError('')}
                  ></button>
                </div>
              )}

              {/* Multiple Orders List (when searching by details) */}
              {searchMethod === 'details' && orders.length > 1 && !order && (
                <div className="mt-4">
                  <h5 className="text-center text-success mb-4">
                    ✅ Found {orders.length} Orders
                  </h5>
                  {orders.map((orderItem) => (
                    <div key={orderItem.id} className="card mb-3 border-success">
                      <div className="card-header bg-success bg-opacity-10 d-flex justify-content-between align-items-center">
                        <strong>Order #{orderItem.id}</strong>
                        <div>
                          {getStatusBadge(orderItem.status)}
                          <button 
                            className="btn btn-sm btn-outline-primary ms-2"
                            onClick={() => loadOrderByCode(orderItem.confirmation_code)}
                            disabled={loading}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <p><strong>Date:</strong> {new Date(orderItem.created_at).toLocaleDateString()}</p>
                            <p><strong>Total:</strong> ${orderItem.total_price}</p>
                            <p><strong>Pharmacy:</strong> {orderItem.pharmacy_name}</p>
                          </div>
                          <div className="col-md-6">
                            <div className="bg-light p-3 rounded text-center">
                              <h6 className="text-muted mb-2">Confirmation Code</h6>
                              <div className="fw-bold text-primary fs-5" style={{
                                fontFamily: 'monospace',
                                letterSpacing: '0.2rem'
                              }}>
                                {orderItem.confirmation_code}
                              </div>
                              <small className="text-danger">
                                ⚠️ Save this code!
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Details Display */}
              {order && (
                <div className="order-details mt-4">
                  <div className="card mb-3">
                    <div className="card-header bg-primary text-white">
                      <h5 className="mb-0">Order Information</h5>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <p><strong>Confirmation Code:</strong> 
                            <span className="fw-bold text-primary ms-2" style={{ fontFamily: 'monospace' }}>
                              {order.order.confirmation_code}
                            </span>
                          </p>
                          <p><strong>Customer:</strong> {order.order.customer_name}</p>
                          <p><strong>Pharmacy:</strong> {order.order.pharmacy_name}</p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>Order Status:</strong> {getStatusBadge(order.order.status)}</p>
                          <p><strong>Order Type:</strong> {order.order.order_type}</p>
                          <p><strong>Order Date:</strong> {new Date(order.order.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {order.order.prescription_status && (
                    <div className="card mb-3">
                      <div className="card-header">
                        <h5 className="mb-0">Prescription Status</h5>
                      </div>
                      <div className="card-body">
                        <p>
                          <strong>Status:</strong> {getPrescriptionStatusBadge(order.order.prescription_status)}
                        </p>
                        {order.order.prescription_notes && (
                          <div className="mt-2">
                            <strong>Pharmacist Notes:</strong>
                            <p className="mb-0">{order.order.prescription_notes}</p>
                          </div>
                        )}
                        {order.order.reviewed_by && (
                          <p className="mb-0 mt-2">
                            <strong>Reviewed by:</strong> {order.order.reviewed_by}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="card">
                    <div className="card-header">
                      <h5 className="mb-0">Order Items</h5>
                    </div>
                    <div className="card-body">
                      {order.items.map(item => (
                        <div key={item.id} className="d-flex justify-content-between border-bottom pb-2 mb-2">
                          <div>
                            <strong>{item.medication_name}</strong>
                            <br />
                            <small className="text-muted">Qty: {item.quantity}</small>
                          </div>
                          <div className="text-end">
                            ${item.price_per_unit} each
                            <br />
                            <strong>${(item.price_per_unit * item.quantity).toFixed(2)}</strong>
                          </div>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between border-top pt-2 mt-2 fw-bold">
                        <span>Total:</span>
                        <span>${order.order.total_price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-light rounded">
                    <h6>Need Help?</h6>
                    <p className="mb-1">
                      <strong>Pharmacy:</strong> {order.order.pharmacy_name}
                    </p>
                    <p className="mb-1">
                      <strong>Phone:</strong> {order.order.pharmacy_phone}
                    </p>
                    {order.order.pharmacy_email && (
                      <p className="mb-0">
                        <strong>Email:</strong> {order.order.pharmacy_email}
                      </p>
                    )}
                  </div>

                  {/* Back button when viewing from multiple orders */}
                  {searchMethod === 'details' && orders.length > 1 && (
                    <div className="text-center mt-3">
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={() => setOrder(null)}
                      >
                        ← Back to Orders List
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusCheck;