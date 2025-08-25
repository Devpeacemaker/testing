const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      );
    `);

    // NEW: Add sudo owners table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sudo_owners (
        id SERIAL PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        added_by TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const [key, value] of Object.entries(defaultSettings)) {
      await client.query(
        `INSERT INTO bot_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING;`,
        [key, value]
      );
    }

    console.log("✅ Database initialized.");
  } catch (err) {
    console.error("❌ Initialization error:", err);
  } finally {
    client.release();
  }
}

async function getSettings() {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT key, value FROM bot_settings WHERE key = ANY($1::text[])`,
      [Object.keys(defaultSettings)]
    );

    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    console.log("✅ Settings fetched from DB.");
    return settings;

  } catch (err) {
    console.error("❌ Failed to fetch settings:", err);
    return defaultSettings;

  } finally {
    client.release();
  }
}

async function updateSetting(key, value) {
  const client = await pool.connect();
  try {
    const validKeys = Object.keys(defaultSettings);
    if (!validKeys.includes(key)) {
      throw new Error(`Invalid setting key: ${key}`);
    }

    await client.query(
      `UPDATE bot_settings SET value = $1 WHERE key = $2`,
      [value, key]
    );

    return true;
  } catch (err) {
    console.error("❌ Failed to update setting:", err.message || err);
    return false;
  } finally {
    client.release();
  }
}

// Sudo owners management functions
async function addSudoOwner(userId, addedBy) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO sudo_owners (user_id, added_by) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id) DO NOTHING 
       RETURNING *`,
      [userId, addedBy]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error("❌ Failed to add sudo owner:", err);
    return false;
  } finally {
    client.release();
  }
}

async function removeSudoOwner(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM sudo_owners WHERE user_id = $1`,
      [userId]
    );
    return result.rowCount > 0;
  } catch (err) {
    console.error("❌ Failed to remove sudo owner:", err);
    return false;
  } finally {
    client.release();
  }
}

async function getSudoOwners() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT user_id, added_by, added_at FROM sudo_owners ORDER BY added_at`
    );
    return result.rows;
  } catch (err) {
    console.error("❌ Failed to get sudo owners:", err);
    return [];
  } finally {
    client.release();
  }
}

async function isSudoOwner(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM sudo_owners WHERE user_id = $1`,
      [userId]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error("❌ Failed to check sudo owner:", err);
    return false;
  } finally {
    client.release();
  }
}

async function clearAllSudoOwners() {
  const client = await pool.connect();
  try {
    const result = await client.query(`DELETE FROM sudo_owners`);
    return result.rowCount;
  } catch (err) {
    console.error("❌ Failed to clear sudo owners:", err);
    return 0;
  } finally {
    client.release();
  }
}

module.exports = {
  initializeDatabase,
  getSettings,
  updateSetting,
  addSudoOwner,
  removeSudoOwner,
  getSudoOwners,
  isSudoOwner,
  clearAllSudoOwners
};
