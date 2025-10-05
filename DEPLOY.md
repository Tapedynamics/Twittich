# 🚀 Guida al Deploy - Social Trading Platform

## Architettura
- **Frontend**: Vercel (Next.js)
- **Backend**: Railway (Express + Socket.io)
- **Database**: Railway (PostgreSQL)

---

## 📋 Pre-requisiti

1. Account GitHub (per connettere i repository)
2. Account Vercel (gratis): https://vercel.com
3. Account Railway (gratis): https://railway.app
4. Git repository inizializzato

---

## 1️⃣ Deploy Database (Railway)

### Già fatto! ✅
Il tuo database PostgreSQL è già attivo su Railway.
Hai già il `DATABASE_URL` nel file `.env` del backend.

---

## 2️⃣ Deploy Backend (Railway)

### Step 1: Crea nuovo servizio su Railway

1. Vai su https://railway.app
2. Click su "New Project"
3. Seleziona "Deploy from GitHub repo"
4. Seleziona il repository e la cartella `backend`

### Step 2: Configura le variabili d'ambiente

Aggiungi queste variabili in Railway → Settings → Variables:

```env
DATABASE_URL=<il-tuo-database-url-di-railway>
JWT_SECRET=<genera-una-stringa-random-sicura>
JWT_REFRESH_SECRET=<genera-un-altra-stringa-random>
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
PORT=5000
```

**Genera chiavi sicure con:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Configura Build & Start

Railway → Settings → Build & Deploy:
- **Build Command**: `npm run build`
- **Start Command**: `npm run deploy`

### Step 4: Deploy

Railway farà automaticamente il deploy quando fai push su GitHub.
L'URL del backend sarà tipo: `https://your-backend.railway.app`

---

## 3️⃣ Deploy Frontend (Vercel)

### Step 1: Connetti repository a Vercel

1. Vai su https://vercel.com
2. Click su "New Project"
3. Importa il tuo repository GitHub
4. Seleziona la cartella `frontend` come Root Directory

### Step 2: Configura variabili d'ambiente

Vercel → Settings → Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

Sostituisci con l'URL del tuo backend Railway.

### Step 3: Deploy

Vercel farà automaticamente il deploy.
L'URL sarà tipo: `https://your-app.vercel.app`

---

## 4️⃣ Aggiorna CORS

Dopo aver ottenuto l'URL di Vercel, aggiorna su Railway:

**Railway → Backend → Variables:**
```env
FRONTEND_URL=https://your-app.vercel.app
```

---

## 5️⃣ Test Production

### Testa queste funzionalità:

- ✅ Registrazione utente
- ✅ Login
- ✅ Creazione post
- ✅ Like e commenti
- ✅ Notifiche
- ✅ Live streaming (solo admin)
- ✅ Chat live
- ✅ WebRTC screen share

---

## 🔄 Deploy Automatico

Entrambe le piattaforme deployano automaticamente quando fai push su GitHub:

```bash
git add .
git commit -m "Update: descrizione modifiche"
git push origin main
```

- **Vercel**: rileva push e rebuilda frontend
- **Railway**: rileva push e rebuilda backend

---

## 📊 Monitoraggio

### Railway Dashboard
- Logs in tempo reale
- Metriche di utilizzo
- Database metrics

### Vercel Dashboard
- Analytics
- Performance metrics
- Error tracking

---

## 🔒 Sicurezza Post-Deploy

1. **Genera nuove chiavi JWT** (non usare quelle di dev!)
2. **Configura rate limiting** sul backend
3. **Abilita HTTPS** (automatico su Vercel/Railway)
4. **Backup database** regolari su Railway

---

## 🆘 Troubleshooting

### Backend non parte su Railway
```bash
# Verifica logs su Railway Dashboard
# Controlla che tutte le env vars siano configurate
# Assicurati che PORT sia 5000 o usa process.env.PORT
```

### Frontend non si connette al backend
```bash
# Verifica NEXT_PUBLIC_API_URL in Vercel
# Controlla CORS su Railway (FRONTEND_URL)
# Verifica che il backend sia online
```

### Database connection error
```bash
# Verifica DATABASE_URL su Railway
# Controlla che Prisma migrations siano applicate
# Esegui: npm run deploy (applica migrations)
```

---

## 💰 Costi

### Piano Gratuito
- **Vercel**: 100GB bandwidth/mese
- **Railway**: $5 credito/mese (~500h runtime)
- **Totale**: GRATIS per progetti piccoli/medi

### Se superi i limiti
- **Vercel Pro**: $20/mese
- **Railway**: Pay as you go (~$5-20/mese)

---

## 🎯 Prossimi Passi

1. Setup dominio custom
2. Setup email (per notifiche)
3. Setup analytics (Google Analytics, Plausible)
4. Setup monitoring (Sentry per error tracking)
5. Setup CI/CD (GitHub Actions per test automatici)

---

## 📝 Comandi Utili

```bash
# Backend - Railway
npm run build          # Build TypeScript
npm run deploy         # Deploy + migrate
npm run start          # Start server

# Frontend - Vercel  
npm run build          # Build Next.js
npm run start          # Start production server

# Database
npx prisma migrate deploy  # Apply migrations
npx prisma generate        # Generate Prisma client
npx prisma studio          # Open Prisma Studio
```

---

## ✅ Checklist Deploy

- [ ] Database PostgreSQL su Railway configurato
- [ ] Backend deployato su Railway
- [ ] Variabili d'ambiente backend configurate
- [ ] Migrations database applicate
- [ ] Frontend deployato su Vercel
- [ ] Variabile NEXT_PUBLIC_API_URL configurata
- [ ] CORS configurato correttamente
- [ ] Test registrazione/login
- [ ] Test funzionalità principali
- [ ] Dominio custom (opzionale)
- [ ] Analytics setup (opzionale)

---

Fatto! 🎉 La tua app è live!
