const { createClient } = require('@supabase/supabase-js');

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      enabled: true
    }
  }
);

// Create admin client for server-side operations
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

// Database connection test
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.warn('Database connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    return false;
  }
};

// Helper function to handle database errors
const handleDatabaseError = (error) => {
  console.error('Database error:', error);
  
  // Map common Supabase errors to user-friendly messages
  const errorMessages = {
    '23505': 'A record with this information already exists',
    '23503': 'Referenced record does not exist',
    '23514': 'Invalid data provided',
    'PGRST116': 'No rows found',
    'PGRST301': 'Invalid JSON format'
  };
  
  const userMessage = errorMessages[error.code] || error.message || 'Database operation failed';
  
  return {
    success: false,
    error: userMessage,
    code: error.code
  };
};

// Helper function for pagination
const getPaginatedResults = async (query, page = 1, limit = 10) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error, count } = await query
    .range(from, to)
    .select('*', { count: 'exact' });
  
  if (error) {
    return handleDatabaseError(error);
  }
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
      hasNext: to < count - 1,
      hasPrev: page > 1
    }
  };
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  handleDatabaseError,
  getPaginatedResults
};
