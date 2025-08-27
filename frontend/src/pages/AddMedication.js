import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AddMedication = () => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    dosage: '',
    price: '',
    description: '',
    stock_quantity: '',
    online_stock: '',
    in_person_stock: '',
    low_stock_threshold: 10,
    is_prescription_required: false
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value === '' ? '' : Number(value)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        online_stock: parseInt(formData.online_stock) || 0,
        in_person_stock: parseInt(formData.in_person_stock) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10
      };

      await axios.post('/api/medications', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setSuccess('Medication added successfully!');
      setTimeout(() => navigate('/medications'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add medication');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px' }}>Add New Medication</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
        {/* Basic Information */}
        <div className="card p-4">
          <h3>Basic Information</h3>
          <div className="mb-3">
            <label className="form-label">Name*</label>
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
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="card p-4">
          <h3>Pricing</h3>
          <div className="mb-3">
            <label className="form-label">Price*</label>
            <div className="input-group">
              <span className="input-group-text">$</span>
              <input
                type="number"
                className="form-control"
                name="price"
                value={formData.price}
                onChange={handleNumberChange}
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        {/* Stock Information */}
        <div className="card p-4">
          <h3>Stock Information</h3>
          <div className="mb-3">
            <label className="form-label">Total Stock Quantity*</label>
            <input
              type="number"
              className="form-control"
              name="stock_quantity"
              value={formData.stock_quantity}
              onChange={handleNumberChange}
              min="0"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Online Stock</label>
            <input
              type="number"
              className="form-control"
              name="online_stock"
              value={formData.online_stock}
              onChange={handleNumberChange}
              min="0"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">In-Person Stock</label>
            <input
              type="number"
              className="form-control"
              name="in_person_stock"
              value={formData.in_person_stock}
              onChange={handleNumberChange}
              min="0"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Low Stock Threshold</label>
            <input
              type="number"
              className="form-control"
              name="low_stock_threshold"
              value={formData.low_stock_threshold}
              onChange={handleNumberChange}
              min="1"
            />
          </div>
        </div>

        {/* Additional Settings */}
        <div className="card p-4">
          <h3>Additional Settings</h3>
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
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/medications')}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Medication
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMedication;