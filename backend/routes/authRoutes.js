const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail
} = require('../controllers/authController');

const router = express.Router();

// Security middleware
router.use(helmet());
router.use(express.json({ limit: '10kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Registration
router.post(
  '/register',
  authLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .trim()
      .isLength({ min: 3 }),
    body('full_name')
      .notEmpty()
      .withMessage('Full name is required')
      .trim()
  ],
  registerUser
);

// Login
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  loginUser
);

// Email Verification
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationEmail);

module.exports = router;