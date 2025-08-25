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

    await client.query(`
      CREATE TABLE IF NOT EXISTS sudo_owners (
        id SERIAL PRIMARY KEY,
        number TEXT UNIQUE NOT NULL
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
    if (!validKeys.includes(key)) throw new Error(`Invalid setting key: ${key}`);

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

// 🔹 SUDO FUNCTIONS
async function addSudoOwner(number) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO sudo_owners (number) VALUES ($1) ON CONFLICT DO NOTHING`,
      [number]
    );
    return true;
  } catch (err) {
    console.error("❌ Failed to add sudo owner:", err);
    return false;
  } finally {
    client.release();
  }
}

async function removeSudoOwner(number) {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM sudo_owners WHERE number = $1`, [number]);
    return true;
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
    const result = await client.query(`SELECT number FROM sudo_owners`);
    return result.rows.map(r => r.number);
  } catch (err) {
    console.error("❌ Failed to fetch sudo owners:", err);
    return [];
  } finally {
    client.release();
  }
}

async function isSudoOwner(number) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM sudo_owners WHERE number = $1`,
      [number]
    );
    return result.rowCount > 0;
  } catch (err) {
    console.error("❌ Failed to check sudo owner:", err);
    return false;
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
  isSudoOwner
};
