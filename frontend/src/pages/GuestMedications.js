// src/pages/GuestMedications.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const GuestMedications = ({ onCartUpdate }) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
  try {
    const response = await axios.get('/api/guest/medications'); // Changed to guest endpoint
    setMedications(response.data.medications || []);
  } catch (err) {
    setError('Failed to fetch medications');
    console.error('Error:', err);
  } finally {
    setLoading(false);
  }
};

  const addToCart = (medication) => {
    // For guests, store cart in localStorage
    const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
    const existingItem = guestCart.find(item => item.id === medication.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      guestCart.push({
        ...medication,
        quantity: 1
      });
    }
    
    localStorage.setItem('guestCart', JSON.stringify(guestCart));
    
    // Update cart count in parent
    if (onCartUpdate) {
      onCartUpdate();
    }
    
    alert(`${medication.name} added to cart!`);
  };

  if (loading) return <div className="container mt-4">Loading medications...</div>;
  if (error) return <div className="container mt-4 text-danger">{error}</div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Available Medications</h2>
        <div>
          <button 
            className="btn btn-outline-primary me-2"
            onClick={() => navigate('/order-status')}
          >
            Track Order
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/guest/checkout')}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>

      <div className="row">
        {medications.map(medication => (
          <div key={medication.id} className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">{medication.name}</h5>
                <p className="card-text text-muted">{medication.description}</p>
                <p className="card-text">
                  <strong>Price: ${medication.price}</strong>
                </p>
                {medication.is_prescription_required && (
                  <span className="badge bg-warning text-dark mb-2">
                    Prescription Required
                  </span>
                )}
                <p className="card-text">
                  <small className="text-muted">
                    Stock: {medication.stock_quantity}
                  </small>
                </p>
              </div>
              <div className="card-footer">
                <button
                  className="btn btn-primary w-100"
                  onClick={() => addToCart(medication)}
                  disabled={medication.stock_quantity === 0}
                >
                  {medication.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {medications.length === 0 && (
        <div className="text-center mt-5">
          <h4>No medications available</h4>
          <p className="text-muted">Please check back later.</p>
        </div>
      )}
    </div>
  );
};

export default GuestMedications;