const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Database connected");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS points (
      team TEXT,
      sport TEXT,
      played INTEGER DEFAULT 0,
      won INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport TEXT,
      team1 TEXT,
      team2 TEXT,
      score1 INTEGER,
      score2 INTEGER,
      round TEXT
    )
  `);
});

module.exports = db;
