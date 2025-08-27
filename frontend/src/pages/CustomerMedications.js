import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaShoppingCart, FaPrescription } from 'react-icons/fa';

const CustomerMedications = () => {
  const [medications, setMedications] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
  const fetchMedications = async () => {
    const token = localStorage.getItem('token'); // get the token
    if (!token) {
      navigate('/auth'); // redirect if not logged in
      return;
    }

    try {
      const response = await axios.get('/api/medications', {
        headers: { Authorization: `Bearer ${token}` } // include token
      });
      setMedications(response.data);
      setFilteredMedications(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching medications');
    } finally {
      setLoading(false);
    }
  };

  fetchMedications();
}, [navigate]);


  useEffect(() => {
    const results = medications.filter(med =>
      med.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMedications(results);
  }, [searchTerm, medications]);

  const handleAddToCart = (medId) => {
    // Implement your cart logic here
    console.log('Added to cart:', medId);
  };

  if (loading) return <div>Loading medications...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="customer-medications" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Our Medications</h1>
      
      {/* Search Bar */}
      <div style={{ 
        marginBottom: '30px',
        position: 'relative',
        maxWidth: '500px'
      }}>
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
        {filteredMedications.map(med => (
          <div key={med.id} style={{
            border: '1px solid #eee',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
            ':hover': {
              transform: 'translateY(-5px)'
            }
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
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                ${med.price.toFixed(2)}
              </span>
              <span style={{ 
                color: med.stock_quantity > 0 ? 'green' : 'red',
                fontWeight: '500'
              }}>
                {med.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {med.is_prescription_required ? (
              <button
                onClick={() => navigate(`/upload-prescription/${med.id}`)}
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
                  gap: '8px'
                }}
              >
                <FaPrescription /> Upload Prescription
              </button>
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerMedications;