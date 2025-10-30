// routes/guestRoutes.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  initiateGuestCheckout,
  checkGuestOrderStatus,
  getPharmacies
} = require('../controllers/authController');
const medicationController = require('../controllers/medicationController'); // Add this

const router = express.Router();

const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ Guest Medication Routes (No authentication)
router.get('/medications', medicationController.getMedications);
router.get('/medications/:id', medicationController.getMedicationById);
router.get('/medications/:medicationId/prescription-check', 
  medicationController.checkPrescriptionRequirement
);

// ✅ Existing Guest Routes
router.post('/initiate', guestLimiter, [
  body('name').notEmpty().trim().isLength({ min: 2 }),
  body('phone').notEmpty().matches(/^[\+]?[1-9][\d]{0,15}$/),
  body('email').optional().isEmail().normalizeEmail()
], initiateGuestCheckout);

router.get('/order/:confirmationCode', guestLimiter, checkGuestOrderStatus);
router.get('/pharmacies', getPharmacies);

module.exports = router;