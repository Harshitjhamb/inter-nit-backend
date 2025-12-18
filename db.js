const sqlite3 = require("sqlite3").verbose();
const path = require("path");

/* =========================
   DATABASE FILE
   ========================= */
const dbPath = path.join(__dirname, "database.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Database connection error:", err.message);
  } else {
    console.log("✅ Database connected");
  }
});

/* =========================
   SCHEMA INITIALIZATION
   ========================= */
db.serialize(() => {

  /* ---------- POINTS TABLE ---------- */
  db.run(`
    CREATE TABLE IF NOT EXISTS points (
      team TEXT NOT NULL,
      sport TEXT NOT NULL,
      played INTEGER DEFAULT 0,
      won INTEGER DEFAULT 0,
      lost INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      UNIQUE(team, sport)
    )
  `);

  /* ---------- ENSURE LOST COLUMN EXISTS (SAFE MIGRATION) ---------- */
  db.run(
    `ALTER TABLE points ADD COLUMN lost INTEGER DEFAULT 0`,
    (err) => {
      if (err) {
        // Column already exists – safe to ignore
        console.log("ℹ️ 'lost' column already exists");
      } else {
        console.log("✅ 'lost' column added to points table");
      }
    }
  );

  /* ---------- MATCHES TABLE ---------- */
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport TEXT NOT NULL,
      team1 TEXT NOT NULL,
      team2 TEXT NOT NULL,
      score1 INTEGER NOT NULL,
      score2 INTEGER NOT NULL,
      round TEXT
    )
  `);

});

module.exports = db;
