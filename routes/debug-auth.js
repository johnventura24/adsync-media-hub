const express = require('express');
const { supabase } = require('../config/database');

const router = express.Router();

// Debug endpoint to test authentication
router.post('/test-login', async (req, res) => {
  try {
    console.log('🔍 Debug login attempt:', req.body);
    const { email, password } = req.body;

    // 1. Check if user exists in auth.users
    const { data: authUsers, error: authError } = await supabase
      .rpc('get_auth_user', { user_email: email })
      .single();

    if (authError) {
      console.log('❌ Auth user query error:', authError);
      
      // Alternative: Try to query auth.users directly (might not work due to RLS)
      const { data: users, error: userError } = await supabase
        .from('auth.users')
        .select('*')
        .eq('email', email);
      
      console.log('Direct auth.users query result:', users, userError);
    }

    // 2. Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    console.log('Profile query result:', profile, profileError);

    // 3. Try Supabase Auth sign in
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    console.log('Supabase auth sign in result:', authData, signInError);

    // 4. Return debug info
    res.json({
      debug: {
        email: email,
        authUserExists: !authError,
        profileExists: !profileError,
        signInSuccess: !signInError,
        profile: profile,
        authData: authData?.user ? {
          id: authData.user.id,
          email: authData.user.email,
          confirmed: authData.user.email_confirmed_at
        } : null,
        errors: {
          authError: authError?.message,
          profileError: profileError?.message,
          signInError: signInError?.message
        }
      }
    });

  } catch (error) {
    console.error('💥 Debug login error:', error);
    res.status(500).json({
      error: 'Debug test failed',
      details: error.message
    });
  }
});

// Create RPC function to query auth.users (run this SQL in Supabase first)
router.get('/setup-rpc', async (req, res) => {
  try {
    const rpcSQL = `
      CREATE OR REPLACE FUNCTION get_auth_user(user_email text)
      RETURNS TABLE(
        id uuid,
        email text,
        email_confirmed_at timestamptz,
        created_at timestamptz
      )
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT 
          au.id,
          au.email::text,
          au.email_confirmed_at,
          au.created_at
        FROM auth.users au
        WHERE au.email = user_email;
      $$;
    `;

    res.json({
      message: 'Run this SQL in Supabase SQL Editor:',
      sql: rpcSQL
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check environment variables
router.get('/check-env', (req, res) => {
  res.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrlPreview: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  });
});

// Simple profile check
router.get('/check-profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Check environment first
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.json({
        email: email,
        profileExists: false,
        profile: null,
        error: 'Supabase environment variables not configured',
        debug: {
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY
        }
      });
    }
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    res.json({
      email: email,
      profileExists: !error,
      profile: profile,
      error: error?.message
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
