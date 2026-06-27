const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lddkcqafjjzzvjvegfgs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.use(cors());
app.use(express.json());

// ── Supabase REST helper ─────────────────────────────────────
async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function rangeOverlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart;
}

// ── GET /api/data ────────────────────────────────────────────
app.get('/api/data', async (req, res) => {
  try {
    const [reservations, absences] = await Promise.all([
      sb('reservations?select=*&order=start_date.asc'),
      sb('absences?select=*&order=start_date.asc')
    ]);
    res.json({
      reservations: reservations.map(r => ({
        id: r.id, name: r.name, people: r.people,
        start: r.start_date, end: r.end_date, status: r.status
      })),
      absences: absences.map(a => ({
        start: a.start_date, end: a.end_date
      }))
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/reservations ───────────────────────────────────
app.post('/api/reservations', async (req, res) => {
  const { start, end, name, people } = req.body;
  if (!start || !end) return res.status(400).json({ error: 'start et end sont requis' });
  if (start > end) return res.status(400).json({ error: 'Dates invalides' });
  if (start < today()) return res.status(400).json({ error: 'Impossible de réserver dans le passé' });

  try {
    const existing = await sb(`reservations?select=start_date,end_date`);
    const conflict = existing.find(r => rangeOverlaps(start, end, r.start_date, r.end_date));
    if (conflict) return res.status(409).json({ error: 'Créneau déjà réservé' });

    const [newRes] = await sb('reservations', {
      method: 'POST',
      body: JSON.stringify({
        id: Date.now(),
        name: name || 'Visiteur',
        people: people || 1,
        start_date: start,
        end_date: end,
        status: 'confirmed'
      })
    });
    res.status(201).json({ id: newRes.id, start: newRes.start_date, end: newRes.end_date, status: newRes.status });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/reservations/:id ─────────────────────────────
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    await sb(`reservations?id=eq.${req.params.id}`, { method: 'DELETE' });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/absences ───────────────────────────────────────
app.post('/api/absences', async (req, res) => {
  const { start, end } = req.body;
  if (!start || !end) return res.status(400).json({ error: 'start et end sont requis' });
  try {
    const [absence] = await sb('absences', {
      method: 'POST',
      body: JSON.stringify({ start_date: start, end_date: end })
    });
    res.status(201).json({ start: absence.start_date, end: absence.end_date });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/absences ─────────────────────────────────────
app.delete('/api/absences', async (req, res) => {
  const { start, end } = req.body;
  try {
    await sb(`absences?start_date=eq.${start}&end_date=eq.${end}`, { method: 'DELETE' });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Backend démarré sur http://localhost:${PORT}`);
});
