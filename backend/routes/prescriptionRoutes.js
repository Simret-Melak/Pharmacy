const express = require('express');
const { checkAuth } = require('../middleware/authMiddleware');
const prescriptionController = require('../controllers/prescriptionController');
const upload = require('../config/multerConfig');

const router = express.Router();

const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

router.use(checkAuth);

// Upload prescription
router.post(
  '/medications/:id/prescriptions',
  upload.single('prescription'),
  prescriptionController.uploadPrescription
);

// Get user's own prescriptions - MUST COME FIRST
router.get('/prescriptions/my', prescriptionController.getMyPrescriptions);

// Get all prescriptions (admin only)
router.get(
  '/prescriptions/all',
  checkAdmin,
  prescriptionController.getAllPrescriptions
);

// File operations
router.get(
  '/prescriptions/file/:id/view',
  prescriptionController.viewPrescriptionFile
);

router.get(
  '/prescriptions/file/:id/download',
  prescriptionController.downloadPrescription
);

// Get specific prescription details
router.get(
  '/prescriptions/:id',
  checkAdmin,
  prescriptionController.getPrescriptionDetails
);

// Update prescription status
router.put(
  '/prescriptions/:id/status',
  checkAdmin,
  prescriptionController.updatePrescriptionStatus
);

module.exports = router;