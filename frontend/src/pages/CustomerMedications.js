import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaShoppingCart, FaPlus, FaMinus } from 'react-icons/fa';

const CustomerMedications = ({ onCartUpdate }) => {
  const [medications, setMedications] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itemQuantities, setItemQuantities] = useState({});
  const [prescriptions, setPrescriptions] = useState({}); // medicationId => status
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      try {
        // Fetch medications
        const medResponse = await axios.get(`${API_URL}/api/medications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMedications(medResponse.data);
        setFilteredMedications(medResponse.data);

        // Fetch cart items
        const cartResponse = await axios.get(`${API_URL}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const quantities = {};
        cartResponse.data.forEach(item => {
          quantities[item.medication_id] = item.quantity;
        });
        setItemQuantities(quantities);

        // Fetch customer prescriptions
        const presResponse = await axios.get(`${API_URL}/api/prescriptions/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const presMap = {};
        presResponse.data.prescriptions.forEach(p => {
          presMap[p.medication_id] = p.status; // e.g., 'pending', 'approved', 'rejected'
        });
        setPrescriptions(presMap);

      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, API_URL]);

  const handleAddToCart = async (medId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/cart/add`,
        { medicationId: medId, quantity: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setItemQuantities(prev => ({
        ...prev,
        [medId]: (prev[medId] || 0) + 1
      }));

      if (onCartUpdate) onCartUpdate();
    } catch (err) {
      console.error('Add to cart error:', err);
      alert(err.response?.data?.message || 'Failed to add to cart');
    }
  };

  const handleUpdateQuantity = async (medId, newQuantity) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/api/cart/${medId}`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setItemQuantities(prev => ({
        ...prev,
        [medId]: newQuantity
      }));

      if (onCartUpdate) onCartUpdate();
    } catch (err) {
      console.error('Update quantity error:', err);
      alert(err.response?.data?.message || 'Failed to update quantity');
    }
  };

  const handleQuantityChange = (medId, change) => {
    const currentQty = itemQuantities[medId] || 0;
    const newQty = currentQty + change;
    if (newQty < 0) return;

    handleUpdateQuantity(medId, newQty);
  };

  useEffect(() => {
    const results = medications.filter(med =>
      med.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMedications(results);
  }, [searchTerm, medications]);

  if (loading) return <div>Loading medications...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="customer-medications" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Our Medications</h1>

      {/* Search Bar */}
      <div style={{ marginBottom: '30px', position: 'relative', maxWidth: '500px' }}>
        <FaSearch style={{
          position: 'absolute',
          left: '15px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#666'
        }} />
        <input
          type="text"
          placeholder="Search medications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '12px 12px 12px 40px',
            width: '100%',
            borderRadius: '25px',
            border: '1px solid #ddd',
            fontSize: '16px'
          }}
        />
      </div>

      {/* Medications Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '25px'
      }}>
        {filteredMedications.map(med => {
          const prescriptionStatus = prescriptions[med.id];

          // Determine if Add to Cart / Quantity buttons should show
          
          const isPending = med.is_prescription_required && prescriptionStatus === 'pending';
          const isRejected = med.is_prescription_required && prescriptionStatus === 'rejected';

          return (
            <div key={med.id} style={{
              border: '1px solid #eee',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s'
            }}>
              {med.image_url && (
                <img 
                  src={med.image_url} 
                  alt={med.name}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'contain',
                    marginBottom: '15px',
                    borderRadius: '5px'
                  }}
                />
              )}
              <h3 style={{ marginBottom: '10px' }}>{med.name}</h3>
              <p style={{ color: '#666', marginBottom: '8px' }}>{med.category} • {med.dosage}</p>
              <p style={{ marginBottom: '15px' }}>{med.description}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '20px', fontWeight: 'bold' }}>${med.price.toFixed(2)}</span>
                <span style={{ color: med.stock_quantity > 0 ? 'green' : 'red', fontWeight: '500' }}>
                  {med.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              {/* Prescription / Add to Cart Logic */}
              {med.is_prescription_required ? (
                isPending ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '10px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    borderRadius: '5px',
                    fontWeight: 'bold'
                  }}>
                    Prescription Pending
                  </div>
                ) : isRejected ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '10px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    borderRadius: '5px',
                    fontWeight: 'bold'
                  }}>
                    Prescription Rejected
                  </div>
                ) : (
                  // Approved prescription, show add to cart / quantity
                  itemQuantities[med.id] > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <button
                        onClick={() => handleQuantityChange(med.id, -1)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <FaMinus />
                      </button>

                      <span style={{ fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>
                        {itemQuantities[med.id]}
                      </span>

                      <button
                        onClick={() => handleQuantityChange(med.id, 1)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <FaPlus />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(med.id)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaShoppingCart /> Add to Cart
                    </button>
                  )
                )
              ) : (
                // No prescription required
                itemQuantities[med.id] > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <button
                      onClick={() => handleQuantityChange(med.id, -1)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      <FaMinus />
                    </button>

                    <span style={{ fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>
                      {itemQuantities[med.id]}
                    </span>

                    <button
                      onClick={() => handleQuantityChange(med.id, 1)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      <FaPlus />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddToCart(med.id)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <FaShoppingCart /> Add to Cart
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerMedications;
