// config/multerR2Config.js - For R2 uploads (memory storage)
const multer = require('multer');

// Configure multer for memory storage (for R2 uploads)
const medicationUpload = multer({
  storage: multer.memoryStorage(), // Store in memory, not on disk
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased from 5MB for prescriptions)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf' // ✅ Added PDF for prescriptions
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only images (JPEG, PNG, WebP, GIF) and PDF files are allowed. Received: ${file.mimetype}`), false);
    }
  }
});

// ✅ NEW: Separate configuration for prescriptions
const prescriptionUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for prescriptions
  },
  fileFilter: (req, file, cb) => {
    console.log('📄 Processing file upload:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      console.log('✅ File type accepted:', file.mimetype);
      cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      cb(new Error(`Invalid file type for prescription. Only images and PDF files are allowed. Received: ${file.mimetype}`), false);
    }
  }
});

// ✅ NEW: Error handling middleware for Multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Make sure to use the correct field name.'
      });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
};

module.exports = {
  medicationUpload,
  prescriptionUpload, // ✅ Export the new prescription upload
  handleMulterError   // ✅ Export error handler
};