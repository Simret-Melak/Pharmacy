const { Pool } = require('pg');
require('dotenv').config();

// Validate required environment variables
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD environment variable is required');
}

// Create a connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME || 'postgres',
  max: 20, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database connection error', err));

module.exports = pool;