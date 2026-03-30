# BACKEND SETUP GUIDE (B Setup)

## Complete Step-by-Step Backend Installation

### Prerequisites
- **Node.js**: v18+ ([Download](https://nodejs.org))
- **PostgreSQL**: 12+ ([Download](https://www.postgresql.org))
- **npm**: Comes with Node.js
- **DBeaver**: For database visualization ([Download](https://dbeaver.io))

---

## STEP 1: Install Node.js & Verify

```bash
# Check Node.js is installed
node --version
# Expected output: v18.x.x or higher

# Check npm is installed
npm --version
# Expected output: 9.x.x or higher
```

---

## STEP 2: Set Up PostgreSQL Database

### Windows/Mac:
1. Install PostgreSQL from official site
2. During installation:
   - Set password for `postgres` user (remember this!)
   - Note the port (default: 5432)
3. Verify installation:
   ```bash
   psql --version
   ```

### Linux (Ubuntu/Debian):
```bash
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

---

## STEP 3: Create Database & Run SQL Script

### Option A: Using DBeaver (Recommended for Beginners)

1. Open DBeaver
2. Click **Database → New Database Connection**
3. Select **PostgreSQL** → **Next**
4. Fill in:
   - **Server Host**: `localhost`
   - **Port**: `5432`
   - **Database**: (leave empty)
   - **Username**: `postgres`
   - **Password**: (your postgres password)
   - Click **Test Connection**
5. Click **Finish**
6. Right-click connection → **Create New Database**
   - Name: `admin_portal_db`
   - Click **OK**
7. Double-click `admin_portal_db` to connect
8. Go to **File → Open SQL Script**
   - Select `DATABASE_SETUP.sql`
9. Click **Execute** (orange arrow icon)
10. Verify tables created:
    - Right-click `admin_portal_db` → **Refresh**
    - Expand **Schemas → public → Tables**
    - You should see: users, roles, claims, categories, etc.

### Option B: Using Command Line

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE admin_portal_db;

# Connect to new database
\c admin_portal_db

# Run the SQL script (copy entire DATABASE_SETUP.sql content)
# Paste the SQL and press Enter
```

---

## STEP 4: Clone/Create Backend Folder

```bash
# Navigate to your projects folder
cd ~/projects  # or wherever you want

# Create backend folder
mkdir admin-portal-backend
cd admin-portal-backend

# Initialize npm project
npm init -y
```

---

## STEP 5: Install Backend Dependencies

```bash
npm install express cors dotenv pg bcryptjs jsonwebtoken axios
```

**What each package does:**
- `express`: Web server framework
- `cors`: Allow frontend to call backend
- `dotenv`: Load environment variables from .env file
- `pg`: PostgreSQL client
- `bcryptjs`: Hash passwords securely
- `jsonwebtoken`: Create login tokens
- `axios`: Make HTTP requests

---

## STEP 6: Create `.env` File

In the backend folder, create a file named `.env`:

```env
# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admin_portal_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Server
PORT=5000
NODE_ENV=development

# JWT Secret (create a random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Email (optional for now)
EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

**Replace:**
- `your_postgres_password` → Your actual postgres password
- `your_super_secret_jwt_key_change_this_in_production` → Any random string (e.g., `abc123xyz!@#`)

---

## STEP 7: Create Backend Folder Structure

```bash
# From backend folder
mkdir -p config controllers middleware models routes services utils

# Create main files
touch server.js
touch config/database.js
touch config/env.js
```

---

## STEP 8: Copy Backend Code Files

(Backend code files will be provided in next section)

Create each file in the following structure:
```
admin-portal-backend/
├── server.js
├── package.json
├── .env
├── .gitignore
├── config/
│   ├── database.js
│   └── env.js
├── controllers/
│   ├── authController.js
│   ├── claimController.js
│   └── configController.js
├── middleware/
│   ├── authMiddleware.js
│   └── errorHandler.js
├── models/
│   ├── User.js
│   ├── Claim.js
│   └── Role.js
├── routes/
│   ├── authRoutes.js
│   ├── claimRoutes.js
│   └── configRoutes.js
├── services/
│   ├── emailService.js
│   ├── approvalService.js
│   └── configService.js
└── utils/
    └── validators.js
```

---

## STEP 9: Start Backend Server

```bash
# Make sure you're in backend folder
cd admin-portal-backend

# Start the server
node server.js

# Expected output:
# ✓ Database connected successfully
# ✓ Server running on http://localhost:5000
```

---

## STEP 10: Verify Backend is Running

Open a new terminal/command prompt:

```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@portal.com","password":"admin123"}'

# Expected response:
# {"success":true,"token":"eyJhbGc...","user":{"id":1,"email":"admin@portal.com"...}}
```

Or use **Postman** (graphical tool):
1. Download [Postman](https://www.postman.com/downloads)
2. Create a new request:
   - Method: **POST**
   - URL: `http://localhost:5000/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "admin@portal.com",
       "password": "admin123"
     }
     ```
3. Click **Send**

---

## Troubleshooting

### ❌ "Cannot connect to PostgreSQL"
- Check postgres is running: `pg_isready -h localhost -p 5432`
- Verify credentials in `.env` file
- Check DB_NAME is `admin_portal_db`

### ❌ "Port 5000 already in use"
- Change PORT in `.env` to 5001, 5002, etc.

### ❌ "Module not found errors"
- Delete `node_modules` folder
- Run `npm install` again

### ❌ "Database table doesn't exist"
- Verify DATABASE_SETUP.sql was fully executed
- In DBeaver, right-click database → Refresh

---

## Next Steps

1. ✅ Backend running on port 5000
2. ⏳ Frontend setup (See FRONTEND_SETUP_GUIDE.md)
3. ⏳ Test full integration

---

## Database Credentials (Test Users)

All passwords are hashed. For testing, use:

```
Email: admin@portal.com (Super Admin)
Email: employee@portal.com (Employee)
Email: manager@portal.com (Manager)
Email: finance@portal.com (Finance)

Password: admin123 (for all test users, adjust in code as needed)
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `node server.js` | Start server |
| `npm start` | Start (if configured in package.json) |
| `npm run dev` | Start with nodemon (auto-reload) |

---

## Backend is Ready! ✓

Once backend is running on port 5000, proceed to **Frontend Setup Guide**.