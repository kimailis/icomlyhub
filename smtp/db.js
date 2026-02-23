const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

let database = null;

function db() {
    if (database) return database;

    const dbDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'smtp.db');
    database = new sqlite3.Database(dbPath);

    // Initialize Schema
    database.serialize(() => {
        // Users Table
        database.run(`CREATE TABLE IF NOT EXISTS smtp_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            is_admin BOOLEAN DEFAULT 0,
            allowed_addresses TEXT DEFAULT '*'
        )`);

        // System Addresses Table
        database.run(`CREATE TABLE IF NOT EXISTS system_addresses (
            email TEXT PRIMARY KEY,
            type TEXT,
            has_inbox BOOLEAN DEFAULT 0,
            redirect_to TEXT,
            description TEXT
        )`);

        // Emails Table
        database.run(`CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_address TEXT,
            to_address TEXT,
            subject TEXT,
            body TEXT,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Mail Queue Table
        database.run(`CREATE TABLE IF NOT EXISTS mail_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            to_address TEXT,
            from_address TEXT,
            subject TEXT,
            body TEXT,
            status TEXT,
            attempts INTEGER DEFAULT 0,
            last_attempt DATETIME,
            error TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed default admin if not exists (using provided default creds)
        // SMTP_USER=admin, SMTP_PASS=icomly2024smtp
        const adminUser = 'admin';
        const adminPass = hashPassword('icomly2024smtp');

        database.get('SELECT * FROM smtp_users WHERE username = ?', [adminUser], (err, row) => {
            if (!row) {
                database.run('INSERT INTO smtp_users (username, password, is_admin) VALUES (?, ?, 1)', [adminUser, adminPass]);
            }
        });

        // Seed some system addresses based on context
        const sysAddresses = [
            ['noreply@icomly.com', 'system', 0, null, 'No-reply address'],
            ['support@icomly.com', 'support', 1, null, 'Support address']
        ];

        const stmt = database.prepare('INSERT OR IGNORE INTO system_addresses (email, type, has_inbox, redirect_to, description) VALUES (?, ?, ?, ?, ?)');
        sysAddresses.forEach(addr => stmt.run(addr));
        stmt.finalize();
    });

    return database;
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = { db, hashPassword };
