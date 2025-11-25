const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  getAllPharmacies,
  getPharmacyById,
  createPharmacy,
  updatePharmacy,
  deletePharmacy,
  getPharmacyStats
} = require('../controllers/adminController');

const { authenticateToken, requireAdmin } = require('../controllers/authController');

const router = express.Router();

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many admin requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require admin authentication
router.use(adminLimiter);
router.use(authenticateToken);
router.use(requireAdmin);

// Pharmacy Management Routes
router.get('/pharmacies', getAllPharmacies);
router.get('/pharmacies/:pharmacyId', getPharmacyById);
router.get('/pharmacies/:pharmacyId/stats', getPharmacyStats);

router.post(
  '/pharmacies',
  [
    body('name')
      .notEmpty()
      .withMessage('Pharmacy name is required')
      .trim()
      .isLength({ min: 2, max: 255 }),
    body('contact_phone')
      .optional()
      .trim()
      .isLength({ min: 10 }),
    body('contact_email')
      .optional()
      .isEmail()
      .withMessage('Valid email required')
      .normalizeEmail()
  ],
  createPharmacy
);

router.put(
  '/pharmacies/:pharmacyId',
  [
    body('name')
      .notEmpty()
      .withMessage('Pharmacy name is required')
      .trim()
      .isLength({ min: 2, max: 255 }),
    body('contact_phone')
      .optional()
      .trim()
      .isLength({ min: 10 }),
    body('contact_email')
      .optional()
      .isEmail()
      .withMessage('Valid email required')
      .normalizeEmail()
  ],
  updatePharmacy
);

router.delete('/pharmacies/:pharmacyId', deletePharmacy);

module.exports = router;