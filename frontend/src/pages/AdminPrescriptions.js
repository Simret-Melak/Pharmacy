import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/api/prescriptions/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPrescriptions(data.prescriptions);
        setFilteredPrescriptions(data.prescriptions);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch prescriptions');
      } finally {
        setLoading(false);
      }
    };
    fetchPrescriptions();
  }, []);

  const viewUserPrescriptions = (userId, userName) => {
    const userPrescriptions = prescriptions.filter(p => p.user_id === userId);
    setFilteredPrescriptions(userPrescriptions);
    setSelectedUser(userName);
    setShowAll(false);
  };

  const viewAllPrescriptions = () => {
    setFilteredPrescriptions(prescriptions);
    setSelectedUser(null);
    setShowAll(true);
  };

  const downloadFile = async (prescriptionId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/prescriptions/file/${prescriptionId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create a blob from the response data
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'prescription.pdf');
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download file');
    }
  };

  if (loading) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Loading prescriptions...</p>
    </div>
  );
  
  if (error) return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
      <p>{error}</p>
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>All Prescriptions</h1>
      
      {!showAll && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '5px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p>Showing prescriptions for: <strong>{selectedUser}</strong></p>
          <button 
            onClick={viewAllPrescriptions}
            style={{ 
              padding: '8px 15px', 
              backgroundColor: '#2196f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Show All Prescriptions
          </button>
        </div>
      )}
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>ID</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>User</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Medication</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Notes</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Uploaded At</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrescriptions.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{p.id}</td>
                <td style={{ padding: '12px' }}>{p.user_name}</td>
                <td style={{ padding: '12px' }}>{p.user_email}</td>
                <td style={{ padding: '12px' }}>{p.medication_name}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: 
                      p.status === 'approved' ? '#4caf50' :
                      p.status === 'rejected' ? '#f44336' :
                      '#ff9800'
                  }}>
                    {p.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{p.notes || '-'}</td>
                <td style={{ padding: '12px' }}>{new Date(p.created_at).toLocaleString()}</td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => viewUserPrescriptions(p.user_id, p.user_name)}
                    style={{ 
                      padding: '6px 10px', 
                      marginRight: '8px', 
                      backgroundColor: '#2196f3', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '3px', 
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    View User
                  </button>
                  <button
                    onClick={() => downloadFile(p.id, p.file_path?.split('/').pop())}
                    style={{ 
                      padding: '6px 10px', 
                      backgroundColor: '#4caf50', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '3px', 
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredPrescriptions.length === 0 && !loading && (
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
          No prescriptions found.
        </p>
      )}
    </div>
  );
};

export default AdminPrescriptions;