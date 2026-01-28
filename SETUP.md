# MakerSet Receipt Hub v2 - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Root dependencies (for database scripts)
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Database Setup

1. **Create PostgreSQL database:**
   ```bash
   createdb makerset_db
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL
   ```

3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Seed initial data:**
   ```bash
   npm run db:seed
   ```

   Default admin credentials:
   - Username: `admin`
   - Password: `Admin123!`

### 3. Start Development Servers

**Backend (Netlify Functions):**
```bash
npm run dev:backend
# Or if you have Netlify CLI installed:
netlify dev
```

**Frontend:**
```bash
npm run dev:frontend
# Or:
cd frontend && npm run dev
```

## Project Structure

```
makerset-receipt-hub-v2/
├── backend/
│   ├── functions/          # Netlify Functions (API endpoints)
│   └── lib/                # Shared utilities
│       ├── db.js          # Database connection
│       ├── auth.js        # JWT authentication
│       ├── errors.js      # Error handling
│       ├── middleware.js  # Auth middleware
│       ├── pagination.js  # Pagination utilities
│       └── logger.js      # Structured logging
├── frontend/
│   ├── src/
│   │   ├── contexts/      # React contexts (AuthContext)
│   │   ├── components/   # Reusable components
│   │   ├── pages/         # Page components
│   │   └── lib/          # Utilities (API client)
│   └── package.json
├── database/
│   ├── migrations/        # SQL migration files
│   └── seeds/            # Seed data
└── netlify.toml          # Netlify configuration
```

## API Endpoints

All endpoints are under `/api` prefix:

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Settings
- `GET /api/settings` - Get all settings (admin)
- `GET /api/settings/:key` - Get single setting
- `PUT /api/settings/:key` - Update setting (admin)

### Catalog
- `GET /api/parts` - List parts
- `POST /api/parts` - Create part (admin)
- `GET /api/parts/:id` - Get part
- `PUT /api/parts/:id` - Update part (admin)
- `DELETE /api/parts/:id` - Delete part (admin)

Similar endpoints for `tools`, `sets`, `set-parts`

### Provider Sets
- `GET /api/provider-sets` - List provider sets
- `POST /api/provider-sets` - Create provider set (provider/admin)
- `GET /api/provider-sets/:id` - Get provider set
- `PUT /api/provider-sets/:id` - Update provider set

### Shop & Orders
- `GET /api/shop-sets` - Public shop listing
- `GET /api/orders` - List orders (role-filtered)
- `POST /api/orders` - Create order (checkout)
- `GET /api/orders/:id` - Get order with items
- `PUT /api/orders/:id` - Update order status

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

### Health
- `GET /api/health` - Health check

## Environment Variables

Required:
- `DATABASE_URL` or `NETLIFY_DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_EXPIRES_IN` - Token expiration (default: "7d")

Optional:
- `NODE_ENV` - Environment (development/production)
- `REACT_APP_API_URL` or `VITE_API_URL` - Frontend API URL override

## Features Implemented

✅ **Backend:**
- PostgreSQL schema with all required tables
- JWT authentication with role-based access control
- All core API endpoints (auth, catalog, provider-sets, orders, settings)
- Error handling with JSON envelope responses
- Structured logging with requestId
- Database connection pooling
- Pagination support
- Transaction support for orders

✅ **Frontend:**
- React + TypeScript + Material-UI
- React Router with role-based route protection
- AuthContext for authentication state
- Centralized API client with axios
- Error boundary and health banner
- Basic pages (login, register, shop, dashboard, orders)

## Next Steps (Optional Modules)

- [ ] Ratings endpoints and UI
- [ ] Invoice generation and email
- [ ] Monthly reports
- [ ] Production dashboard
- [ ] Set builder UI
- [ ] Provider management UI
- [ ] System settings UI
- [ ] User management UI
- [ ] Rate limiting
- [ ] Caching improvements
- [ ] Tests

## Deployment

### Netlify

1. Connect repository to Netlify
2. Set environment variables in Netlify dashboard
3. Configure build command: `cd frontend && npm run build`
4. Set publish directory: `frontend/dist`
5. Functions will be automatically deployed from `backend/functions`

### Database

Use a managed PostgreSQL service (e.g., Supabase, Neon, AWS RDS) and set `DATABASE_URL` in Netlify environment variables.

## Security Notes

- Change `JWT_SECRET` in production
- Change default admin password immediately
- Use HTTPS in production
- Consider adding rate limiting
- Review SQL injection protection (using parameterized queries)
- Consider adding CORS configuration if needed
