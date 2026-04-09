# ORCA — Inteligência Comercial B2B

Plataforma de inteligência comercial B2B para captação, qualificação e gestão de leads com IA.

---

## Novidades nesta versão

### 🔐 Backend Completo (Node.js + PostgreSQL)
- **API REST** com Express.js e TypeScript
- **Autenticação JWT** com access + refresh tokens
- **Multi-tenancy** — cada organização tem dados isolados
- **PostgreSQL** com Prisma ORM
- **Rate limiting**, CORS, Helmet, validação Zod
- **Docker** + Docker Compose para dev local
- **Seed** com dados demo automáticos

### 🛡️ Segurança
- Senhas com bcrypt (12 rounds)
- Tokens JWT com expiração configurável
- Refresh tokens rotativos
- Validação de input com Zod em todos os endpoints
- Helmet para headers de segurança

### 📊 API Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Criar conta + organização |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Renovar token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Perfil do usuário |
| GET | `/api/leads` | Listar leads (paginado, filtrado) |
| GET | `/api/leads/:id` | Lead por ID |
| POST | `/api/leads` | Criar lead |
| POST | `/api/leads/bulk` | Importação em massa |
| PATCH | `/api/leads/:id` | Atualizar lead |
| DELETE | `/api/leads/:id` | Apagar lead |
| PATCH | `/api/leads/:id/pipeline` | Mover no pipeline |
| GET | `/api/leads/dashboard` | Métricas do dashboard |

### 🎨 Frontend — Melhorias UX
- **Error Boundary** — tratamento visual de erros inesperados
- **Skeleton Loading** — animações de carregamento em tabelas e cards
- **Empty States** — mensagens com CTA quando não há dados
- **Onboarding Wizard** — tour guiado de 6 passos para novos usuários
- **Google Analytics 4** — tracking de páginas e eventos
- **Fallback local** — funciona sem backend (modo offline com IndexedDB)
- **Logo clicável** na página de login → volta para a home

### 🔄 Arquitetura Híbrida
- **Com backend**: dados no PostgreSQL, auth JWT, multi-tenancy
- **Sem backend**: fallback automático para IndexedDB + localStorage
- Migração transparente — os dados locais persistem mesmo sem servidor

---

## Quick Start

### Pré-requisitos
- **Docker** + **Docker Compose**
- **Node.js 22+**
- **npm**

### 1. Backend — Banco de Dados + API

```bash
# Entrar na pasta do servidor
cd server

# Subir PostgreSQL
docker-compose up -d postgres

# Instalar dependências
npm install

# Gerar cliente Prisma
npm run db:generate

# Rodar migrações (cria tabelas)
npm run db:migrate

# Seed com dados demo
npm run db:seed

# Iniciar API em modo dev (porta 3333)
npm run dev
```

> **Credenciais demo:** `demo@etos.pt` / `Orca1234!`

### 2. Frontend — Aplicação Web

```bash
# Novo terminal, na raiz do projeto
npm install

# Iniciar dev server (porta 5173)
npm run dev
```

Acesse: **http://localhost:5173**

### 3. Tudo com Docker (alternativa)

```bash
cd server

# Sobe PostgreSQL + API juntos (com auto-migrate)
docker-compose up -d
```

---

## Comandos Úteis

```bash
# Backend
cd server
npm run dev          # Dev server com hot reload
npm run build        # Build produção
npm run start        # Rodar build
npm run db:generate  # Gerar Prisma Client
npm run db:migrate   # Criar/atualizar tabelas
npm run db:seed      # Dados demo
npm run db:studio    # UI para ver/editar dados
npm run db:reset     # Reset total do banco

# Frontend
npm run dev          # Dev server
npm run build        # Build produção
npm run preview      # Preview do build
```

---

## Estrutura do Projeto

```
orcleans/
├── server/                    # Backend API
│   ├── src/
│   │   ├── config/           # Env, database, JWT config
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth, validation, errors
│   │   ├── routes/           # Express routers
│   │   ├── services/         # Business logic
│   │   ├── types/            # Zod schemas + types
│   │   ├── utils/            # Crypto, JWT helpers
│   │   └── index.ts          # Entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Demo data
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── src/                       # Frontend (React + Vite)
│   ├── components/           # UI components
│   │   ├── ErrorBoundary.tsx # Error handling + Skeleton + Empty states
│   │   ├── Onboarding.tsx    # Wizard de introdução
│   │   └── ui/               # CSS components
│   ├── services/
│   │   ├── api.ts            # API client com auto-refresh
│   │   ├── auth.tsx          # Auth context (JWT + fallback local)
│   │   ├── leads.ts          # Lead API service
│   │   └── analytics.ts      # GA4 tracking
│   ├── pages/                # Route pages
│   ├── store.tsx             # State management (híbrido)
│   └── App.tsx               # Router + providers
├── index.html
├── vite.config.ts
└── package.json
```

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| **Backend** | Node.js 22, Express, TypeScript, Prisma |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT + Refresh Tokens, bcrypt |
| **Frontend** | React 19, Vite 8, TypeScript, React Router |
| **UI** | CSS custom, Lucide Icons, Leaflet (mapas) |
| **Infra** | Docker, Docker Compose |
| **Analytics** | Google Analytics 4 |
| **Validation** | Zod |

---

## Segurança

- Senhas hash com bcrypt (12 rounds)
- JWT com expiração curta (15min) + refresh tokens (7 dias)
- Rate limiting (100 req/15min)
- Helmet para headers de segurança
- CORS configurável
- Validação Zod em todos os inputs
- Sem source maps em produção
