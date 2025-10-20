import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL;

const AdminPrescriptionReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState(''); // 'approve' or 'reject'
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPrescriptionDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE}/api/prescriptions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrescription(data.prescription);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch prescription details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPrescriptionDetails();
  }, [fetchPrescriptionDetails]);

  const viewFile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/prescriptions/file/${id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Get file info from the prescription data
      const fileName = prescription?.file_path?.split('/').pop() || 'prescription';
      
      // Create blob from response with proper MIME type
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

  const downloadFile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/prescriptions/file/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const fileName = prescription?.file_path?.split('/').pop() || 'prescription.pdf';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError(err.response?.data?.message || 'Failed to download file');
    }
  };

  const handleStatusUpdate = async () => {
    if (action === 'reject' && !rejectionNotes.trim()) {
      setError('Please provide rejection notes');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const status = action === 'approve' ? 'approved' : 'rejected';
      
      await axios.put(
        `${API_BASE}/api/prescriptions/${id}/status`,
        { status, notes: rejectionNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate('/admin/prescriptions', { 
        state: { message: `Prescription ${status} successfully` } 
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>{error}</div>;
  if (!prescription) return <div style={{ padding: '20px', textAlign: 'center' }}>Prescription not found</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/admin/prescriptions')}
        style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        ← Back to Prescriptions
      </button>

      <h1>Review Prescription #{prescription.id}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Left Column - Prescription Info */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3>Prescription Details</h3>
          <div style={{ marginBottom: '15px' }}>
            <strong>Status:</strong>
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              marginLeft: '10px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor:
                prescription.status === 'approved' ? '#28a745' :
                prescription.status === 'rejected' ? '#dc3545' :
                '#ffc107'
            }}>
              {prescription.status?.toUpperCase()}
            </span>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Medication:</strong> {prescription.medication_name}
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Patient:</strong> {prescription.user_name} ({prescription.user_email})
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Uploaded:</strong> {new Date(prescription.created_at).toLocaleString()}
          </div>

          {prescription.pharmacist_name && (
            <div style={{ marginBottom: '15px' }}>
              <strong>Reviewed by:</strong> {prescription.pharmacist_name} {prescription.pharmacist_email && `(${prescription.pharmacist_email})`}
            </div>
          )}

          {prescription.notes && (
            <div style={{ marginBottom: '15px' }}>
              <strong>Notes:</strong> {prescription.notes}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button
              onClick={viewFile}
              style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
            >
              📄 View File
            </button>
            <button
              onClick={downloadFile}
              style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
            >
              ⬇️ Download
            </button>
          </div>
        </div>

        {/* Right Column - Review Actions */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3>Review Actions</h3>
          
          {prescription.status === 'pending' ? (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                  Select Action:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setAction('approve')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: action === 'approve' ? '#28a745' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => setAction('reject')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: action === 'reject' ? '#dc3545' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>

              {action === 'reject' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                    Rejection Reason (Required):
                  </label>
                  <textarea
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="Please provide details why this prescription is being rejected..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '10px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                    required
                  />
                </div>
              )}

              {action && (
                <button
                  onClick={handleStatusUpdate}
                  disabled={submitting}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: action === 'approve' ? '#28a745' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    width: '100%',
                    fontSize: '16px'
                  }}
                >
                  {submitting ? 'Processing...' : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
              <p>This prescription has already been {prescription.status}.</p>
              {prescription.notes && (
                <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
                  <strong>Review Notes:</strong>
                  <p>{prescription.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Preview Area */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
        <h3>Prescription File Preview</h3>
        <p>Use the buttons above to view or download the prescription file for detailed review.</p>
      </div>
    </div>
  );
};

export default AdminPrescriptionReview;