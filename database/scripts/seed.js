/**
 * Database seed script
 * Seeds initial data (admin user, default settings)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL or NETLIFY_DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function seed() {
  console.log('Starting seed...');

  // Check if admin already exists
  const adminCheck = await pool.query('SELECT user_id FROM users WHERE username = $1', ['admin']);
  
  if (adminCheck.rows.length > 0) {
    console.log('Admin user already exists, skipping seed');
    await pool.end();
    return;
  }

  // Hash admin password
  const adminPassword = 'Admin123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Create admin user
  await pool.query(
    `INSERT INTO users (user_id, username, email, password_hash, role, first_name, last_name, is_active)
     VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@makerset.com', $1, 'admin', 'System', 'Administrator', true)
     ON CONFLICT (username) DO NOTHING`,
    [passwordHash]
  );

  console.log('✓ Admin user created (username: admin, password: Admin123!)');

  // Seed settings
  const seedsDir = path.join(__dirname, '../seeds');
  const files = fs.readdirSync(seedsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`Running seed file ${file}...`);
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
    
    // Replace placeholder password hash
    const sqlWithHash = sql.replace(
      /\$2b\$10\$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq/,
      passwordHash
    );

    try {
      await pool.query(sqlWithHash);
      console.log(`✓ ${file} applied`);
    } catch (error) {
      console.error(`✗ Error applying ${file}:`, error.message);
      // Continue with other seeds
    }
  }

  console.log('Seed completed successfully');
  await pool.end();
}

seed().catch(error => {
  console.error('Seed failed:', error);
  process.exit(1);
});
