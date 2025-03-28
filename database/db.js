const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'agafbot.db');

// Create a new database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create tables if they don't exist
    db.serialize(() => {
      // Table to store the API key
      db.run(`CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        value TEXT NOT NULL
      )`);

      // Table to store responses
      db.run(`CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Table to store menus
      db.run(`CREATE TABLE IF NOT EXISTS menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        description TEXT,
        media_url TEXT,
        media_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES menus (id)
      )`);

      // Table to store general knowledge base information without keywords
      db.run(`CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        information TEXT NOT NULL,
        title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Initialize with default API key if it doesn't exist
      db.get("SELECT value FROM config WHERE key = 'groq_api_key'", (err, row) => {
        if (err) {
          console.error('Error checking for API key:', err.message);
        } else if (!row) {
          db.run("INSERT INTO config (key, value) VALUES (?, ?)", 
            ['groq_api_key', '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'], 
            (err) => {
              if (err) {
                console.error('Error setting default API key:', err.message);
              } else {
                console.log('Default API key set.');
              }
            });
        }
      });
    });
  }
});

module.exports = db; 