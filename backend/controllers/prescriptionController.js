const pool = require('../db');

exports.uploadPrescription = async (req, res) => {
  try {
    const { id: medicationId } = req.params;
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if medication exists and requires prescription
    const medResult = await pool.query(
      'SELECT is_prescription_required FROM medications WHERE id = $1',
      [medicationId]
    );

    if (medResult.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    if (!medResult.rows[0].is_prescription_required) {
      return res.status(400).json({ message: 'This medication does not require a prescription' });
    }

    // Save prescription to database
    const result = await pool.query(
      `INSERT INTO prescriptions (
        user_id,
        medication_id,
        file_path,
        status
      ) VALUES ($1, $2, $3, 'pending')
      RETURNING id, created_at`,
      [userId, medicationId, req.file.path]
    );

    res.status(201).json({
      message: 'Prescription uploaded successfully',
      prescription: result.rows[0]
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload prescription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAllPrescriptions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.status, p.notes, p.file_path, p.created_at, p.updated_at,
             u.id AS user_id, u.full_name AS user_name, u.email AS user_email,
             m.id AS medication_id, m.name AS medication_name
      FROM prescriptions p
      JOIN users u ON p.user_id = u.id
      JOIN medications m ON p.medication_id = m.id
      ORDER BY p.created_at DESC
    `);

    res.status(200).json({ prescriptions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch prescriptions', error: err.message });
  }
};

// In your prescriptionController.js
exports.downloadPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get prescription from database
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
    
    // Check if user has permission to access this file
    if (req.user.role !== 'admin' && prescription.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const filePath = path.join(__dirname, '..', prescription.file_path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Send the file
    res.download(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: 'Server error' });
  }
};