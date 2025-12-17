const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   SERVE FRONTEND
   ========================= */
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* =========================
   ADD MATCH (REFEREE INPUT)
   ========================= */
app.post("/add-match", (req, res) => {
  const { sport, team1, team2, score1, score2, round } = req.body;

  /* Validation */
  if (!sport || !team1 || !team2 || score1 == null || score2 == null) {
    return res.status(400).json({ error: "Invalid match data" });
  }

  if (team1 === team2) {
    return res.status(400).json({ error: "Teams must be different" });
  }

  const winner =
    score1 > score2 ? team1 :
    score2 > score1 ? team2 :
    null; // draw case

  const loser =
    winner === team1 ? team2 :
    winner === team2 ? team1 :
    null;

  /* Save match */
  db.run(
    `INSERT INTO matches (sport, team1, team2, score1, score2, round)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sport, team1, team2, score1, score2, round]
  );

  /* Ensure teams exist (UNIQUE by team + sport) */
  [team1, team2].forEach(team => {
    db.run(
      `INSERT OR IGNORE INTO points (team, sport, played, won, lost, points)
       VALUES (?, ?, 0, 0, 0, 0)`,
      [team, sport]
    );
  });

  /* Update standings */
  if (winner && loser) {
    db.run(
      `UPDATE points
       SET played = played + 1,
           won = won + (team = ?),
           lost = lost + (team = ?),
           points = points + (team = ?)*2
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

  res.json({ message: "Match recorded successfully" });
});

/* =========================
   GET POINTS TABLE
   ========================= */
app.get("/points/:sport", (req, res) => {
  db.all(
    `SELECT team, played, won, lost, points
     FROM points
     WHERE sport = ?
     ORDER BY points DESC, won DESC`,
    [req.params.sport],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

/* =========================
   GET TOP 4 TEAMS (SEMIFINAL)
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
      res.json(rows);
    }
  );
});

/* =========================
   START SERVER
   ========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

