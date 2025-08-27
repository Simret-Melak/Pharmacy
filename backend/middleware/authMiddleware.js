const jwt = require('jsonwebtoken');
const pool = require('../db');

exports.checkAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (user.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request in the SAME format as your JWT token
    req.user = {
      userId: user.rows[0].id,
      role: user.rows[0].role,
      email: user.rows[0].email,
      pharmacyId: user.rows[0].pharmacy_id
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
exports.checkRole = (role) => {
  return (req, res, next) => {
    // Use req.user.role (from JWT format) not req.user.role from database
    if (req.user.role !== role) {
      return res.status(403).json({ message: `Unauthorized - ${role} access required` });
    }
    next();
  };
};
