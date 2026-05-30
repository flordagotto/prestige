# Prestige Rewards — Backend

Plataforma B2B2C de puntos ("goldies") para empleados. Backend con **Medusa 2**.

**Documentación detallada:** [`docs/CONTEXT.md`](docs/CONTEXT.md)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Medusa 2.13 |
| Lenguaje | TypeScript |
| Runtime | Node.js 20+ |
| DB | PostgreSQL 15 (Docker) |
| Pagos | Stripe (WIP — rama del equipo) |
| Emails | SendGrid (futuro) |

**Desarrollo:** Windows + WSL2 (Ubuntu). Todos los comandos desde WSL, nunca PowerShell.

---

## Roles

| Rol | Actor Medusa | Login |
|-----|--------------|-------|
| Admin | `user` | `POST /auth/user/emailpass` |
| Agent | `customer` | `POST /auth/customer/emailpass` |
| Employee | `customer` | `POST /auth/customer/emailpass` |

Agent y employee son **customers** de Medusa. La autorización de rol se valida en las tablas custom `agent` / `employee` por `customer_id`.

---

## Módulos custom

### `company-module`
`Company`, `Agent`, `Employee`

### `goldie-module`
`GoldieTransaction`, `GoldieOrder` (canje — WIP)

### Categorías
No hay tablas custom. Se usa **ProductCategory** de Medusa linkeada a **Company** via module link:

```
src/links/product-category-company.ts
```

Después de cambiar links: `npx medusa db:migrate`

---

## Estado de implementación

### Hecho
- Middleware auth por rol (`requireAgent`, `requireEmployee`)
- Workflows: `accept-invite`, `assign-goldies` (con rollback)
- CRUD empresas, categorías (ProductCategory), asignación goldies
- Invitaciones agent/employee via Medusa `invite`
- Rutas admin, agent y employee (perfil, transacciones, orders)
- Unit tests de assign-goldies

### Pendiente
| Item | Owner |
|------|-------|
| Extensión de producto (`goldie_price`, `is_available`) | Compañero |
| Workflow redeem + Stripe webhook | Compañero |
| Campos delivery en GoldieOrder | Compañero |
| `GET /employee/products` (filtro por categorías) | Bloqueado en producto |
| Admin redemptions | — |
| Emails (SendGrid) | Futuro |
| Integration tests | — |

---

## API (resumen)

Ver listado completo en [`docs/CONTEXT.md`](docs/CONTEXT.md).

### Públicos
```
POST /auth/user/emailpass
POST /auth/customer/emailpass
POST /auth/invite
```

### Admin
```
GET/POST       /admin/categories
DELETE         /admin/categories/:id
GET/POST       /admin/companies
GET            /admin/companies/:id
PATCH          /admin/companies/:id          { active: bool }
POST           /admin/companies/:id/assign-goldies
GET/PUT        /admin/companies/:id/categories
POST           /admin/companies/:id/agents
POST           /admin/companies/:id/employees   → 403
GET            /admin/transactions
```

### Agent
```
GET            /agent/company
GET/POST       /agent/employees
GET/PATCH/DELETE /agent/employees/:id
POST           /agent/employees/:id/assign-goldies
GET            /agent/transactions
```

### Employee
```
GET/PUT        /employee/me
PUT            /employee/me/password
GET            /employee/transactions
GET            /employee/orders
```

---

## Setup local

```bash
# PostgreSQL (primera vez)
docker run --name prestige-rewards-db \
  -e POSTGRES_PASSWORD=prestige123 \
  -e POSTGRES_DB=prestigerewards \
  -p 5432:5432 -d postgres:15

docker start prestige-rewards-db
cd ~/prestige-rewards-backend
npm install
npx medusa db:migrate
npm run dev
# → http://localhost:9000
# → admin: http://localhost:9000/app
```

### Tests
```bash
npm run test:unit
```

### Variables de entorno
Copiar `.env.template` → `.env`. Mínimo:
```env
DATABASE_URL=postgres://postgres:prestige123@localhost:5432/prestigerewards
JWT_SECRET=...
COOKIE_SECRET=...
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:3000,http://localhost:9000
```

---

## Estructura relevante

```
src/
├── modules/
│   ├── company/          Company, Agent, Employee
│   └── goldie/           GoldieTransaction, GoldieOrder
├── links/
│   └── product-category-company.ts
├── api/
│   ├── middlewares.ts
│   ├── admin/
│   ├── agent/
│   ├── employee/
│   └── auth/invite/
├── workflows/
│   ├── accept-invite.ts
│   └── assign-goldies.ts
└── __tests__/
docs/
└── CONTEXT.md            ← fuente de verdad para el agente
```

---

## Decisiones de diseño (resumen)

- Invitaciones Medusa con metadata firmada — el rol no lo elige el usuario.
- Solo agents crean employees.
- Goldies enteros, no fracciones.
- Exclusión de catálogo por categorías linkeadas a la empresa del employee.
- Rol verificado en DB cada request (desactivación inmediata).
- `phone` del employee vive en Medusa Customer, no en tabla `employee`.

---

*Última actualización: Mayo 2026*
