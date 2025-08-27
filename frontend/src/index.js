import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import global styles
import { BrowserRouter as Router } from 'react-router-dom'; // Import Router for routing
import App from './App'; // Import the main App component

// Get the root element where your React app will be rendered
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the app with React Router inside the root element
root.render(
  <Router>
    <App />  {/* Main App component */}
  </Router>
);