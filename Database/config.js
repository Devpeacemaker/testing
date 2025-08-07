const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

const defaultSettings = {
  antilink: 'on',
  antilinkall: 'off',
  autobio: 'on',
  antidelete: 'on',
  antitag: 'on',
  antibot: 'off',
  anticall: 'on',
  antiforeign: 'off',
  badword: 'on',
  gptdm: 'off',
  welcomegoodbye: 'off',
  autoread: 'off',
  mode: 'public',
  prefix: '.',
  autolike: 'on',
  autoview: 'on',
  wapresence: 'recording',
  antiedit: 'private'
};

async function initializeDatabase() {
  const client = await pool.connect();
  console.log("📡 Connecting to PostgreSQL...");

  try {
    // Create tables if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      );
    `);

    // Insert default settings if not exists
    const settingsEntries = Object.entries(defaultSettings);
    for (const [key, value] of settingsEntries) {
      await client.query(
        `INSERT INTO bot_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, value]
      );
    }

    console.log("✅ Database initialized with default settings");
    return true;
  } catch (err) {
    console.error("❌ Database initialization failed:", err.stack);
    return false;
  } finally {
    client.release();
  }
}

async function getSettings() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT key, value FROM bot_settings`
    );

    const settings = { ...defaultSettings };
    for (const row of result.rows) {
      if (defaultSettings.hasOwnProperty(row.key)) {
        settings[row.key] = row.value;
      }
    }

    console.log("📋 Settings loaded from database");
    return settings;
  } catch (err) {
    console.error("❌ Failed to fetch settings:", err.stack);
    return defaultSettings;
  } finally {
    client.release();
  }
}

async function updateSetting(key, value) {
  if (!defaultSettings.hasOwnProperty(key)) {
    console.error(`🚨 Invalid setting key: ${key}`);
    return false;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO bot_settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value
       RETURNING *`,
      [key, value]
    );

    if (result.rowCount === 1) {
      console.log(`🔄 Setting updated: ${key}=${value}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`❌ Failed to update ${key}:`, err.stack);
    return false;
  } finally {
    client.release();
  }
}

async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    console.error('🔌 Database connection test failed:', err.stack);
    return false;
  }
}

// Health check and automatic reconnection
setInterval(async () => {
  if (!await testConnection()) {
    console.log('Attempting to reconnect to database...');
    await initializeDatabase();
  }
}, 60000); // Check every minute

module.exports = {
  pool,
  initializeDatabase,
  getSettings,
  updateSetting,
  testConnection,
  defaultSettings
};
