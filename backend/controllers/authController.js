
const { createClient } = require('@supabase/supabase-js');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // Verify using Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Supabase token verification failed:', error);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    console.log('🔐 Authenticating user:', user.email);

    // Get user role SOLELY from clients table
    let userRole = 'user'; // Default for all users
    
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('role')
      .eq('id', user.id)
      .single();

      console.log('🔍 Client data fetched for role:', clientData, clientError);

    if (clientError) {
      console.log('ℹ️ No client record found, using default role: user');
    } else if (clientData && clientData.role) {
      userRole = clientData.role;
      console.log('✅ User role from clients table:', userRole);
    }

    req.user = {
      userId: user.id,
      email: user.email,
      ...user.user_metadata,
      role: userRole
      
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Role-specific middleware
const requireAdmin = (req, res, next) => {
  console.log('🔐 requireAdmin - User object:', {
    email: req.user.email,
    role: req.user.role,
    userId: req.user.userId,
    roleType: typeof req.user.role,
    roleLength: req.user.role?.length
  });
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const requirePharmacist = (req, res, next) => {
  if (req.user.role !== 'pharmacist') {
    return res.status(403).json({ message: 'Pharmacist access required' });
  }
  next();
};

const requireAdminOrPharmacist = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'pharmacist') {
    return res.status(403).json({ message: 'Admin or pharmacist access required' });
  }
  next();
};

// Register User
exports.registerUser = async (req, res) => {
  const { email, password, username, full_name, phone } = req.body;

  try {
    // Input validation
    if (!email || !password || !username || !full_name) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Use Supabase Auth for registration
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          full_name: full_name,
          phone: phone
        }
      }
    });

    if (error) {
      console.error('Supabase signup error:', error);
      
      if (error.message.includes('already registered')) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      return res.status(400).json({ message: error.message });
    }

    console.log('✅ User registered with Supabase Auth');

    res.status(201).json({ 
      message: 'Registration successful! You can now login.',
      email: email,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        full_name: full_name,
        phone: phone,
        username: username
        // No role in response - frontend will get it from protected endpoints
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Use Supabase Auth for login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {      
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      return res.status(401).json({ message: error.message });
    }

    const user = data.user;

    // Get user role SOLELY from clients table
    let user_role = "user"; // Default role for all users

    if (user && user.id) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('role')
        .eq('id', user.id)
        .single();

      // If found in clients table, use that role (pharmacist or admin)
      if (clientData && clientData.role) {
        user_role = clientData.role;
      }
    }

    // Get user metadata from Supabase Auth
    const userMetadata = user.user_metadata || {};

    res.status(200).json({
      message: 'Login successful',
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        full_name: userMetadata.full_name || '',
        phone: userMetadata.phone || '',
        role: user_role // Only from clients table
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

// Logout User
exports.logoutUser = async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    console.log('✅ User logged out successfully');
    
    res.status(200).json({
      message: 'Logout successful',
      clearSession: true
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete User Account
exports.deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password confirmation required for account deletion' 
      });
    }

    // Verify the user's credentials before deletion
    const { data: verifyData, error: verifyError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (verifyError) {
      return res.status(401).json({ 
        message: 'Invalid credentials. Cannot delete account.' 
      });
    }

    // Check if the authenticated user matches the account being deleted
    if (verifyData.user.id !== userId) {
      return res.status(403).json({ 
        message: 'You can only delete your own account' 
      });
    }

    // Delete user from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Account deletion error:', deleteError);
      return res.status(500).json({ 
        message: 'Failed to delete account. Please try again.' 
      });
    }

    console.log('✅ User account deleted:', userId);

    res.status(200).json({
      message: 'Account deleted successfully',
      deleted: true
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ 
      message: 'Account deletion failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get All Users (Admin only) - CLEAN VERSION
exports.getAllUsers = async (req, res) => {
  try {
    console.log('🔐 Checking admin access for user:', req.user.email);
    console.log('🔐 User role:', req.user.role);
    
    if (req.user.role !== 'admin') {
      console.log('❌ Admin access denied for user:', req.user.email);
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('✅ Admin access granted, fetching users...');

    // Get ALL users from Supabase Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching users from Auth:', authError);
      return res.status(500).json({ 
        message: 'Failed to fetch users from authentication system',
        error: process.env.NODE_ENV === 'development' ? authError.message : undefined
      });
    }

    // Get ALL roles from clients table
    const { data: clientRoles, error: clientError } = await supabase
      .from('clients')
      .select('id, role');

    if (clientError) {
      console.error('Error fetching client roles:', clientError);
      return res.status(500).json({ 
        message: 'Failed to fetch user roles',
        error: process.env.NODE_ENV === 'development' ? clientError.message : undefined
      });
    }

    // Create a map of user IDs to roles from clients table
    const roleMap = new Map();
    clientRoles.forEach(client => {
      roleMap.set(client.id, client.role);
    });

    // Combine Auth users with roles from clients table
    const formattedUsers = authUsers.users.map(authUser => {
      const userRole = roleMap.get(authUser.id) || 'user';
      
      return {
        id: authUser.id,
        email: authUser.email,
        username: authUser.user_metadata?.username,
        full_name: authUser.user_metadata?.full_name,
        phone: authUser.user_metadata?.phone,
        role: userRole, // Only from clients table
        email_confirmed: authUser.email_confirmed_at !== null,
        created_at: authUser.created_at,
        last_sign_in: authUser.last_sign_in_at,
        has_special_role: roleMap.has(authUser.id)
      };
    });

    console.log(`✅ Admin fetched ${formattedUsers.length} users`);

    res.status(200).json({
      message: 'Users retrieved successfully',
      users: formattedUsers,
      total: formattedUsers.length,
      stats: {
        total_users: formattedUsers.length,
        admins: formattedUsers.filter(u => u.role === 'admin').length,
        pharmacists: formattedUsers.filter(u => u.role === 'pharmacist').length,
        regular_users: formattedUsers.filter(u => u.role === 'user').length,
        with_special_roles: formattedUsers.filter(u => u.has_special_role).length
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Promote User to Admin/Pharmacist
exports.promoteUser = async (req, res) => {
  const { userId } = req.params;
  const { role, pharmacy_id } = req.body;

  try {
    const allowedRoles = ['admin', 'pharmacist'];
    
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Allowed roles: admin, pharmacist' 
      });
    }

    // Get user info from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userData.user;

    // ✅ FIXED: Only include fields that exist in clients table
    const clientData = {
      id: userId,
      role: role
      // Only id and role - no email, username, full_name, phone, pharmacy_id
    };

    const { error: clientError } = await supabase
      .from('clients')
      .upsert(clientData, { onConflict: 'id' });

    if (clientError) {
      console.error('Promotion error:', clientError);
      return res.status(500).json({ 
        message: 'Failed to promote user' 
      });
    }

    console.log(`✅ User ${user.email} promoted to: ${role}`);

    res.status(200).json({
      message: `User successfully promoted to ${role}`,
      user: {
        id: userId,
        email: user.email,
        role: role
        // No pharmacy_id since it's not in clients table
      }
    });

  } catch (error) {
    console.error('Promotion error:', error);
    res.status(500).json({ 
      message: 'Failed to promote user'
    });
  }
};

// Demote User to Regular User
exports.demoteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    // Remove user from clients table (they become regular user)
    const { error: clientError } = await supabase
      .from('clients')
      .delete()
      .eq('id', userId);

    if (clientError) {
      console.error('Demotion error:', clientError);
      return res.status(500).json({ 
        message: 'Failed to demote user' 
      });
    }

    console.log(`✅ User ${userId} demoted to regular user`);

    res.status(200).json({
      message: 'User successfully demoted to regular user',
      userId: userId
    });

  } catch (error) {
    console.error('Demotion error:', error);
    res.status(500).json({ 
      message: 'Failed to demote user'
    });
  }
};

// Admin Delete Any User Account - FIXED
exports.adminDeleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        message: 'User ID is required' 
      });
    }

    // ✅ FIRST: Check if user exists in clients table (admin/pharmacist)
    const { data: clientData, error: clientCheckError } = await supabase
      .from('clients')
      .select('role')
      .eq('id', userId)
      .single();

    if (clientCheckError && clientCheckError.code !== 'PGRST116') {
      // PGRST116 means "no rows returned" - that's fine, user might not be in clients table
      console.error('Error checking clients table:', clientCheckError);
    }

    // ✅ SECOND: Delete user from clients table if they exist there
    if (clientData) {
      const { error: clientDeleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', userId);

      if (clientDeleteError) {
        console.error('Error deleting from clients table:', clientDeleteError);
        // Don't return error here - still try to delete from Auth
      } else {
        console.log('✅ Removed user from clients table:', userId);
      }
    }

    // ✅ THIRD: Delete user from Supabase Auth using admin API
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Admin account deletion error:', deleteError);
      return res.status(500).json({ 
        message: 'Failed to delete user account',
        error: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
      });
    }

    console.log('✅ Admin deleted user account:', userId);

    res.status(200).json({
      message: 'User account deleted successfully',
      deleted: true,
      userId: userId,
      wasInClientsTable: !!clientData, // Inform if user was admin/pharmacist
      previousRole: clientData?.role || null
    });

  } catch (error) {
    console.error('Admin account deletion error:', error);
    res.status(500).json({ 
      message: 'Failed to delete user account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Guest Checkout
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
      const { data, error } = await supabase.auth.getUser(email);
      if (data?.user) {
        return res.status(400).json({ 
          message: `An account with email ${email} already exists. Please login instead.`,
          code: 'EMAIL_ALREADY_REGISTERED',
          existingEmail: email,
          action: 'LOGIN_REQUIRED'
        });
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

// Middleware: User can only access their own data, or admin/pharmacist can access any
const requireOwnUserOrAdmin = (req, res, next) => {
  const requestedUserId = req.params.userId;
  const authenticatedUserId = req.user.userId;
  const userRole = req.user.role;

  console.log('🔐 requireOwnUserOrAdmin check:', {
    requestedUserId,
    authenticatedUserId,
    userRole,
    isSameUser: requestedUserId === authenticatedUserId,
    isAdminOrPharmacist: ['admin', 'pharmacist'].includes(userRole)
  });

  // Allow if:
  // 1. User is accessing their own data OR
  // 2. User is admin/pharmacist
  if (requestedUserId === authenticatedUserId || ['admin', 'pharmacist'].includes(userRole)) {
    return next();
  }

  console.log('❌ Access denied - user cannot access another user\'s data');
  return res.status(403).json({ 
    message: 'Access denied. You can only access your own data.' 
  });
};

// Middleware: User can only access their own data
const requireOwnUser = (req, res, next) => {
  const requestedUserId = req.params.userId;
  const authenticatedUserId = req.user.userId;

  console.log('🔐 requireOwnUser check:', {
    requestedUserId,
    authenticatedUserId,
    isSameUser: requestedUserId === authenticatedUserId
  });

  if (requestedUserId === authenticatedUserId) {
    return next();
  }

  console.log('❌ Access denied - user cannot access another user\'s data');
  return res.status(403).json({ 
    message: 'Access denied. You can only access your own data.' 
  });
};


// Export middleware for use in routes
exports.authenticateToken = authenticateToken;
exports.requireAdmin = requireAdmin;
exports.requirePharmacist = requirePharmacist;
exports.requireAdminOrPharmacist = requireAdminOrPharmacist;
exports.requireOwnUserOrAdmin = requireOwnUserOrAdmin; // Add this
exports.requireOwnUser = requireOwnUser; // Add this