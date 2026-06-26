const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'data.json');

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── JSON "database" helpers ─────────────────────────────────
function readDB() {
  if (!fs.existsSync(DB_FILE)) return defaultDB();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return defaultDB();
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function defaultDB() {
  return {
    reservations: [
      { id: 1, name: 'Théo', people: 1, start: '2026-06-27', end: '2026-06-29', status: 'confirmed' },
      { id: 2, name: 'Marta & Joan', people: 2, start: '2026-07-03', end: '2026-07-06', status: 'confirmed' },
      { id: 3, name: 'Famille Roca', people: 4, start: '2026-08-08', end: '2026-08-14', status: 'confirmed' }
    ],
    absences: [
      { start: '2026-07-14', end: '2026-07-21' },
      { start: '2026-08-01', end: '2026-08-05' }
    ]
  };
}

// ── Helpers ─────────────────────────────────────────────────
function rangeOverlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Routes ──────────────────────────────────────────────────

// GET /api/data — récupère tout (réservations + absences)
app.get('/api/data', (req, res) => {
  const db = readDB();
  res.json({
    reservations: db.reservations,
    absences: db.absences
  });
});

// GET /api/reservations — liste des réservations (futures uniquement si ?upcoming=1)
app.get('/api/reservations', (req, res) => {
  const db = readDB();
  let list = db.reservations;
  if (req.query.upcoming === '1') {
    const t = today();
    list = list.filter(r => r.end >= t);
  }
  list = [...list].sort((a, b) => a.start < b.start ? -1 : 1);
  res.json(list);
});

// POST /api/reservations — créer une réservation
app.post('/api/reservations', (req, res) => {
  const { start, end, name, people } = req.body;

  if (!start || !end) {
    return res.status(400).json({ error: 'start et end sont requis' });
  }
  if (start > end) {
    return res.status(400).json({ error: 'La date de début doit être avant la date de fin' });
  }
  if (start < today()) {
    return res.status(400).json({ error: 'Impossible de réserver dans le passé' });
  }

  const db = readDB();

  // Vérifier les conflits
  const conflict = db.reservations.find(r =>
    rangeOverlaps(start, end, r.start, r.end)
  );
  if (conflict) {
    return res.status(409).json({
      error: 'Créneau déjà réservé',
      conflict: { start: conflict.start, end: conflict.end }
    });
  }

  const newRes = {
    id: Date.now(),
    name: name || 'Visiteur',
    people: people || 1,
    start,
    end,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  db.reservations.push(newRes);
  writeDB(db);

  res.status(201).json(newRes);
});

// DELETE /api/reservations/:id — annuler une réservation
app.delete('/api/reservations/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = readDB();
  const idx = db.reservations.findIndex(r => r.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Réservation introuvable' });
  }

  const removed = db.reservations.splice(idx, 1)[0];
  writeDB(db);
  res.json({ success: true, removed });
});

// GET /api/absences — liste des absences du propriétaire
app.get('/api/absences', (req, res) => {
  const db = readDB();
  res.json(db.absences);
});

// POST /api/absences — ajouter une absence
app.post('/api/absences', (req, res) => {
  const { start, end } = req.body;

  if (!start || !end) {
    return res.status(400).json({ error: 'start et end sont requis' });
  }
  if (start > end) {
    return res.status(400).json({ error: 'Dates invalides' });
  }

  const db = readDB();
  const absence = { start, end };
  db.absences.push(absence);
  writeDB(db);

  res.status(201).json(absence);
});

// DELETE /api/absences — supprimer une absence (par start+end)
app.delete('/api/absences', (req, res) => {
  const { start, end } = req.body;
  const db = readDB();
  const before = db.absences.length;
  db.absences = db.absences.filter(a => !(a.start === start && a.end === end));

  if (db.absences.length === before) {
    return res.status(404).json({ error: 'Absence introuvable' });
  }

  writeDB(db);
  res.json({ success: true });
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Backend Casa Barcelona démarré sur http://localhost:${PORT}`);
  console.log(`   • GET    /api/data`);
  console.log(`   • GET    /api/reservations`);
  console.log(`   • POST   /api/reservations`);
  console.log(`   • DELETE /api/reservations/:id`);
  console.log(`   • GET    /api/absences`);
  console.log(`   • POST   /api/absences`);
  console.log(`   • DELETE /api/absences`);
});
