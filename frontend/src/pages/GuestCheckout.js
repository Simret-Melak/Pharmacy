// src/pages/GuestCheckout.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const GuestCheckout = ({ onCartUpdate }) => {
  const [pharmacies, setPharmacies] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pharmaciesLoading, setPharmaciesLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [formData, setFormData] = useState({
    pharmacyId: '',
    orderType: 'pickup',
    customerNotes: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
    fetchPharmacies();
  }, []);

  const loadCart = () => {
    const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
    setCart(guestCart);
  };

  const fetchPharmacies = async () => {
    try {
      setPharmaciesLoading(true);
      console.log('🔄 Fetching pharmacies from /api/guest/pharmacies...');
      
      const response = await axios.get('/api/guest/pharmacies');
      console.log('✅ Pharmacy API response:', response.data);
      
      if (response.data.success && response.data.pharmacies) {
        setPharmacies(response.data.pharmacies);
        console.log(`✅ Loaded ${response.data.pharmacies.length} pharmacies`);
        
        // Auto-select the first pharmacy if only one exists
        if (response.data.pharmacies.length === 1) {
          setFormData(prev => ({ ...prev, pharmacyId: response.data.pharmacies[0].id.toString() }));
        }
      } else {
        console.error('❌ Unexpected response format:', response.data);
        setPharmacies([]);
        setError('Failed to load pharmacies');
      }
      
    } catch (error) {
      console.error('💥 Error fetching pharmacies:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Use fallback data based on your database
      setPharmacies([
        {
          id: 1,
          name: 'Bethlam Pharmacy',
          address: '123 Healthcare Ave, Medical District',
          contact_phone: '+1 (555) 123-4567',
          contact_email: 'pharmacy@bethlam.com'
        }
      ]);
      
      console.log('🔄 Using fallback pharmacy data');
      setError('Using demo pharmacy data - some features may be limited');
      
    } finally {
      setPharmaciesLoading(false);
    }
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedCart = cart.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    
    setCart(updatedCart);
    localStorage.setItem('guestCart', JSON.stringify(updatedCart));
    
    if (onCartUpdate) {
      onCartUpdate();
    }
  };

  const removeItem = (id) => {
    const updatedCart = cart.filter(item => item.id !== id);
    setCart(updatedCart);
    localStorage.setItem('guestCart', JSON.stringify(updatedCart));
    
    if (onCartUpdate) {
      onCartUpdate();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const guestData = JSON.parse(localStorage.getItem('guestData') || '{}');
      const guestToken = localStorage.getItem('guestToken');
      
      // Validate guest session
      if (!guestData.name || !guestData.phone) {
        throw new Error('Please complete guest registration first');
      }

      // Validate pharmacy selection
      if (!formData.pharmacyId) {
        throw new Error('Please select a pharmacy');
      }

      // Validate cart
      if (cart.length === 0) {
        throw new Error('Your cart is empty');
      }

      // Check for prescription items
      const prescriptionItemsList = cart.filter(item => item.is_prescription_required);
      if (prescriptionItemsList.length > 0) {
        setPrescriptionItems(prescriptionItemsList);
        setShowPrescriptionModal(true);
        setLoading(false);
        return;
      }

      await processOrder(guestData, guestToken);
      
    } catch (error) {
      console.error('💥 Order error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to place order';
      setError(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  const processOrder = async (guestData, guestToken) => {
    console.log('🔄 Placing guest order...', {
      guestData,
      pharmacyId: formData.pharmacyId,
      itemCount: cart.length
    });
    
    const orderData = {
      customerName: guestData.name,
      customerPhone: guestData.phone,
      customerEmail: guestData.email,
      pharmacyId: parseInt(formData.pharmacyId),
      orderType: formData.orderType === 'delivery' ? 'online' : 'online',
      customerNotes: formData.customerNotes,
      items: cart.map(item => ({
        medicationId: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      isGuestOrder: true,
      guestToken: guestToken
    };

    const response = await axios.post('/api/orders', orderData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Order placed successfully:', response.data);
    
    // Clear guest cart and data
    localStorage.removeItem('guestCart');
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestData');
    
    if (onCartUpdate) onCartUpdate();
    
    // Navigate to confirmation page
    navigate('/order-confirmation', { 
      replace: true,
      state: { 
        order: response.data.order,
        confirmationCode: response.data.confirmationCode,
        isGuestOrder: true
      }
    });
  };

  const handlePrescriptionConfirm = () => {
    setShowPrescriptionModal(false);
    setLoading(true);
    
    const guestData = JSON.parse(localStorage.getItem('guestData') || '{}');
    const guestToken = localStorage.getItem('guestToken');
    
    processOrder(guestData, guestToken).catch(error => {
      console.error('💥 Order error after prescription confirmation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to place order';
      setError(errorMessage);
      setLoading(false);
    });
  };

  const handlePrescriptionCancel = () => {
    setShowPrescriptionModal(false);
    setLoading(false);
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="mb-4">
            <span style={{ fontSize: '4rem' }}>🛒</span>
          </div>
          <h3 className="text-muted">Your cart is empty</h3>
          <p className="text-muted mb-4">Add some medications to proceed with checkout</p>
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/guest/medications')}
          >
            Browse Medications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Prescription Confirmation Modal */}
      {showPrescriptionModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">📋 Prescription Required</h5>
              </div>
              <div className="modal-body">
                <p>The following items in your cart require a valid prescription:</p>
                <ul>
                  {prescriptionItems.map(item => (
                    <li key={item.id} className="fw-bold">{item.name}</li>
                  ))}
                </ul>
                <p className="text-muted">
                  Please ensure you have a valid prescription from your healthcare provider. 
                  Your order may be delayed or cancelled if you cannot provide a prescription when requested.
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handlePrescriptionCancel}
                >
                  Cancel Order
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePrescriptionConfirm}
                >
                  I Have a Prescription - Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Guest Checkout</h2>
          <p className="text-muted mb-0">Review your order and complete checkout</p>
        </div>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/guest/medications')}
        >
          Continue Shopping
        </button>
      </div>

      {error && (
        <div className="alert alert-warning alert-dismissible fade show" role="alert">
          <strong>⚠️ Order Issue:</strong> {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError('')}
            aria-label="Close"
          ></button>
        </div>
      )}

      <div className="row">
        {/* Order Items Section */}
        <div className="col-lg-8">
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                Order Items 
                <span className="badge bg-primary ms-2">{cart.length}</span>
              </h5>
              <span className="text-muted">{totalItems} total items</span>
            </div>
            <div className="card-body">
              {cart.map((item, index) => (
                <div key={item.id} className={`d-flex justify-content-between align-items-start pb-3 ${index !== cart.length - 1 ? 'border-bottom mb-3' : 'mb-0'}`}>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">{item.name}</h6>
                    <p className="text-muted mb-1 small">${item.price.toFixed(2)} each</p>
                    {item.description && (
                      <p className="text-muted mb-1 small">{item.description}</p>
                    )}
                    {item.is_prescription_required && (
                      <span className="badge bg-warning text-dark small">
                        📋 Prescription Required
                      </span>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        title="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="px-2 fw-bold" style={{ minWidth: '30px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <strong className="text-end" style={{ minWidth: '80px' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </strong>
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removeItem(item.id)}
                      title="Remove item from cart"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <strong className="fs-5">Total:</strong>
                <strong className="fs-5 text-primary">${totalPrice.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Form Section */}
        <div className="col-lg-4">
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0">Order Details</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Select Pharmacy *
                    {pharmaciesLoading && (
                      <span className="spinner-border spinner-border-sm ms-2 text-primary"></span>
                    )}
                  </label>
                  <select
                    className="form-select"
                    value={formData.pharmacyId}
                    onChange={(e) => setFormData({...formData, pharmacyId: e.target.value})}
                    required
                    disabled={pharmaciesLoading}
                  >
                    <option value="">{pharmaciesLoading ? 'Loading pharmacies...' : 'Choose a pharmacy'}</option>
                    {pharmacies.map(pharmacy => (
                      <option key={pharmacy.id} value={pharmacy.id}>
                        {pharmacy.name} - {pharmacy.address}
                      </option>
                    ))}
                  </select>
                  {pharmacies.length === 0 && !pharmaciesLoading && (
                    <div className="form-text text-warning">
                      <small>No pharmacies available</small>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Order Type</label>
                  <select
                    className="form-select"
                    value={formData.orderType}
                    onChange={(e) => setFormData({...formData, orderType: e.target.value})}
                  >
                    <option value="pickup">🏪 Store Pickup</option>
                    <option value="delivery">🚚 Delivery</option>
                  </select>
                  <div className="form-text">
                    {formData.orderType === 'pickup' 
                      ? 'Pick up your order at the pharmacy' 
                      : 'Get your order delivered to your location'
                    }
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Special Instructions <span className="text-muted">(Optional)</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.customerNotes}
                    onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                    placeholder="Any special instructions, allergies, delivery notes, or pickup preferences..."
                  />
                  <div className="form-text">
                    Help us prepare your order better
                  </div>
                </div>

                {/* Order Summary */}
                <div className="mb-3 p-3 bg-light rounded">
                  <h6 className="mb-3 border-bottom pb-2">Order Summary</h6>
                  <div className="d-flex justify-content-between small mb-2">
                    <span>Items ({totalItems}):</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between small mb-2">
                    <span>Shipping:</span>
                    <span className="text-success">FREE</span>
                  </div>
                  <div className="d-flex justify-content-between small mb-2">
                    <span>Tax:</span>
                    <span>Calculated at pharmacy</span>
                  </div>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between fw-bold fs-6">
                    <span>Total Amount:</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary w-100 py-3 fw-semibold"
                  disabled={loading || !formData.pharmacyId || pharmaciesLoading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Processing Order...
                    </>
                  ) : (
                    <>
                      <span className="me-2">✅</span>
                      Place Order - ${totalPrice.toFixed(2)}
                    </>
                  )}
                </button>
                
                <div className="text-center mt-3">
                  <small className="text-muted">
                    By placing this order, you agree to our{' '}
                    <a href="/terms" className="text-decoration-none">terms of service</a> 
                    {' '}and{' '}
                    <a href="/privacy" className="text-decoration-none">privacy policy</a>
                  </small>
                </div>
              </div>
            </div>
          </form>

          {/* Guest Information */}
          <div className="card mt-3 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Guest Information</h6>
              <div className="small text-muted">
                <div>Ordering as guest</div>
                <div>You will receive a confirmation code to track your order</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestCheckout;