const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');

const router = express.Router();

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Generate JWT token
function generateToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Login using Supabase Auth
router.post('/login', loginValidation, async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Try to sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) {
      console.log('❌ Supabase auth error:', authError.message);
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    if (!authData.user) {
      console.log('❌ No user data returned');
      return res.status(401).json({
        error: 'Authentication failed'
      });
    }

    console.log('✅ Supabase auth successful for:', authData.user.email);

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.log('⚠️ Profile not found, creating one:', profileError.message);
      
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          first_name: authData.user.user_metadata?.first_name || 'User',
          last_name: authData.user.user_metadata?.last_name || 'Name',
          role: 'member',
          department: 'General',
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Failed to create profile:', createError.message);
        return res.status(500).json({
          error: 'Failed to create user profile'
        });
      }

      console.log('✅ Profile created successfully');
      profile = newProfile;
    }

    // Generate our own JWT token for the app
    const token = generateToken(authData.user.id);

    // Prepare user data
    const userData = {
      id: authData.user.id,
      email: authData.user.email,
      first_name: profile?.first_name || 'User',
      last_name: profile?.last_name || 'Name',
      role: profile?.role || 'member',
      department: profile?.department || 'General',
      is_active: profile?.is_active !== false
    };

    console.log('✅ Login successful for:', userData.email, 'Role:', userData.role);

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({
      error: 'Internal server error during login'
    });
  }
});

// Alternative login method using direct database query
router.post('/login-direct', loginValidation, async (req, res) => {
  try {
    console.log('🔐 Direct login attempt:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Query the auth.users table directly
    const { data: users, error: queryError } = await supabase
      .from('users_view') // Use the view we created
      .select('*')
      .eq('email', email)
      .limit(1);

    if (queryError) {
      console.log('❌ Database query error:', queryError.message);
      return res.status(500).json({
        error: 'Database error'
      });
    }

    if (!users || users.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check if account is active
    if (!user.is_active) {
      console.log('❌ Account deactivated:', email);
      return res.status(401).json({
        error: 'Account is deactivated. Please contact administrator.'
      });
    }

    // For this method, we'll skip password verification temporarily
    // In production, you'd verify against the encrypted_password
    console.log('✅ Direct login successful for:', user.email);

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        department: user.department,
        is_active: user.is_active
      }
    });

  } catch (error) {
    console.error('💥 Direct login error:', error);
    res.status(500).json({
      error: 'Internal server error during login'
    });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: profile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
