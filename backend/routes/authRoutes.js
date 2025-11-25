const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// ✅ SINGLE IMPORT - No duplicates
const {
  registerUser,
  loginUser,
  logoutUser,
  deleteUserAccount,
  getAllUsers,
  adminDeleteUser,
  promoteUser,
  demoteUser,
  initiateGuestCheckout,
  authenticateToken,
  requireAdmin
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

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ GUEST CHECKOUT ROUTE
router.post(
  '/guest/initiate',
  generalLimiter,
  [
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .trim()
      .isLength({ min: 2 }),
    body('phone')
      .notEmpty()
      .withMessage('Phone number is required')
      .trim()
      .isLength({ min: 10 })
  ],
  initiateGuestCheckout
);

// Public routes
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

// Protected routes (require authentication)
router.post(
  '/logout',
  generalLimiter,
  authenticateToken,
  logoutUser
);

router.delete(
  '/account',
  generalLimiter,
  authenticateToken,
  [
    body('email')
      .isEmail()
      .withMessage('Valid email required for confirmation')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password confirmation is required')
  ],
  deleteUserAccount
);

// Admin-only routes
router.get(
  '/users',
  generalLimiter,
  authenticateToken,
  requireAdmin,
  getAllUsers
);

router.delete(
  '/users/:userId',
  generalLimiter,
  authenticateToken,
  requireAdmin,
  adminDeleteUser
);

// ✅ ADDED: Promote user route
router.post(
  '/users/:userId/promote',
  generalLimiter,
  authenticateToken,
  requireAdmin,
  [
    body('role')
      .isIn(['admin', 'pharmacist'])
      .withMessage('Role must be either admin or pharmacist')
  ],
  promoteUser
);

// ✅ ADDED: Demote user route
router.post(
  '/users/:userId/demote',
  generalLimiter,
  authenticateToken,
  requireAdmin,
  demoteUser
);


module.exports = router;