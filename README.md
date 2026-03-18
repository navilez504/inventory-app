## Inventory Management System

Enterprise-ready institutional inventory management system built with **FastAPI**, **PostgreSQL**, and a **React + Material UI** admin dashboard.

### Project structure

- **backend/**: FastAPI application (modular, service-oriented architecture)
- **frontend/**: React + TypeScript + Vite admin UI
- **alembic/**: Database migrations
- **infrastructure/**: Nginx configuration
- **docker-compose.yml**: Local and on-prem/cloud Docker orchestration

### Backend

- Python 3.11, FastAPI, SQLAlchemy ORM, Pydantic
- JWT authentication with bcrypt password hashing
- Role-based access control (roles, permissions)
- Organizational entities (gerencias, unidades, personas)
- Inventory master data (categorías, marcas, proveedores)
- Assets (`bienes`) with lifecycle (assignments, movements, disposals)
- Warehouses (`bodegas`) and locations (`ubicaciones`) with stock table
- Inventory operations (movimientos, detalle_movimientos)
- Audit module (`auditoria`) using JSONB for old/new data
- Alembic migrations configured in `alembic/env.py`

Run migrations (from project root):

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

### Frontend

- React + TypeScript + Vite
- Material UI dashboard layout
- Authentication context with JWT
- Protected routes with React Router
- Pages:
  - Login, Dashboard
  - Inventory: assets list / create / edit
  - Warehouses & locations
  - Assignments
  - Movements (entries, transfers, adjustments)
  - Reports
  - Audit logs

### Infrastructure & DevOps

- Dockerfiles for backend and frontend
- Nginx reverse proxy in `infrastructure/nginx/nginx.conf`
- Docker Compose services: `postgres`, `backend`, `frontend`, `nginx`
- S3-ready storage service for file uploads

### Local development

1. Copy environment example and adjust as needed:

```bash
cp .env.example .env
```

2. Build and start all services:

```bash
docker compose up --build
```

3. Access services:

- API (behind Nginx): `http://localhost/api`
- Backend direct: `http://localhost:8000`
- Frontend (Docker): `http://localhost` (Nginx) or `http://localhost:5173` — **this UI is the last `docker compose build` of the frontend**, not your latest source files.

### Frontend: why UI changes don’t show (Docker)

The **frontend** container serves a **pre-built** `dist/` folder. Editing React code does **nothing** until you rebuild:

```bash
docker compose build frontend --no-cache && docker compose up -d frontend nginx
```

**Live-reload UI (recommended while developing):**

```bash
docker compose --profile dev-ui up -d
```

Then open **http://localhost:5174** — Vite serves your current `frontend/` source and proxies `/api` to the backend.

**Without Docker (only backend in Docker):**

```bash
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173** (API proxy → `http://127.0.0.1:8000`).

### Reset / clean database

See **[docs/DATABASE_RESET.md](docs/DATABASE_RESET.md)** — wipe schema + migrations, or remove Docker volume.

### Production notes

- Deploy the same Docker images to on-prem servers or AWS EC2.
- Configure environment variables (database URL, JWT secret, S3 credentials) via your platform.
- Place an application load balancer or AWS ALB in front of Nginx, terminate TLS, and forward traffic to port 80.

