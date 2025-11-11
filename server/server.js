// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const db = require("./database");
const path = require("path");
const app = express();

// === Fake security: allow everything (VULNERABLE BY DESIGN) ===
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// === Serve uploads statically so frontend can preview uploaded files ===
// Note: serving uploads directly is insecure in production. For lab-only.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// === File upload (NO filtering = vulnerable) ===
const upload = multer({ dest: path.join(__dirname, "uploads") });

// ========================
// REGISTER
// (INSECURE: no password hashing, minimal validation)
// ========================
app.post("/api/register", upload.single("idFile"), (req, res) => {
  const { fullName, dob, email, phone, address, idNumber, password } = req.body;

  db.run(
    `INSERT INTO users (fullName, dob, email, phone, address, idNumber, password, idFilePath)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [fullName, dob, email, phone, address, idNumber, password, req.file ? path.join("uploads", req.file.filename) : null],
    (err) => {
      if (err) {
        console.error("DB insert error:", err);
        return res.status(500).send("DB ERROR");
      }
      res.send("User registered successfully");
    }
  );
});

// ========================
// LOGIN (intentionally vulnerable to SQLi for lab)
// ========================
app.post("/api/login", (req, res) => {
  const { identifier, password } = req.body;

  // ❌ INTENTIONALLY VULNERABLE: string concatenation = SQLi
  const sql = `SELECT * FROM users WHERE (email='${identifier}' OR idNumber='${identifier}') AND password='${password}'`;

  db.get(sql, (err, user) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).send("DB ERROR");
    }
    if (user) return res.json({ success: true, id: user.id });
    res.status(401).send("Invalid credentials");
  });
});

// ========================
// IDOR: Fetch user profile (no auth check) - lab demo
// ========================
app.get("/api/user/:id", (req, res) => {
  const uid = req.params.id;
  // Intentionally using interpolation to keep it vulnerable pattern in lab
  db.get(`SELECT id, fullName, dob, email, phone, address, idNumber, idFilePath FROM users WHERE id = ${uid}`, (err, row) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).send("DB ERROR");
    }
    res.json(row || null);
  });
});

// ========================
// TRANSFER API
// (NO auth, no CSRF, no balance checks) - lab demo
// ========================
app.post("/api/transfer", (req, res) => {
  const { userId, receiver, amount } = req.body;

  if (!userId || !receiver || (amount === undefined || amount === null)) {
    return res.status(400).send("Missing parameters");
  }

  db.run(
    `INSERT INTO transactions (userId, amount, receiver) VALUES (?, ?, ?)`,
    [userId, amount, receiver],
    function (err) {
      if (err) {
        console.error("DB insert transaction error:", err);
        return res.status(500).send("DB ERROR");
      }
      // return the created transaction id to frontend
      res.json({ success: true, transactionId: this.lastID });
    }
  );
});

// ========================
// Transactions list for a user
// (used by dashboard to render recent transactions)
// ========================
app.get("/api/transactions/:userId", (req, res) => {
  const uid = req.params.userId;
  db.all(
    `SELECT id, userId, amount, receiver, timestamp FROM transactions WHERE userId = ? ORDER BY timestamp DESC LIMIT 100`,
    [uid],
    (err, rows) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).send("DB ERROR");
      }
      res.json(rows || []);
    }
  );
});

// ========================
// Employees list (simple mapping from users) - no auth
// Useful for employee directory in lab pages
// ========================
app.get("/api/employees", (req, res) => {
  db.all(
    `SELECT id, fullName, email, phone, address FROM users ORDER BY id LIMIT 200`,
    [],
    (err, rows) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).send("DB ERROR");
      }
      res.json(rows || []);
    }
  );
});

// ========================
// Open redirect demo (insecure)
// ========================
app.get("/redirect", (req, res) => {
  const { url } = req.query;
  // Intentionally no validation (lab only)
  if (!url) return res.status(400).send("Missing url param");
  res.redirect(url);
});

// ========================
// Start
// ========================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
