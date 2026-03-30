# Quick Start Guide

## 5-Minute Setup

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Git (optional)

---

## Step 1: Database Setup (5 min)

### Option A: Using DBeaver (Easiest)
1. Open DBeaver
2. Create new PostgreSQL connection:
   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: (your postgres password)
3. Right-click connection → New SQL Script
4. Copy contents of `DATABASE_SETUP.sql`
5. Paste into script, then Execute (Ctrl+Enter)
6. Confirm all tables created ✅

### Option B: Using CLI
```bash
psql -U postgres -d postgres -f DATABASE_SETUP.sql
```

**Verify**: 
```bash
psql -U postgres -c "\dt"  # Should show all tables
```

---

## Step 2: Backend Setup (3 min)

```bash
# Navigate to backend
cd ADMIN_PORTAL_EXPORT/backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/admin_portal
JWT_SECRET=your-super-secret-key-min-32-characters-long-please
NODE_ENV=development
PORT=5000
EOF

# Start server
npm start
```

**Expected Output**:
```
✓ Server running on http://localhost:5000
✓ Connected to PostgreSQL
```

**Test**: Open `http://localhost:5000/health` → Should see: `{"status":"ok"}`

---

## Step 3: Frontend Setup (2 min)

```bash
# In new terminal, navigate to frontend
cd ADMIN_PORTAL_EXPORT/frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
EOF

# Start dev server
npm run dev
```

**Expected Output**:
```
VITE v5.0.0  ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Open** `http://localhost:5173` in browser ✅

---

## Step 4: Login

| Email | Password | Role |
|-------|----------|------|
| admin@company.com | admin123 | super_admin |
| manager@company.com | manager123 | manager |
| employee@company.com | emp123 | employee |

**Login and explore Dashboard** ✅

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
sudo lsof -i :5000
# Kill if needed: sudo kill -9 <PID>

# Check database connection
# Edit .env DATABASE_URL and verify credentials
```

### Frontend shows "Cannot connect to API"
```bash
# Make sure backend is running on http://localhost:5000
# Check VITE_API_URL in frontend .env matches
```

### Database connection failed
```bash
# Verify PostgreSQL is running
sudo service postgresql status

# If stopped, start it:
sudo service postgresql start

# Test connection:
psql -U postgres -c "SELECT 1"
```

### "Cannot find module" error
```bash
# Run npm install again in both directories
cd backend && npm install
cd ../frontend && npm install
```

---

## Next: Full Documentation

- **Architecture**: See `ARCHITECTURE.md`
- **Backend Setup**: See `BACKEND_SETUP_GUIDE.md`
- **Frontend Setup**: See `FRONTEND_SETUP_GUIDE.md`
- **API Docs**: Check `backend/routes/*.js` files

---

## What You Now Have

✅ Complete PostgreSQL database  
✅ Production-ready Node.js backend  
✅ React frontend with authentication  
✅ Role-based access control  
✅ JWT authentication  
✅ Claims management system  
✅ User management  
✅ Zero external dependencies  

**You're ready to customize and deploy!**