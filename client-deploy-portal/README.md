# ClientDeploy Portal

A secure, multi-tenant SaaS deployment portal that sits in front of Coolify. It provides a client-facing abstraction layer so customers can deploy their applications, view sanitized logs, and monitor status without ever accessing the underlying Coolify instance or VPS directly.

## 🏗️ Architecture & Stack

- **Backend:** Laravel 12 (API + Filament Admin + Queues)
- **Frontend:** Next.js 15 (React, Tailwind CSS, Zustand, Framer Motion)
- **Database:** PostgreSQL 16
- **Cache & Queues:** Redis 7
- **Web Server:** Nginx (Reverse Proxy with strict rate limiting & SSL)
- **Integration:** Coolify REST API + Webhooks
- **Infrastructure:** Fully containerized via Docker Compose

## 🔒 Security & Isolation Features (Hardened)

1.  **Triple-Layer Log Sanitization:** Prevents leakage of API keys, DB passwords, SSH keys, internal IPs, and .env files using Regex, Deny-lists, and a safe-line allowlist. Added a "Summary Only" mode for maximum safety.
2.  **Deployment Guard (Abuse Prevention):** Enforces rate limits (hourly per project), concurrent deployment limits (per client), and daily limits based on subscription plans. Includes a 30-second cooldown between consecutive deploy attempts.
3.  **Webhook Trust Middleware:** Verifies incoming Coolify webhooks using a 3-layer approach: IP CIDR allowlist, Shared Secret Token, and HMAC Signature verification.
4.  **Multi-Tenancy:** Strict tenant isolation at the database level. Each client only sees their associated projects, domains, and deployments.
5.  **Robust Backup Strategy:** Automated daily/weekly PostgreSQL backups with retention policies and a safe restore command (`php artisan backup:restore`).
6.  **Comprehensive Monitoring:** Deep health check endpoint (`/api/health/deep`) monitoring DB latency, Redis status, Queue size, Coolify API connectivity, disk space, and backup freshness.

## 🚀 Deployment Guide (Production)

### 1. Server Prerequisites
Ensure your Ubuntu server (e.g., Contabo VPS) has Docker and Docker Compose installed:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose-v2 -y
```

### 2. Initial Setup
Clone the repository and prepare the environment:
```bash
git clone <repository-url> client-deploy-portal
cd client-deploy-portal
cp backend/.env.example backend/.env
```

### 3. Configure Environment Variables
Edit `backend/.env` with your secure credentials. **CRITICAL:** Set the Coolify connection details:
```env
APP_URL=https://portal.yourdomain.com
FRONTEND_URL=https://portal.yourdomain.com

DB_PASSWORD=your_secure_db_password
REDIS_PASSWORD=your_secure_redis_password
ENV_ENCRYPTION_KEY=generate_a_secure_base64_key

COOLIFY_BASE_URL=https://coolify.yourdomain.com
COOLIFY_API_TOKEN=your_coolify_api_token
COOLIFY_WEBHOOK_SECRET=your_secure_webhook_secret
COOLIFY_WEBHOOK_ALLOWED_IPS=123.45.67.89 # Your Coolify Server IP
```

### 4. Build and Start the Stack
Bring up the Docker containers:
```bash
docker compose up -d --build
```

### 5. Initialize the Database
Run migrations, seed the initial data (Plans, Admin, Demo Client), and generate the app key:
```bash
docker exec -it clientdeploy-app php artisan key:generate
docker exec -it clientdeploy-app php artisan migrate --seed
```

### 6. SSL Configuration (Let's Encrypt)
*Note: Ensure your DNS A record points to the VPS IP.*
Configure SSL certificates for Nginx. A standard approach is using Certbot:
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d portal.yourdomain.com
```
Then update the `docker-compose.yml` volumes for Nginx to point to your Let's Encrypt certificates (typically `/etc/letsencrypt/live/portal.yourdomain.com/fullchain.pem`).

### 7. Coolify Configuration
In your Coolify dashboard:
1.  Generate a new API Token and add it to `COOLIFY_API_TOKEN` in your `.env`.
2.  Set up a webhook pointing to `https://portal.yourdomain.com/api/webhooks/coolify` and configure the secret to match `COOLIFY_WEBHOOK_SECRET`.

## 🛠️ Advanced Features (Phase 2 Roadmap)

-   **Coolify Auto-Provisioning:** Automate the creation of Coolify Projects and Applications directly from the Laravel backend via API upon client onboarding.
-   **Billing Integration:** Integrate Stripe/Paymob to create a fully automated "Deploy-as-a-Service" product.
-   **Resource Isolation:** Automate the assignment of separate Docker networks and DB users per Coolify project for hard server-level isolation.
