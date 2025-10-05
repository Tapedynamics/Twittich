# ⚡ READ THE TAPE - Social Trading Platform

Una piattaforma di social trading con streaming live, chat in tempo reale e condivisione schermo WebRTC.

## 🎨 Tema
Wall Street anni '80 - Cyber Trading Floor con effetti neon e retro style

## 🚀 Stack Tecnologico

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Socket.io Client
- WebRTC (screen sharing)

### Backend
- Node.js + Express
- TypeScript
- Socket.io (WebSocket)
- Prisma ORM
- PostgreSQL
- JWT Authentication

## 📦 Struttura Progetto

```
socialtrading/
├── frontend/          # Next.js app
│   ├── app/          # Pages e componenti
│   ├── public/       # Asset statici
│   └── ...
├── backend/          # Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── ...
└── DEPLOY.md         # Guida deploy
```

## ✨ Funzionalità

- ✅ Autenticazione (JWT con refresh token)
- ✅ Social feed (post, like, commenti)
- ✅ Profili utente con statistiche trading
- ✅ Sistema di notifiche real-time
- ✅ Live streaming con chat
- ✅ Screen sharing WebRTC con audio
- ✅ Dashboard admin
- ✅ Sezione Education
- ✅ Sezione Funding (prop firms)
- ✅ Mobile responsive

## 🏃 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- npm o yarn

### 1. Clone repository
```bash
git clone <your-repo-url>
cd socialtrading
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Configura il DATABASE_URL in .env
npm run db:setup
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Configura NEXT_PUBLIC_API_URL in .env.local
npm run dev
```

### 4. Accedi all'app
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Prisma Studio: http://localhost:5555

## 📖 Documentazione

- [Guida Deploy](./DEPLOY.md) - Istruzioni complete per il deploy

## 🔐 Variabili d'Ambiente

### Backend (.env)
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
FRONTEND_URL="http://localhost:3000"
PORT=5000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

## 🎯 Comandi Utili

### Backend
```bash
npm run dev          # Development
npm run build        # Build TypeScript
npm run start        # Production
npm run db:setup     # Setup database
npx prisma studio    # Database GUI
```

### Frontend
```bash
npm run dev          # Development
npm run build        # Build production
npm run start        # Production server
```

## 🐛 Troubleshooting

### Backend non parte
- Verifica DATABASE_URL in `.env`
- Esegui `npm run db:setup`
- Controlla che PostgreSQL sia avviato

### Frontend non si connette
- Verifica NEXT_PUBLIC_API_URL
- Controlla che il backend sia avviato
- Verifica CORS settings

### Chat duplicati
- Pulisci la cache del browser
- Riavvia il backend
- Controlla i socket connection logs

## 🤝 Contributing

1. Fork del progetto
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

## 📄 License

MIT License - vedi LICENSE file

## 🎨 Design Credits

Tema ispirato a Wall Street anni '80 con elementi cyberpunk e retro-futurism.

---

**Built with ⚡ by Tape Dynamics**
