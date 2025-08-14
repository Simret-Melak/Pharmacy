const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors'); // Add this

dotenv.config();

const app = express();

// ======== CRITICAL FIXES ======== //
// 1. Trust proxy for rate limiting
app.set('trust proxy', 1); 

// 2. Enable CORS (for frontend communication)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ======== SECURITY MIDDLEWARE ======== //
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// ======== RATE LIMITING ======== //
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  validate: { trustProxy: true } // Respect proxy headers
});
app.use('/api', limiter);

// ======== ROUTES ======== //
app.use('/api/auth', require('./routes/authRoutes'));

// ======== ERROR HANDLING ======== //
app.use((err, req, res, next) => {
  console.error('⚠️ Error:', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ======== START SERVER ======== //
const PORT = process.env.PORT || 5001; // Changed to 5001 to match your frontend proxy
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`ℹ️  Environment: ${process.env.NODE_ENV || 'development'}`);
});