const pool = require('../db');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
// Upload prescription (store relative path)
exports.uploadPrescription = async (req, res) => {
  try {
    const { id: medicationId } = req.params;
    const userId = req.user.userId;

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Check medication
    const medResult = await pool.query(
      'SELECT is_prescription_required FROM medications WHERE id = $1',
      [medicationId]
    );
    if (!medResult.rows.length) return res.status(404).json({ message: 'Medication not found' });
    if (!medResult.rows[0].is_prescription_required)
      return res.status(400).json({ message: 'This medication does not require a prescription' });

    // Save relative path only
    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path);

    const result = await pool.query(
      `INSERT INTO prescriptions (user_id, medication_id, file_path, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id, created_at`,
      [userId, medicationId, relativePath]
    );

    res.status(201).json({ message: 'Prescription uploaded successfully', prescription: result.rows[0] });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload prescription', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Get all prescriptions (admin)
exports.getAllPrescriptions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.status, p.notes, p.file_path, p.created_at, p.updated_at,
             u.id AS user_id, u.full_name AS user_name, u.email AS user_email,
             m.id AS medication_id, m.name AS medication_name,
             pharm.id AS pharmacist_id, pharm.full_name AS pharmacist_name, pharm.email AS pharmacist_email
      FROM prescriptions p
      JOIN users u ON p.user_id = u.id
      JOIN medications m ON p.medication_id = m.id
      LEFT JOIN users pharm ON p.pharmacist_id = pharm.id
      ORDER BY p.created_at DESC
    `);
    res.status(200).json({ prescriptions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch prescriptions', error: err.message });
  }
};

// Update your viewPrescriptionFile controller
exports.viewPrescriptionFile = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, u.id AS user_id
      FROM prescriptions p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const prescription = result.rows[0];
    
    if (req.user.role !== 'admin' && prescription.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join(__dirname, '..', prescription.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Enhanced headers with proper MIME type detection
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (err) {
    console.error('Error viewing file:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Download prescription file
exports.downloadPrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT p.*, u.id AS user_id
      FROM prescriptions p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (!result.rows.length) return res.status(404).json({ message: 'Prescription not found' });

    const prescription = result.rows[0];

    if (req.user.role !== 'admin' && prescription.user_id !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    const filePath = path.join(__dirname, '..', prescription.file_path);

    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

    res.download(filePath);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Update prescription status (approve/reject)
exports.updatePrescriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const pharmacistId = req.user.userId; // This is the admin/pharmacist reviewing

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use "approved" or "rejected"' });
    }

    if (status === 'rejected' && !notes) {
      return res.status(400).json({ message: 'Rejection notes are required' });
    }

    const result = await pool.query(
      `UPDATE prescriptions 
       SET status = $1, notes = $2, updated_at = NOW(), pharmacist_id = $3
       WHERE id = $4 
       RETURNING *`,
      [status, notes, pharmacistId, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    res.status(200).json({ 
      message: `Prescription ${status} successfully`,
      prescription: result.rows[0] 
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Failed to update prescription status' });
  }
};

// Get single prescription with details for review page
exports.getPrescriptionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT p.*, 
             u.id AS user_id, u.full_name AS user_name, u.email AS user_email,
             m.name AS medication_name, m.description AS medication_description,
             pharm.full_name AS pharmacist_name, pharm.email AS pharmacist_email
      FROM prescriptions p
      JOIN users u ON p.user_id = u.id
      JOIN medications m ON p.medication_id = m.id
      LEFT JOIN users pharm ON p.pharmacist_id = pharm.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    res.status(200).json({ prescription: result.rows[0] });
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ message: 'Failed to fetch prescription details' });
  }
};

exports.getMyPrescriptions = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(`
      SELECT 
        p.id,
        p.status,
        p.notes,
        p.file_path,
        p.created_at,
        p.updated_at,
        m.name AS medication_name,
        m.description AS medication_description
      FROM prescriptions p
      JOIN medications m ON p.medication_id = m.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `, [userId]);

    res.status(200).json({ 
      prescriptions: result.rows 
    });
    
  } catch (err) {
    console.error('Get my prescriptions error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch prescriptions',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};