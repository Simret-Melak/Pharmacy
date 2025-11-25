const express = require('express');
const { authenticateToken, requireAdmin, requireAdminOrPharmacist } = require('../controllers/authController');
const prescriptionController = require('../controllers/prescriptionController');
const { prescriptionUpload, handleMulterError } = require('../config/multerR2Config'); // ✅ Updated import

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// === USER ROUTES === //

// Upload prescription for a medication
router.post(
  '/upload/:medicationId',
  prescriptionUpload.single('prescription'), // ✅ Use prescriptionUpload
  handleMulterError, // ✅ Add error handling middleware
  prescriptionController.uploadPrescription
);

// Get user's own prescriptions
router.get(
  '/my-prescriptions', // ✅ Fixed route name to match your controller
  prescriptionController.getMyPrescriptions
);

// Get specific prescription details (users can only see their own)
router.get(
  '/:id',
  prescriptionController.getPrescriptionDetails
);

// View prescription file (users can only view their own)
router.get(
  '/:id/view',
  prescriptionController.viewPrescriptionFile
);

// Download prescription file (users can only download their own)
router.get(
  '/:id/download',
  prescriptionController.downloadPrescription
);

// Delete prescription (users can only delete their own pending ones)
router.delete(
  '/:id',
  prescriptionController.deletePrescription
);

// === ADMIN/PHARMACIST ROUTES === //

// Get all prescriptions (admin/pharmacist only)
router.get(
  '/',
  requireAdminOrPharmacist,
  prescriptionController.getAllPrescriptions
);

// Update prescription status (admin/pharmacist only)
router.patch(
  '/:id/status',
  requireAdminOrPharmacist,
  prescriptionController.updatePrescriptionStatus
);

module.exports = router;