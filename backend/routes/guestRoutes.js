// routes/guestRoutes.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const guestController = require('../controllers/guestController'); // ✅ Check this path
const medicationController = require('../controllers/medicationController');

const router = express.Router();

const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ Guest Medication Routes
router.get('/medications', medicationController.getMedications);
router.get('/medications/:id', medicationController.getMedicationById);
router.get('/medications/:medicationId/prescription-check', 
  medicationController.checkPrescriptionRequirement
);

// ✅ Guest Checkout Routes - FIXED
router.post('/initiate', guestLimiter, [
  body('name').notEmpty().trim().isLength({ min: 2 }),
  body('phone').notEmpty().matches(/^[\+]?[1-9][\d]{0,15}$/),
  body('email').optional().isEmail().normalizeEmail()
], guestController.initiateGuestCheckout); // ✅ This should now work

router.get('/order/:confirmationCode', guestLimiter, guestController.checkGuestOrderStatus);
router.get('/pharmacies', guestController.getPharmacies);

module.exports = router;