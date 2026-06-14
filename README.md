<p align="center">
  <img src="https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/LiteLLM-10B981?style=for-the-badge&logo=openai&logoColor=white" />
</p>

<h1 align="center">RullRouter Console</h1>

<p align="center">
  A modern, self-hosted API gateway console for managing LLM routing, API keys, usage budgets, and team access control.
</p>

<p align="center">
  <a href="https://console.rullprojects.dev">Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Features

- **Dashboard** — Real-time usage chart with daily spend, requests, and token metrics (powered by Recharts)
- **API Key Management** — Create, delete, and set monthly USD budgets per key with visual progress bars
- **Model Registry** — View all available LLM models grouped by provider with live online/offline status
- **User Management & RBAC** — Role-based access control (Admin, Editor, User, Viewer) with avatar profiles
- **Multi-Provider Routing** — Route requests across multiple LLM providers with automatic failover via LiteLLM
- **OpenAI-Compatible API** — Drop-in replacement endpoint for any OpenAI SDK or extension (Kilo Code, Continue, etc.)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Nginx (SSL)                      │
├──────────────────────┬──────────────────────────────┤
│  console.rullprojects.dev  │  router.rullprojects.dev    │
│  (Dashboard Panel)         │  (LLM API Endpoint)         │
└───────────┬────────────────┴──────────┬─────────────┘
            │                           │
    ┌───────▼───────┐          ┌────────▼────────┐
    │ Router Panel  │          │    LiteLLM      │
    │  (Go :20130)  │          │   (:20128)      │
    └───────┬───────┘          └────────┬────────┘
            │                           │
            └───────────┬───────────────┘
                        │
               ┌────────▼────────┐
               │   PostgreSQL    │
               │    (:5432)      │
               └─────────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
   ┌──────▼──┐   ┌─────▼────┐  ┌────▼─────┐
   │Claudefire│   │  Sumopod  │  │  Others  │
   │(Anthropic)│  │(Multi-LLM)│  │          │
   └──────────┘   └──────────┘  └──────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Recharts, Lucide Icons |
| Backend | Go (Chi router), JWT Auth, bcrypt |
| Database | PostgreSQL 16 |
| LLM Gateway | LiteLLM (proxy mode) |
| Proxy | Nginx with Let's Encrypt SSL |
| Process Manager | PM2 |
| Font | Plus Jakarta Sans |

## Getting Started

### Prerequisites

- Go 1.21+
- Node.js 18+
- PostgreSQL 16
- LiteLLM (`pip install litellm[proxy]`)

### Setup

```bash
# Clone
git clone https://github.com/syahrullrmdhn/rullprojects.dev.git
cd rullprojects.dev

# Backend
cd backend
cp .env.example .env  # configure DATABASE_URL, LITELLM_MASTER_KEY, JWT_SECRET
go build -o router-panel .

# Frontend
cd ../frontend
npm install
npm run build

# Run
cd ..
./start.sh
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://n8n@127.0.0.1:5432/litellm?sslmode=disable` |
| `LITELLM_MASTER_KEY` | LiteLLM admin key | — |
| `JWT_SECRET` | Secret for JWT token signing | `router-panel-jwt-2026` |
| `LITELLM_URL` | LiteLLM internal URL | `http://127.0.0.1:20128` |
| `PORT` | Backend server port | `20130` |

## API Usage

The router exposes an OpenAI-compatible API:

```bash
curl https://router.rullprojects.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claudefire/claude-opus-4.8",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

Works with any OpenAI SDK, Kilo Code, Continue, Cursor, and other AI coding tools.

## Deployment

### With PM2

```bash
# Start LiteLLM
pm2 start "litellm --config config.yaml --port 20128" --name litellm

# Start backend + frontend
pm2 start start.sh --name router-panel

# Save for auto-restart
pm2 save
```

### Nginx Config

```nginx
server {
    server_name console.rullprojects.dev;

    location /v1 {
        proxy_pass http://127.0.0.1:20128;
        proxy_read_timeout 600s;
    }

    location /api {
        proxy_pass http://127.0.0.1:20130;
    }

    location / {
        proxy_pass http://127.0.0.1:20130;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/console.rullprojects.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/console.rullprojects.dev/privkey.pem;
}
```

## Screenshots

> Dashboard with real-time usage chart, API key table with budget bars, model registry with provider grouping, and user management with RBAC.

## License

MIT © [Syahrul Ramadhan](https://syahrulramadhan.id)
