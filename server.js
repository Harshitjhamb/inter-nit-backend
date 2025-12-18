const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   LOCAL FRONTEND SERVING
   ========================= */
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* =========================
   ADD MATCH (ADMIN PANEL)
   ========================= */
app.post("/add-match", (req, res) => {
  const { sport, team1, team2, score1, score2, round } = req.body;

  /* ---------- VALIDATION ---------- */
  if (!sport || !team1 || !team2 || score1 == null || score2 == null) {
    return res.status(400).json({ error: "Invalid match data" });
  }

  if (team1 === team2) {
    return res.status(400).json({ error: "Teams must be different" });
  }

  const winner =
    score1 > score2 ? team1 :
    score2 > score1 ? team2 :
    null;

  const loser =
    winner === team1 ? team2 :
    winner === team2 ? team1 :
    null;

  /* =========================
     SERIALIZED DB OPERATIONS
     (THIS FIXES YOUR BUG)
     ========================= */
  db.serialize(() => {

    /* ---------- SAVE MATCH ---------- */
    db.run(
      `INSERT INTO matches (sport, team1, team2, score1, score2, round)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sport, team1, team2, score1, score2, round || "league"]
    );

    /* ---------- ENSURE BOTH TEAMS EXIST ---------- */
    db.run(
      `INSERT OR IGNORE INTO points (team, sport, played, won, lost, points)
       VALUES (?, ?, 0, 0, 0, 0)`,
      [team1, sport]
    );

    db.run(
      `INSERT OR IGNORE INTO points (team, sport, played, won, lost, points)
       VALUES (?, ?, 0, 0, 0, 0)`,
      [team2, sport]
    );

    /* ---------- UPDATE BOTH TEAMS TOGETHER ---------- */
    if (winner && loser) {
      db.run(
        `UPDATE points
         SET played = played + 1,
             won    = won    + (team = ?),
             lost   = lost   + (team = ?),
             points = points + (team = ?) * 2
         WHERE team IN (?, ?) AND sport = ?`,
        [winner, loser, winner, team1, team2, sport]
      );
    } else {
      /* Draw */
      db.run(
        `UPDATE points
         SET played = played + 1
         WHERE team IN (?, ?) AND sport = ?`,
        [team1, team2, sport]
      );
    }

    /* ---------- DEBUG LOG ---------- */
    db.all(
      `SELECT team, played, won, lost, points
       FROM points
       WHERE sport = ?`,
      [sport],
      (_, rows) => console.log("POINTS TABLE:", rows)
    );
  });

  res.json({ success: true });
});

/* =========================
   GET POINTS TABLE
   ========================= */
app.get("/points/:sport", (req, res) => {
  const sport = req.params.sport;

  db.all(
    `SELECT team, sport, played, won, lost, points
     FROM points
     WHERE sport = ?
     ORDER BY points DESC, won DESC, lost ASC`,
    [sport],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows || []);
    }
  );
});

/* =========================
   QUALIFIERS (OPTIONAL)
   ========================= */
app.get("/qualifiers/:sport", (req, res) => {
  db.all(
    `SELECT team, points
     FROM points
     WHERE sport = ?
     ORDER BY points DESC, won DESC
     LIMIT 4`,
    [req.params.sport],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows || []);
    }
  );
});

/* =========================
   START SERVER
   ========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
