const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const pool = require('../db');
const { sendVerificationEmail } = require('../utils/emailSender');

// Validate configuration
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}

exports.registerUser = async (req, res) => {
  const { email, password, username, full_name } = req.body;

  try {
    // Input validation
    if (!email || !password || !username || !full_name) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check if email exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );

    // Case 1: Email exists AND is verified
    if (existingUser.rows.length > 0 && existingUser.rows[0].is_verified) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Case 2: Email exists BUT NOT verified → update existing record
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser.rows.length > 0) {
      await pool.query(
        `UPDATE users SET 
          password = $1,
          username = $2,
          full_name = $3,
          verification_token = $4,
          verification_token_expires = $5,
          updated_at = NOW()
         WHERE email = $6`,
        [hashedPassword, username, full_name, verificationToken, verificationTokenExpires, email]
      );
    } else {
      // Create new user
      await pool.query(
        `INSERT INTO users (
          email, password, username, full_name, 
          verification_token, verification_token_expires
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [email, hashedPassword, username, full_name, verificationToken, verificationTokenExpires]
      );
    }

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ 
      message: 'Verification email sent. Please check your inbox.',
      email: email
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};
exports.verifyEmail = async (req, res) => {
  console.log('HEYYYYYY SIMRET, VERIFY EMAIL CALLED');
  const { token, redirect } = req.query;

  if (!token) {
    console.log('Missing verification token');
    return res.status(400).json({
      success: false,
      message: 'Verification token is required',
      code: 'MISSING_TOKEN'
    });  
  }

  try {
    // Verify token exists and isn't expired
    const result = await pool.query(
      `UPDATE users 
       SET 
         is_verified = TRUE,
         verification_token = NULL,
         verification_token_expires = NULL,
         updated_at = NOW()
       WHERE verification_token = $1
       AND verification_token_expires > NOW()
       RETURNING id, email`,
      [token]
    );
    console.log('found the user and updated it', result.rows);
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    const user = result.rows[0];
    console.log(`User ${user.email} verified successfully`);
    // Successful verification
    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      email: user.email
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during verification',
      code: 'SERVER_ERROR'
    });
  }
};

// loginUser function:
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('🔐 LOGIN ATTEMPT - Full request body:', req.body);
    console.log('🔐 LOGIN ATTEMPT - Headers:', req.headers);

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('✅ User found:', { 
      id: user.id, 
      email: user.email, 
      is_verified: user.is_verified,
      role: user.role 
    });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      console.log('⚠️ User not verified - sending verification email');
      // ... verification code
    } else {
      console.log('✅ User is verified - proceeding with login');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,        
        email: user.email,
        pharmacyId: user.pharmacy_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    console.log('🎉 LOGIN SUCCESS - Token generated for user:', user.email);
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_verified: user.is_verified,
        role: user.role,        
        pharmacy_id: user.pharmacy_id
      },
      clearGuestSession: true
    });

  } catch (error) {
    console.error('💥 LOGIN ERROR:', error);
    res.status(500).json({ 
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists and isn't already verified
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    
    if (user.is_verified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Update user record
    const updateQuery = `
      UPDATE users
      SET 
        verification_token = $1,
        verification_token_expires = $2
      WHERE email = $3
    `;
    await pool.query(updateQuery, [verificationToken, verificationTokenExpires, email]);

    // Resend email
    await sendVerificationEmail(email, verificationToken);

    res.status(200).json({ 
      message: 'Verification email resent successfully' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend verification email' });
  }
};

// ✅ ADD THIS: Generate guest session token
const generateGuestToken = (guestData) => {
  return jwt.sign(
    {
      guestId: crypto.randomBytes(16).toString('hex'),
      type: 'guest',
      name: guestData.name,
      phone: guestData.phone,
      email: guestData.email,
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Initiate guest checkout
// Initiate guest checkout - UPDATED VERSION
exports.initiateGuestCheckout = async (req, res) => {
  const { name, phone, email } = req.body;

  try {
    // Input validation
    if (!name || !phone) {
      return res.status(400).json({ 
        message: 'Name and phone number are required for guest checkout' 
      });
    }

    // Validate phone format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        message: 'Please provide a valid phone number' 
      });
    }

    // ✅ NEW: Check if email already has an account
    if (email) {
      const existingUser = await pool.query(
        'SELECT id, email, is_verified FROM users WHERE email = $1', 
        [email]
      );

      if (existingUser.rows.length > 0) {
        const user = existingUser.rows[0];
        return res.status(400).json({ 
          message: `An account with email ${email} already exists. Please login instead.`,
          code: 'EMAIL_ALREADY_REGISTERED',
          existingEmail: email,
          isVerified: user.is_verified,
          action: 'LOGIN_REQUIRED'
        });
      }
    }

    // Generate guest token
    const guestToken = generateGuestToken({ name, phone: cleanPhone, email });

    res.status(200).json({
      message: 'Guest session created successfully',
      guestToken,
      guestData: { 
        name, 
        phone: cleanPhone, 
        email: email || null 
      }
    });

  } catch (error) {
    console.error('Guest checkout initiation error:', error);
    res.status(500).json({ 
      message: 'Failed to initiate guest checkout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ ADD THIS: Check guest order status
exports.checkGuestOrderStatus = async (req, res) => {
  const { confirmationCode } = req.params;

  try {
    if (!confirmationCode) {
      return res.status(400).json({ message: 'Confirmation code is required' });
    }

    const result = await pool.query(`
      SELECT 
        o.*,
        p.name as pharmacy_name,
        p.contact_phone as pharmacy_phone,
        p.contact_email as pharmacy_email,
        -- Prescription status
        pr.status as prescription_status,
        pr.notes as prescription_notes,
        pr.updated_at as prescription_updated,
        u.full_name as reviewed_by
      FROM orders o
      JOIN pharmacies p ON o.pharmacy_id = p.id
      LEFT JOIN prescriptions pr ON o.id = pr.order_id
      LEFT JOIN users u ON pr.pharmacist_id = u.id
      WHERE o.confirmation_code = $1 
        AND o.is_guest_order = true
    `, [confirmationCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = result.rows[0];

    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.*, m.name as medication_name 
       FROM order_items oi 
       JOIN medications m ON oi.medication_id = m.id 
       WHERE order_id = $1`,
      [order.id]
    );

    res.json({
      order: order,
      items: itemsResult.rows,
      isGuestOrder: true
    });

  } catch (error) {
    console.error('Check guest order status error:', error);
    res.status(500).json({ 
      message: 'Failed to check order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


exports.getPharmacies = async (req, res) => {
  try {
    console.log('🏪 GET /api/guest/pharmacies called');
    
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        address, 
        contact_phone, 
        contact_email,
        created_at,
        updated_at
      FROM pharmacies 
      ORDER BY name
    `);
    
    console.log(`✅ Found ${result.rows.length} pharmacies`);
    
    res.json({ 
      success: true,
      pharmacies: result.rows 
    });
    
  } catch (error) {
    console.error('💥 Get pharmacies error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch pharmacies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};