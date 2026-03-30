# FRONTEND SETUP GUIDE (F Setup)

## Complete Step-by-Step Frontend Installation

### Prerequisites
- **Node.js**: v18+ (already installed if you did backend setup)
- **npm**: Comes with Node.js
- **Backend running**: Must be on `http://localhost:5000`

---

## STEP 1: Verify Backend is Running

Before starting frontend setup, ensure backend is running:

```bash
# In another terminal, from backend folder:
node server.js

# Expected output:
# ✓ Database connected successfully
# ✓ Server running on http://localhost:5000
```

---

## STEP 2: Create Frontend Folder

```bash
# Navigate to your projects folder
cd ~/projects  # (same parent as backend)

# Create frontend folder
mkdir admin-portal-frontend
cd admin-portal-frontend

# Initialize npm project
npm init -y
```

---

## STEP 3: Install Vite & React

```bash
npm install vite @vitejs/plugin-react react react-dom axios react-router-dom

# For UI components (optional but recommended)
npm install tailwindcss postcss autoprefixer
```

---

## STEP 4: Create `.env` File

In frontend folder, create `.env`:

```env
VITE_API_URL=http://localhost:5000
```

This tells the frontend where the backend API is located.

---

## STEP 5: Create Frontend Folder Structure

```bash
# From frontend folder root
mkdir -p src/{pages,components,services,hooks,utils,styles}

# Create core files
touch src/main.jsx
touch src/App.jsx
touch vite.config.js
touch index.html
touch src/styles/index.css
```

---

## STEP 6: Copy Frontend Code Files

(Frontend code files will be provided)

Final structure should look like:
```
admin-portal-frontend/
├── package.json
├── .env
├── index.html
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── styles/
│   │   └── index.css
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Claims.jsx
│   │   └── Users.jsx
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── Navigation.jsx
│   │   └── ProtectedRoute.jsx
│   ├── services/
│   │   └── api.js
│   ├── hooks/
│   │   └── useAuth.js
│   └── utils/
│       └── helpers.js
```

---

## STEP 7: Start Frontend Development Server

```bash
# From frontend folder
npm run dev

# Expected output:
# ✓ Vite v5.x.x  ready in 500ms
# ➜  Local:   http://localhost:5173
# ➜  press h + enter to show help
```

---

## STEP 8: Open in Browser

Visit: **http://localhost:5173**

---

## STEP 9: Login with Test Credentials

Use any of these:
```
Email: admin@portal.com
Email: employee@portal.com
Email: manager@portal.com
Email: finance@portal.com

Password: admin123
```

---

## How Frontend Connects to Backend

```
┌─────────────────┐
│   React App     │ (http://localhost:5173)
│   (Frontend)    │
└────────┬────────┘
         │ API Calls (Axios)
         │ http://localhost:5000/api/*
         ↓
┌─────────────────┐
│   Express API   │ (http://localhost:5000)
│   (Backend)     │
└────────┬────────┘
         │ Queries
         ↓
┌─────────────────┐
│   PostgreSQL    │
│   (Database)    │
└─────────────────┘
```

---

## Frontend Architecture

### Key Concepts:

1. **Services (api.js)**
   - All API calls go here
   - Handles authentication headers
   - Error handling

2. **Hooks (useAuth.js)**
   - Manages user login state
   - Stores JWT token
   - Checks if user is authenticated

3. **Protected Routes**
   - Only authenticated users can access
   - Redirects to login if not authenticated
   - Checks user role for access

4. **Components**
   - Reusable UI elements
   - Layout wrapper for consistent design
   - Navigation sidebar

---

## Troubleshooting

### ❌ "Cannot GET http://localhost:5000/api/..."
- Backend is not running
- Check backend is on port 5000
- Verify `.env` has `VITE_API_URL=http://localhost:5000`

### ❌ "Login fails with 'Invalid credentials'"
- Check backend is running
- Verify password is `admin123`
- Check user exists in database

### ❌ "Blank page or errors"
- Open browser DevTools (F12)
- Check Console for errors
- Check Network tab to see API responses

### ❌ "Port 5173 already in use"
- Vite will automatically use 5174, 5175, etc.
- Or close other apps using port 5173

---

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Frontend is Ready! ✓

Once frontend loads at http://localhost:5173, you have:

✅ Complete frontend running
✅ Connected to backend API
✅ Authentication working
✅ Database synced

---

## Next Steps

1. ✅ Frontend running on port 5173
2. ✅ Backend running on port 5000
3. ✅ Database connected
4. 🎉 Complete system operational!

---

## What You Can Do Now

- Login with test users
- Submit expense claims
- Approve/reject claims (as manager/admin)
- View user profiles
- Manage system configuration
- View all claims and their approval history

---

## File Locations Reference

| File | Purpose |
|------|---------|
| `src/main.jsx` | App entry point |
| `src/App.jsx` | Main routing logic |
| `src/services/api.js` | All API calls |
| `src/hooks/useAuth.js` | Authentication state |
| `src/pages/*.jsx` | Page components |
| `.env` | Environment variables |

---

## Support Debugging

If something doesn't work:

1. Check if backend is running: `curl http://localhost:5000/api/health`
2. Check browser console (F12) for errors
3. Check Network tab in DevTools to see API responses
4. Check .env file has correct API URL
5. Restart both frontend and backend

---

## System Architecture Summary

```
┌─────────────────────────────────────────────────┐
│  ADMIN PORTAL - COMPLETE STACK                  │
├─────────────────────────────────────────────────┤
│  Frontend: React + Vite (Port 5173)             │
│  Backend: Express.js (Port 5000)                │
│  Database: PostgreSQL (Port 5432)               │
├─────────────────────────────────────────────────┤
│  Authentication: JWT Tokens                     │
│  Authorization: Role-Based Access Control       │
│  Data Flow: React → Axios → Express → PostgreSQL│
└─────────────────────────────────────────────────┘
```

---

**System is ready for use!** 🎉