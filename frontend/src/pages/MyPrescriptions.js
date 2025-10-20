import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaDownload, FaEye } from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_URL;

const MyPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`${API_BASE}/api/prescriptions/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPrescriptions(data.prescriptions);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch prescriptions');
      } finally {
        setLoading(false);
      }
    };
    fetchPrescriptions();
  }, []);

  const viewFile = async (id, filePath) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/prescriptions/file/${id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadFile = async (id, filePath) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/prescriptions/file/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const fileName = filePath?.split('/').pop() || 'prescription.pdf';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>My Prescriptions</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Medication</th>
            <th>Status</th>
            <th>Uploaded At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {prescriptions.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{p.id}</td>
              <td>{p.medication_name}</td>
              <td>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  color: 'white',
                  backgroundColor:
                    p.status === 'approved' ? '#4caf50' :
                    p.status === 'rejected' ? '#f44336' :
                    '#ff9800'
                }}>
                  {p.status.toUpperCase()}
                </span>
              </td>
              <td>{new Date(p.created_at).toLocaleString()}</td>
              <td style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => viewFile(p.id, p.file_path)}
                  style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                ><FaEye /> View</button>
                <button
                  onClick={() => downloadFile(p.id, p.file_path)}
                  style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
                ><FaDownload /> Download</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {prescriptions.length === 0 && <p>No prescriptions uploaded yet.</p>}
    </div>
  );
};

export default MyPrescriptions;
