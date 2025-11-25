// controllers/guestController.js
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

// ✅ Make sure this function is properly defined and exported
exports.initiateGuestCheckout = async (req, res) => {
  const { name, phone, email } = req.body;

  try {
    if (!name || !phone) {
      return res.status(400).json({ 
        message: 'Name and phone number are required for guest checkout' 
      });
    }

    // Check if email exists in Supabase Auth
    if (email) {
      try {
        const { data, error } = await supabase.auth.getUser(email);
        if (data.user) {
          return res.status(400).json({ 
            message: `An account with email ${email} already exists. Please login instead.`,
            code: 'EMAIL_ALREADY_REGISTERED',
            existingEmail: email,
            action: 'LOGIN_REQUIRED'
          });
        }
      } catch (error) {
        console.log('Email not found in Supabase - proceeding with guest checkout');
      }
    }

    // Generate guest token
    const guestToken = jwt.sign(
      {
        guestId: crypto.randomBytes(16).toString('hex'),
        type: 'guest',
        name: name,
        phone: phone,
        email: email,
        expires: Date.now() + (24 * 60 * 60 * 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Guest session created successfully',
      guestToken,
      guestData: { name, phone, email }
    });

  } catch (error) {
    console.error('Guest checkout initiation error:', error);
    res.status(500).json({ 
      message: 'Failed to initiate guest checkout'
    });
  }
};

// ✅ Make sure other functions are also exported
exports.checkGuestOrderStatus = async (req, res) => {
  try {
    const { confirmationCode } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM orders WHERE confirmation_code = $1',
      [confirmationCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ 
      success: true,
      order: result.rows[0] 
    });
  } catch (error) {
    console.error('Check order status error:', error);
    res.status(500).json({ message: 'Failed to check order status' });
  }
};

exports.getPharmacies = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, address, contact_phone, contact_email
      FROM pharmacies 
      ORDER BY name
    `);
    
    res.json({ 
      success: true,
      pharmacies: result.rows 
    });
  } catch (error) {
    console.error('Get pharmacies error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch pharmacies'
    });
  }
};