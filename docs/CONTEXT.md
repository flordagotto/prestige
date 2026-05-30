# Prestige Rewards — Context Document

> Fuente de verdad para desarrollo con Cursor/Claude. Actualizar cuando cambie el código.

---

## What is this project?

**Prestige Rewards** is a B2B2C platform that allows companies to pay part of their employees' salary in points ("goldies"). Employees accumulate points and redeem them for products in a catalog.

**Tech stack:** Medusa 2 · Node.js · TypeScript · PostgreSQL · Stripe (WIP, teammate branch) · SendGrid (future)  
**OS:** Windows + WSL2 (Ubuntu). All commands run from WSL2, never PowerShell.  
**Project path in WSL:** `~/prestige-rewards-backend`  
**DB:** PostgreSQL via Docker, container name `prestige-rewards-db`, DB name `prestigerewards`

---

## Roles & Medusa actor types

| Code role | UI name | Medusa actor type | Login |
|-----------|---------|-------------------|-------|
| `admin` | Admin | `user` | `POST /auth/user/emailpass` |
| `agent` | Agent | `customer` | `POST /auth/customer/emailpass` |
| `employee` | Employee | `customer` | `POST /auth/customer/emailpass` |

Agents and employees are **Medusa customers** (`customer` table). Only admins are Medusa **users** (`user` table).

Role authorization (`agent` vs `employee`) is verified in our custom `agent` / `employee` tables via `customer_id = auth_context.actor_id`.

---

## Database — Custom Tables

### `company`
```
id, name, tax_id, contact_email, status (active|inactive), goldie_balance (int), created_at, updated_at, deleted_at
```

### `agent`
```
id, customer_id (FK → Medusa customer.id), company_id (FK), status (active|inactive), created_at, updated_at, deleted_at
```
No goldie_balance. Agents manage points but don't receive them.

### `employee`
```
id, customer_id (FK → Medusa customer.id), company_id (FK), goldie_balance (int), status (active|inactive), department (nullable), role (nullable), created_at, updated_at, deleted_at
```
- `role` = job title within the company (e.g. "Developer"), NOT the system role.
- `phone` lives on Medusa **Customer**, not on this table. Updated via `PUT /employee/me`.

### `goldie_transaction`
```
id, type (earned|spent|topup|adjustment), company_id, employee_id (nullable), amount (int), reference_type, reference_id, performed_by, created_at, updated_at, deleted_at
```

### `goldie_order` (WIP — teammate)
Custom redemption record linked to Medusa order. Delivery fields pending in model.

### Categories ↔ Company (module link, NOT custom tables)

We use Medusa **ProductCategory** linked to **Company** via module link:

- Link file: `src/links/product-category-company.ts`
- Sync to DB: `npx medusa db:migrate`
- Set categories for a company: `PUT /admin/companies/:id/categories { category_ids: [...] }`
- Exclusion logic for employee catalog: products whose category is linked to the employee's company are hidden.

Old custom tables `category` and `category_x_company` were removed by migration.

### Medusa tables we use/extend

- **`customer`** — agents and employees (`first_name`, `last_name`, `email`, `phone`, `company_name`)
- **`auth_identity`** — `app_metadata: { customer_id }`
- **`provider_identity`** — `entity_id` (email), password hash
- **`invite`** — onboarding. `metadata`: `{ company_id, role, first_name, last_name, employee_role?, employee_department? }`
- **`product`** — extension pending (teammate): `goldie_price`, `is_available`
- **`user`** — admin only

---

## Modules

### `company-module` (`src/modules/company/`)
Models: `Company`, `Agent`, `Employee`  
Service: `CompanyModuleService` — auto-generated CRUD via `MedusaService`

### `goldie-module` (`src/modules/goldie/`)
Models: `GoldieTransaction`, `GoldieOrder`  
Service: `GoldieModuleService`

---

## Workflows

### `assignGoldiesToCompanyWorkflow` / `assignGoldiesToEmployeeWorkflow`
See `src/workflows/assign-goldies.ts`. Transaction types: `topup` (company), `adjustment` (employee assignment).

### `acceptInviteWorkflow`
7 steps with full rollback. On employee invite, persists `employee_role` → `employee.role` and `employee_department` → `employee.department`.

### `redeem-product` workflow
WIP — teammate branch (Stripe).

---

## Auth & Middleware

```
/admin/*    → authenticate("user", ["session", "bearer"])
/agent/*    → authenticate("customer", ...) + requireAgent
/employee/* → authenticate("customer", ...) + requireEmployee
```

Role verified in DB on every request (deactivation is immediate).

---

## API Endpoints

### Public
```
POST /auth/user/emailpass
POST /auth/customer/emailpass
POST /auth/invite
```

### Admin
```
GET/POST       /admin/categories              ← Medusa ProductCategory
DELETE         /admin/categories/:id
GET/POST       /admin/companies
GET            /admin/companies/:id
PATCH          /admin/companies/:id           ← { active: bool } updates status
POST           /admin/companies/:id/assign-goldies
GET/PUT        /admin/companies/:id/categories
POST           /admin/companies/:id/agents
POST           /admin/companies/:id/employees ← 403, only agents create employees
GET            /admin/transactions
GET            /admin/redemptions             ← TODO
PUT            /admin/redemptions/:id/status  ← TODO
```

### Agent
```
GET            /agent/company
GET/POST       /agent/employees
GET/PATCH/DELETE /agent/employees/:id         ← PATCH: { active?, role?, department? }
POST           /agent/employees/:id/assign-goldies
GET            /agent/transactions
```

### Employee
```
GET/PUT        /employee/me                   ← PUT: first_name, last_name, phone (Customer fields)
PUT            /employee/me/password
GET            /employee/transactions
GET            /employee/orders
GET            /employee/products               ← TODO (blocked on product extension)
GET            /employee/products/:id           ← TODO
POST           /employee/redeem                ← TODO (teammate)
POST           /webhooks/stripe                ← TODO (teammate)
```

---

## Pending

| Item | Status | Owner |
|------|--------|-------|
| Product extension (goldie_price, is_available) | WIP | Teammate |
| Redeem workflow + Stripe webhook | WIP | Teammate |
| GoldieOrder delivery fields | WIP | Teammate |
| GET /employee/products with category exclusion | Blocked on product extension | — |
| Admin redemptions endpoints | TODO | — |
| SendGrid / email subscribers | Future | — |
| Integration tests | TODO | — |
| HTTP codes/messages cleanup | TODO | — |

---

## Key Design Decisions

- Invitation system reuses Medusa `invite` with signed metadata (role cannot be manipulated by user).
- Only agents create employees (`POST /admin/companies/:id/employees` → 403).
- Goldies are integers.
- Goldies not deducted until Stripe payment confirmed (teammate flow).
- Email not editable on `PUT /employee/me` (would desync `provider_identity.entity_id`).
- Password change without current password (user already authenticated).
- Category exclusion: employee cannot see products in categories linked to their company.
- No role caching in middleware — DB lookup per request.
- Custom `GoldieOrder` instead of Medusa orders for redemption.

---

## How to Run

```bash
docker start prestige-rewards-db
cd ~/prestige-rewards-backend
npm run dev                    # http://localhost:9000 · admin http://localhost:9000/app

# After changing module links:
npx medusa db:migrate

npm run test:unit
```

Tests live in `src/__tests__/`, not `tests/unit/`.

---

## Common Issues

| Issue | Fix |
|-------|-----|
| 401 on `/agent/*` with admin token | Login via `POST /auth/customer/emailpass` |
| Link not working | Use `CompanyModule.linkable.company` in link file; file must be `.ts`; run `npx medusa db:migrate` |
| `npm run dev` loads spec files | Exclude `**/__tests__/**` and `**/*.spec.ts` in tsconfig |
| Slow npm on `/mnt/c/` | Work from `~/` in WSL |
