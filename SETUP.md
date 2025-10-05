# 🚀 Setup Completo - Twittich

## 📋 Prerequisiti

- Node.js 18+
- PostgreSQL (o account Supabase gratuito)
- Git

---

## 🔧 Setup Passo per Passo

### 1️⃣ Backend Setup

#### a) Naviga nella cartella backend
```bash
cd backend
```

#### b) Configura le variabili d'ambiente
```bash
cp .env.example .env
```

Modifica il file `.env` con i tuoi dati:

**Opzione A: PostgreSQL Locale**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/twittich"
JWT_SECRET="tuo-segreto-molto-sicuro-cambiale"
JWT_REFRESH_SECRET="tuo-refresh-segreto-cambiale"
PORT=5000
FRONTEND_URL="http://localhost:3000"
```

**Opzione B: Supabase (Gratis)**
1. Vai su [supabase.com](https://supabase.com)
2. Crea un progetto
3. Vai in Settings → Database → Connection String
4. Copia la stringa e usala:

```env
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
JWT_SECRET="tuo-segreto-molto-sicuro-cambiale"
JWT_REFRESH_SECRET="tuo-refresh-segreto-cambiale"
PORT=5000
FRONTEND_URL="http://localhost:3000"
```

#### c) Genera Prisma Client e crea il database
```bash
npm run prisma:generate
npm run prisma:migrate
```

Quando chiede il nome della migration, scrivi: `init`

#### d) Avvia il backend
```bash
npm run dev
```

✅ Il backend sarà attivo su `http://localhost:5000`

---

### 2️⃣ Frontend Setup

#### a) Apri un nuovo terminale e vai nella cartella frontend
```bash
cd frontend
```

#### b) Crea file environment
```bash
cp .env.local.example .env.local
```

Il file `.env.local` dovrebbe contenere:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

#### c) Avvia il frontend
```bash
npm run dev
```

✅ Il frontend sarà attivo su `http://localhost:3000`

---

## 🎯 Primi Passi

### 1. Registra il primo utente (Admin)
1. Vai su `http://localhost:3000/register`
2. Crea il tuo account (sarà il tuo account admin)
3. Dopo la registrazione, accedi al database e imposta `isAdmin = true` per il tuo utente

**Con Prisma Studio:**
```bash
cd backend
npx prisma studio
```
Apri la tabella `users`, trova il tuo utente e imposta `isAdmin` su `true`

**Oppure con SQL diretto:**
```sql
UPDATE users SET "isAdmin" = true WHERE email = 'tua@email.com';
```

### 2. Testa le funzionalità
- ✅ Registrazione/Login
- ✅ Crea un post nel feed
- ✅ Like e commenti
- ✅ Avvia una sessione live (solo admin)
- ✅ Chat live durante lo streaming

---

## 🐛 Troubleshooting

### Errore: "Cannot connect to database"
- Verifica che PostgreSQL sia in esecuzione
- Controlla la `DATABASE_URL` nel file `.env`
- Se usi Supabase, verifica che il progetto sia attivo

### Errore: "Port already in use"
- Backend: Cambia `PORT` nel `.env`
- Frontend: Usa `npm run dev -- -p 3001`

### Errore Prisma: "Schema is out of sync"
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

---

## 📦 Struttura Completa

```
twittich/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Logica business
│   │   ├── routes/          # Endpoint API
│   │   ├── middleware/      # Auth, validation
│   │   ├── config/          # Database config
│   │   ├── utils/           # JWT helpers
│   │   └── index.ts         # Server entry
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── .env                 # Config (da creare)
│   └── package.json
│
├── frontend/
│   ├── app/                 # Next.js 15 pages
│   │   ├── login/
│   │   ├── register/
│   │   ├── live/
│   │   └── page.tsx         # Home feed
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── lib/             # API client, socket
│   │   └── store/           # Zustand state
│   ├── .env.local           # Config (da creare)
│   └── package.json
│
└── README.md
```

---

## 🔥 Features Implementate

### ✅ Backend
- [x] Autenticazione JWT (register/login)
- [x] API Posts (CRUD, like, comment)
- [x] API Users (profile, follow/unfollow)
- [x] API Live Streaming (start/stop)
- [x] WebSocket (Socket.io per chat e real-time)
- [x] Database Prisma + PostgreSQL

### ✅ Frontend
- [x] Pagine Login/Register
- [x] Feed principale con post
- [x] Creazione post
- [x] Like e commenti
- [x] Pagina Live con chat
- [x] WebSocket client
- [x] State management (Zustand)

### 🚧 Da Implementare (Opzionale)
- [ ] WebRTC per screen sharing reale (Agora/Daily.co)
- [ ] Upload immagini/video
- [ ] Notifiche push
- [ ] Pagina profilo utente completa
- [ ] Dashboard statistiche trading
- [ ] Mobile responsive improvements

---

## 🎬 Prossimi Step

1. **Testa tutto in locale**
2. **Aggiungi screen sharing reale** (Agora.io SDK)
3. **Deploy quando pronto:**
   - Backend → Railway/Render
   - Frontend → Vercel
   - Database → già su Supabase

---

## 🆘 Supporto

Se hai problemi, controlla:
1. I log del backend (terminale dove hai lanciato `npm run dev`)
2. La console browser (F12) per errori frontend
3. Verifica che entrambi i server siano attivi

Buon coding! 🚀
