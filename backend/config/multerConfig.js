const multer = require('multer');
const path = require('path');
const fs = require('fs');

// CORRECTED PATH: Go up one level from config, then into uploads/prescriptions
const prescriptionDir = path.join(__dirname, '../uploads/prescriptions');

// Ensure upload directory exists with error handling
try {
  if (!fs.existsSync(prescriptionDir)) {
    fs.mkdirSync(prescriptionDir, { recursive: true });
    console.log(`Prescription directory created: ${prescriptionDir}`);
  }
} catch (error) {
  console.error('Error creating prescription directory:', error);
  // You might want to handle this differently in production
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, prescriptionDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `prescription-${Date.now()}${ext}`);
  }
});

// Configure file filter
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed!'));
};

// Create Multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = upload; // Export the configured Multer instance