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

// Get user's own prescriptions - REGULAR USERS ONLY
router.get('/my', prescriptionController.getMyPrescriptions);

// === ADMIN ROUTES === //
// Get all prescriptions (admin only)
router.get(
  '/all',
  checkAdmin,
  prescriptionController.getAllPrescriptions
);

// Get specific prescription details (admin only)
router.get(
  '/:id',
  checkAdmin,
  prescriptionController.getPrescriptionDetails
);

// Update prescription status (admin only)
router.put(
  '/:id/status',
  checkAdmin,
  prescriptionController.updatePrescriptionStatus
);

// File operations (both user and admin, with proper auth in controller)
router.get(
  '/file/:id/view',
  prescriptionController.viewPrescriptionFile
);

router.get(
  '/file/:id/download',
  prescriptionController.downloadPrescription
);

module.exports = router;