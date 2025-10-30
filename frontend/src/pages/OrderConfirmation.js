import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const OrderConfirmation = ({ onCartUpdate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { order, confirmationCode } = location.state || {};

  // Debug log to see what we're receiving
  console.log('📦 Order Confirmation Data:', { order, confirmationCode });

  // Clear cart when confirmation page loads
  React.useEffect(() => {
    if (order && confirmationCode && onCartUpdate) {
      onCartUpdate(); // This will update the cart count to 0
    }
  }, [order, confirmationCode, onCartUpdate]);

  if (!order || !confirmationCode) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h4>Order information not found</h4>
          <p>Please check your order history or contact support.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/')}
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="card shadow-lg border-0">
        <div className="card-header bg-success text-white text-center py-4">
          <h1 className="display-4 fw-bold mb-0">🎉 Order Confirmed!</h1>
          <p className="fs-5 mb-0 mt-2">Thank you for your order!</p>
        </div>
        
        <div className="card-body p-4">
          
          {/* 🎯 BIG BOLD CONFIRMATION CODE SECTION */}
          <div className="text-center mb-5 p-5 bg-light border border-4 border-warning rounded-3">
            <h3 className="text-muted mb-4">YOUR ORDER CONFIRMATION CODE</h3>
            
            {/* Giant Confirmation Code */}
            <div className="confirmation-code-display mb-4">
              <div className="display-1 fw-bold text-primary" style={{ 
                fontSize: '4rem', 
                letterSpacing: '0.8rem',
                fontFamily: "'Courier New', monospace",
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                lineHeight: '1.2'
              }}>
                {confirmationCode}
              </div>
            </div>

            {/* ⚠️ IMPORTANT DISCLAIMER */}
            <div className="alert alert-warning border-3 fs-5 fw-bold mb-4">
              <div className="d-flex align-items-center justify-content-center">
                <span className="fs-2 me-3">⚠️</span>
                <div>
                  <div className="fw-bold">SAVE THIS CONFIRMATION CODE!</div>
                  <div className="fs-6 fw-normal mt-1">
                    You will need this code to check your order status and pick up your medication.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Recommendations */}
            <div className="row justify-content-center">
              <div className="col-md-8">
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-info btn-lg"
                    onClick={() => {
                      // Copy to clipboard
                      navigator.clipboard.writeText(confirmationCode);
                      alert('Confirmation code copied to clipboard!');
                    }}
                  >
                    📋 Copy Confirmation Code
                  </button>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => window.print()}
                  >
                    🖨️ Print This Page
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header bg-light">
                  <h5 className="mb-0">📦 Order Details</h5>
                </div>
                <div className="card-body">
                  <p><strong>Order ID:</strong> #{order.id}</p>
                  <p>
                    <strong>Status:</strong> 
                    <span className="badge bg-warning text-dark ms-2 fs-6">
                      {order.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </p>
                  <p><strong>Total Amount:</strong> ${order.total_price}</p>
                  <p><strong>Total Items:</strong> {order.total_number_of_items}</p>
                  <p><strong>Pharmacy:</strong> {order.pharmacy_name || 'Bethlam Pharmacy'}</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header bg-light">
                  <h5 className="mb-0">👤 Customer Information</h5>
                </div>
                <div className="card-body">
                  <p><strong>Name:</strong> {order.customer_name}</p>
                  <p><strong>Phone:</strong> {order.customer_phone}</p>
                  {order.customer_email && <p><strong>Email:</strong> {order.customer_email}</p>}
                  {order.customer_notes && (
                    <p><strong>Notes:</strong> {order.customer_notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 📋 What's Next Section */}
          <div className="alert alert-info border-0">
            <h5 className="mb-3">📋 What Happens Next?</h5>
            <div className="row">
              <div className="col-md-6">
                <div className="d-flex mb-2">
                  <span className="me-3 fw-bold text-primary">1.</span>
                  <div>
                    <strong>Keep your confirmation code safe</strong>
                    <div className="text-muted small">You'll need it for all order inquiries</div>
                  </div>
                </div>
                <div className="d-flex mb-2">
                  <span className="me-3 fw-bold text-primary">2.</span>
                  <div>
                    <strong>Check order status anytime</strong>
                    <div className="text-muted small">Use your confirmation code to track progress</div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex mb-2">
                  <span className="me-3 fw-bold text-primary">3.</span>
                  <div>
                    <strong>Receive SMS updates</strong>
                    <div className="text-muted small">We'll text you at {order.customer_phone}</div>
                  </div>
                </div>
                <div className="d-flex mb-2">
                  <span className="me-3 fw-bold text-primary">4.</span>
                  <div>
                    <strong>Present code at pickup</strong>
                    <div className="text-muted small">Bring this code to collect your order</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center mt-4">
            <button 
              className="btn btn-primary btn-lg me-3 px-4"
              onClick={() => navigate('/order-status')}
            >
              📱 Track Order Status
            </button>
            <button 
              className="btn btn-success btn-lg me-3 px-4"
              onClick={() => navigate('/guest/medications')}
            >
              🛒 Continue Shopping
            </button>
            <button 
              className="btn btn-outline-dark btn-lg px-4"
              onClick={() => navigate('/')}
            >
              🏠 Return Home
            </button>
          </div>

        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .btn { display: none !important; }
          .confirmation-code-display { 
            break-inside: avoid; 
            font-size: 3rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderConfirmation;