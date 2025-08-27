import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaFileUpload, FaArrowLeft } from 'react-icons/fa';

const UploadPrescription = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('prescription', file);
      formData.append('medicationId', id);

      const token = localStorage.getItem('token');
      await axios.post(`/api/medications/${id}/prescriptions`, formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});

      setSuccess('Prescription uploaded successfully!');
      setTimeout(() => navigate('/medications'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <button 
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          marginBottom: '20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#666'
        }}
      >
        <FaArrowLeft /> Back to Medications
      </button>

      <h1 style={{ marginBottom: '20px' }}>Upload Prescription</h1>
      
      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: '15px' }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Select Prescription File (PDF, JPG, PNG)
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            style={{ display: 'block', width: '100%' }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%'
          }}
        >
          {loading ? 'Uploading...' : (
            <>
              <FaFileUpload /> Upload Prescription
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default UploadPrescription;