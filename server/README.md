# ORCA API

Backend da plataforma ORCA - Inteligência Comercial B2B.

## Stack

- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Auth**: JWT + Refresh Tokens
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### 1. Dependencies

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Server runs on `http://localhost:3333`.

## Docker

```bash
docker-compose up -d
```

This starts PostgreSQL and the API with auto-migration.

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account + organization
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get profile

### Leads
- `GET /api/leads` - List leads (paginated, filtered)
- `GET /api/leads/:id` - Get lead by ID
- `POST /api/leads` - Create lead
- `POST /api/leads/bulk` - Bulk import leads
- `PATCH /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `DELETE /api/leads/bulk` - Bulk delete leads
- `PATCH /api/leads/:id/pipeline` - Move lead in pipeline

### Dashboard
- `GET /api/leads/dashboard` - Get dashboard metrics

## Demo Credentials

After seeding:
- **Email**: demo@etos.pt
- **Password**: Orca1234!

## Project Structure

```
server/
├── src/
│   ├── config/       # Database, env, JWT config
│   ├── controllers/  # Request handlers
│   ├── middleware/   # Auth, validation, error handling
│   ├── routes/       # Express routers
│   ├── services/     # Business logic
│   ├── types/        # Zod schemas + TypeScript types
│   ├── utils/        # Crypto, JWT helpers
│   └── index.ts      # App entry point
├── prisma/
│   ├── schema.prisma # Database schema
│   └── seed.ts       # Demo data
├── Dockerfile
├── docker-compose.yml
└── package.json
```
