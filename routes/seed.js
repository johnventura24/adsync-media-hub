const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { supabase } = require('../config/database');

// Seed database with demo data
router.post('/demo', async (req, res) => {
  try {
    // Read seed SQL file
    const seedSQL = await fs.readFile(
      path.join(__dirname, '../database/seed.sql'), 
      'utf8'
    );

    // Split by statements and execute each one
    const statements = seedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const results = [];
    
    for (const statement of statements) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });
        
        if (error) {
          console.warn('SQL warning:', error.message);
        }
        
        results.push({ statement: statement.substring(0, 50) + '...', success: !error });
      } catch (err) {
        console.warn('SQL execution warning:', err.message);
        results.push({ statement: statement.substring(0, 50) + '...', success: false, error: err.message });
      }
    }

    res.json({
      message: 'Demo data seeding completed',
      results: results,
      demoCredentials: {
        email: 'demo@hubdashboard.com',
        password: 'demo123456'
      }
    });

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      error: 'Failed to seed demo data',
      details: error.message
    });
  }
});

// Alternative: Direct database seeding without SQL file
router.post('/demo-direct', async (req, res) => {
  try {
    // Create demo organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Demo Company',
        description: 'Sample organization for demonstration purposes',
        industry: 'Technology',
        size: '10-50'
      }, { onConflict: 'id' });

    if (orgError) {
      console.log('Organization exists or created:', orgError.message);
    }

    // Create demo user
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: '00000000-0000-4000-8000-000000000002',
        email: 'demo@hubdashboard.com',
        password_hash: '$2a$10$mbv2SsJ.AzfiZVnWKX7Ebe1INRAp.glrmaioX.PXcRkGP5LbLrpKS',
        first_name: 'Demo',
        last_name: 'User',
        role: 'admin',
        department: 'Management',
        position: 'Demo Administrator',
        is_active: true
      }, { onConflict: 'email' });

    if (userError) {
      console.log('User exists or created:', userError.message);
    }

    // Link user to organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .upsert({
        user_id: '00000000-0000-4000-8000-000000000002',
        organization_id: '00000000-0000-4000-8000-000000000001',
        role: 'admin'
      }, { onConflict: 'user_id,organization_id' });

    if (userOrgError) {
      console.log('User-org link exists or created:', userOrgError.message);
    }

    res.json({
      message: 'Demo data created successfully',
      demoCredentials: {
        email: 'demo@hubdashboard.com',
        password: 'demo123456'
      },
      organization: 'Demo Company'
    });

  } catch (error) {
    console.error('Direct seed error:', error);
    res.status(500).json({
      error: 'Failed to create demo data',
      details: error.message
    });
  }
});

module.exports = router;
