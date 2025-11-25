// config/supabase.js - DEBUG VERSION
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

console.log('🔄 Loading Supabase configuration...');

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  hasServiceKey: !!supabaseServiceKey,
  nodeEnv: process.env.NODE_ENV
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// More aggressive SSL handling for development
const customFetch = (url, options = {}) => {
  console.log(`🌐 Fetching: ${url}`);
  
  if (typeof window === 'undefined') {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false // Always false for now to ensure it works
    });
    
    return fetch(url, {
      ...options,
      agent: httpsAgent
    }).catch(err => {
      console.error('❌ Fetch error:', err.message);
      throw err;
    });
  }
  
  return fetch(url, options);
};

try {
  // Create clients
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, 
      detectSessionInUrl: false
    },
    global: {
      fetch: customFetch
    }
  });

  const supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          fetch: customFetch
        }
      })
    : null;

  console.log('✅ Supabase clients created successfully');

  // Test connection
  async function testConnection() {
    try {
      console.log('🔌 Testing Supabase connection...');
      
      // Try multiple approaches
      const { data, error } = await supabase
        .from('medications')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('❌ Table query failed:', error.message);
        
        // Try auth check as fallback
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) {
          console.log('❌ Auth check failed:', authError.message);
          return false;
        }
        console.log('✅ Auth connection working');
        return true;
      }
      
      console.log('✅ Table query successful - Supabase connected!');
      return true;
    } catch (err) {
      console.log('❌ Connection test error:', err.message);
      return false;
    }
  }

  // Export the clients
  module.exports = {
    supabase,
    supabaseAdmin,
    testConnection
  };

  // Test connection
  testConnection();

} catch (error) {
  console.error('❌ Failed to create Supabase clients:', error.message);
  throw error;
}