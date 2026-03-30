# Admin Portal - Deployment Guide

## Deployment Checklist

Before deploying, ensure:
- [ ] All tests pass locally
- [ ] `.env` files configured correctly
- [ ] Database backups created
- [ ] SSL certificates ready (HTTPS)
- [ ] Domain name purchased
- [ ] Monitoring/logging configured

---

## Option 1: Deploy Backend to Heroku

### Step 1: Create Heroku Account
```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login
```

### Step 2: Create Heroku App
```bash
cd ADMIN_PORTAL_EXPORT/backend

# Create app
heroku create admin-portal-api

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# View DATABASE_URL
heroku config
```

### Step 3: Deploy
```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set FRONTEND_URL=https://admin-portal.vercel.app

# Deploy
git push heroku main
```

### Step 4: Setup Database
```bash
# Run schema
heroku run "psql < DATABASE_SETUP.sql"

# Verify
heroku run "psql -c 'SELECT count(*) FROM users;'"
```

✅ Backend deployed at: `https://admin-portal-api.herokuapp.com`

---

## Option 2: Deploy Backend to DigitalOcean

### Step 1: Create Droplet
1. Login to DigitalOcean
2. Create **Ubuntu 22.04 Droplet** (minimum $5/month)
3. Add SSH key during creation
4. Note IP address

### Step 2: Setup Server
```bash
# SSH into server
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
npm install -g pm2
```

### Step 3: Clone and Deploy Backend
```bash
# Clone repo
git clone <your-repo-url>
cd ADMIN_PORTAL_EXPORT/backend

# Install dependencies
npm install

# Create .env
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/admin_portal
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
FRONTEND_URL=https://yourdomain.com
EOF

# Setup PostgreSQL
sudo -u postgres createdb admin_portal
psql admin_portal < ../DATABASE_SETUP.sql

# Start with PM2
pm2 start server.js --name "admin-api"
pm2 startup
pm2 save
```

### Step 4: Setup Nginx (Reverse Proxy)
```bash
# Install Nginx
apt install -y nginx

# Create config
cat > /etc/nginx/sites-available/admin-api << EOF
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/admin-api /etc/nginx/sites-enabled/

# Test config
nginx -t

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

### Step 5: Add SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com

# Auto-renew
systemctl enable certbot.timer
```

✅ Backend deployed at: `https://yourdomain.com`

---

## Option 3: Deploy Frontend to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Production release"
git push origin main
```

### Step 2: Connect to Vercel
1. Login to Vercel.com
2. Click "New Project"
3. Select your GitHub repository
4. Click "Import"

### Step 3: Configure Environment
In Vercel Dashboard:
- Go to **Settings → Environment Variables**
- Add: `VITE_API_URL=https://yourdomain.com/api`
- Click "Save"

### Step 4: Deploy
```bash
# Or just push to GitHub - Vercel auto-deploys
```

✅ Frontend deployed at: `https://admin-portal.vercel.app`

---

## Option 4: Deploy Frontend to Netlify

### Step 1: Build Project Locally
```bash
cd ADMIN_PORTAL_EXPORT/frontend
npm run build
```

### Step 2: Connect to Netlify
1. Login to Netlify.com
2. Click "New site from Git"
3. Select GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click "Deploy"

### Step 3: Add Environment Variables
1. Go to **Site Settings → Build & Deploy → Environment**
2. Add: `VITE_API_URL=https://yourdomain.com/api`
3. Re-deploy

✅ Frontend deployed

---

## Option 5: Self-Hosted (Docker)

### Step 1: Create Docker Compose File
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: admin_portal
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:your_password@postgres:5432/admin_portal
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "5000:5000"
    depends_on:
      - postgres

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: http://backend:5000/api
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Step 2: Deploy
```bash
docker-compose up -d
```

---

## Post-Deployment

### Health Checks
```bash
# Check backend
curl https://yourdomain.com/api/auth/health

# Check frontend loads
curl https://admin-portal.vercel.app
```

### Monitoring
- Setup error tracking: Sentry, Rollbar
- Setup uptime monitoring: UptimeRobot, Pingdom
- Setup log aggregation: Papertrail, LogDNA

### Backups
```bash
# Daily PostgreSQL backup
0 2 * * * pg_dump admin_portal | gzip > /backups/admin_portal_$(date +\%Y\%m\%d).sql.gz
```

### Security
- [ ] Enable 2FA on hosting accounts
- [ ] Rotate JWT secret monthly
- [ ] Update dependencies regularly
- [ ] Setup WAF (Web Application Firewall)
- [ ] Enable DDoS protection

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend shows 404 | Ensure VITE_API_URL correct in env vars |
| Backend connection timeout | Check DATABASE_URL, PostgreSQL running |
| "Origin not allowed" CORS | Update FRONTEND_URL in backend .env |
| Slow performance | Check database indexes, enable caching |

---

## Summary

- **Backend**: Heroku, DigitalOcean, or self-hosted
- **Frontend**: Vercel, Netlify, or self-hosted
- **Database**: Heroku PostgreSQL, DigitalOcean, or managed service
- **SSL**: Let's Encrypt (free)
- **Monitoring**: Sentry, UptimeRobot

Production deployment complete! 🚀