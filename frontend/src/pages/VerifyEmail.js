import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [verificationMessage, setVerificationMessage] = useState('Verifying your email...');

useEffect(() => {
  const verifyToken = async () => {
    const token = searchParams.get('token');
    
    if (!token) {
      setVerificationStatus('error');
      setVerificationMessage('Missing verification token');
      return;
    }

    try {
      // Verify with backend
      const response = await axios.get(`/api/auth/verify-email`, {
        params: { token }
      });

      if (response.data.success) {
        setVerificationStatus('success');
        setVerificationMessage('Email verified! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      setVerificationStatus('error');
      setVerificationMessage(error.response?.data?.message || 'Verification failed');
    }
  };

  verifyToken();
}, [searchParams, navigate]);

  return (
    <div className="email-verification-page">
      <div className={`status-message ${verificationStatus}`}>
        <h2>
          {verificationStatus === 'verifying' ? 'Verifying Email' : 
           verificationStatus === 'success' ? 'Success!' : 'Verification Failed'}
        </h2>
        <p>{verificationMessage}</p>
        {verificationStatus === 'error' && (
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}