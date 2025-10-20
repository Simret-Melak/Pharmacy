import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaFileMedicalAlt } from 'react-icons/fa';

const Header = ({ cartCount }) => {
  const navigate = useNavigate();

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
      <h1 style={{ margin: 0, cursor: 'pointer' }} onClick={() => navigate('/')}>
        Pharmacy App
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* My Prescriptions Icon */}
        <div style={{ cursor: 'pointer', position: 'relative' }} onClick={() => navigate('/my-prescriptions')}>
          <FaFileMedicalAlt size={24} />
        </div>

        {/* Cart Icon */}
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/cart')}>
          <FaShoppingCart size={24} />
          {cartCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: '#ff4444',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {cartCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
