import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div style={{ 
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5' 
    }}>
      <h1 style={{ color: '#333' }}>Dashboard</h1>
      <p style={{ color: '#666' }}>Welcome to your dashboard!</p>
      
      {/* Add this link to navigate to medications */}
      <Link 
        to="/medications" 
        style={{
          display: 'inline-block',
          marginTop: '20px',
          padding: '10px 15px',
          backgroundColor: '#4CAF50',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          transition: 'background-color 0.3s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
      >
        View Medications as Admin
      </Link>

      <Link 
        to="/customer/medications" 
        style={{
          display: 'inline-block',
          marginTop: '20px',
          padding: '10px 15px',
          backgroundColor: '#4CAF50',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          transition: 'background-color 0.3s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
      >
        View Medications as Customer
      </Link>

      <Link 
        to="/prescriptions" 
        style={{
          display: 'inline-block',
          marginTop: '20px',
          padding: '10px 15px',
          backgroundColor: '#4CAF50',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          transition: 'background-color 0.3s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
      >
        View Prescriptions
      </Link>

      
    </div>
  );
}