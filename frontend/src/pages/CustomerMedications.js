import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaShoppingCart, FaPlus, FaMinus, FaPrescription } from 'react-icons/fa';

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
        
        // FIX: Extract medications array from response
        const medicationsData = medResponse.data.medications || medResponse.data || [];
        console.log('Medications data:', medicationsData);
        
        setMedications(medicationsData);
        setFilteredMedications(medicationsData);

        // Fetch cart items
        try {
          const cartResponse = await axios.get(`${API_URL}/api/cart`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const quantities = {};
          const cartItems = Array.isArray(cartResponse.data) ? cartResponse.data : cartResponse.data.items || [];
          cartItems.forEach(item => {
            quantities[item.medication_id] = item.quantity;
          });
          setItemQuantities(quantities);
        } catch (cartError) {
          console.log('Cart might be empty or error fetching cart:', cartError);
          setItemQuantities({});
        }

        // Fetch customer prescriptions
        try {
          const presResponse = await axios.get(`${API_URL}/api/prescriptions/my`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const presMap = {};
          const prescriptionsData = Array.isArray(presResponse.data) ? presResponse.data : presResponse.data.prescriptions || [];
          prescriptionsData.forEach(p => {
            presMap[p.medication_id] = p.status; // e.g., 'pending', 'approved', 'rejected'
          });
          setPrescriptions(presMap);
        } catch (presError) {
          console.log('No prescriptions found or error:', presError);
          setPrescriptions({});
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || 'Error fetching medications');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, API_URL]);

  useEffect(() => {
    // FIX: Ensure medications is always an array before filtering
    const results = Array.isArray(medications) 
      ? medications.filter(med =>
          med && med.name && med.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : [];
    setFilteredMedications(results);
  }, [searchTerm, medications]);

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

  const handleUploadPrescription = (medication) => {
    navigate(`/upload-prescription/${medication.id}`, { 
      state: { medicationName: medication.name } 
    });
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading medications...</div>;
  if (error) return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>{error}</div>;

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
      {!filteredMedications || filteredMedications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <h3>No medications found</h3>
          <p>{searchTerm ? 'Try adjusting your search terms' : 'No medications available at the moment'}</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '25px'
        }}>
          {filteredMedications.map(med => {
            if (!med || !med.id) return null; // Skip invalid medications
            
            const prescriptionStatus = prescriptions[med.id];
            const currentQuantity = itemQuantities[med.id] || 0;
            const isOutOfStock = !med.stock_quantity || med.stock_quantity <= 0;

            // Determine prescription status
            const isPending = med.is_prescription_required && prescriptionStatus === 'pending';
            const isRejected = med.is_prescription_required && prescriptionStatus === 'rejected';
            const isApproved = med.is_prescription_required && prescriptionStatus === 'approved';
            const needsPrescription = med.is_prescription_required && !prescriptionStatus;

            return (
              <div key={med.id} style={{
                border: '1px solid #eee',
                borderRadius: '10px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                backgroundColor: '#fff'
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
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, flex: 1 }}>{med.name}</h3>
                  {med.is_prescription_required && (
                    <FaPrescription 
                      style={{ 
                        color: '#ff9800',
                        marginTop: '3px'
                      }} 
                      title="Prescription required"
                    />
                  )}
                </div>
                
                <p style={{ color: '#666', marginBottom: '8px', fontSize: '14px' }}>
                  {med.category} {med.dosage && `• ${med.dosage}`}
                </p>
                
                {med.description && (
                  <p style={{ 
                    marginBottom: '15px', 
                    fontSize: '14px',
                    color: '#555',
                    lineHeight: '1.4'
                  }}>
                    {med.description.length > 100 
                      ? `${med.description.substring(0, 100)}...` 
                      : med.description
                    }
                  </p>
                )}

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '15px' 
                }}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c5aa0' }}>
                    ${med.price ? med.price.toFixed(2) : '0.00'}
                  </span>
                  <span style={{ 
                    color: isOutOfStock ? '#f44336' : '#4CAF50', 
                    fontWeight: '500',
                    fontSize: '14px'
                  }}>
                    {isOutOfStock ? 'Out of Stock' : `Stock: ${med.stock_quantity}`}
                  </span>
                </div>

                {/* Prescription / Add to Cart Logic */}
                {isOutOfStock ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    color: '#666',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    Currently Unavailable
                  </div>
                ) : med.is_prescription_required ? (
                  <>
                    {isPending && (
                      <div style={{
                        textAlign: 'center',
                        padding: '10px',
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        border: '1px solid #ffeaa7'
                      }}>
                        ⏳ Prescription Pending Review
                      </div>
                    )}
                    
                    {isRejected && (
                      <div style={{
                        textAlign: 'center',
                        padding: '10px',
                        backgroundColor: '#f8d7da',
                        color: '#721c24',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        border: '1px solid #f5c6cb'
                      }}>
                        ❌ Prescription Rejected
                      </div>
                    )}
                    
                    {isApproved && currentQuantity > 0 && (
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
                          {currentQuantity}
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
                    )}
                    
                    {isApproved && currentQuantity === 0 && (
                      <button
                        onClick={() => handleAddToCart(med.id)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: 'bold'
                        }}
                      >
                        <FaShoppingCart /> Add to Cart
                      </button>
                    )}
                    
                    {needsPrescription && (
                      <button
                        onClick={() => handleUploadPrescription(med)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: '#ff9800',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: 'bold'
                        }}
                      >
                        <FaPrescription /> Upload Prescription
                      </button>
                    )}
                  </>
                ) : (
                  // No prescription required
                  currentQuantity > 0 ? (
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
                        {currentQuantity}
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
                      disabled={isOutOfStock}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: isOutOfStock ? '#ccc' : '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: 'bold'
                      }}
                    >
                      <FaShoppingCart /> {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerMedications;