import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const EditMedication = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    dosage: '',
    price: '',
    description: '',
    stock_quantity: '',
    is_prescription_required: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMedication = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/auth');
          return;
        }

        // Check if we have medication data in location state (from the link)
        if (location.state?.medication) {
          setFormData(location.state.medication);
          setLoading(false);
          return;
        }

        // If not, fetch from API
        const response = await axios.get(`/api/medications/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setFormData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch medication');
      } finally {
        setLoading(false);
      }
    };

    fetchMedication();
  }, [id, navigate, location.state]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/medications/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      navigate('/medications', { state: { message: 'Medication updated successfully' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update medication');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container mt-4">
      <h2>Edit Medication</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-3">
          <label className="form-label">Category</label>
          <input
            type="text"
            className="form-control"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-3">
          <label className="form-label">Dosage</label>
          <input
            type="text"
            className="form-control"
            name="dosage"
            value={formData.dosage}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-3">
          <label className="form-label">Price</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-3">
          <label className="form-label">Stock Quantity</label>
          <input
            type="number"
            className="form-control"
            name="stock_quantity"
            value={formData.stock_quantity}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-3 form-check">
          <input
            type="checkbox"
            className="form-check-input"
            name="is_prescription_required"
            checked={formData.is_prescription_required}
            onChange={handleChange}
          />
          <label className="form-check-label">Prescription Required</label>
        </div>
        
        <button type="submit" className="btn btn-primary">
          Update Medication
        </button>
      </form>
    </div>
  );
};

export default EditMedication;