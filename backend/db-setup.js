const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function setupDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL for setup');

    const sql = fs.readFileSync('./schema.sql', 'utf-8');
    await client.query(sql);
    console.log('✅ Schema created successfully!');
  } catch (err) {
    console.error('❌ Database setup failed:', err);
    process.exit(1); // Exit with error code
  } finally {
    await client.end();
    console.log('🔌 Setup connection closed');
  }
}

setupDatabase();