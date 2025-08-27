import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { FaSearch, FaTrash } from 'react-icons/fa';

const Medications = () => {
  const [medications, setMedications] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Safely decode token
  const getUserFromToken = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { role: 'customer' };
      const decoded = jwtDecode(token);
      return decoded;
    } catch (err) {
      console.error('Invalid token:', err);
      return { role: 'customer' };
    }
  };

  const user = getUserFromToken();
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const fetchMedications = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      try {
        const response = await axios.get('/api/medications', {
          headers: { Authorization: `Bearer ${token}` }
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medication?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/medications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedications(medications.filter(med => med.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete medication');
    }
  };

  if (loading) return <div>Loading medications...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="medications-container" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Medications</h1>
        {isAdmin && (
          <Link
            to="/medications/add"
            style={{
              padding: '10px 15px',
              backgroundColor: '#4CAF50',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            + Add Medication
          </Link>
        )}
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FaSearch style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666'
          }} />
          <input
            type="text"
            placeholder="Search by medication name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 10px 10px 35px',
              width: '100%',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Price</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Stock</th>
            {isAdmin && (
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {filteredMedications.map((med) => (
            <tr key={med.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '12px' }}>
                {isAdmin ? (
                  <Link to={`/medications/edit/${med.id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                    {med.name}
                  </Link>
                ) : (
                  med.name
                )}
              </td>
              <td style={{ padding: '12px' }}>${med.price?.toFixed(2)}</td>
              <td style={{ padding: '12px' }}>{med.stock_quantity}</td>
              {isAdmin && (
                <td style={{ padding: '12px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => navigate(`/medications/edit/${med.id}`)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(med.id)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <FaTrash /> Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Medications;