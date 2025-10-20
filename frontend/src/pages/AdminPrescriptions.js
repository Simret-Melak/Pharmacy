import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL;

const AdminPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAll, setShowAll] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No auth token found');

        const { data } = await axios.get(`${API_BASE}/api/prescriptions/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const prescriptionsData = Array.isArray(data) ? data : data.prescriptions;
        setPrescriptions(prescriptionsData || []);
        setFilteredPrescriptions(prescriptionsData || []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch prescriptions');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, []);

  useEffect(() => {
    let filtered = prescriptions;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    // Apply user filter if active
    if (!showAll && selectedUser) {
      const userPrescriptions = prescriptions.filter(p => p.user_id === selectedUser.id);
      filtered = filtered.filter(p => userPrescriptions.some(up => up.id === p.id));
    }
    
    setFilteredPrescriptions(filtered);
  }, [statusFilter, showAll, selectedUser, prescriptions]);

  const viewUserPrescriptions = (userId, userName) => {
    setSelectedUser({ id: userId, name: userName });
    setShowAll(false);
  };

  const viewAllPrescriptions = () => {
    setSelectedUser(null);
    setShowAll(true);
    setStatusFilter('all');
  };

  const viewFile = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/prescriptions/file/${id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Get file info from your prescriptions data
      const prescription = prescriptions.find(p => p.id === id);
      const fileName = prescription?.file_path?.split('/').pop() || 'prescription';
      
      // Create blob from response
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      
      // Open PDFs and images in new tab, download others
      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('pdf') || contentType.includes('image/')) {
        window.open(url, '_blank');
      } else {
        // For non-viewable files, trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error viewing file:', err);
      setError(err.response?.data?.message || 'Failed to view file');
    }
  };

  const downloadFile = async (id, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/prescriptions/file/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'prescription.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError(err.response?.data?.message || 'Failed to download file');
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading prescriptions...</div>;
  if (error) return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>All Prescriptions</h1>

      {/* Status Filter */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold' }}>Filter by Status:</label>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {!showAll && selectedUser && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p>Showing prescriptions for: <strong>{selectedUser.name}</strong></p>
          <button onClick={viewAllPrescriptions} style={{ padding: '8px 15px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Show All Prescriptions
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>ID</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>User</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Medication</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Pharmacist</th>
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
                    {p.status?.toUpperCase() || 'PENDING'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  {p.pharmacist_name ? (
                    <span title={`Pharmacist: ${p.pharmacist_name} (${p.pharmacist_email})`}>
                      {p.pharmacist_name}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '12px', maxWidth: '200px' }}>
                  {p.notes ? (
                    <span title={p.notes}>
                      {p.notes.length > 50 ? p.notes.substring(0, 50) + '...' : p.notes}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '12px' }}>{new Date(p.created_at).toLocaleString()}</td>
                <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => viewUserPrescriptions(p.user_id, p.user_name)}
                    style={{ padding: '6px 10px', margin: '2px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                    title="View all prescriptions from this user"
                  >
                    View User
                  </button>
                  
                  <button
                    onClick={() => navigate(`/admin/prescriptions/review/${p.id}`)}
                    style={{ 
                      padding: '6px 10px', 
                      margin: '2px', 
                      backgroundColor: '#9c27b0', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '3px', 
                      cursor: 'pointer', 
                      fontSize: '12px' 
                    }}
                    title="Review and approve/reject prescription"
                  >
                    Review
                  </button>
                  
                  <button
                    onClick={() => viewFile(p.id)}
                    style={{ padding: '6px 10px', margin: '2px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                    title="View prescription file"
                  >
                    View File
                  </button>
                  
                  <button
                    onClick={() => downloadFile(p.id, p.file_path?.split('/').pop())}
                    style={{ padding: '6px 10px', margin: '2px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                    title="Download prescription file"
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
        <div style={{ textAlign: 'center', marginTop: '40px', padding: '40px', color: '#666', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h3>No prescriptions found</h3>
          <p>No prescriptions match your current filters.</p>
          {(statusFilter !== 'all' || !showAll) && (
            <button 
              onClick={viewAllPrescriptions}
              style={{ padding: '10px 20px', marginTop: '10px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {filteredPrescriptions.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
          Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
        </div>
      )}
    </div>
  );
};

export default AdminPrescriptions;