# Local Development Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Docker Desktop installed and running
- Git installed
- Your Gemini API key

### Step 1: Clone and Configure

```bash
# Navigate to project directory
cd icomly

# Copy environment file
cp .env.example .env

# Edit .env and add your Gemini API key
# GEMINI_API_KEY=your_actual_api_key_here
```

### Step 2: Start Everything

```bash
# Build and start all services
docker-compose -f docker-compose.dev.yml up --build

# Or run in background
docker-compose -f docker-compose.dev.yml up --build -d
```

### Step 3: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

### Step 4: Initialize Database

The database will be automatically initialized on first run, but you can manually run:

```bash
# Run migrations
docker-compose -f docker-compose.dev.yml exec backend npx prisma db push

# (Optional) Seed with test data
docker-compose -f docker-compose.dev.yml exec backend npm run seed
```

---

## 📁 Project Structure

```
icomly/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Redis config
│   │   ├── controllers/     # API endpoints
│   │   ├── middleware/      # Auth, validation
│   │   ├── routes/          # Route definitions
│   │   ├── services/        # Business logic
│   │   │   ├── gemini.service.ts
│   │   │   ├── gemini-optimized.service.ts  # NEW: Cost-optimized
│   │   │   └── analytics.service.ts         # NEW: Trend analysis
│   │   ├── workers/         # Background jobs
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── Dockerfile           # Production build
│   ├── Dockerfile.dev       # Development build
│   └── package.json
├── frontend/
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── services/           # API clients
│   ├── Dockerfile          # Production build
│   ├── Dockerfile.dev      # Development build
│   └── package.json
├── docker-compose.yml       # Production compose
├── docker-compose.dev.yml   # Development compose (USE THIS)
└── .env                     # Environment variables
```

---

## 🔧 Development Commands

### Docker Commands

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.dev.yml down -v

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend

# Rebuild specific service
docker-compose -f docker-compose.dev.yml up --build backend

# Execute command in container
docker-compose -f docker-compose.dev.yml exec backend sh
docker-compose -f docker-compose.dev.yml exec postgres psql -U user -d icomly
```

### Backend Commands

```bash
# Run migrations
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev

# Generate Prisma Client
docker-compose -f docker-compose.dev.yml exec backend npx prisma generate

# Push schema changes
docker-compose -f docker-compose.dev.yml exec backend npx prisma db push

# Open Prisma Studio (Database GUI)
docker-compose -f docker-compose.dev.yml exec backend npx prisma studio

# Run backfill script
docker-compose -f docker-compose.dev.yml exec backend npm run backfill:followers

# Check API health
curl http://localhost:3001/api/feed
```

### Database Commands

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U user -d icomly

# Backup database
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U user icomly > backup.sql

# Restore database
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U user icomly < backup.sql

# Reset database (WARNING: Deletes all data)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d postgres
docker-compose -f docker-compose.dev.yml exec backend npx prisma db push
```

### Redis Commands

```bash
# Connect to Redis CLI
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# Clear all cache
docker-compose -f docker-compose.dev.yml exec redis redis-cli FLUSHALL

# View all keys
docker-compose -f docker-compose.dev.yml exec redis redis-cli KEYS '*'

# Get specific key
docker-compose -f docker-compose.dev.yml exec redis redis-cli GET feed:global
```

---

## 🐛 Troubleshooting

### Issue: Services won't start

```bash
# Check if ports are already in use
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Kill processes using ports
kill -9 <PID>

# Or change ports in docker-compose.dev.yml
```

### Issue: Database connection errors

```bash
# Check if PostgreSQL is healthy
docker-compose -f docker-compose.dev.yml ps

# View PostgreSQL logs
docker-compose -f docker-compose.dev.yml logs postgres

# Restart PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres

# Reset database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Issue: Prisma Client errors

```bash
# Regenerate Prisma Client
docker-compose -f docker-compose.dev.yml exec backend npx prisma generate

# Push schema changes
docker-compose -f docker-compose.dev.yml exec backend npx prisma db push

# Rebuild backend
docker-compose -f docker-compose.dev.yml up --build backend
```

### Issue: Frontend not loading

```bash
# Check if backend is running
curl http://localhost:3001/api/feed

# Check frontend logs
docker-compose -f docker-compose.dev.yml logs frontend

# Rebuild frontend
docker-compose -f docker-compose.dev.yml up --build frontend

# Clear browser cache and reload
```

### Issue: Gemini API errors

```bash
# Check if API key is set
docker-compose -f docker-compose.dev.yml exec backend printenv | grep GEMINI

# Test API key
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY"

# View backend logs for errors
docker-compose -f docker-compose.dev.yml logs backend | grep -i gemini
```

### Issue: Hot reload not working

```bash
# Ensure volumes are mounted correctly
docker-compose -f docker-compose.dev.yml config

# Restart services
docker-compose -f docker-compose.dev.yml restart backend frontend

# If still not working, rebuild
docker-compose -f docker-compose.dev.yml up --build
```

---

## 🧪 Testing the Application

### 1. Check Backend Health

```bash
# Test feed endpoint
curl http://localhost:3001/api/feed

# Test top celebs
curl http://localhost:3001/api/celebs/top

# Test map data
curl http://localhost:3001/api/map
```

### 2. Check Database

```bash
# Connect to database
docker-compose -f docker-compose.dev.yml exec postgres psql -U user -d icomly

# Run queries
SELECT COUNT(*) FROM "Celebrity";
SELECT COUNT(*) FROM "Article";
SELECT COUNT(*) FROM "Sighting";

# Exit
\q
```

### 3. Check Redis Cache

```bash
# Connect to Redis
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# Check cached data
KEYS *
GET feed:global
GET celebs:top

# Exit
exit
```

### 4. Check Background Jobs

```bash
# View worker logs
docker-compose -f docker-compose.dev.yml logs backend | grep -E "GlobalFeedGenerator|ProfileRefresher"

# Check job queue
docker-compose -f docker-compose.dev.yml exec redis redis-cli KEYS "bull:*"
```

---

## 📊 Monitoring

### View Real-time Logs

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend

# Filter logs
docker-compose -f docker-compose.dev.yml logs backend | grep ERROR
docker-compose -f docker-compose.dev.yml logs backend | grep "API call"
```

### Check Resource Usage

```bash
# View container stats
docker stats

# View specific container
docker stats icomly-backend
```

### Database Size

```bash
docker-compose -f docker-compose.dev.yml exec postgres psql -U user -d icomly -c "
SELECT 
  pg_size_pretty(pg_database_size('icomly')) as db_size,
  pg_size_pretty(pg_total_relation_size('\"Celebrity\"')) as celeb_size,
  pg_size_pretty(pg_total_relation_size('\"Article\"')) as article_size;
"
```

---

## 🔄 Development Workflow

### Making Changes

1. **Backend Changes:**
   - Edit files in `backend/src/`
   - Changes auto-reload (nodemon)
   - Check logs: `docker-compose -f docker-compose.dev.yml logs -f backend`

2. **Frontend Changes:**
   - Edit files in `frontend/`
   - Changes auto-reload (Vite HMR)
   - Refresh browser if needed

3. **Database Schema Changes:**
   ```bash
   # Edit backend/prisma/schema.prisma
   
   # Push changes
   docker-compose -f docker-compose.dev.yml exec backend npx prisma db push
   
   # Regenerate client
   docker-compose -f docker-compose.dev.yml exec backend npx prisma generate
   
   # Restart backend
   docker-compose -f docker-compose.dev.yml restart backend
   ```

### Testing Optimizations

1. **Test Cost-Optimized Gemini Service:**
   ```bash
   # Switch to optimized service in backend/src/workers/feed.worker.ts
   # Change: import { geminiService } from '../services/gemini.service';
   # To: import { geminiService } from '../services/gemini-optimized.service';
   
   # Restart backend
   docker-compose -f docker-compose.dev.yml restart backend
   
   # Check stats
   docker-compose -f docker-compose.dev.yml logs backend | grep "Cache hit"
   ```

2. **Test Database Optimizations:**
   ```bash
   # Check query performance
   docker-compose -f docker-compose.dev.yml exec postgres psql -U user -d icomly -c "
   EXPLAIN ANALYZE SELECT * FROM \"Celebrity\" ORDER BY \"noiseRating\" DESC LIMIT 10;
   "
   ```

---

## 🚢 Preparing for VPS Deployment

### 1. Build Production Images

```bash
# Build production images
docker-compose build

# Test production build locally
docker-compose up
```

### 2. Export Images (Optional)

```bash
# Save images to tar files
docker save icomly-backend:latest | gzip > backend.tar.gz
docker save icomly-frontend:latest | gzip > frontend.tar.gz

# Transfer to VPS
scp backend.tar.gz frontend.tar.gz user@your-vps:/path/to/deploy

# Load on VPS
docker load < backend.tar.gz
docker load < frontend.tar.gz
```

### 3. Environment Variables for Production

```bash
# Create production .env
cp .env .env.production

# Update values:
# - Change JWT_SECRET to strong random value
# - Update DATABASE_URL if using external DB
# - Set NODE_ENV=production
```

### 4. VPS Deployment Checklist

- [ ] Install Docker and Docker Compose on VPS
- [ ] Copy project files to VPS
- [ ] Set up environment variables
- [ ] Configure firewall (ports 80, 443, 3000, 3001)
- [ ] Set up reverse proxy (Nginx/Caddy)
- [ ] Configure SSL certificates (Let's Encrypt)
- [ ] Set up automatic backups
- [ ] Configure monitoring (optional)

---

## 📝 Quick Reference

### Essential Commands

```bash
# Start development
docker-compose -f docker-compose.dev.yml up

# Stop development
docker-compose -f docker-compose.dev.yml down

# Clean restart
docker-compose -f docker-compose.dev.yml down -v && docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Database shell
docker-compose -f docker-compose.dev.yml exec postgres psql -U user -d icomly

# Redis shell
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# Backend shell
docker-compose -f docker-compose.dev.yml exec backend sh
```

### URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api
- Prisma Studio: Run `npx prisma studio` in backend container

---

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `docker-compose -f docker-compose.dev.yml logs`
2. Verify services are running: `docker-compose -f docker-compose.dev.yml ps`
3. Check environment variables: `docker-compose -f docker-compose.dev.yml config`
4. Try clean restart: `docker-compose -f docker-compose.dev.yml down -v && docker-compose -f docker-compose.dev.yml up --build`

---

## ✅ Success Checklist

After setup, verify:

- [ ] All containers are running: `docker-compose -f docker-compose.dev.yml ps`
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:3001/api/feed
- [ ] Database has tables: `docker-compose -f docker-compose.dev.yml exec postgres psql -U user -d icomly -c "\dt"`
- [ ] Redis is working: `docker-compose -f docker-compose.dev.yml exec redis redis-cli ping`
- [ ] Background jobs are running: Check logs for "GlobalFeedGenerator"
- [ ] Hot reload works: Edit a file and see changes

You're all set! 🎉
