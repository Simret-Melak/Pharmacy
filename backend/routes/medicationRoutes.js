const express = require('express');
const { authenticateToken, requireAdminOrPharmacist } = require('../controllers/authController');
const medicationController = require('../controllers/medicationController');
const { medicationUpload, handleMulterError } = require('../config/multerR2Config'); // ✅ Import from config

const router = express.Router();

// Add medication with image upload
router.post(
  '/',
  authenticateToken,
  requireAdminOrPharmacist,
  medicationUpload.single('image'), // ✅ Use directly in routes
  handleMulterError,
  medicationController.addMedication
);

// Update medication with optional image upload
router.put(
  '/:id',
  authenticateToken,
  requireAdminOrPharmacist,
  medicationUpload.single('image'), // ✅ Use directly in routes
  handleMulterError,
  medicationController.updateMedication
);

// Other routes...
router.get('/', medicationController.getMedications);
router.get('/:id', medicationController.getMedicationById);
router.delete('/:id', authenticateToken, requireAdminOrPharmacist, medicationController.deleteMedication);
router.patch('/:id/stock', authenticateToken, requireAdminOrPharmacist, medicationController.updateStock);

module.exports = router;