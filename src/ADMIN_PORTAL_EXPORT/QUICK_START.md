# Admin Portal - Quick Start (5 Minutes)

## Prerequisites
- Node.js 16+ installed
- PostgreSQL 12+ installed and running
- Terminal access

---

## 🚀 Start Backend

```bash
cd ADMIN_PORTAL_EXPORT/backend

# Copy environment file
cp ../.env.example .env

# Edit .env and set:
# DB_PASSWORD=<your postgres password>
# JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Install dependencies
npm install

# Create database
createdb admin_portal

# Import schema
psql admin_portal < ../DATABASE_SETUP.sql

# Start server
npm run dev
```

✅ You should see: `Express server running on http://localhost:5000`

---

## 🎨 Start Frontend (NEW TERMINAL)

```bash
cd ADMIN_PORTAL_EXPORT/frontend

# Copy environment file
cp ../.env.example .env

# Install dependencies
npm install

# Start server
npm run dev
```

✅ You should see: `http://localhost:5173/`

---

## 🔓 Login

1. Open **http://localhost:5173** in browser
2. Enter credentials:
   - **Email**: `admin@example.com`
   - **Password**: `admin123`
3. Click **Login**

✅ You're in! 🎉

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Port 5000 in use" | Kill: `lsof -i :5000 \| grep LISTEN \| awk '{print $2}' \| xargs kill -9` |
| "Database connection failed" | Check: `psql postgres` (PostgreSQL running?) |
| "Cannot find module" | Run: `npm install` in both backend & frontend |
| "CORS error in console" | Check backend `.env`: `FRONTEND_URL=http://localhost:5173` |
| "401 Unauthorized" | Clear localStorage: DevTools → Application → Clear, then login again |

---

## ✅ Next Steps

1. Create more users via **User Management** page
2. Submit claims via **Submit Claim** page
3. Approve claims via **Approvals** page
4. View reports via **Reports** page

---

## 📚 Full Documentation

- **Setup Details**: See `SETUP_CHECKLIST.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Production**: See `DEPLOYMENT.md`

---

That's it! You're ready to use the Admin Portal. 🚀