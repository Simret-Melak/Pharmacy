// routes/medicationRoutes.js
const express = require('express');
const { body } = require('express-validator');
const { checkAuth, checkRole } = require('../middleware/authMiddleware');
const medicationController = require('../controllers/medicationController');

const router = express.Router();

// Input validation for medication
const medicationValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('stock_quantity').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('dosage').optional().trim(),
  body('category').optional().trim(),
  body('description').optional().trim(),
  body('is_prescription_required').optional().isBoolean(),
  body('pharmacy_id').optional().isInt(),
  body('online_stock').optional().isInt({ min: 0 }),
  body('in_person_stock').optional().isInt({ min: 0 })
];

// Protected routes - require authentication
router.use(checkAuth);

// Get medications (accessible to all authenticated users)
router.get('/', medicationController.getMedications);

// Get single medication (accessible to all authenticated users)
router.get('/:id', medicationController.getMedicationById);

// Check prescription requirement (accessible to all authenticated users)
router.get('/:medicationId/prescription-check', 
  medicationController.checkPrescriptionRequirement,
  (req, res) => {
    res.json({ requiresPrescription: req.requiresPrescription });
  }
);

// Admin-only routes
router.post('/', checkRole('admin'), medicationController.uploadMedicationImage, medicationValidation, medicationController.addMedication);
router.put('/:id', checkRole('admin'), medicationController.uploadMedicationImage, medicationValidation, medicationController.updateMedication);
router.delete('/:id', checkRole('admin'), medicationController.deleteMedication);

// Admin and pharmacist routes
router.patch('/:id/stock', checkRole(['admin', 'pharmacist']), [
  body('online_stock').isInt({ min: 0 }).optional(),
  body('in_person_stock').isInt({ min: 0 }).optional()
], medicationController.updateStock);

module.exports = router;