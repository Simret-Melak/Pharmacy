const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors'); 
const path = require('path'); 

// Import routes
const guestRoutes = require('./routes/guestRoutes');

dotenv.config();

const app = express();

// ======== CRITICAL FIXES ======== //
app.set('trust proxy', 1); 

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Token'],
  credentials: true
}));

// ======== SECURITY MIDDLEWARE ======== //
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// ======== RATE LIMITING ======== //
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  validate: { trustProxy: true }
});
app.use('/api', limiter);

// ======== DEBUG MIDDLEWARE ======== //
if (process.env.NODE_ENV === 'development') {
  app.use('/api', (req, res, next) => {
    console.log('🔍 API Request:', req.method, req.url);
    next();
  });
}

// ======== HEALTH CHECK ======== //
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ======== ROUTES ======== //
// ✅ GUEST ROUTES FIRST (no authentication required)
app.use('/api/guest', guestRoutes);

// ✅ ORDER ROUTES (use the real controller that saves to database)
app.use('/api/orders', require('./routes/orderRoutes'));

// ✅ Other routes (may require authentication)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/medications', require('./routes/medicationRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));

// ✅ ADMIN ROUTES (ADDED - for admin dashboard)
app.use('/api/admin', require('./routes/adminRoutes'));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ======== ERROR HANDLING ======== //
app.use((err, req, res, next) => {
  console.error('⚠️ Error:', err.message);
  
  if (err.statusCode === 429) {
    return res.status(429).json({ error: 'Too many requests, please try again later' });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ======== START SERVER ======== //
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`ℹ️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Available endpoints:`);
  console.log(`   - Guest: http://localhost:${PORT}/api/guest`);
  console.log(`   - Orders: http://localhost:${PORT}/api/orders`);
  console.log(`   - Admin: http://localhost:${PORT}/api/admin`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
});