const { createClient } = require('@supabase/supabase-js');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { r2Client, R2_CONFIG } = require('../config/r2.config');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate clean file key for prescriptions
const generatePrescriptionFileKey = (userId, medicationName, fileName) => {
  // Clean medication name for filename
  const cleanMedName = medicationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Replace special chars with hyphens
    .replace(/-+/g, '-') // Remove multiple hyphens
    .substring(0, 30); // Limit length
  
  const fileExtension = fileName.split('.').pop() || 'pdf';
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8); // 6 char random
  
  // Format: prescriptions/{userId}/{medication}-prescription-{timestamp}-{random}.{ext}
  return `prescriptions/${userId}/${cleanMedName}-prescription-${timestamp}-${randomString}.${fileExtension}`;
};

// Upload prescription to R2
exports.uploadPrescription = async (req, res) => {
  try {
    const { medicationId } = req.params;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    console.log('📄 Uploading prescription for user:', userId);

    // Check medication using Supabase
    const { data: medication, error: medError } = await supabase
      .from('medications')
      .select('is_prescription_required, name')
      .eq('id', medicationId)
      .single();

    if (medError || !medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    if (!medication.is_prescription_required) {
      return res.status(400).json({
        success: false,
        message: 'This medication does not require a prescription'
      });
    }

    // ✅ FIXED: Clean the filename for R2 headers
    const cleanFileName = req.file.originalname
      .replace(/[^\w\s.-]/gi, '') // Remove special characters except dots and hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit length

    // ✅ FIXED: Generate organized file key (no duplicate user ID)
    const fileKey = generatePrescriptionFileKey(userId, medication.name, cleanFileName);

    // Upload to R2
    const uploadParams = {
      Bucket: R2_CONFIG.buckets.prescriptions.name,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      Metadata: {
        'user-id': userId,
        'medication-id': medicationId,
        'medication-name': medication.name,
        'uploaded-at': new Date().toISOString(),
        'original-filename': cleanFileName
      }
    };

    console.log('📤 Uploading prescription to R2:', fileKey);

    // Upload to R2
    await r2Client.send(new PutObjectCommand(uploadParams));

    // Generate signed URL for private access
    const getObjectParams = {
      Bucket: R2_CONFIG.buckets.prescriptions.name,
      Key: fileKey,
    };
    const signedUrl = await getSignedUrl(r2Client, new GetObjectCommand(getObjectParams), {
      expiresIn: 7 * 24 * 60 * 60, // 7 days
    });

    // ✅ FIXED: Save prescription record to Supabase
    const { data: prescription, error: presError } = await supabase
      .from('prescriptions')
      .insert([{
        user_id: userId,
        medication_id: medicationId,
        file_key: fileKey,
        file_name: cleanFileName,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        status: 'pending'
      }])
      .select(`
        *,
        medications (name)
        // ✅ REMOVED: users!prescriptions_user_id_fkey join - causing the error
      `)
      .single();

    if (presError) {
      // Clean up uploaded file if database insert fails
      await r2Client.send(new DeleteObjectCommand({
        Bucket: R2_CONFIG.buckets.prescriptions.name,
        Key: fileKey
      }));
      throw presError;
    }

    console.log('✅ Prescription uploaded successfully:', prescription.id);

    res.status(201).json({
      success: true,
      message: 'Prescription uploaded successfully',
      prescription: {
        ...prescription,
        file_url: signedUrl
      }
    });

  } catch (error) {
    console.error('Upload prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload prescription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all prescriptions (admin/pharmacist)
exports.getAllPrescriptions = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('prescriptions')
      .select(`
        *,
        medications (id, name, description)
        // ✅ FIXED: Removed problematic users join
      `, { count: 'exact' });

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: prescriptions, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Generate signed URLs for each prescription
    const prescriptionsWithUrls = await Promise.all(
      prescriptions.map(async (prescription) => {
        try {
          const getObjectParams = {
            Bucket: R2_CONFIG.buckets.prescriptions.name,
            Key: prescription.file_key,
          };
          const signedUrl = await getSignedUrl(r2Client, new GetObjectCommand(getObjectParams), {
            expiresIn: 3600, // 1 hour
          });

          return {
            ...prescription,
            file_url: signedUrl
          };
        } catch (urlError) {
          console.error('Error generating URL for prescription:', prescription.id, urlError);
          return prescription;
        }
      })
    );

    res.status(200).json({
      success: true,
      prescriptions: prescriptionsWithUrls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get all prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions'
    });
  }
};

// View prescription file
exports.viewPrescriptionFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // ✅ FIXED: Get prescription details without problematic join
    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Authorization check
    const canAccess = userRole === 'admin' || 
                     userRole === 'pharmacist' || 
                     prescription.user_id === userId;

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this prescription'
      });
    }

    // Generate signed URL and redirect
    const getObjectParams = {
      Bucket: R2_CONFIG.buckets.prescriptions.name,
      Key: prescription.file_key,
    };

    const signedUrl = await getSignedUrl(r2Client, new GetObjectCommand(getObjectParams), {
      expiresIn: 3600, // 1 hour
    });

    res.redirect(signedUrl);

  } catch (error) {
    console.error('View prescription file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to view prescription file'
    });
  }
};

// Download prescription file
exports.downloadPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get prescription details
    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Authorization check
    const canAccess = userRole === 'admin' || 
                     userRole === 'pharmacist' || 
                     prescription.user_id === userId;

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this prescription'
      });
    }

    // Generate signed URL for download
    const getObjectParams = {
      Bucket: R2_CONFIG.buckets.prescriptions.name,
      Key: prescription.file_key,
      ResponseContentDisposition: `attachment; filename="${prescription.file_name}"`,
    };

    const signedUrl = await getSignedUrl(r2Client, new GetObjectCommand(getObjectParams), {
      expiresIn: 3600,
    });

    res.redirect(signedUrl);

  } catch (error) {
    console.error('Download prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download prescription'
    });
  }
};

// Update prescription status (approve/reject)
exports.updatePrescriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const pharmacistId = req.user.userId;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
       message: 'Invalid status. Use "approved" or "rejected"'
      });
    }

    if (status === 'rejected' && !notes) {
      return res.status(400).json({
        success: false,
        message: 'Rejection notes are required'
      });
    }

    // ✅ FIXED: Update without problematic join
    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .update({
        status,
        notes,
        pharmacist_id: pharmacistId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        medications (name)
        // ✅ REMOVED: users!prescriptions_user_id_fkey join
      `)
      .single();

    if (error || !prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Prescription ${status} successfully`,
      prescription
    });

  } catch (error) {
    console.error('Update prescription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prescription status'
    });
  }
};

// Get single prescription with details
exports.getPrescriptionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ FIXED: Get prescription without problematic join
    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        medications (id, name, description)
        // ✅ REMOVED: users!prescriptions_user_id_fkey join
      `)
      .eq('id', id)
      .single();

    if (error || !prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Generate signed URL
    const getObjectParams = {
      Bucket: R2_CONFIG.buckets.prescriptions.name,
      Key: prescription.file_key,
    };
    const signedUrl = await getSignedUrl(r2Client, new GetObjectCommand(getObjectParams), {
      expiresIn: 3600,
    });

    res.status(200).json({
      success: true,
      prescription: {
        ...prescription,
        file_url: signedUrl
      }
    });

  } catch (error) {
    console.error('Get prescription details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription details'
    });
  }
};

// Get user's own prescriptions
exports.getMyPrescriptions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;

    let query = supabase
      .from('prescriptions')
      .select(`
        *,
        medications (name, description)
      `, { count: 'exact' })
      .eq('user_id', userId);

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: prescriptions, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Generate signed URLs
    const prescriptionsWithUrls = await Promise.all(
      prescriptions.map(async (prescription) => {
        try {
          const getObjectParams = {
            Bucket: R2_CONFIG.buckets.prescriptions.name,
            Key: prescription.file_key,
          };
          const signedUrl = await getSignedUrl(r2Client, new GetObjectCommand(getObjectParams), {
            expiresIn: 3600,
          });

          return {
            ...prescription,
            file_url: signedUrl
          };
        } catch (urlError) {
          console.error('Error generating URL for prescription:', prescription.id, urlError);
          return prescription;
        }
      })
    );

    res.status(200).json({
      success: true,
      prescriptions: prescriptionsWithUrls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get my prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions'
    });
  }
};

// Delete prescription (user can delete their own pending prescriptions)
exports.deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get prescription to verify ownership and status
    const { data: prescription, error: fetchError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Authorization check
    if (prescription.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own prescriptions'
      });
    }

    if (prescription.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete prescription that has already been processed'
      });
    }

    // Delete file from R2
    try {
      await r2Client.send(new DeleteObjectCommand({
        Bucket: R2_CONFIG.buckets.prescriptions.name,
        Key: prescription.file_key
      }));
      console.log('✅ File deleted from R2:', prescription.file_key);
    } catch (r2Error) {
      console.error('Error deleting file from R2:', r2Error);
    }

    // Delete prescription record
    const { error: deleteError } = await supabase
      .from('prescriptions')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    console.log('✅ Prescription deleted:', id);

    res.status(200).json({
      success: true,
      message: 'Prescription deleted successfully'
    });

  } catch (error) { 
    console.error('Delete prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prescription'
    });
  }
};