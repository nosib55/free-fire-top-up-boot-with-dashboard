# Production Deployment Guide: Commercial Game Top-Up B2B SaaS Platform

Follow this production readiness guide to deploy the platform on a live Ubuntu/Linux VPS, Cloudflare/Nginx reverse proxy, MongoDB Atlas, and Managed Redis instance.

---

## 1. Environment Variables Configuration (`.env.production`)

Create a `.env.production` file in your root folder:

```env
# Server Config
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database (MongoDB Atlas Cluster)
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@cluster.mongodb.net/ff_topup_saas?retryWrites=true&w=majority

# Redis (Upstash / Redis Cloud / Self-hosted Redis)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

# Authentication & Security
JWT_SECRET=super_secret_jwt_key_9x8y7z6a5b4c
COOKIE_DOMAIN=.yourdomain.com

# Telegram Bot Integration
TELEGRAM_BOT_TOKEN=7890123456:AAxxxxxx_your_telegram_bot_token
TELEGRAM_ADMIN_CHAT_ID=-100123456789

# Automation Credentials & Proxy Config
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
UNIPIN_WORKER_EMAIL=worker@yourdomain.com
UNIPIN_WORKER_PASSWORD=your_unipin_password
RESIDENTIAL_PROXY_URL=http://username:password@proxy.provider.com:8080
```

---

## 2. Linux VPS Server Dependencies (Ubuntu 22.04 LTS)

Install Node.js 20+, PM2, Nginx, Redis, and Chromium dependencies for Puppeteer Stealth:

```bash
# Update System Packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx redis-server

# Install Chromium & Puppeteer System Dependencies
sudo apt install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  stdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  chromium-browser
```

---

## 3. PM2 Process Manager & Separate Queue Worker Process

Install PM2 globally and build the Next.js app:

```bash
sudo npm install -g pm2

# Build Production Bundle
npm run build

# Start Next.js Web Server & Dedicated Queue Worker with PM2
pm2 start npm --name "ff-topup-web" -- start
pm2 start lib/queue/topupQueue.ts --name "ff-topup-worker" --interpreter ./node_modules/.bin/ts-node

# Save PM2 Process List & Enable Auto-Start on System Reboot
pm2 save
pm2 startup
```

---

## 4. Nginx Reverse Proxy & SSL Setup (Certbot Let's Encrypt)

Create `/etc/nginx/sites-available/topup-saas`:

```nginx
server {
    server_name yourdomain.com api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site & obtain SSL Certificate:

```bash
sudo ln -s /etc/nginx/sites-available/topup-saas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Free SSL Certificate via Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

---

## 5. Security & Commercial Readiness Checklist

- [x] **MongoDB Atlas Security:** Whitelist VPS IP address and restrict access with strong database credentials.
- [x] **Redis Password Protection:** Enable `requirepass` in `/etc/redis/redis.conf`.
- [x] **Residential Proxy Manager:** Ensure `RESIDENTIAL_PROXY_URL` is set in `.env` so Puppeteer Stealth browser instances rotate IPs to prevent Garena / UniPin Cloudflare 403 blocks.
- [x] **PM2 Memory Limit:** Auto-restart workers if RAM exceeds 1GB (`pm2 start ... --max-memory-restart 1G`).
- [x] **Database Automated Backups:** Enable daily MongoDB Atlas automated backups.
