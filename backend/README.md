# Backend — Casa Barcelona 🏠

API REST pour synchroniser les réservations et absences entre tous les visiteurs.

## Lancer en local

```bash
npm install
node server.js
# → http://localhost:3001
```

## Endpoints

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | /api/data | Tout (réservations + absences) |
| GET | /api/reservations | Liste des réservations |
| POST | /api/reservations | Créer une réservation |
| DELETE | /api/reservations/:id | Annuler une réservation |
| GET | /api/absences | Liste des absences |
| POST | /api/absences | Ajouter une absence |
| DELETE | /api/absences | Supprimer une absence |
| GET | /api/health | Vérification |

## Exemples

### Créer une réservation
```bash
curl -X POST http://localhost:3001/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"start":"2026-09-10","end":"2026-09-14","name":"Sophie","people":2}'
```

### Annuler une réservation
```bash
curl -X DELETE http://localhost:3001/api/reservations/1234567890
```

### Ajouter une absence (espace Charly)
```bash
curl -X POST http://localhost:3001/api/absences \
  -H "Content-Type: application/json" \
  -d '{"start":"2026-10-01","end":"2026-10-10"}'
```

## Déploiement

### Option A — Railway (gratuit, recommandé)
1. Va sur [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Sélectionne ce dossier
4. Railway détecte Node.js automatiquement
5. ✅ Ton API est en ligne !

### Option B — Render (gratuit)
1. Va sur [render.com](https://render.com)
2. "New Web Service" → connecte ton repo GitHub
3. Build command : `npm install`
4. Start command : `node server.js`
5. ✅ Déployé !

### Option C — VPS (Hetzner, OVH…)
```bash
git clone ton-repo
cd casa-barcelona-backend
npm install
# Lancer avec PM2 pour qu'il reste actif
npm install -g pm2
pm2 start server.js --name casa-backend
pm2 save
```

## Connecter le front-end

Dans ton `index.html`, remplace les appels `localStorage` par des appels à cette API.

URL de base : `https://ton-backend.railway.app` (ou localhost:3001 en dev)

```javascript
const API = 'https://ton-backend.railway.app';

// Charger les données au démarrage
const data = await fetch(`${API}/api/data`).then(r => r.json());

// Créer une réservation
await fetch(`${API}/api/reservations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ start, end, name, people })
});

// Annuler
await fetch(`${API}/api/reservations/${id}`, { method: 'DELETE' });
```

## Données

Les données sont stockées dans `data.json` (créé automatiquement au premier lancement).
Pour sauvegarder : copie simplement ce fichier.
