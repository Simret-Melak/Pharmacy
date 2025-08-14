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

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      // Resend verification email if not verified
      console.log('BOOM SIMRET THIS USER IS NOT VERIFIED', user.email);
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await pool.query(
        'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE email = $3',
        [verificationToken, new Date(Date.now() + 24*60*60*1000), email]
      );
      
      await sendVerificationEmail(email, verificationToken);
      
      return res.status(403).json({
        message: 'Please verify your email address. A new verification email has been sent.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_verified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
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