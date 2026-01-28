# MakerSet Receipt Hub v2

Production-ready web application and API for managing and selling maker/STEM sets with multi-role workflows.

## Architecture

- **Backend**: Serverless functions (Netlify Functions) with PostgreSQL
- **Frontend**: React + TypeScript + Material-UI
- **Database**: PostgreSQL with migrations and seed data

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Netlify CLI (for local development)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   cd frontend && npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL, JWT_SECRET, etc.
   ```

3. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Seed initial data:**
   ```bash
   npm run db:seed
   ```

5. **Start development servers:**
   ```bash
   # Backend (Netlify Functions)
   npm run dev:backend

   # Frontend (separate terminal)
   npm run dev:frontend
   ```

## Environment Variables

Required:
- `DATABASE_URL` or `NETLIFY_DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `JWT_EXPIRES_IN` - Token expiration (default: "7d")

Optional:
- Email credentials for invoice emails
- Rate limiting configuration

## Default Admin Credentials

After seeding:
- Username: `admin`
- Password: `Admin123!` (change immediately in production)

## Project Structure

```
makerset-receipt-hub-v2/
├── backend/           # Serverless functions
│   ├── functions/     # Netlify functions
│   └── lib/          # Shared utilities
├── frontend/         # React application
├── database/         # Schema and migrations
│   ├── migrations/
│   └── seeds/
└── package.json
```

## API Documentation

All endpoints are under `/api` prefix. See individual function files for details.

## License

MIT
