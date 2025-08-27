const pool = require('../db');
const { validationResult } = require('express-validator');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Correct relative path - go up one level from controllers, then into uploads/medications
const uploadDir = path.join(__dirname, '../uploads/medications');

// Create directory if it doesn't exist
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Upload directory created: ${uploadDir}`);
  }
} catch (error) {
  console.error('Error creating upload directory:', error);
  // Handle error appropriately
}
const medicationUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `med-${Date.now()}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    cb(null, extname && mimetype);
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

exports.uploadMedicationImage = medicationUpload.single('image');

exports.addMedication = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Enhanced price validation and conversion
  const price = Number(req.body.price);
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ 
      message: 'Price must be a valid positive number' 
    });
  }

  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized - Admin access required' });
  }

  const {
    name,
    category,
    dosage,
    description,
    stock_quantity,
    is_prescription_required,
    pharmacy_id
  } = req.body;

  try {
    // Insert new medication with explicit numeric casting
    const result = await pool.query(
      `INSERT INTO medications (
        name, 
        category, 
        dosage, 
        price, 
        description, 
        stock_quantity,
        online_stock,
        in_person_stock,
        is_prescription_required,
        pharmacy_id
      ) VALUES ($1, $2, $3, $4::numeric, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, category, dosage, price::float, description, stock_quantity`,
      [
        name,
        category,
        dosage,
        price, // Already validated as number
        description,
        stock_quantity,
        stock_quantity,
        0,
        is_prescription_required || false,
        pharmacy_id || req.user.pharmacy_id
      ]
    );

    res.status(201).json({
      message: 'Medication added successfully',
      medication: result.rows[0]
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      message: 'Failed to add medication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getMedications = async (req, res) => {
  try {
    let query = `SELECT 
                  m.id, 
                  m.name, 
                  m.category, 
                  m.dosage, 
                  m.price::float, 
                  m.description, 
                  m.stock_quantity,
                  m.image_url,
                  m.is_prescription_required,
                  p.name as pharmacy_name
                FROM medications m
                LEFT JOIN pharmacies p ON m.pharmacy_id = p.id`;
    
    const params = [];
    let paramCount = 1;

    // Different access for different roles
    if (req.user.role === 'pharmacist' && req.user.pharmacy_id) {
      query += ` WHERE m.pharmacy_id = $${paramCount}`;
      params.push(req.user.pharmacy_id);
      paramCount++;
    } 
    else if (req.user.role === 'customer') {
      query += ` WHERE m.stock_quantity > 0`; // Only show in-stock items to customers
    }

    // Add search capability if query parameter exists
    if (req.query.search) {
      const searchTerm = `%${req.query.search}%`;
      query += paramCount === 1 ? ' WHERE' : ' AND';
      query += ` (m.name ILIKE $${paramCount} OR m.category ILIKE $${paramCount})`;
      params.push(searchTerm);
      paramCount++;
    }

    query += ' ORDER BY m.name ASC';
    const result = await pool.query(query, params);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch medications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateMedication = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check admin permissions
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { id } = req.params; // Get medication ID from URL

  // Convert price to number if provided
  const price = req.body.price ? Number(req.body.price) : undefined;
  if (price && (isNaN(price) || price <= 0)) {
    return res.status(400).json({ message: 'Price must be a positive number' });
  }

  try {
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    // List of allowed fields to update
    const allowedFields = [
      'name', 'category', 'dosage', 'price', 'description',
      'stock_quantity', 'is_prescription_required'
    ];

    // Prepare fields for update
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(field === 'price' ? price : req.body[field]);
        paramIndex++;
      }
    });

    // Handle uploaded image
    if (req.file) {
      updateFields.push(`image_url = $${paramIndex}`);
      values.push(`/uploads/medications/${req.file.filename}`);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    values.push(id); // Add ID as last parameter

    const query = `
      UPDATE medications
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, name, category, dosage, price::float, description,
                stock_quantity, is_prescription_required, image_url
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    res.status(200).json({
      message: 'Medication updated successfully',
      medication: result.rows[0]
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      message: 'Failed to update medication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


exports.getMedicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        m.id, 
        m.name, 
        m.category, 
        m.dosage, 
        m.price::float, 
        m.description, 
        m.stock_quantity,
        m.online_stock,
        m.in_person_stock,
        m.is_prescription_required,
        m.image_url,
        p.name as pharmacy_name,
        p.address as pharmacy_address,
        p.contact_phone as pharmacy_phone
      FROM medications m
      LEFT JOIN pharmacies p ON m.pharmacy_id = p.id
      WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    const medication = result.rows[0];
    
    // For customers, include only relevant info
    if (req.user.role === 'customer') {
      const { pharmacy_address, pharmacy_phone, ...customerMed } = medication;
      return res.status(200).json(customerMed);
    }

    res.status(200).json(medication);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch medication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteMedication = async (req, res) => {
  // Check admin permissions
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { id } = req.params;

  try {
    // First check if medication exists
    const checkResult = await pool.query(
      'SELECT id FROM medications WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    // Delete the medication
    await pool.query('DELETE FROM medications WHERE id = $1', [id]);
    
    res.status(200).json({ 
      message: 'Medication deleted successfully',
      deletedId: id
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      message: 'Failed to delete medication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateStock = async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'pharmacist') {
    return res.status(403).json({ message: 'Unauthorized access' });
  }

  const { id } = req.params;
  const { online_stock, in_person_stock } = req.body;

  try {
    const result = await pool.query(
      `UPDATE medications
       SET online_stock = $1,
           in_person_stock = $2,
           stock_quantity = $1 + $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, online_stock, in_person_stock, stock_quantity`,
      [online_stock, in_person_stock, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    res.status(200).json({
      message: 'Stock updated successfully',
      medication: result.rows[0]
    });
  } catch (error) {
    console.error('Stock update error:', error);
    res.status(500).json({ 
      message: 'Failed to update stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.checkPrescriptionRequirement = async (req, res, next) => {
  const { medicationId } = req.params;

  try {
    const result = await pool.query(
      'SELECT is_prescription_required FROM medications WHERE id = $1',
      [medicationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    req.requiresPrescription = result.rows[0].is_prescription_required;
    next();
  } catch (error) {
    console.error('Prescription check error:', error);
    res.status(500).json({ 
      message: 'Failed to verify prescription requirement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};