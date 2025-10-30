const pool = require('../db');
const { validationResult } = require('express-validator');

const multer = require('multer');
const path = require('path');
const fs = require('fs');


const uploadDir = path.join(__dirname, '../uploads/medications');


try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Upload directory created: ${uploadDir}`);
  }
} catch (error) {
  console.error('Error creating upload directory:', error);
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
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      requires_prescription,
      pharmacy_id
    } = req.query;

    const offset = (page - 1) * limit;

    // ✅ FIX: Check if user exists before accessing role
    const userRole = req.user ? req.user.role : 'guest';

    // Build WHERE conditions for SQL
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Base query
    let baseQuery = `
      SELECT 
        id, name, description, price::float, stock_quantity,
        dosage, category, is_prescription_required, image_url,
        pharmacy_id, online_stock, in_person_stock,
        created_at, updated_at
      FROM medications
    `;

    // Count query
    let countQuery = `SELECT COUNT(*) FROM medications`;

    // Add conditions for non-admin users (including guests)
    if (userRole !== 'admin') {
      whereConditions.push(`stock_quantity > 0`);
    }

    // Add search condition
    if (search) {
      paramCount++;
      whereConditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    // Add category condition
    if (category) {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    // Add prescription requirement condition
    if (requires_prescription !== undefined) {
      paramCount++;
      whereConditions.push(`is_prescription_required = $${paramCount}`);
      queryParams.push(requires_prescription === 'true');
    }

    // Add pharmacy_id condition
    if (pharmacy_id) {
      paramCount++;
      whereConditions.push(`pharmacy_id = $${paramCount}`);
      queryParams.push(pharmacy_id);
    }

    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      baseQuery += whereClause;
      countQuery += whereClause;
    }

    // Add ordering and pagination
    baseQuery += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    // Execute queries
    const medicationsResult = await pool.query(baseQuery, queryParams);
    
    // For count, we need to remove the pagination params
    const countParams = queryParams.slice(0, paramCount);
    const countResult = await pool.query(countQuery, countParams);
    
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      medications: medicationsResult.rows,
      totalCount: totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medications',
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