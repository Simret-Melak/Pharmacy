import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaFileMedicalAlt, FaUser, FaSignOutAlt, FaHome } from 'react-icons/fa';

const Header = ({ cartCount, authState, onAuthStateChange }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestData');
    localStorage.removeItem('guestCart');
    
    if (onAuthStateChange) {
      onAuthStateChange({
        isAuthenticated: false,
        isGuest: false,
        user: null,
        guest: null
      });
    }
    
    navigate('/');
  };

  const handleGuestEndSession = () => {
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestData');
    localStorage.removeItem('guestCart');
    
    if (onAuthStateChange) {
      onAuthStateChange({
        isAuthenticated: false,
        isGuest: false,
        user: null,
        guest: null
      });
    }
    
    navigate('/');
  };

  const getDisplayName = () => {
    if (authState?.isAuthenticated && authState.user) {
      return authState.user.full_name || authState.user.email || 'User';
    }
    if (authState?.isGuest && authState.guest) {
      return authState.guest.name || 'Guest';
    }
    return null;
  };

  const getUserRole = () => {
    if (authState?.isAuthenticated && authState.user) {
      return authState.user.role || 'customer';
    }
    return null;
  };

  const displayName = getDisplayName();
  const userRole = getUserRole();

  // SIMPLIFIED: Use the same navigation as Dashboard component
  const handlePrescriptionClick = () => {
    navigate('/prescriptions'); // Same as your Dashboard button
  };

  return (
    <header style={{
      padding: '1rem 2rem',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      {/* Left Section - Logo and Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
        <h1 
          style={{ 
            margin: 0, 
            cursor: 'pointer',
            color: '#2563eb',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }} 
          onClick={() => navigate('/')}
        >
          🏥 Pharmacy App
        </h1>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: '#64748b',
              fontSize: '14px'
            }}
          >
            <FaHome size={16} />
            Home
          </button>

          {/* Show different navigation based on auth state */}
          {authState?.isAuthenticated && (
            <>
              {userRole === 'admin' ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      fontSize: '14px'
                    }}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/prescriptions')} // Same as Dashboard
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      fontSize: '14px'
                    }}
                  >
                    Manage Prescriptions
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/customer/medications')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      fontSize: '14px'
                    }}
                  >
                    Medications
                  </button>
                  <button
                    onClick={() => navigate('/my-prescriptions')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      fontSize: '14px'
                    }}
                  >
                    My Prescriptions
                  </button>
                </>
              )}
            </>
          )}

          {authState?.isGuest && (
            <button
              onClick={() => navigate('/guest/medications')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '14px'
              }}
            >
              Medications
            </button>
          )}

          {!authState?.isAuthenticated && !authState?.isGuest && (
            <button
              onClick={() => navigate('/auth')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '14px'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Right Section - User Info and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Order Status Check (Visible to all) */}
        <button
          onClick={() => navigate('/order-status')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: '14px',
            textDecoration: 'underline'
          }}
        >
          📱 Track Order
        </button>

        {/* User/Guest Info */}
        {displayName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            <FaUser size={14} color="#64748b" />
            <span style={{ color: '#334155' }}>
              {displayName}
              {userRole && userRole !== 'customer' && (
                <span style={{ 
                  marginLeft: '8px',
                  padding: '2px 8px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {userRole}
                </span>
              )}
              {authState?.isGuest && (
                <span style={{ 
                  marginLeft: '8px',
                  padding: '2px 8px',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  Guest
                </span>
              )}
            </span>
          </div>
        )}

        {/* Prescriptions Icon - Use same navigation as Dashboard */}
        {authState?.isAuthenticated && (
          <div 
            style={{ 
              cursor: 'pointer', 
              position: 'relative',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onClick={handlePrescriptionClick} // Now goes to /prescriptions
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title={userRole === 'admin' ? 'Manage All Prescriptions' : 'My Prescriptions'}
          >
            <FaFileMedicalAlt size={20} color="#64748b" />
            {/* Optional: Show different badge for admin */}
            {userRole === 'admin' && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#2563eb',
                color: 'white',
                borderRadius: '50%',
                width: '8px',
                height: '8px',
                fontSize: '0px',
                border: '2px solid white'
              }}>
                •
              </span>
            )}
          </div>
        )}

        {/* Cart Icon (Visible to all authenticated users and guests) */}
        {(authState?.isAuthenticated || authState?.isGuest) && (
          <div 
            style={{ 
              position: 'relative', 
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onClick={() => authState?.isGuest ? navigate('/guest/checkout') : navigate('/cart')}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title={authState?.isGuest ? 'Guest Cart' : 'My Cart'}
          >
            <FaShoppingCart size={20} color="#64748b" />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                border: '2px solid white'
              }}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
        )}

        {/* Auth Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {authState?.isAuthenticated && (
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#64748b',
                fontSize: '14px',
                padding: '8px 12px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FaSignOutAlt size={14} />
              Logout
            </button>
          )}

          {authState?.isGuest && (
            <button
              onClick={handleGuestEndSession}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#64748b',
                fontSize: '14px',
                padding: '8px 12px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FaSignOutAlt size={14} />
              End Session
            </button>
          )}

          {!authState?.isAuthenticated && !authState?.isGuest && (
            <button
              onClick={() => navigate('/auth')}
              style={{
                background: '#2563eb',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                fontSize: '14px',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;