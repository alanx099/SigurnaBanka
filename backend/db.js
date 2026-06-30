const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const config = require("./config");

const pool = new Pool({ connectionString: config.databaseUrl });

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(80) NOT NULL,
      last_name VARCHAR(80) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'USER',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (email = lower(email)),
      CHECK (role IN ('USER','ADMIN'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      iban VARCHAR(34) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'CURRENT',
      balance NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
      currency CHAR(3) NOT NULL DEFAULT 'EUR',
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (type IN ('CURRENT','GIRO','SAVINGS','BUSINESS')),
      CHECK (status IN ('ACTIVE','BLOCKED','CLOSED'))
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
      description VARCHAR(255),
      reference VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
      description VARCHAR(255),
      reference VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS account_requests (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_type VARCHAR(20) NOT NULL,
      requested_name VARCHAR(100) NOT NULL,
      user_message VARCHAR(500),
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      admin_message VARCHAR(500),
      reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      created_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (account_type IN ('CURRENT','GIRO','SAVINGS','BUSINESS')),
      CHECK (status IN ('PENDING','APPROVED','REJECTED'))
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id BIGSERIAL PRIMARY KEY,
      sender_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      recipient_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
      description VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (sender_account_id <> recipient_account_id)
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_deposits_account ON deposits(account_id);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_account ON withdrawals(account_id);
    CREATE INDEX IF NOT EXISTS idx_account_requests_user ON account_requests(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_request_per_type
      ON account_requests(user_id, account_type) WHERE status = 'PENDING';
    CREATE INDEX IF NOT EXISTS idx_transfers_sender ON transfers(sender_account_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON transfers(recipient_account_id);
  `);

  // Existing course databases may already contain the minimal users table.
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(80) NOT NULL DEFAULT 'Korisnik';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(80) NOT NULL DEFAULT 'Banke';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
  `);

  await pool.query(`
    ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
    ALTER TABLE accounts ADD CONSTRAINT accounts_type_check
      CHECK (type IN ('CURRENT','GIRO','SAVINGS','BUSINESS'));
  `);

  const admin = await pool.query("SELECT id FROM users WHERE email = $1", [
    "admin@sigurnabanka.hr",
  ]);
  if (!admin.rowCount) {
    const passwordHash = await bcrypt.hash("Admin123!", 12);
    const created = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1,$2,$3,$4,'ADMIN') RETURNING id`,
      ["admin@sigurnabanka.hr", passwordHash, "Sigurna", "Administracija"],
    );
    await pool.query(
      `INSERT INTO accounts (user_id, iban, name, type, balance)
       VALUES ($1, 'HR1224840081100000001', 'Glavni račun', 'CURRENT', 12450.75)`,
      [created.rows[0].id],
    );
  }
}

module.exports = { pool, initializeDatabase };
