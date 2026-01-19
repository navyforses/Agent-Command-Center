# Trial Navigator - Deployment Guide

## Quick Start Options

### Option 1: Replit (Easiest - Already Configured!)
### Option 2: Railway
### Option 3: Render
### Option 4: Docker Compose (Self-hosted)
### Option 5: Vercel + Railway

---

## Option 1: Replit (Recommended)

პროექტი უკვე კონფიგურირებულია Replit-ისთვის!

### ნაბიჯი 1: Secrets-ის დამატება

Replit-ის მარცხენა პანელში დააჭირეთ **Secrets** (🔒) და დაამატეთ:

```
DATABASE_URL = postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL = https://[PROJECT].supabase.co
SUPABASE_KEY = your-anon-key
OPENAI_API_KEY = sk-...
RESEND_API_KEY = re_...
STRIPE_SECRET_KEY = sk_...
STRIPE_WEBHOOK_SECRET = whsec_...
SECRET_KEY = your-random-secret-key
```

### ნაბიჯი 2: მონაცემთა ბაზის შექმნა

1. შედით [Supabase](https://supabase.com)-ში
2. შექმენით ახალი პროექტი
3. გადადით **SQL Editor**-ში
4. ჩასვით `backend/schema.sql`-ის შიგთავსი
5. დააჭირეთ **Run**

### ნაბიჯი 3: გაშვება

დააჭირეთ **Run** ღილაკს ან Shell-ში:

```bash
# Backend-ის გაშვება
cd backend && pip install -r requirements.txt && python main.py

# ახალ ტერმინალში - Frontend-ის გაშვება
npm run dev
```

### ნაბიჯი 4: Deployment

1. დააჭირეთ **Deploy** ღილაკს (მარჯვენა ზედა კუთხე)
2. აირჩიეთ **Reserved VM** ან **Autoscale**
3. დაადასტურეთ deployment

### Replit URLs

- **Frontend**: `https://your-repl-name.repl.co`
- **Backend API**: `https://your-repl-name.repl.co:8000`
- **API Docs**: `https://your-repl-name.repl.co:8000/docs`

### Stripe Webhook (Replit)

1. Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-repl-name.repl.co:8000/api/payments/webhook`
3. აირჩიეთ events

---

## Prerequisites

Before deploying, you need:

1. **Supabase Account** - [supabase.com](https://supabase.com)
   - Create a new project
   - Run `backend/schema.sql` in SQL Editor
   - Copy URL and anon key

2. **OpenAI API Key** - [platform.openai.com](https://platform.openai.com)
   - For GPT-4o translation

3. **Stripe Account** - [stripe.com](https://stripe.com)
   - Create products and prices
   - Get API keys

4. **Resend Account** - [resend.com](https://resend.com)
   - Verify your domain
   - Get API key

---

## Option 1: Railway (Recommended)

Railway provides the easiest deployment with automatic builds.

### Step 1: Deploy Backend

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Link to backend
cd backend
railway link

# Add environment variables
railway variables set DATABASE_URL="your-supabase-connection-string"
railway variables set SUPABASE_URL="https://xxx.supabase.co"
railway variables set SUPABASE_KEY="your-anon-key"
railway variables set OPENAI_API_KEY="sk-..."
railway variables set RESEND_API_KEY="re_..."
railway variables set STRIPE_SECRET_KEY="sk_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."
railway variables set APP_URL="https://your-app.railway.app"
railway variables set SECRET_KEY="your-random-secret-key"

# Deploy
railway up
```

### Step 2: Deploy Frontend

```bash
cd ../client
railway link

# Set environment variables
railway variables set VITE_API_URL="https://your-backend.railway.app"
railway variables set VITE_STRIPE_PUBLIC_KEY="pk_..."

# Deploy
railway up
```

### Step 3: Configure Stripe Webhook

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-backend.railway.app/api/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

---

## Option 2: Render

### Backend (Web Service)

1. Create new Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (same as Railway)

### Frontend (Static Site)

1. Create new Static Site
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variables

---

## Option 3: Docker Compose (Self-hosted)

For VPS or dedicated server deployment.

### Step 1: Clone and Configure

```bash
git clone https://github.com/your-repo/trial-navigator.git
cd trial-navigator

# Create environment file
cp backend/.env.example .env
nano .env  # Edit with your values
```

### Step 2: Deploy with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 3: Setup SSL (Production)

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

---

## Option 4: Vercel (Frontend) + Railway (Backend)

Best for maximum frontend performance.

### Backend on Railway
Follow Option 1 backend steps.

### Frontend on Vercel

```bash
cd client

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# VITE_API_URL=https://your-backend.railway.app
# VITE_STRIPE_PUBLIC_KEY=pk_...
```

---

## Environment Variables Reference

### Backend (.env)

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_KEY=eyJ...

# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional fallback

# Email
RESEND_API_KEY=re_...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
APP_URL=https://yourdomain.com
SECRET_KEY=your-random-64-char-secret
DEBUG=false
```

### Frontend

```env
VITE_API_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

---

## Database Setup

After setting up Supabase:

```sql
-- Run in Supabase SQL Editor
-- Copy contents of backend/schema.sql

-- Then run seed data (optional)
-- Copy contents of backend/scripts/seed_database.py
```

---

## Stripe Configuration

### Products to Create

1. **Premium Subscription** - $5/month
   - Price ID: `price_premium_monthly`
   - Yearly: `price_premium_yearly` - $48/year

2. **Premium+ Subscription** - $10/month
   - Price ID: `price_premium_plus_monthly`
   - Yearly: `price_premium_plus_yearly` - $96/year

3. **Deep Search Basic** - $50 one-time
   - Price ID: `price_deep_search_basic`

4. **Deep Search Comprehensive** - $100 one-time
   - Price ID: `price_deep_search_comprehensive`

5. **Deep Search Premium** - $150 one-time
   - Price ID: `price_deep_search_premium`

### Update Price IDs

After creating products in Stripe, update `backend/services/stripe_service.py`:

```python
PRICES = {
    "premium_monthly": "price_xxx",  # Your actual price ID
    "premium_yearly": "price_xxx",
    # ... etc
}
```

---

## Post-Deployment Checklist

- [ ] Database schema applied
- [ ] Environment variables set
- [ ] Stripe webhook configured
- [ ] Test email sending
- [ ] Test payment flow
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Health checks passing

---

## Monitoring

### Health Endpoints

- Backend: `GET /health`
- Frontend: `GET /health`

### Logs

```bash
# Railway
railway logs

# Docker
docker-compose logs -f backend

# Render
# Check dashboard
```

---

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` format
- Ensure IP is whitelisted in Supabase

### Email Not Sending
- Verify domain in Resend
- Check `RESEND_API_KEY`

### Payments Failing
- Verify Stripe keys match environment (test vs live)
- Check webhook endpoint URL
- Verify webhook secret

### CORS Errors
- Update `allow_origins` in `backend/main.py`
- Ensure `VITE_API_URL` is correct

---

## Support

- GitHub Issues: [github.com/your-repo/issues](https://github.com/your-repo/issues)
- Email: support@trialnavigator.com
