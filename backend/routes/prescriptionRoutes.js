const express = require('express');
const { checkAuth } = require('../middleware/authMiddleware');
const prescriptionController = require('../controllers/prescriptionController');
const upload = require('../config/multerConfig'); // Import the configured Multer
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Admin check middleware
const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Protected routes
router.use(checkAuth);

// Upload prescription (user)
router.post(
  '/medications/:id/prescriptions',
  upload.single('prescription'),
  prescriptionController.uploadPrescription
);

// Get all prescriptions (admin)
router.get(
  '/prescriptions/all',
  checkAdmin,
  prescriptionController.getAllPrescriptions
);


router.get(
  '/prescriptions/file/:id',
  prescriptionController.downloadPrescription
);

module.exports = router;
