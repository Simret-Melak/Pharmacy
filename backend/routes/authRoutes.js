const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration route with validation and rate limiting
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('username').notEmpty().trim(),
    body('full_name').notEmpty().trim()
  ],
  registerUser
);

// Login route with validation and rate limiting
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  loginUser
);

module.exports = router;