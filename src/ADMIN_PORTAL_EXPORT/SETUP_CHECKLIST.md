# Admin Portal - Complete Setup Checklist

## ✅ Pre-Setup Verification

- [ ] **Node.js & npm installed**: `node --version && npm --version` (Node 16+)
- [ ] **PostgreSQL installed**: `psql --version` (PostgreSQL 12+)
- [ ] **Git installed**: `git --version`
- [ ] **Port 5000 & 5173 are free**: Check `lsof -i :5000` and `lsof -i :5173`

---

## 🔧 Backend Setup

### Step 1: Navigate to Backend Directory
```bash
cd ADMIN_PORTAL_EXPORT/backend
```

### Step 2: Install Dependencies
```bash
npm install
```
✅ Verify: No errors in output. File `node_modules/` created.

### Step 3: Setup Environment Variables
```bash
# Copy example to actual .env
cp ../.env.example .env

# Edit .env with your database credentials
# Required changes:
#   DB_PASSWORD=<your postgres password>
#   JWT_SECRET=<generate a random 32-char string>
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Setup PostgreSQL Database
```bash
# Start PostgreSQL service
# macOS:
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Windows:
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start
```

### Step 5: Create Database & Run Schema
```bash
# Create database
createdb admin_portal

# Import schema
psql admin_portal < DATABASE_SETUP.sql

# Verify tables created:
psql admin_portal -c "\dt"
```

✅ Verify: Should see tables: users, roles, claims, categories, approvals, workflows, etc.

### Step 6: Verify Backend Configuration
```bash
# Check database connection:
npm run test:db

# Expected output:
# ✓ Database connected successfully
# ✓ Tables found: 12
```

### Step 7: Start Backend Server
```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

✅ Verify: Output shows:
```
✓ Express server running on http://localhost:5000
✓ Database connected to admin_portal
✓ JWT middleware initialized
✓ CORS enabled for http://localhost:5173
```

---

## 🎨 Frontend Setup

### Step 1: Open New Terminal & Navigate to Frontend
```bash
cd ADMIN_PORTAL_EXPORT/frontend
```

### Step 2: Install Dependencies
```bash
npm install
```
✅ Verify: No errors. File `node_modules/` created.

### Step 3: Setup Environment Variables
```bash
# Copy example to actual .env
cp ../.env.example .env

# Verify VITE_API_URL is set:
cat .env | grep VITE_API_URL
# Should show: VITE_API_URL=http://localhost:5000/api
```

### Step 4: Start Frontend Development Server
```bash
npm run dev
```

✅ Verify: Output shows:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### Step 5: Open in Browser
```bash
# Visit: http://localhost:5173
```

---

## 🧪 Verification Tests

### Frontend Load Test
- [ ] Page loads without errors
- [ ] No red errors in browser console (F12 → Console)
- [ ] Login form visible
- [ ] CSS styles applied correctly

### Backend API Test
```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Expected response:
# {
#   "success": true,
#   "token": "eyJhbGc...",
#   "user": { "id": 1, "email": "admin@example.com", ... }
# }
```

✅ If you get token → Backend is working correctly.

### Database Connection Test
```bash
# Check if data was seeded
psql admin_portal -c "SELECT COUNT(*) FROM users;"

# Expected: count > 0 (seed data present)
```

### Full Login Flow Test
1. Open http://localhost:5173
2. Enter credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Click "Login"
4. Should redirect to Dashboard (no errors)
5. Open DevTools (F12) → Network tab
6. Verify API request to `/api/auth/login` returns 200 OK with token

---

## 🐛 Troubleshooting

### ❌ "Cannot find module" Error
**Problem**: Missing dependencies
```bash
# Solution:
cd backend && npm install && cd ../frontend && npm install
npm list  # See what's missing
```

### ❌ "Port 5000 already in use"
**Problem**: Another process using port 5000
```bash
# Solution - Kill process on port 5000:
# macOS/Linux:
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### ❌ "Database connection refused"
**Problem**: PostgreSQL not running
```bash
# Solution:
# macOS:
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Windows:
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start
```

### ❌ "CORS error in console"
**Problem**: Frontend/Backend URL mismatch
```bash
# Solution: In backend/.env, verify:
FRONTEND_URL=http://localhost:5173

# In frontend/.env, verify:
VITE_API_URL=http://localhost:5000/api

# Restart both servers
```

### ❌ "401 Unauthorized" on API calls
**Problem**: Invalid or missing JWT token
```bash
# Solution:
1. Clear browser localStorage: DevTools → Application → localStorage → Clear
2. Login again
3. Check Network tab: Login request should return "token"
```

### ❌ "npm install fails"
**Problem**: Node version incompatible or npm cache corrupted
```bash
# Solution:
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Or use specific Node version:
nvm use 18
npm install
```

---

## 📋 Final Verification Checklist

| Check | Expected | Status |
|-------|----------|--------|
| Backend running | `npm run dev` shows "listening on 5000" | ✓ |
| Frontend running | `npm run dev` shows "http://localhost:5173" | ✓ |
| PostgreSQL running | `psql` connects to `admin_portal` | ✓ |
| Browser loads app | http://localhost:5173 loads without 500 error | ✓ |
| No console errors | F12 → Console shows no red errors | ✓ |
| Login works | Email + password logs in successfully | ✓ |
| API calls work | Network tab shows 200 responses | ✓ |
| Dashboard loads | After login, see dashboard with data | ✓ |

---

## 🚀 You're Ready!

If all checks pass, your Admin Portal is **fully operational**.

**Next steps:**
1. Create additional users via Admin UI
2. Test claim submission and approval workflow
3. Configure email notifications (optional)
4. Deploy to production (see DEPLOYMENT.md)

---

## 📞 Support

- **Backend won't start**: Check `backend/.env` (DB credentials, JWT_SECRET)
- **Frontend won't load**: Check `frontend/.env` (VITE_API_URL correct)
- **API 404 errors**: Ensure backend is running on http://localhost:5000
- **Data not showing**: Check database seeding in `DATABASE_SETUP.sql` was imported