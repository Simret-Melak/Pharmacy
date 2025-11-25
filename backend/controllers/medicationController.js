const { validationResult } = require('express-validator');
const multer = require('multer');
const medicationImageService = require('../services/medicationImageService');
const { createClient } = require('@supabase/supabase-js');

const medicationUpload = require('../config/multerR2Config');

// ✅ Use the same pattern as your admin controller
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);



// Add medication with image
// Add medication with image - UPDATED VERSION
exports.addMedication = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check if user is admin or pharmacist
  if (req.user.role !== 'admin' && req.user.role !== 'pharmacist') {
    return res.status(403).json({ 
      success: false,
      message: 'Unauthorized - Admin or pharmacist access required' 
    });
  }

  const {
    name,
    category,
    dosage,
    price,
    description,
    stock_quantity,
    is_prescription_required,
    pharmacy_id
  } = req.body;

  try {
    let imageData = null;

    // Insert medication into database FIRST to get the real ID
    const { data: medication, error } = await supabase
      .from('medications')
      .insert([{
        name,
        category,
        dosage,
        price: parseFloat(price),
        description,
        stock_quantity: parseInt(stock_quantity) || 0,
        online_stock: parseInt(stock_quantity) || 0,
        in_person_stock: 0,
        is_prescription_required: is_prescription_required || false,
        pharmacy_id: pharmacy_id || req.user.pharmacy_id,
        created_by: req.user.userId,
        // Don't set image_url and image_key yet - we'll update after upload
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Medication created with ID:', medication.id);

    // Handle image upload if provided - NOW WITH REAL MEDICATION ID
    if (req.file) {
      console.log('📸 Processing medication image upload with real ID...');
      
      imageData = await medicationImageService.uploadMedicationImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        medication.id, // ✅ Use REAL medication ID
        name, // ✅ Use medication name
        category, // ✅ Use category
        dosage // ✅ Use dosage
      );

      // Update medication with image data
      const { error: updateError } = await supabase
        .from('medications')
        .update({
          image_url: imageData.publicUrl,
          image_key: imageData.fileKey,
          image_size: imageData.size,
          image_mime_type: imageData.mimeType
        })
        .eq('id', medication.id);

      if (updateError) {
        // Clean up uploaded image if database update fails
        if (imageData) {
          await medicationImageService.deleteMedicationImage(imageData.fileKey);
        }
        throw updateError;
      }

      // Refresh medication data with image info
      const { data: updatedMedication } = await supabase
        .from('medications')
        .select('*')
        .eq('id', medication.id)
        .single();

      console.log('✅ Medication added successfully with image:', medication.id);

      return res.status(201).json({
        success: true,
        message: 'Medication added successfully',
        medication: updatedMedication
      });
    }

    // If no image, return the original medication data
    console.log('✅ Medication added successfully (no image):', medication.id);

    res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      medication
    });

  } catch (error) {
    console.error('Add medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add medication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Update medication with image

exports.updateMedication = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'pharmacist') {
    return res.status(403).json({ 
      success: false,
      message: 'Admin or pharmacist access required' 
    });
  }

  const { id } = req.params;
  const updateData = req.body;

  try {
    // Get current medication data
    const { data: currentMedication, error: fetchError } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentMedication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    // Verify pharmacist can only update their pharmacy's medications
    if (req.user.role === 'pharmacist' && currentMedication.pharmacy_id !== req.user.pharmacy_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update medications from your pharmacy'
      });
    }

    let imageData = null;

    // Handle new image upload
    if (req.file) {
      console.log('📸 Updating medication image...');
      
      imageData = await medicationImageService.updateMedicationImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        id, // Real medication ID
        currentMedication.name, // Medication name
        currentMedication.category, // Category
        currentMedication.dosage, // Dosage
        currentMedication.image_key // Pass old image key for cleanup
      );

      updateData.image_url = imageData.publicUrl;
      updateData.image_key = imageData.fileKey;
      updateData.image_size = imageData.size;
      updateData.image_mime_type = imageData.mimeType;
    }

    // Update medication in database
    const { data: medication, error } = await supabase
      .from('medications')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Clean up new image if database update fails
      if (imageData) {
        await medicationImageService.deleteMedicationImage(imageData.fileKey);
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Medication updated successfully',
      medication
    });

  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Delete medication
exports.deleteMedication = async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'pharmacist') {
    return res.status(403).json({ 
      success: false,
      message: 'Admin or pharmacist access required' 
    });
  }

  const { id } = req.params;

  try {
    // Get medication data first
    const { data: medication, error: fetchError } = await supabase
      .from('medications')
      .select('image_key, pharmacy_id')
      .eq('id', id)
      .single();

    if (fetchError || !medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    // Verify pharmacist can only delete their pharmacy's medications
    if (req.user.role === 'pharmacist' && medication.pharmacy_id !== req.user.pharmacy_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete medications from your pharmacy'
      });
    }

    // Delete image from R2 if exists
    if (medication.image_key) {
      await medicationImageService.deleteMedicationImage(medication.image_key);
    }

    // Delete medication from database
    const { error: deleteError } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.status(200).json({
      success: true,
      message: 'Medication deleted successfully',
      deletedId: id
    });

  } catch (error) {
    console.error('Delete medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all medications (with R2 image URLs)
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

    const userRole = req.user ? req.user.role : 'guest';

    let query = supabase
      .from('medications')
      .select(`
        *,
        pharmacies (name, address)
      `, { count: 'exact' });

    // Apply filters
    if (userRole !== 'admin') {
      query = query.gt('stock_quantity', 0);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (requires_prescription !== undefined) {
      query = query.eq('is_prescription_required', requires_prescription === 'true');
    }

    if (pharmacy_id) {
      query = query.eq('pharmacy_id', pharmacy_id);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: medications, error, count } = await query
      .order('name')
      .range(from, to);

    if (error) throw error;

    // Ensure all image URLs are properly formatted
    const medicationsWithImages = medications.map(med => ({
      ...med,
      // image_url is already the public URL from R2, no need to modify
    }));

    res.status(200).json({
      success: true,
      medications: medicationsWithImages,
      totalCount: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medications'
    });
  }
};

exports.checkPrescriptionRequirement = async (req, res) => {
  try {
    const { medicationId } = req.params;

    const { data: medication, error } = await supabase
      .from('medications')
      .select('is_prescription_required, name')
      .eq('id', medicationId)
      .single();

    if (error || !medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    res.status(200).json({
      success: true,
      requiresPrescription: medication.is_prescription_required,
      medicationName: medication.name
    });

  } catch (error) {
    console.error('Prescription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check prescription requirement'
    });
  }
};

// Add these missing functions to medicationController.js

exports.getMedicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: medication, error } = await supabase
      .from('medications')
      .select(`
        *,
        pharmacies (name, address, contact_phone)
      `)
      .eq('id', id)
      .single();

    if (error || !medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    res.status(200).json({
      success: true,
      medication
    });

  } catch (error) {
    console.error('Get medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medication'
    });
  }
};

exports.updateStock = async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'pharmacist') {
    return res.status(403).json({ 
      success: false,
      message: 'Unauthorized access' 
    });
  }

  const { id } = req.params;
  const { online_stock, in_person_stock } = req.body;

  try {
    const { data: medication, error } = await supabase
      .from('medications')
      .update({
        online_stock: parseInt(online_stock) || 0,
        in_person_stock: parseInt(in_person_stock) || 0,
        stock_quantity: (parseInt(online_stock) || 0) + (parseInt(in_person_stock) || 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      medication
    });

  } catch (error) {
    console.error('Stock update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock'
    });
  }
};


/* ============================================================
   SEARCH MEDICATIONS BY NAME (DEBUG VERSION)
   ============================================================ */
exports.searchMedicationsByName = async (req, res) => {
  try {
    const { name, limit = 20 } = req.query;

    console.log('🔍 SEARCH REQUEST RECEIVED:', { name, limit });

    if (!name || name.trim().length === 0) {
      return res.status(200).json({
        success: true,
        medications: [],
        message: 'Please enter a medication name to search'
      });
    }

    const searchTerm = name.trim();
    console.log('🔍 Searching for medication:', searchTerm);

    // First, let's check if ANY medications exist
    const { data: allMeds, error: countError } = await supabase
      .from('medications')
      .select('id, name', { count: 'exact' })
      .limit(5);

    console.log('📊 Total medications sample:', allMeds);

    // Now search for the specific term
    let query = supabase
      .from('medications')
      .select(`
        id,
        name,
        dosage,
        category,
        price,
        image_url,
        stock_quantity,
        online_stock,
        in_person_stock,
        is_prescription_required,
        pharmacies (name, address)
      `, { count: 'exact' });

    // Try different search approaches
    query = query.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,dosage.ilike.%${searchTerm}%`);

    // For non-admin users, only show medications with stock
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'pharmacist')) {
      query = query.gt('stock_quantity', 0);
    }

    const { data: medications, error, count } = await query
      .order('name')
      .limit(parseInt(limit));

    if (error) {
      console.error('❌ Supabase search error:', error);
      throw error;
    }

    console.log(`✅ Search query executed. Found ${count} medications matching "${searchTerm}"`);
    console.log('🔍 Medications found:', medications);

    // Also try a direct exact match search
    const { data: exactMatch, error: exactError } = await supabase
      .from('medications')
      .select('id, name')
      .ilike('name', searchTerm)
      .limit(1);

    console.log('🎯 Exact match search result:', exactMatch);

    res.status(200).json({
      success: true,
      medications: medications || [],
      searchTerm: searchTerm,
      count: count || 0,
      message: count > 0 
        ? `Found ${count} medication(s) matching "${searchTerm}"`
        : `No medications found matching "${searchTerm}"`,
      debug: {
        totalMedicationsSample: allMeds,
        exactMatch: exactMatch
      }
    });

  } catch (error) {
    console.error('❌ Search medications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search medications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/* ============================================================
   GET MEDICATION SUGGESTIONS (for autocomplete)
   ============================================================ */
exports.getMedicationSuggestions = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(200).json({
        success: true,
        suggestions: [],
        message: 'Type at least 2 characters to see suggestions'
      });
    }

    const searchTerm = query.trim();

    const { data: medications, error } = await supabase
      .from('medications')
      .select(`
        id,
        name,
        dosage,
        category,
        price,
        image_url
      `)
      .or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      .order('name')
      .limit(parseInt(limit));

    if (error) throw error;

    const suggestions = medications.map(med => ({
      id: med.id,
      name: med.name,
      dosage: med.dosage,
      category: med.category,
      price: med.price,
      image_url: med.image_url,
      display: `${med.name} ${med.dosage ? `- ${med.dosage}` : ''}`
    }));

    res.status(200).json({
      success: true,
      suggestions: suggestions,
      count: suggestions.length
    });

  } catch (error) {
    console.error('Medication suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get medication suggestions'
    });
  }
};