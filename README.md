# 🏆 Prestige Rewards — Documentación Backend
> Sistema de gestión de puntos para empleados · Backend con Medusa 2
>
> **Última actualización:** Mayo 2026
> **Stack:** Medusa 2 · Node.js · TypeScript · PostgreSQL · Stripe · SendGrid

---

## 📋 Índice

1. [Visión general del sistema](#1-visión-general-del-sistema)
2. [Arquitectura y roles](#2-arquitectura-y-roles)
3. [Cómo Medusa 2 nos ayuda](#3-cómo-medusa-2-nos-ayuda)
4. [Entidades de datos](#4-entidades-de-datos)
5. [Módulos custom que vamos a crear](#5-módulos-custom-que-vamos-a-crear)
6. [APIs y endpoints](#6-apis-y-endpoints)
7. [Flujos principales](#7-flujos-principales)
8. [Stack tecnológico completo](#8-stack-tecnológico-completo)
9. [Instalación y setup inicial](#9-instalación-y-setup-inicial)
10. [Variables de entorno](#10-variables-de-entorno)
11. [Estructura de carpetas del proyecto](#11-estructura-de-carpetas-del-proyecto)
12. [Decisiones de diseño](#12-decisiones-de-diseño)
13. [Roadmap de desarrollo](#13-roadmap-de-desarrollo)

---

## 1. Visión general del sistema

**Prestige Rewards** es una plataforma B2B2C que permite a empresas pagar parte del sueldo de sus empleados en puntos ("goldies"). Los empleados pueden acumular esos puntos y canjearlos por productos en un catálogo.

### Actores del sistema

| Rol interno | Nombre en UI | Descripción |
|-------------|--------------|-------------|
| `admin` | Admin | Gestiona la plataforma: empresas, categorías, productos y asignación masiva de puntos. |
| `agent` | Agente | Representa a una empresa cliente. Distribuye puntos entre sus employees y gestiona su equipo. |
| `employee` | Employee | Usuario final. Recibe puntos, ve el catálogo y solicita canjes. |

> **Nota de nomenclatura:** en el código y la base de datos los roles se llaman `admin`, `agent` y `employee`. En la UI pueden mostrarse con etiquetas distintas según el contexto.

### Qué hace el sistema (y qué NO hace)

**Sí hace:**
- Gestión de usuarios y autenticación (3 roles)
- Creación de usuarios via sistema de invitaciones (email + link de registro)
- Asignación de puntos (admin → empresa → employee)
- Catálogo de productos filtrado por categorías de empresa
- Solicitud de canje con dirección de entrega incluida
- Cobro simbólico de 1€ antes del canje (Stripe)
- Notificaciones por email (confirmaciones, solicitudes de canje) ← pendiente de implementar
- Gestión de perfil y contraseña por parte del employee

**NO hace:**
- Logística de envío de productos
- Procesamiento del canje en sí (el admin lo recibe por email y lo gestiona manualmente)
- Compra real de productos (no hay carrito de compras tradicional)

---

## 2. Arquitectura y roles

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│  /admin   /agent/:id   /employee/:id                    │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP / REST API
┌──────────────────▼──────────────────────────────────────┐
│                 BACKEND (Medusa 2)                       │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Medusa     │  │   Módulo     │  │   Módulo      │  │
│  │  Core       │  │   Goldies    │  │   Company     │  │
│  │  (auth,     │  │  (puntos,    │  │   (empresas,  │  │
│  │  productos, │  │   canjes,    │  │    agents,    │  │
│  │  admin UI)  │  │   saldos)    │  │   employees)  │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└──────────┬─────────────────┬───────────────┬────────────┘
           │                 │               │
    ┌──────▼──────┐  ┌───────▼──────┐  ┌────▼────────┐
    │ PostgreSQL  │  │    Stripe    │  │  SendGrid   │
    │  (datos)    │  │   (cobro 1€) │  │  (emails)   │
    └─────────────┘  └──────────────┘  └─────────────┘
```

### Por qué Medusa 2

Medusa 2 es un framework de comercio headless. Lo usamos para aprovechar:

- **Sistema de autenticación** ya construido (login, tokens JWT, roles)
- **Sistema de invitaciones** para onboarding de agents y employees
- **Gestión de productos** (catálogo de productos canjeables)
- **Panel de administración** (Medusa Admin UI — gratis, ya viene incluido)
- **Sistema de módulos** (nos permite agregar lógica custom sin romper el core)
- **Infraestructura de eventos** (para disparar emails cuando pasan cosas)

---

## 3. Cómo Medusa 2 nos ayuda

### Lo que Medusa da "out of the box"

| Feature | Medusa lo da | Nosotros lo custom |
|---------|-------------|-------------------|
| Login / logout | ✅ | — |
| JWT tokens y sesiones | ✅ | — |
| Panel de admin | ✅ | Agregar secciones de goldies |
| CRUD de productos | ✅ | Asociar puntos y categoría al producto |
| Sistema de invitaciones | ✅ | Extendemos para agents y employees |
| Gestión de usuarios | ✅ | Agregar campo `goldie_role` |
| Webhooks / eventos | ✅ | — |
| Integración Stripe | ✅ (plugin) | Configurar el cobro de 1€ |
| Emails transaccionales | ✅ (plugin) | Templates de Prestige Rewards |

### Conceptos clave de Medusa 2 que usaremos

**Módulos (`modules/`):** Bloques de funcionalidad independientes. Vamos a crear dos:
- `goldie-module`: gestión de puntos, saldos, transacciones
- `company-module`: gestión de empresas, agents y employees

**Workflows:** Secuencias de pasos con manejo de errores y rollback automático. Los usamos para operaciones críticas como aceptar una invitación, asignar goldies o procesar un canje.

**Subscribers:** Escuchan eventos del sistema. Por ejemplo, cuando se crea una invitación, un subscriber (pendiente de implementar) enviará el email con el link de registro.

**API Routes (`api/`):** Endpoints REST adicionales que nosotros definimos, más allá de los que Medusa ya expone.

**Middlewares (`api/middlewares.ts`):** Interceptan requests para validar autenticación y rol antes de llegar a la ruta.

---

## 4. Entidades de datos

### Entidades custom (las que vamos a crear)

#### `Category` (Categoría de industria)
```
id          uuid
name        string    ← ej: "Photography", "Electronics", "Food"
slug        string    ← ej: "photography", "electronics", "food" (único, indexado)
created_at  timestamp

NOTA: Catálogo maestro de categorías. Solo el admin crea y elimina categorías.
Tanto Company (via CategoryXCompany) como Product la referencian.
```

#### `CategoryXCompany` (Categorías que pertenece una empresa — relación N:M)
```
id          uuid
company_id  uuid  ← FK a Company
category_id uuid  ← FK a Category
created_at  timestamp

EJEMPLO: Samsung tiene categorías Electronics, Photography, Mobile
→ 3 filas en esta tabla con company_id = Samsung.id

LÓGICA DE EXCLUSIÓN: cuando un employee de Samsung busca productos,
se excluyen todos los productos cuya category_id esté en esta lista.
```

#### `Company` (Empresa cliente)
```
id             uuid
name           string
tax_id         string    ← CUIT / VAT
contact_email  string
status         enum: active | inactive
goldie_balance integer   ← puntos disponibles para asignar a employees
created_at     timestamp
updated_at     timestamp

→ Las categorías de la empresa se consultan via CategoryXCompany
```

#### `Agent` (Usuario agente — puede haber varios por empresa)
```
id          uuid
user_id     string  ← FK a customer de Medusa (vinculado via auth identity)
company_id  uuid    ← FK a Company
status      enum: active | inactive
created_at  timestamp

NOTA: No tiene goldie_balance. El agent gestiona puntos pero no los recibe.
NOTA: Se crea al aceptar la invitación via POST /auth/invite.
```

#### `Employee` (Usuario empleado)
```
id             uuid
user_id        string   ← FK a customer de Medusa (vinculado via auth identity)
company_id     uuid     ← FK a Company
goldie_balance integer  ← puntos acumulados del employee
status         enum: active | inactive
created_at     timestamp

NOTA: Solo los agents pueden crear employees (via invitación).
      POST /admin/companies/:id/employees está deshabilitado intencionalmente.
```

#### `GoldieTransaction` (historial de todos los movimientos de puntos)
```
id           uuid
type         enum: company_assignment | employee_assignment | redemption | adjustment
company_id   uuid    ← siempre presente
employee_id  uuid    ← nullable: presente en employee_assignment y redemption
product_id   string  ← nullable: presente solo en redemption
amount       integer ← positivo = crédito, negativo = débito
performed_by string  ← user_id de quien ejecutó la operación (admin o agent)
note         string  ← opcional, para adjustments manuales
created_at   timestamp

Ejemplos:
  type=company_assignment  → admin asignó 1000 goldies a la empresa
  type=employee_assignment → agent asignó 100 goldies a un employee
  type=redemption          → employee canjeó un producto (amount negativo)
```

#### `RedemptionRequest` (solicitud de canje de un producto)
```
id                    uuid
employee_id           uuid    ← FK a Employee
product_id            string  ← FK a Product de Medusa
goldies_cost          integer ← snapshot del precio al momento del canje
payment_intent_id     string  ← Stripe payment intent (el 1€ simbólico)
payment_status        enum: pending | paid | failed
status                enum: pending | processing | completed | cancelled

← Dirección de entrega (solicitada al momento del canje, no se guarda en el perfil)
delivery_full_name    string           requerido
delivery_street       string           requerido
delivery_city         string           requerido
delivery_state        string | null    opcional (no todos los países usan estado/provincia)
delivery_postal_code  string           requerido
delivery_country      string           requerido (código ISO, ej: "ES", "AR")
delivery_phone        string | null    opcional
delivery_notes        string | null    opcional (ej: "piso 3, timbre B")

created_at            timestamp

Flujo de estados:
  pending    → solicitud creada, esperando pago de 1€
  processing → pago confirmado, admin notificado, pendiente de gestión
  completed  → admin marcó como completado
  cancelled  → cancelado (pago fallido u otro motivo)
```

### Entidades de Medusa que usamos/extendemos

- **`User`** → admin de la plataforma. Actor type: `user`. Login: `/auth/user/emailpass`
- **`Customer`** → agents y employees. Actor type: `customer`. Login: `/auth/customer/emailpass`
- **`AuthIdentity`** → credenciales de autenticación. El campo `app_metadata` guarda `{ customer_id }` para vincular la identity al customer correspondiente
- **`Invite`** → sistema de invitaciones de Medusa, reutilizado para agents y employees. El campo `metadata` guarda `{ company_id, role, first_name, last_name }`
- **`Product`** → extendemos con: `goldie_price` (costo en goldies), `category_id` (FK a Category), `is_available`

### Lógica de exclusión de productos por categoría

```
1. Obtener company_id del employee autenticado
2. Obtener category_ids de CategoryXCompany donde company_id = ese valor
3. Retornar productos donde:
   - is_available = true
   - category_id NOT IN (lista de categorías de la empresa)

Ejemplo — Samsung tiene: Electronics, Photography, Mobile
→ Un employee de Samsung ve: Food, Travel, Fashion...
→ No ve: cámaras, TVs, celulares (aunque sean de otras marcas)
```

---

## 5. Módulos custom que vamos a crear

### `goldie-module`

```typescript
GoldieModuleService:
  getCompanyBalance(companyId)
  getEmployeeBalance(employeeId)

  assignToCompany(companyId, amount, performedBy, note?)
  assignToEmployee(companyId, employeeId, amount, performedBy)

  initiateRedemption(employeeId, productId, deliveryAddress)
  confirmRedemption(paymentIntentId)

  getCompanyTransactions(companyId)
  getEmployeeTransactions(employeeId)
```

### `company-module`

```typescript
CompanyModuleService:
  // Solo admin
  createCompany(data)
  updateCompany(id, data)
  toggleCompanyStatus(id)
  createAgent(companyId, userData)
  setCompanyCategories(companyId, categoryIds)
  createCategory(data)
  getCategories()

  // Admin y agent
  getCompany(id)
  getAgents(companyId)
  getEmployees(companyId)
  getEmployee(employeeId)
  toggleEmployeeStatus(employeeId)
  removeEmployee(companyId, employeeId)
  createEmployee(companyId, userData)  ← solo agents en la práctica
```

---

## 6. APIs y endpoints

### Públicos (sin autenticación)

```
POST   /auth/user/emailpass              ← login de admin
POST   /auth/customer/emailpass          ← login de agent o employee
POST   /auth/invite                      ← aceptar invitación y completar registro
```

### Rutas de Admin

```
# Categorías
GET    /admin/categories
POST   /admin/categories
DELETE /admin/categories/:id

# Empresas
POST   /admin/companies
GET    /admin/companies
GET    /admin/companies/:id
PUT    /admin/companies/:id
POST   /admin/companies/:id/toggle
POST   /admin/companies/:id/assign-goldies
PUT    /admin/companies/:id/categories

# Usuarios
POST   /admin/companies/:id/agents       ← crea invitación para agent
POST   /admin/companies/:id/employees    ← DESHABILITADO (403). Solo agents crean employees.

# Visibilidad global
GET    /admin/transactions
GET    /admin/redemptions
PUT    /admin/redemptions/:id/status
```

### Rutas de Agent

```
GET    /agent/company
GET    /agent/employees
GET    /agent/employees/:id
POST   /agent/employees                  ← crea invitación para employee
DELETE /agent/employees/:id
POST   /agent/employees/:id/toggle
POST   /agent/employees/:id/assign-goldies
GET    /agent/transactions
```

### Rutas de Employee

```
GET    /employee/me
PUT    /employee/me
PUT    /employee/me/password
GET    /employee/products
GET    /employee/products/:id
POST   /employee/redeem
GET    /employee/redemptions
GET    /employee/transactions
```

### Webhook de Stripe

```
POST   /webhooks/stripe
```

---

## 7. Flujos principales

### Flujo A: Alta de empresa y usuarios (Admin + sistema de invitaciones)

```
Admin → POST /admin/companies { name, tax_id, contact_email }
  → Company creada (status: inactive)

Admin → PUT /admin/companies/:id/categories { category_ids: [...] }
  → Filas creadas en CategoryXCompany

Admin → POST /admin/companies/:id/toggle
  → Company.status = "active"

Admin → POST /admin/companies/:id/agents { first_name, last_name, email }
  → Se crea Invite en Medusa con metadata: { company_id, role: "agent", first_name, last_name }
  → [PENDIENTE] Subscriber on-invite-created envía email al agent con link de registro

Agent → POST /auth/invite { token, password }
  → Workflow accept-invite:
    1. Validar token (no expirado, no aceptado)
    2. Validar password (min 8 chars, 1 mayúscula, 1 número)
    3. Crear auth identity con email + password (scrypt hash automático)
    4. Crear Customer en Medusa
    5. Vincular auth identity al customer (app_metadata: { customer_id })
    6. Crear Agent { user_id: customer.id, company_id } en nuestra tabla
    7. Marcar invite como accepted: true
  → Rollback automático si cualquier paso falla

Agent (logueado) → POST /agent/employees { first_name, last_name, email }
  → Se crea Invite con metadata: { company_id: agent.company_id, role: "employee", ... }
  → [PENDIENTE] Email al employee con link de registro

Employee → POST /auth/invite { token, password }
  → Mismo workflow accept-invite, crea Employee en lugar de Agent
```

### Flujo B: Asignación de goldies

```
Admin → POST /admin/companies/:id/assign-goldies { amount: 1000, note: "March 2026" }
  → Workflow assign-goldies-to-company:
    Step 1: Validar amount > 0, validar company activa
    Step 2: Company.goldie_balance += 1000
    Step 3: Registrar GoldieTransaction (type: company_assignment)
  → Rollback automático si falla

Agent → POST /agent/employees/:id/assign-goldies { amount: 100 }
  → Workflow assign-goldies-to-employee:
    Step 1: Validar amount > 0, validar company y employee activos
    Step 2: Validar Company.goldie_balance >= 100
    Step 3: Company.goldie_balance -= 100, Employee.goldie_balance += 100
    Step 4: Registrar GoldieTransaction (type: employee_assignment)
  → Rollback automático si falla
```

### Flujo C: Canje de producto

```
GET /employee/products
  → Obtiene categorías de la empresa del employee (CategoryXCompany)
  → Retorna productos: is_available = true AND category_id NOT IN (categorías empresa)

POST /employee/redeem { product_id, delivery_address: { ... } }
  → Validar Employee.goldie_balance >= product.goldie_price
  → Crear RedemptionRequest (status: pending, dirección guardada)
  → Crear Stripe PaymentIntent (amount: 100, currency: "eur")
  → Retornar { redemption_id, client_secret }

POST /webhooks/stripe (evento: payment_intent.succeeded)
  → Verificar firma (STRIPE_WEBHOOK_SECRET)
  → Employee.goldie_balance -= product.goldie_price
  → GoldieTransaction (type: redemption, amount: negativo)
  → RedemptionRequest.status = "processing"
  → [PENDIENTE] Email al admin con datos del canje y dirección
  → [PENDIENTE] Email al employee: "Tu solicitud fue recibida"

PUT /admin/redemptions/:id/status { status: "completed" }
  → [PENDIENTE] Email al employee: "Tu canje fue procesado"
```

### Flujo D: Perfil y contraseña (Employee)

```
PUT /employee/me { first_name, last_name }
  → Actualiza campos en Customer de Medusa

PUT /employee/me/password { current_password, new_password }
  → Verifica current_password
  → Actualiza hash en Medusa
  → [PENDIENTE] Email de confirmación
```

---

## 8. Stack tecnológico completo

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Framework backend | **Medusa 2** | Core del sistema, auth, productos, admin |
| Lenguaje | **TypeScript** | Tipado estático, mejor DX |
| Runtime | **Node.js 20+** | Requerido por Medusa 2 |
| Base de datos | **PostgreSQL 15+** | Requerido por Medusa 2 |
| ORM | **MikroORM** | Incluido en Medusa 2 |
| Pagos | **Stripe** | Plugin oficial de Medusa |
| Emails | **SendGrid** (o Resend) | Plugin de notificaciones de Medusa |
| Gestor de paquetes | **npm** | Viene con Node |
| Dev local DB | **Docker** | Para correr PostgreSQL localmente |
| OS de desarrollo | **Windows + WSL2 / macOS / Linux** | Ver sección 9 |
| Hosting | **Por definir** | A decidir con el equipo |

---

## 9. Instalación y setup inicial

### Requisitos comunes (todos los SO)

- Node.js 20+ via NVM
- Docker Desktop
- VS Code (extensiones: ESLint, Prettier, WSL si usás Windows)

---

### 🪟 Windows (vía WSL2)

Medusa 2 **no corre nativamente en Windows**. Se requiere WSL2.

**1 — Instalar WSL2** (PowerShell como administrador):
```powershell
wsl --install
# Reiniciar. Al volver, Ubuntu pide crear un usuario Linux.
wsl --list --verbose  # debe mostrar Ubuntu VERSION 2
```

A partir de acá, **todo se hace desde la terminal de Ubuntu (WSL2)**.

> 💡 Instalar la extensión **"WSL"** en VS Code para trabajar con `code .` desde WSL.

**2 — Docker Desktop:** docker.com/products/docker-desktop → Settings → Resources → WSL Integration → activar Ubuntu.

**3 — Node.js (dentro de WSL2):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Cerrar y reabrir terminal:
nvm install 20 && nvm use 20
```

**4 — PostgreSQL y proyecto (dentro de WSL2):**
```bash
docker run --name prestige-rewards-db \
  -e POSTGRES_PASSWORD=prestige123 \
  -e POSTGRES_DB=prestigerewards \
  -p 5432:5432 -d postgres:15

cd ~   # siempre trabajar en ~, nunca en /mnt/c/
npx create-medusa-app@latest prestige-rewards-backend
# DB string: postgres://postgres:prestige123@localhost:5432/prestigerewards

cd prestige-rewards-backend
code .        # abre VS Code conectado a WSL
npm run dev   # http://localhost:9000 · admin en http://localhost:9000/app
```

---

### 🍎 macOS

**1 — Node.js:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Reiniciar terminal:
nvm install 20 && nvm use 20
```

**2 — Docker Desktop:** docker.com/products/docker-desktop (elegir Apple Silicon o Intel).

**3 — PostgreSQL y proyecto:**
```bash
docker run --name prestige-rewards-db \
  -e POSTGRES_PASSWORD=prestige123 \
  -e POSTGRES_DB=prestigerewards \
  -p 5432:5432 -d postgres:15

npx create-medusa-app@latest prestige-rewards-backend
# DB string: postgres://postgres:prestige123@localhost:5432/prestigerewards

cd prestige-rewards-backend
npm run dev
```

---

### 🐧 Linux

**1 — Node.js:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20
```

**2 — Docker (Ubuntu/Debian):**
```bash
sudo apt-get update && sudo apt-get install -y docker.io
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar
```

**3 — PostgreSQL y proyecto:**
```bash
docker run --name prestige-rewards-db \
  -e POSTGRES_PASSWORD=prestige123 \
  -e POSTGRES_DB=prestigerewards \
  -p 5432:5432 -d postgres:15

npx create-medusa-app@latest prestige-rewards-backend
# DB string: postgres://postgres:prestige123@localhost:5432/prestigerewards

cd prestige-rewards-backend
npm run dev
```

---

## 10. Variables de entorno

Archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL=postgres://postgres:prestige123@localhost:5432/prestigerewards

# Medusa
MEDUSA_ADMIN_ONBOARDING_TYPE=default
JWT_SECRET=super-secret-jwt-key-cambiar-en-produccion
COOKIE_SECRET=super-secret-cookie-key-cambiar-en-produccion

# Stripe
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid)
SENDGRID_API_KEY=SG....
SENDGRID_FROM=noreply@prestigerewards.com
ADMIN_EMAIL=admin@prestigerewards.com

# Frontend (CORS)
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:3000,http://localhost:9000
```

> ⚠️ **Nunca subir el .env a git.** Verificar que esté en `.gitignore`.

---

## 11. Estructura de carpetas del proyecto

```
prestige-rewards-backend/
├── src/
│   ├── modules/
│   │   ├── goldie/
│   │   │   ├── index.ts
│   │   │   ├── service.ts
│   │   │   └── models/
│   │   │       ├── goldie-transaction.ts
│   │   │       └── redemption-request.ts
│   │   └── company/
│   │       ├── index.ts
│   │       ├── service.ts
│   │       └── models/
│   │           ├── category.ts
│   │           ├── category-x-company.ts
│   │           ├── company.ts
│   │           ├── agent.ts
│   │           └── employee.ts
│   │
│   ├── api/
│   │   ├── middlewares.ts              ← auth middleware para /admin/*, /agent/*, /employee/*
│   │   ├── auth/
│   │   │   └── invite/
│   │   │       └── route.ts           ← POST /auth/invite (público)
│   │   ├── admin/
│   │   │   ├── categories/
│   │   │   ├── companies/
│   │   │   │   └── [id]/
│   │   │   │       ├── toggle/
│   │   │   │       ├── assign-goldies/
│   │   │   │       ├── categories/
│   │   │   │       ├── agents/
│   │   │   │       └── employees/     ← retorna 403, solo agents crean employees
│   │   │   ├── transactions/
│   │   │   └── redemptions/
│   │   ├── agent/
│   │   │   ├── company/
│   │   │   ├── employees/
│   │   │   │   └── [id]/
│   │   │   │       ├── toggle/
│   │   │   │       └── assign-goldies/
│   │   │   └── transactions/
│   │   ├── employee/
│   │   │   ├── me/
│   │   │   ├── products/
│   │   │   ├── redeem/
│   │   │   └── transactions/
│   │   └── webhooks/
│   │       └── stripe/
│   │
│   ├── workflows/
│   │   ├── accept-invite.ts           ← 7 steps con rollback completo
│   │   ├── assign-goldies.ts          ← assignGoldiesToCompany + assignGoldiesToEmployee
│   │   ├── initiate-redemption.ts     ← pendiente
│   │   └── confirm-redemption.ts      ← pendiente
│   │
│   ├── subscribers/
│   │   ├── on-invite-created.ts       ← PENDIENTE: enviar email con link de registro
│   │   ├── on-redemption-confirmed.ts ← PENDIENTE: emails post-pago
│   │   └── on-goldies-assigned.ts     ← PENDIENTE: notificar al employee
│   │
│   └── admin/
│       └── widgets/
│           └── company-goldies-widget.tsx
│
├── tests/
│   └── unit/
│       └── workflows/
│           └── assign-goldies.unit.spec.ts
│
├── medusa-config.ts
├── .env
└── package.json
```

---

## 12. Decisiones de diseño

### ¿Por qué `Agent` y `Employee` son tablas separadas?
Tienen responsabilidades y datos completamente distintos: el agent no tiene saldo de goldies, accede a una página diferente y es invitado por el admin. Mezclarlos con un campo `role` crearía columnas nullable innecesarias. Tablas separadas = código más claro y permisos más fáciles de razonar.

### ¿Por qué sistema de invitaciones en lugar de creación directa con password?
El admin no debería manejar contraseñas de los usuarios. Con el sistema de invitaciones el admin solo conoce el email, y el usuario completa su propio registro de forma segura. Reutilizamos la tabla `invite` de Medusa extendiendo el campo `metadata` con `{ company_id, role, first_name, last_name }`.

### ¿Por qué solo agents pueden crear employees?
Los agents son quienes conocen a su equipo. El admin gestiona empresas y agents, pero no debería gestionar el onboarding individual de cada empleado. Separar estas responsabilidades hace el sistema más escalable y reduce el trabajo del admin.

### ¿Por qué confiamos en el token de invitación para determinar el rol?
Al aceptar una invitación, el rol del usuario (agent o employee) se determina por el campo `role` dentro del `metadata` del token — no por algo que el usuario pueda manipular en el request. El token es generado y firmado por el servidor, por lo que no puede ser falsificado. Si alguien intercepta un token ajeno y lo usa, igualmente queda registrado con el rol que el token indica, no con el que el atacante desee. La superficie de ataque real es el email — si el email llega a la persona correcta, el registro es seguro.

### ¿Por qué goldies son integers?
Simplicidad. Los puntos se asignan y consumen en enteros. No hay fracciones de goldie.

### ¿Por qué el canje no descuenta puntos inmediatamente?
Para evitar descontar puntos cuando el pago de Stripe falla. El flujo correcto es: webhook de Stripe confirma pago → se descuentan los goldies. Si el pago falla, `RedemptionRequest.payment_status = failed` y los goldies no se tocan.

### ¿Por qué no usamos el sistema de órdenes de Medusa?
El canje es demasiado custom (pago simbólico + notificación manual al admin). Construir `RedemptionRequest` propio es más simple que adaptar las órdenes de Medusa.

### ¿Por qué `GoldieTransaction.amount` puede ser negativo?
Permite calcular saldos con `SUM(amount)` sobre todas las transacciones. Simple y eficiente.

### ¿Por qué algunos campos de dirección son opcionales?
`delivery_state`, `delivery_phone` y `delivery_notes` varían según el país. El frontend debe aplicar validación contextual según `delivery_country`.

### ¿Por qué el middleware verifica el rol en la DB y no en el token?
Si desactivamos un agent o employee, el efecto debe ser inmediato. Con el rol en el token, un usuario desactivado podría seguir operando hasta que expire el JWT. La query al middleware es por índice en una tabla pequeña — menos de 1ms en producción. Si en el futuro el volumen lo requiere, se puede agregar Redis con TTL corto e invalidación por evento.

---

## 13. Roadmap de desarrollo

> ⚠️ **Nota sobre estimaciones:** los tiempos son aproximados. Los módulos custom de Medusa, webhooks de Stripe y configuración de emails tienen curva de aprendizaje. No comprometer fechas fijas hasta terminar la Fase 2.

### Fase 1 — Setup y estructura base ✅
- [x] Instalar entorno (WSL2, Node 20, Docker, VS Code)
- [x] Crear proyecto Medusa 2
- [x] Configurar PostgreSQL local con Docker
- [x] Crear módulo `company`: `Category`, `CategoryXCompany`, `Company`, `Agent`, `Employee`
- [x] Crear módulo `goldie`: `GoldieTransaction`, `RedemptionRequest`
- [x] Migraciones ejecutadas y tablas verificadas en DB

### Fase 2 — Auth + Rutas de admin + Workflows de asignación ✅ (parcial)
- [x] Middleware de autenticación por rol (`requireAgent`, `requireEmployee`)
- [x] Workflow `accept-invite` (7 steps con rollback completo)
- [x] Workflow `assign-goldies` (assignToCompany + assignToEmployee con rollback)
- [x] CRUD de categorías (`/admin/categories`)
- [x] CRUD de empresas con asignación de categorías
- [x] Sistema de invitaciones para agents (`POST /admin/companies/:id/agents`)
- [x] Sistema de invitaciones para employees (`POST /agent/employees`)
- [x] `POST /auth/invite` — aceptar invitación y completar registro
- [x] Asignación de goldies a empresa y employees
- [x] Historial de transacciones y canjes (read-only)
- [ ] Subscriber `on-invite-created` — enviar email con link de registro (pendiente Fase 5)

### Fase 3 — Rutas de agent (2-3 días)
- [ ] Ver empresa y saldo
- [ ] Listar, ver detalle, toggle y desasociar employees
- [ ] Asignar goldies a employees (ruta conectada al workflow ya implementado)

### Fase 4 — Rutas de employee + catálogo (3-5 días)
- [ ] Ver y editar perfil, cambio de contraseña
- [ ] Catálogo filtrado por `NOT IN` categorías de empresa
- [ ] Flujo de canje con Stripe Elements
- [ ] Webhook de Stripe: confirmar pago, descontar goldies

### Fase 5 — Emails (2-3 días)
- [ ] Subscriber `on-invite-created`: email con link de registro al agent/employee
- [ ] Email al employee: goldies recibidos
- [ ] Email al agent: goldies asignados a su empresa
- [ ] Email al admin: solicitud de canje con datos de entrega
- [ ] Email al employee: canje recibido / completado / cancelado
- [ ] Email de confirmación de cambio de contraseña

### Fase 6 — Testing y deployment (2-3 días)
- [ ] Integration tests para workflows críticos
- [ ] Variables de entorno de producción
- [ ] Deploy (a definir con el equipo)
- [ ] Configurar dominio y CORS

---

*Documento generado como base de trabajo. Actualizar a medida que evolucione el proyecto.*