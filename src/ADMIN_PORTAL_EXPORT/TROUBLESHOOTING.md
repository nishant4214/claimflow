# Admin Portal - Troubleshooting Guide

## 🔴 Common Issues & Solutions

---

## Module & Import Errors

### ❌ "Cannot find module 'express'"
**Symptom**: `Error: Cannot find module 'express'`

**Solution**:
```bash
cd backend
npm install
npm list express  # Verify installed
```

### ❌ "Cannot find module 'axios'"
**Symptom**: `Error: Cannot find module 'axios'`

**Solution**:
```bash
# Both frontend and backend use axios
cd frontend && npm install axios
cd ../backend && npm install axios
```

### ❌ "Cannot find module 'react'"
**Symptom**: `error TS2307: Cannot find module 'react'`

**Solution**:
```bash
cd frontend
npm install react react-dom
npm list react  # Should show version
```

### ❌ "Cannot find module './components/Layout'"
**Symptom**: `Module not found: Error: Can't resolve './components/Layout'`

**Solution**:
```bash
# Check file exists:
ls frontend/src/components/Layout.jsx

# If missing, recreate from backup or git:
git checkout frontend/src/components/Layout.jsx

# Verify import path is correct:
# Should be: import Layout from '../components/Layout'
# NOT: import Layout from './Layout'
```

---

## JSX/TSX & React Issues

### ❌ "ReferenceError: React is not defined"
**Symptom**: At runtime, shows "React is not defined"

**Solution**:
```jsx
// Add at top of file:
import React from 'react';

// Or use modern React without explicit import:
// (Latest React doesn't require explicit import)
```

### ❌ ".tsx file not recognized"
**Symptom**: Vite error about .tsx files

**Solution**:
```bash
# Remove ALL .tsx files - convert to .jsx:
find . -name "*.tsx" -type f

# Rename:
mv file.tsx file.jsx

# Remove all TypeScript references:
rm tsconfig.json
```

### ❌ "Unexpected token <" (JSX parsing error)
**Symptom**: Build fails with "Unexpected token <"

**Solution**:
```bash
# Verify .jsx extension used:
ls -la src/components/ | grep -i ".jsx\|.tsx"

# If .js files contain JSX, rename:
mv Component.js Component.jsx

# Verify vite.config.js includes React plugin:
cat vite.config.js | grep react
```

---

## Database Connection Errors

### ❌ "ECONNREFUSED 127.0.0.1:5432"
**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution - PostgreSQL not running**:
```bash
# macOS:
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Windows:
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start

# Verify running:
psql -U postgres -c "SELECT NOW();"
```

### ❌ "FATAL: password authentication failed"
**Symptom**: `FATAL: password authentication failed for user "postgres"`

**Solution**:
```bash
# Check backend/.env has correct password:
cat backend/.env | grep DB_PASSWORD

# Reset PostgreSQL password:
# macOS/Linux:
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'newpassword';"

# Update backend/.env:
DB_PASSWORD=newpassword
DATABASE_URL=postgresql://postgres:newpassword@localhost:5432/admin_portal
```

### ❌ "database admin_portal does not exist"
**Symptom**: `FATAL: database "admin_portal" does not exist`

**Solution**:
```bash
# Create database:
createdb admin_portal

# Or with postgres user:
sudo -u postgres createdb admin_portal

# Verify created:
psql -l | grep admin_portal

# Import schema:
psql admin_portal < DATABASE_SETUP.sql
```

### ❌ "relation does not exist"
**Symptom**: `ERROR: relation "users" does not exist`

**Solution**:
```bash
# Check tables created:
psql admin_portal -c "\dt"

# If empty, import schema:
psql admin_portal < DATABASE_SETUP.sql

# Verify tables now exist:
psql admin_portal -c "\dt"
# Should show: users, roles, claims, categories, approvals, workflows
```

---

## Port & Server Errors

### ❌ "Port 5000 already in use"
**Symptom**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000:
# macOS/Linux:
lsof -i :5000

# Kill the process:
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port in backend/.env:
PORT=5001

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### ❌ "Port 5173 already in use"
**Symptom**: `Error: port 5173 is in use`

**Solution**:
```bash
# Kill process on 5173:
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port:
npm run dev -- --port 5174
```

---

## Environment Configuration Errors

### ❌ "DATABASE_URL is undefined"
**Symptom**: `Error: DATABASE_URL is undefined`

**Solution**:
```bash
# Check .env file exists:
ls -la backend/.env

# If missing, create it:
cp .env.example backend/.env

# Edit with correct values:
nano backend/.env

# Verify DATABASE_URL is set:
grep DATABASE_URL backend/.env
# Should show: DATABASE_URL=postgresql://...
```

### ❌ "JWT_SECRET is too short"
**Symptom**: Security warning or JWT errors

**Solution**:
```bash
# Generate strong secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update backend/.env:
JWT_SECRET=<paste generated secret here>

# Restart backend server
npm run dev
```

### ❌ "VITE_API_URL not loading"
**Symptom**: Frontend can't reach backend, API calls fail

**Solution**:
```bash
# Check frontend/.env exists:
ls frontend/.env

# If missing:
cp .env.example frontend/.env

# Verify VITE_API_URL:
grep VITE_API_URL frontend/.env
# Should show: VITE_API_URL=http://localhost:5000/api

# Check backend is running:
curl http://localhost:5000/api/auth/health
# Should return 200 OK
```

---

## Authentication & JWT Errors

### ❌ "401 Unauthorized"
**Symptom**: API returns 401, "token is invalid"

**Solution**:
```bash
# Clear browser cache:
# DevTools (F12) → Application → localStorage → Clear

# Login again:
1. Go to http://localhost:5173
2. Enter email: admin@example.com, password: admin123
3. Check Network tab (F12) for token in response
4. Verify token is stored in localStorage
```

### ❌ "Invalid token signature"
**Symptom**: `JsonWebTokenError: invalid signature`

**Solution**:
```bash
# JWT_SECRET mismatch - backend changed secret without clearing tokens
# Clear tokens and regenerate:
rm -f .env
cp .env.example backend/.env

# Generate new JWT_SECRET:
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update .env:
echo "JWT_SECRET=$JWT_SECRET" >> backend/.env

# Restart backend
npm run dev

# Clear browser localStorage and login again
```

### ❌ "Token expired"
**Symptom**: `TokenExpiredError: jwt expired`

**Solution**:
```bash
# Token expired - user needs to login again
# Or increase JWT_EXPIRY in backend/.env:
JWT_EXPIRY=7d  # 7 days instead of 24h

# Users must login again to get new token
```

---

## CORS Errors

### ❌ "Access to XMLHttpRequest blocked by CORS policy"
**Symptom**: Console shows CORS error, red "blocked:cors"

**Solution**:
```bash
# Check backend CORS configuration:
cat backend/server.js | grep cors

# Should have:
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:5173' }));

# Update if needed - edit backend/server.js:
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

# Check backend/.env has correct frontend URL:
grep FRONTEND_URL backend/.env
# Should show: FRONTEND_URL=http://localhost:5173

# Restart backend
npm run dev
```

### ❌ "Request header field authorization is not allowed"
**Symptom**: Preflight fails, Authorization header rejected

**Solution**:
```bash
# Add allowed headers to CORS config in backend/server.js:
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

# Restart backend
```

---

## Build & Compilation Errors

### ❌ "npm run build fails"
**Symptom**: Build process exits with error

**Solution**:
```bash
# Frontend build:
cd frontend
npm run build

# Check for errors in output
# Common issues:
# 1. Missing imports - fix all import statements
# 2. Undefined variables - check all variables are declared
# 3. Missing node_modules - run npm install

# Backend doesn't need build, but check start works:
npm start
```

### ❌ "Vite build generates broken code"
**Symptom**: Built app doesn't work (dist/ broken)

**Solution**:
```bash
# Clear cache and rebuild:
rm -rf node_modules dist package-lock.json
npm install
npm run build

# Verify built files:
ls -la dist/
# Should show: index.html, assets/ folder

# Preview build locally:
npm run preview
# Open http://localhost:4173
```

---

## Runtime & Console Errors

### ❌ "Cannot read property 'x' of undefined"
**Symptom**: Runtime error in DevTools console

**Solution**:
```jsx
// Check if object exists before accessing property:

// ❌ Wrong:
const value = user.name;  // Error if user is undefined

// ✅ Right:
const value = user?.name;  // Safe navigation
// OR
const value = user && user.name ? user.name : 'Unknown';
```

### ❌ "Warning: Each child in a list should have a unique key prop"
**Symptom**: React warning in console

**Solution**:
```jsx
// ❌ Wrong:
{items.map((item, index) => <div key={index}>{item}</div>)}

// ✅ Right:
{items.map((item) => <div key={item.id}>{item}</div>)}
```

### ❌ "Infinite loop - too many re-renders"
**Symptom**: Browser freezes, console shows error

**Solution**:
```jsx
// Check useEffect dependencies:

// ❌ Wrong - runs every render:
useEffect(() => {
  setState(...);  // Sets state, triggers re-render, infinite loop
});

// ✅ Right - runs once on mount:
useEffect(() => {
  setState(...);
}, []);  // Empty dependency array

// ✅ Or with dependencies:
useEffect(() => {
  setState(...);
}, [specificDependency]);
```

---

## API & Fetch Errors

### ❌ "Network request failed"
**Symptom**: API calls fail, Network tab shows error

**Solution**:
```bash
# Check backend is running:
curl http://localhost:5000/api/auth/login
# Should return something (not Connection Refused)

# Check frontend env var:
grep VITE_API_URL frontend/.env
# Should be: VITE_API_URL=http://localhost:5000/api

# Check CORS headers in response:
# DevTools → Network → click request → Response Headers
# Should see: Access-Control-Allow-Origin: *
```

### ❌ "API returns 404 Not Found"
**Symptom**: `/api/users` returns 404

**Solution**:
```bash
# Verify route exists in backend:
grep -r "app.get('/api/users'" backend/

# Check routes are registered:
cat backend/server.js | grep "app.use.*routes"

# Verify endpoint spelling matches:
# Frontend calls: /api/users
# Backend defines: app.get('/api/users', ...)
```

---

## Performance Issues

### ❌ "App is slow / unresponsive"
**Symptom**: UI sluggish, typing lags

**Solution**:
```bash
# 1. Check memory usage:
# DevTools → Performance → Record → See what's slow

# 2. Check network requests:
# DevTools → Network tab → sort by size/time
# Cancel unnecessary requests

# 3. Build and preview:
npm run build
npm run preview
# If preview fast but dev slow, it's webpack issue
```

---

## Data Issues

### ❌ "No data showing on dashboard"
**Symptom**: Dashboard loads but empty tables

**Solution**:
```bash
# 1. Check database has data:
psql admin_portal -c "SELECT COUNT(*) FROM users;"
# Should show: count > 0

# 2. If 0 rows, import schema:
psql admin_portal < DATABASE_SETUP.sql

# 3. Check API returns data:
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer <your-token>"
# Should return JSON array

# 4. Check frontend is calling API:
# DevTools → Network → look for /api/users request
# Should see 200 response with data
```

---

## Final Checklist

If still stuck:

- [ ] PostgreSQL running? `psql -U postgres`
- [ ] Node.js installed? `node --version`
- [ ] npm up to date? `npm install -g npm@latest`
- [ ] All dependencies installed? `npm install`
- [ ] Correct env vars set? `cat .env`
- [ ] Backend running? `npm run dev`
- [ ] Frontend running? `npm run dev` (different terminal)
- [ ] Can reach API? `curl http://localhost:5000`
- [ ] No console errors? DevTools F12 → Console (no red)
- [ ] Database tables exist? `psql admin_portal -c "\dt"`

---

## Still Having Issues?

1. **Check logs**: Look at terminal output (backend/frontend)
2. **Browser console**: F12 → Console tab (red errors)
3. **Network requests**: F12 → Network tab (failed requests)
4. **Database**: `psql admin_portal` and check tables
5. **File permissions**: `ls -la` to check files readable

---

## Get Help

Include in bug report:
- Terminal output (full error message)
- Browser console errors (screenshot)
- OS and Node version: `node --version && uname -a`
- What you were trying to do
- Steps to reproduce