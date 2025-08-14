const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configure email transporter with better options
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD, // Use app password if 2FA enabled
  },
  pool: true, // use connection pooling
  maxConnections: 5,
  maxMessages: 100,
});

/**
 * Send verification email with dashboard redirect
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 */
exports.sendVerificationEmail = async (email, token) => {
  try {
    const verificationUrl = `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/verify-email?token=${token}`;
    const supportEmail = process.env.SUPPORT_EMAIL || 'simretmelak@gmail.com';
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Bethlam Pharmacy'}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to Our App!</h2>
          <p>Please verify your email address to get started:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; 
                      padding: 12px 24px; text-decoration: none; 
                      border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 0.9em; color: #6b7280;">
            If you didn't request this email, please ignore it or contact 
            <a href="mailto:${supportEmail}">our support team</a>.
          </p>
        </div>
      `,
      text: `Please verify your email by clicking this link: ${verificationUrl}\n\nThis link expires in 24 hours.`,
    };

    // Verify connection configuration first
    await transporter.verify();
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}: ${info.messageId}`);
    
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Generate secure random token
 * @returns {string} Random 32-byte hex string
 */
exports.generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Test email configuration
 */
exports.testEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email server is ready to take our messages');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
};