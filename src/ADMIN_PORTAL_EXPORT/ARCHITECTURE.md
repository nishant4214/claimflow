# Admin Portal - Complete Architecture Guide

## Overview
This is a **fully independent, production-ready admin portal** with zero Base44 dependency. It's a complete full-stack application built on **Node.js/Express** (backend) and **React/Vite** (frontend), using **PostgreSQL** for data persistence.

---

## Tech Stack

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Authorization**: Role-Based Access Control (RBAC)
- **Environment**: Node.js 16+

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **Node**: 16+

---

## Architecture

### Backend Structure
```
backend/
├── server.js                 # Main entry point
├── config/
│   └── database.js          # PostgreSQL connection pool
├── middleware/
│   └── authMiddleware.js    # JWT verification & RBAC
├── controllers/
│   ├── authController.js    # Login/logout
│   ├── userController.js    # User management
│   ├── claimController.js   # Expense claims
│   └── configController.js  # System configuration
├── routes/
│   ├── authRoutes.js        # /api/auth/*
│   ├── userRoutes.js        # /api/users/*
│   ├── claimRoutes.js       # /api/claims/*
│   └── configRoutes.js      # /api/config/*
├── package.json
└── .env                     # Environment variables (not in repo)
```

### Frontend Structure
```
frontend/
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Router configuration
│   ├── index.html          # HTML template
│   ├── pages/
│   │   ├── Login.jsx       # Authentication page
│   │   ├── Dashboard.jsx   # Stats & overview
│   │   ├── Claims.jsx      # Expense claims list
│   │   └── Users.jsx       # User management
│   ├── components/
│   │   ├── Layout.jsx      # Sidebar + header
│   │   └── ProtectedRoute.jsx  # Auth guard
│   ├── hooks/
│   │   └── useAuth.js      # Auth state management
│   ├── services/
│   │   └── api.js          # Axios instance + endpoints
│   ├── styles/
│   │   └── index.css       # Global styles
│   ├── vite.config.js      # Vite configuration
│   └── package.json
└── .env                    # Environment variables (not in repo)
```

### Database Schema
**Core Tables:**
- `users` — User accounts with roles and authentication
- `roles` — Role definitions (admin_head, manager, employee, etc.)
- `claims` — Expense claim records
- `categories` — Claim category types
- `approvals` — Claim approval history
- `workflows` — Approval workflow configurations

**Complete schema**: See `DATABASE_SETUP.sql`

---

## Authentication & Authorization

### JWT Flow
1. **Login**: User provides email + password → Backend validates → Returns JWT token
2. **Token Storage**: Frontend stores token in localStorage
3. **API Requests**: Token sent in `Authorization: Bearer <token>` header
4. **Verification**: Middleware verifies token signature & expiry on every request
5. **Role Check**: Middleware extracts `portal_role` from token, enforces RBAC

### Protected Routes
- Frontend: `ProtectedRoute` component checks authentication before rendering
- Backend: `authMiddleware` blocks unauthorized requests at API level
- Dual protection ensures security at both layers

---

## API Endpoints

### Authentication
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Authenticate user (returns JWT) |
| POST | `/api/auth/logout` | Invalidate session (optional) |

### Users
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users` | List all users |
| GET | `/api/users/roles` | List available roles |
| PUT | `/api/users/:id` | Update user profile/role |
| DELETE | `/api/users/:id` | Soft-delete user |

### Claims
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/claims` | List claims (filtered by role) |
| GET | `/api/claims/:id` | Get claim details |
| POST | `/api/claims` | Create new claim |
| PUT | `/api/claims/:id` | Update claim status |

### Configuration
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/config/system` | Get system settings |
| PUT | `/api/config/system` | Update system settings |

---

## Role-Based Access Control (RBAC)

### Roles Hierarchy
```
super_admin          (all permissions)
  ├── admin
  ├── cfo
  ├── cro
  ├── functional_lead
  ├── admin_head
  ├── manager
  ├── junior_admin
  └── employee       (minimal permissions)
```

### Route Protection Examples
```javascript
// Frontend: Require specific role
<ProtectedRoute requiredRole="admin_head">
  <Users />
</ProtectedRoute>

// Backend: Middleware check
authMiddleware(req, res, next) {
  if (req.user.portal_role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

---

## Data Flow Example: Login

1. **Frontend**: User enters email + password → Calls `/api/auth/login`
2. **Backend**: 
   - Validates credentials against `users` table
   - Creates JWT token with user data + role
   - Returns token + user info
3. **Frontend**: 
   - Stores token in localStorage
   - Updates auth context
   - Redirects to Dashboard
4. **Subsequent Requests**:
   - Frontend includes token in every API call header
   - Backend verifies token, extracts user role
   - Routes/endpoints check role permissions
   - Response filtered based on authorization

---

## Deployment

### Backend Deployment
1. Set up Node.js server (DigitalOcean, AWS EC2, Heroku, etc.)
2. Install PostgreSQL database
3. Clone repository, install dependencies
4. Create `.env` file with:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   JWT_SECRET=your-secret-key-here
   NODE_ENV=production
   ```
5. Run database setup: `psql < DATABASE_SETUP.sql`
6. Start server: `npm start` (use PM2 for process management)

### Frontend Deployment
1. Build optimized bundle: `npm run build`
2. Deploy `dist/` folder to:
   - Vercel (automatic from git)
   - Netlify (drag-and-drop or git push)
   - AWS S3 + CloudFront
   - Any static hosting
3. Set API endpoint in environment variables

---

## Security Considerations

1. **JWT Secret**: Use strong, random secret (min 32 characters)
2. **HTTPS Only**: Always use HTTPS in production
3. **CORS**: Configure backend to accept requests from frontend domain only
4. **Password Hashing**: Passwords hashed with bcrypt before storage
5. **Role Verification**: Server-side role checks prevent client-side bypass
6. **Token Expiry**: Short-lived tokens (1-24 hours) with refresh mechanism
7. **SQL Injection**: Use parameterized queries (pg library handles this)
8. **XSS Prevention**: React escapes variables by default

---

## Development Workflow

### Local Development
1. **Backend**: 
   ```bash
   cd ADMIN_PORTAL_EXPORT/backend
   npm install
   npm start
   # Runs on http://localhost:5000
   ```

2. **Frontend**:
   ```bash
   cd ADMIN_PORTAL_EXPORT/frontend
   npm install
   npm run dev
   # Runs on http://localhost:5173
   ```

3. **Database**:
   ```bash
   # Use DBeaver to connect to PostgreSQL
   # Import DATABASE_SETUP.sql
   # Or: psql < DATABASE_SETUP.sql
   ```

### API Testing
- Use Postman/Insomnia
- Import `authRoutes.js` examples
- Include JWT token in Authorization header

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | Check PostgreSQL is running: `sudo service postgresql status` |
| "JWT expired" | Token expired, user needs to login again |
| "403 Forbidden" | User role lacks permission, check RBAC config |
| "CORS error" | Backend CORS not configured for frontend URL |
| "Cannot find module" | Run `npm install` in both backend & frontend |
| Port already in use | Change `PORT` in server.js or kill process on port |

---

## Next Steps / Enhancements

1. **Email Notifications**: Send emails on claim approval/rejection
2. **File Uploads**: Support document uploads for claims
3. **Advanced Filtering**: Search, sort, date range filters
4. **Audit Logs**: Track all user actions for compliance
5. **Two-Factor Auth**: SMS/TOTP for enhanced security
6. **Real-time Updates**: WebSockets for live claim status
7. **Export Reports**: PDF/Excel export of claims data

---

## Summary

This is a **complete, self-contained admin portal** ready for production use. No external dependencies on Base44 or any third-party platform. You own the code, the database, and the entire infrastructure.

All components (frontend, backend, database, authentication, authorization) are fully functional and tested. Follow the setup guides in `BACKEND_SETUP_GUIDE.md` and `FRONTEND_SETUP_GUIDE.md` to get started.

**Status**: ✅ Ready for deployment