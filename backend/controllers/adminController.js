const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

// Get All Pharmacies (Admin only)
exports.getAllPharmacies = async (req, res) => {
  try {
    console.log('🔐 Admin fetching all pharmacies...');

    const { data: pharmacies, error } = await supabase
      .from('pharmacies')
      .select('*')
      .order('name');

    if (error) throw error;

    console.log(`✅ Admin fetched ${pharmacies.length} pharmacies`);

    res.status(200).json({
      success: true,
      pharmacies,
      total: pharmacies.length
    });

  } catch (error) {
    console.error('Get pharmacies error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch pharmacies'
    });
  }
};

// Get Single Pharmacy by ID (Admin only)
exports.getPharmacyById = async (req, res) => {
  try {
    const { pharmacyId } = req.params;

    if (!pharmacyId) {
      return res.status(400).json({ 
        success: false,
        message: 'Pharmacy ID is required' 
      });
    }

    console.log(`🔐 Admin fetching pharmacy: ${pharmacyId}`);

    const { data: pharmacy, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('id', pharmacyId)
      .single();

    if (error) throw error;

    console.log('✅ Admin fetched pharmacy details');

    res.status(200).json({
      success: true,
      pharmacy
    });

  } catch (error) {
    console.error('Get pharmacy error:', error);
    
    if (error.code === 'PGRST116') {
      return res.status(404).json({ 
        success: false,
        message: 'Pharmacy not found' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch pharmacy'
    });
  }
};

// Create New Pharmacy (Admin only)
exports.createPharmacy = async (req, res) => {
  try {
    const { name, address, contact_phone, contact_email } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false,
        message: 'Pharmacy name is required' 
      });
    }

    console.log(`🔐 Admin creating new pharmacy: ${name}`);

    const { data, error } = await supabase
      .from('pharmacies')
      .insert([{ name, address, contact_phone, contact_email }])
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Admin created new pharmacy: ${name} (ID: ${data.id})`);

    res.status(201).json({
      success: true,
      message: 'Pharmacy created successfully',
      pharmacy: data
    });

  } catch (error) {
    console.error('Create pharmacy error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false,
        message: 'A pharmacy with this name already exists' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Failed to create pharmacy'
    });
  }
};

// Update Pharmacy (Admin only)
exports.updatePharmacy = async (req, res) => {
  try {
    const { pharmacyId } = req.params;
    const { name, address, contact_phone, contact_email } = req.body;

    if (!pharmacyId || !name) {
      return res.status(400).json({ 
        success: false,
        message: 'Pharmacy ID and name are required' 
      });
    }

    console.log(`🔐 Admin updating pharmacy: ${pharmacyId}`);

    const { data, error } = await supabase
      .from('pharmacies')
      .update({ 
        name, 
        address, 
        contact_phone, 
        contact_email,
        updated_at: new Date().toISOString()
      })
      .eq('id', pharmacyId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Admin updated pharmacy: ${name}`);

    res.status(200).json({
      success: true,
      message: 'Pharmacy updated successfully',
      pharmacy: data
    });

  } catch (error) {
    console.error('Update pharmacy error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false,
        message: 'A pharmacy with this name already exists' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Failed to update pharmacy'
    });
  }
};

// Delete Pharmacy (Admin only)
exports.deletePharmacy = async (req, res) => {
  try {
    const { pharmacyId } = req.params;

    if (!pharmacyId) {
      return res.status(400).json({ 
        success: false,
        message: 'Pharmacy ID is required' 
      });
    }

    console.log(`🔐 Admin deleting pharmacy: ${pharmacyId}`);

    // Check if pharmacy exists and get stats
    const { data: pharmacy, error: checkError } = await supabase
      .from('pharmacies')
      .select('name')
      .eq('id', pharmacyId)
      .single();

    if (checkError) {
      return res.status(404).json({ 
        success: false,
        message: 'Pharmacy not found' 
      });
    }

    // Check for dependencies
    const [{ count: medsCount }, { count: pharmacistsCount }] = await Promise.all([
      supabase.from('medications').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId).eq('role', 'pharmacist')
    ]);

    if (medsCount > 0 || pharmacistsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete pharmacy with existing medications or assigned pharmacists',
        details: { medications: medsCount, pharmacists: pharmacistsCount }
      });
    }

    // Delete pharmacy
    const { error: deleteError } = await supabase
      .from('pharmacies')
      .delete()
      .eq('id', pharmacyId);

    if (deleteError) throw deleteError;

    console.log(`✅ Admin deleted pharmacy: ${pharmacy.name}`);

    res.status(200).json({
      success: true,
      message: 'Pharmacy deleted successfully',
      deletedPharmacy: { id: pharmacyId, name: pharmacy.name }
    });

  } catch (error) {
    console.error('Delete pharmacy error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete pharmacy'
    });
  }
};

// Add this to adminController.js
exports.getPharmacyStats = async (req, res) => {
  try {
    const { pharmacyId } = req.params;

    console.log(`🔐 Admin fetching stats for pharmacy: ${pharmacyId}`);

    // Get pharmacy info
    const { data: pharmacy, error: pharmacyError } = await supabase
      .from('pharmacies')
      .select('name')
      .eq('id', pharmacyId)
      .single();

    if (pharmacyError) {
      return res.status(404).json({ 
        success: false,
        message: 'Pharmacy not found' 
      });
    }

    // Get counts using Supabase
    const [
      { count: medicationCount },
      { count: pharmacistCount },
      { count: orderCount }
    ] = await Promise.all([
      supabase.from('medications').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId).eq('role', 'pharmacist'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId)
    ]);

    const stats = {
      pharmacy: pharmacy,
      medications: medicationCount || 0,
      pharmacists: pharmacistCount || 0,
      totalOrders: orderCount || 0
    };

    console.log(`✅ Admin fetched stats for pharmacy: ${pharmacy.name}`);

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get pharmacy stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch pharmacy statistics'
    });
  }
};