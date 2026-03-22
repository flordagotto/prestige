# 🪙 Goldies — Documentación Backend
> Sistema de gestión de puntos para empleados · Backend con Medusa 2
> 
> **Última actualización:** Marzo 2026  
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

**Goldies** es una plataforma B2B2C que permite a empresas pagar parte del sueldo de sus empleados en puntos ("goldies"). Los empleados pueden acumular esos puntos y canjearlos por productos en un catálogo.

### Actores del sistema

| Actor | Descripción |
|-------|-------------|
| **Super Admin** | Administrador de la plataforma Goldies. Gestiona empresas, productos y asignación masiva de puntos. |
| **Empleador** | Empresa cliente. Gestiona los puntos que tiene asignados y los distribuye entre sus empleados. |
| **Empleado** | Usuario final. Recibe puntos, ve su saldo, explora el catálogo y solicita canjes. |

### Qué hace el sistema (y qué NO hace)

**Sí hace:**
- Gestión de usuarios y autenticación (3 roles)
- Asignación de puntos (admin → empresa → empleado)
- Catálogo de productos (activar/desactivar)
- Solicitud de canje de productos
- Cobro simbólico de 1€ antes del canje (Stripe)
- Notificaciones por email (confirmaciones, solicitudes de canje)

**NO hace:**
- Logística de envío de productos
- Procesamiento del canje en sí (el admin lo recibe por email y lo gestiona manualmente)
- Compra real de productos (no hay carrito de compras tradicional)

---

## 2. Arquitectura y roles

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│  /admin   /employer/:id   /employee/:id                 │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP / REST API
┌──────────────────▼──────────────────────────────────────┐
│                 BACKEND (Medusa 2)                      │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Medusa     │  │   Módulo     │  │   Módulo      │  │
│  │  Core       │  │   Goldies    │  │   Empleadores │  │
│  │  (auth,     │  │  (puntos,    │  │   (empresas,  │  │
│  │  productos, │  │   canjes,    │  │    empleados) │  │
│  │  admin UI)  │  │   saldos)    │  │               │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└──────────┬─────────────────┬───────────────┬────────────┘
           │                 │               │
    ┌──────▼──────┐  ┌───────▼──────┐  ┌────▼────────┐
    │ PostgreSQL  │  │    Stripe    │  │  SendGrid   │
    │  (datos)    │  │   (cobro 1€) │  │  (emails)   │
    └─────────────┘  └──────────────┘  └─────────────┘
```

### Por qué Medusa 2

Medusa 2 es un framework de comercio headless. En nuestro caso lo usamos no para e-commerce tradicional sino para aprovechar:

- **Sistema de autenticación** ya construido (login, tokens JWT, roles)
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
| CRUD de productos | ✅ | Asociar puntos al producto |
| Gestión de usuarios | ✅ | Agregar campo `goldie_balance` |
| Webhooks / eventos | ✅ | — |
| Integración Stripe | ✅ (plugin) | Configurar el cobro de 1€ |
| Emails transaccionales | ✅ (plugin) | Templates de goldies |

### Conceptos clave de Medusa 2 que usaremos

**Módulos (`modules/`):** Bloques de funcionalidad independientes. Vamos a crear dos módulos custom:
- `goldie-module`: gestión de puntos, saldos, transacciones
- `employer-module`: gestión de empresas y sus empleados

**Workflows:** Secuencias de pasos con manejo de errores y rollback. Los usamos para operaciones críticas como "descontar puntos + registrar canje + enviar email".

**Subscribers:** Escuchan eventos del sistema. Por ejemplo, cuando un empleado hace un canje, un subscriber envía el email al admin.

**API Routes (`api/`):** Endpoints REST adicionales que nosotros definimos, más allá de los que Medusa ya expone.

---

## 4. Entidades de datos

### Entidades custom (las que vamos a crear)

#### `Company` (Empresa)
```
id                  uuid
name                string
tax_id              string (CUIT / VAT)
contact_email       string
status              enum: active | inactive
goldie_balance      integer  ← puntos disponibles para asignar a empleados
created_at          timestamp
updated_at          timestamp
```

#### `Employer` (Usuario empleador — puede haber varios por empresa)
```
id                  uuid
user_id             string   ← FK a User de Medusa (creado por el admin)
company_id          uuid     ← FK a Company
status              enum: active | inactive
created_at          timestamp

NOTA: No tiene goldie_balance. El empleador gestiona puntos pero no los recibe.
```

#### `Employee` (Usuario empleado)
```
id                  uuid
user_id             string   ← FK a User de Medusa (creado por el admin o el employer)
company_id          uuid     ← FK a Company
goldie_balance      integer  ← puntos acumulados del empleado
status              enum: active | inactive
created_at          timestamp
```

#### `GoldieTransaction` (historial de todos los movimientos de puntos)
```
id                  uuid
type                enum: company_assignment | employee_assignment | redemption | adjustment
company_id          uuid     ← siempre presente (todo movimiento pertenece a una empresa)
employee_id         uuid     ← nullable: presente en employee_assignment y redemption
product_id          string   ← nullable: presente solo en redemption
amount              integer  ← positivo = crédito, negativo = débito
performed_by        string   ← user_id de quien hizo la operación (admin o employer)
note                string   ← opcional, para adjustments manuales
created_at          timestamp

Ejemplos de registros:
  type=company_assignment  → admin asignó 1000 goldies a la empresa
  type=employee_assignment → employer asignó 100 goldies a un empleado
  type=redemption          → empleado canjeó un producto (amount negativo)
```

#### `RedemptionRequest` (solicitud de canje de un producto)
```
id                    uuid
employee_id           uuid     ← FK a Employee
product_id            string   ← FK a Product de Medusa
goldies_cost          integer  ← snapshot del precio en goldies al momento del canje
payment_intent_id     string   ← Stripe payment intent (el 1€ simbólico)
payment_status        enum: pending | paid | failed
status                enum: pending | processing | completed | cancelled

← Dirección de entrega (solicitada al momento del canje, no se guarda en el perfil)
delivery_full_name    string
delivery_street       string
delivery_city         string
delivery_state        string
delivery_postal_code  string
delivery_country      string
delivery_phone        string   ← opcional, para coordinar la entrega
delivery_notes        string   ← opcional, ej: "piso 3, timbre B"

created_at            timestamp

Flujo de estados:
  pending    → se creó la solicitud, esperando pago de 1€
  processing → pago confirmado, admin notificado, esperando gestión manual
  completed  → admin marcó como completado
  cancelled  → se canceló (pago fallido u otro motivo)

NOTA: La dirección se pide en el mismo formulario que los datos de la tarjeta,
antes de confirmar el canje. No se almacena en Employee — es dato del canje, no del usuario.
```

### Entidades de Medusa que extendemos

- **`User`** → le agregamos: `goldie_role` (admin | employer | employee) para saber a qué tabla custom apunta
- **`Product`** → le agregamos: `goldie_price` (cuántos goldies cuesta), `company_category` (categoría de empresa — ver punto de exclusión), `is_active` (para activar/desactivar del catálogo)

### Lógica de exclusión de productos por categoría de empresa

Cada producto tiene un campo `company_category` (ej: `"electronics"`, `"photography"`, `"food"`, etc.). Cada `Company` también tiene ese campo. Cuando un empleado pide el catálogo (`GET /employee/products`), el backend filtra y **excluye los productos cuya `company_category` coincida con la de la empresa del empleado**.

Ejemplo: empleado de Canon (categoría `photography`) → no ve productos de categoría `photography` (cámaras Samsung, etc.), sí ve productos de otras categorías.

```
Company.category = "photography"
  → se excluyen productos donde product.company_category = "photography"
  → se muestran todos los demás productos activos
```

---

## 5. Módulos custom que vamos a crear

### `goldie-module`
Responsabilidades: todo lo relacionado con el movimiento de puntos y los canjes.

```typescript
GoldieModuleService:
  // Saldos
  getCompanyBalance(companyId)
  getEmployeeBalance(employeeId)

  // Asignaciones
  assignToCompany(companyId, amount, performedBy, note?)
    → valida que amount > 0
    → actualiza Company.goldie_balance
    → registra GoldieTransaction (type: company_assignment)

  assignToEmployee(companyId, employeeId, amount, performedBy)
    → valida que Company.goldie_balance >= amount
    → descuenta de Company.goldie_balance
    → suma a Employee.goldie_balance
    → registra GoldieTransaction (type: employee_assignment)

  // Canjes
  initiateRedemption(employeeId, productId)
    → valida que Employee.goldie_balance >= product.goldie_price
    → crea RedemptionRequest (status: pending)
    → crea Stripe PaymentIntent por 1€
    → devuelve { redemptionId, clientSecret }

  confirmRedemption(paymentIntentId)
    → llamado desde el webhook de Stripe
    → descuenta goldies del empleado
    → registra GoldieTransaction (type: redemption)
    → actualiza RedemptionRequest.status = "processing"
    → dispara evento "redemption.confirmed" (para emails)

  // Historial
  getCompanyTransactions(companyId)
  getEmployeeTransactions(employeeId)
```

### `company-module`
Responsabilidades: gestión de empresas, empleadores y empleados. El CRUD de empresas lo hace el admin; el employer solo gestiona su propia gente.

```typescript
CompanyModuleService:
  // Solo admin
  createCompany(data)
  updateCompany(id, data)
  toggleCompanyStatus(id)
  createEmployer(companyId, userData)   ← admin crea la cuenta del employer
  createEmployee(companyId, userData)   ← admin o employer crean empleados

  // Admin y employer
  getCompany(id)
  getEmployers(companyId)
  getEmployees(companyId)
  toggleEmployeeStatus(employeeId)
  removeEmployee(companyId, employeeId)
```

---

## 6. APIs y endpoints

### Rutas de Admin (protegidas, solo Super Admin)

```
# Empresas
POST   /admin/companies                        ← crear empresa
GET    /admin/companies                        ← listar todas las empresas
GET    /admin/companies/:id                    ← detalle de una empresa
PUT    /admin/companies/:id                    ← editar empresa
POST   /admin/companies/:id/toggle             ← activar/desactivar empresa
POST   /admin/companies/:id/assign-goldies     ← asignar goldies en bulk a empresa

# Usuarios
POST   /admin/companies/:id/employers          ← crear cuenta de employer para esa empresa
POST   /admin/companies/:id/employees          ← crear cuenta de employee para esa empresa

# Visibilidad global
GET    /admin/transactions                     ← historial completo de todas las empresas
GET    /admin/redemptions                      ← todas las solicitudes de canje
PUT    /admin/redemptions/:id/status           ← marcar canje como completed/cancelled
```

### Rutas de Employer (protegidas, solo employers de esa empresa)

```
GET    /employer/company                       ← info y saldo de su empresa
GET    /employer/employees                     ← listar empleados de su empresa
POST   /employer/employees                     ← agregar empleado a su empresa
DELETE /employer/employees/:id                 ← desasociar empleado
POST   /employer/employees/:id/toggle          ← activar/desactivar empleado
POST   /employer/employees/:id/assign-goldies  ← asignar goldies a un empleado
GET    /employer/transactions                  ← historial de movimientos de la empresa
```

### Rutas de Employee (protegidas, solo el empleado autenticado)

```
GET    /employee/me                            ← mi perfil y saldo de goldies
GET    /employee/products                      ← catálogo filtrado (sin productos de su categoría)
GET    /employee/products/:id                  ← detalle de producto
POST   /employee/redeem                        ← iniciar solicitud de canje { product_id }
GET    /employee/redemptions                   ← mis solicitudes de canje
GET    /employee/transactions                  ← mi historial de goldies
```

### Webhook de Stripe

```
POST   /webhooks/stripe                        ← confirmación de pago del 1€
```

---

## 7. Flujos principales

### Flujo A: Alta de empresa y sus usuarios (solo Admin)

```
Admin en panel → POST /admin/companies { name, tax_id, contact_email, category }
  → Se crea Company (status: inactive por defecto)
  → Admin activa la empresa: POST /admin/companies/:id/toggle

Admin crea los empleadores de esa empresa:
  POST /admin/companies/:id/employers { name, email, password }
  → Se crea User en Medusa con goldie_role = "employer"
  → Se crea Employer { user_id, company_id }
  → El employer recibe email con sus credenciales

Luego admin (o el employer ya logueado) crea empleados:
  POST /admin/companies/:id/employees { name, email, password }
  → Se crea User en Medusa con goldie_role = "employee"
  → Se crea Employee { user_id, company_id, goldie_balance: 0 }
```

### Flujo B: Asignación de goldies (Admin → Empresa → Empleado)

```
Admin hace POST /admin/companies/:id/assign-goldies { amount: 1000, note: "Marzo 2026" }
  → GoldieModule.assignToCompany()
  → Company.goldie_balance += 1000
  → Se registra GoldieTransaction (type: company_assignment, amount: 1000)
  → Email de notificación a todos los employers de esa empresa

Employer hace POST /employer/employees/:id/assign-goldies { amount: 100 }
  → Validar que Company.goldie_balance >= 100
  → GoldieModule.assignToEmployee()
  → Company.goldie_balance -= 100
  → Employee.goldie_balance += 100
  → Se registra GoldieTransaction (type: employee_assignment, amount: 100)
  → Email al empleado: "Recibiste 100 goldies"
```

### Flujo C: Canje de producto (con cobro del 1€ vía Stripe)

```
Empleado navega GET /employee/products
  → Backend obtiene company.category del empleado
  → Filtra productos: excluye donde product.company_category = company.category
  → Devuelve solo productos activos y permitidos

Empleado elige producto → POST /employee/redeem { product_id: "prod_123" }
  → Validar Employee.goldie_balance >= product.goldie_price
  → GoldieModule.initiateRedemption()
  → Crear RedemptionRequest (status: pending)
  → Crear Stripe PaymentIntent (amount: 100, currency: "eur") ← 1€ = 100 centavos
  → Devolver { redemption_id, client_secret } al frontend

Frontend (Stripe Elements) muestra formulario de tarjeta
  → Empleado ingresa datos y confirma
  → Stripe procesa el pago y llama nuestro webhook

POST /webhooks/stripe recibe evento "payment_intent.succeeded"
  → Verificar firma del webhook (STRIPE_WEBHOOK_SECRET)
  → Buscar RedemptionRequest por payment_intent_id
  → GoldieModule.confirmRedemption()
    → Employee.goldie_balance -= product.goldie_price
    → GoldieTransaction (type: redemption, amount: negativo)
    → RedemptionRequest.status = "processing"
  → Enviar email al admin: "Nueva solicitud de canje - [empleado] quiere [producto]"
  → Enviar email al empleado: "Tu solicitud de canje fue recibida"

Admin gestiona manualmente y marca:
  PUT /admin/redemptions/:id/status { status: "completed" }
  → Enviar email al empleado: "Tu canje fue procesado"
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
| Pagos | **Stripe** | Plugin oficial de Medusa, simple de integrar |
| Emails | **SendGrid** (o Resend) | Plugin de notificaciones de Medusa |
| Gestor de paquetes | **npm** | Viene con Node |
| Dev local DB | **Docker** (en WSL2) | Para correr PostgreSQL localmente |
| OS de desarrollo | **Windows + WSL2** | Medusa no corre en Windows nativo |
| Hosting | **Por definir** | A decidir con el equipo cuando corresponda |

---

## 9. Instalación y setup inicial

### ⚠️ Nota para Windows

Medusa 2 **no corre nativamente en Windows**. Es necesario usar **WSL2** (Windows Subsystem for Linux), que básicamente corre un Ubuntu dentro de Windows. Todo el desarrollo se hace desde WSL2, no desde la terminal de Windows.

### Paso 0 — Instalar WSL2 (solo Windows)

Abrir PowerShell **como administrador** y ejecutar:

```powershell
wsl --install
```

Esto instala WSL2 con Ubuntu por defecto. Reiniciar la PC cuando lo pida. Al volver, Ubuntu abre una terminal y pide crear un usuario Linux (puede ser cualquier usuario/contraseña, es solo para WSL).

Verificar que quedó bien:
```powershell
wsl --list --verbose
# Debe mostrar Ubuntu con VERSION 2
```

De acá en adelante, **todo se hace desde la terminal de Ubuntu (WSL2)**, no desde PowerShell ni CMD.

> 💡 En VS Code, instalar la extensión **"WSL"** de Microsoft. Eso permite abrir el proyecto con `code .` desde WSL y que todo funcione perfectamente integrado.

### Requisitos previos (dentro de WSL2)

```bash
# Verificar versiones instaladas
node --version    # necesitás v20 o superior
npm --version     # v10 o superior
```

### Herramientas a instalar (dentro de WSL2)

**1. Node.js 20+ (via NVM — recomendado)**
```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Cerrar y reabrir la terminal WSL, luego:
nvm install 20
nvm use 20
node --version  # debe mostrar v20.x.x
```

**2. PostgreSQL con Docker**

Instalar Docker Desktop para Windows desde https://www.docker.com/products/docker-desktop

En la configuración de Docker Desktop, activar: **Settings → Resources → WSL Integration → habilitar para Ubuntu**.

Luego, desde la terminal WSL:
```bash
# Levantar PostgreSQL:
docker run --name goldies-db \
  -e POSTGRES_PASSWORD=goldies123 \
  -e POSTGRES_DB=goldies \
  -p 5432:5432 \
  -d postgres:15

# Verificar que está corriendo:
docker ps
```

**3. Crear el proyecto Medusa (dentro de WSL2)**
```bash
# Importante: trabajar siempre dentro del filesystem de Linux, no en /mnt/c/
cd ~   # o crear una carpeta: mkdir ~/proyectos && cd ~/proyectos

npx create-medusa-app@latest goldies-backend
# Cuando pregunte: elegir "minimal" (sin demo data)
# Cuando pregunte por la DB string:
# postgres://postgres:goldies123@localhost:5432/goldies

cd goldies-backend
```

**4. Abrir en VS Code**
```bash
code .
# Esto abre VS Code en Windows pero conectado al proyecto en WSL2
```

**5. Verificar que funciona**
```bash
npm run dev
# Debe levantar en http://localhost:9000
# Admin UI en http://localhost:9000/app
```

---

## 10. Variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL=postgres://postgres:goldies123@localhost:5432/goldies

# Medusa
MEDUSA_ADMIN_ONBOARDING_TYPE=default
JWT_SECRET=super-secret-jwt-key-cambiar-en-produccion
COOKIE_SECRET=super-secret-cookie-key-cambiar-en-produccion

# Stripe
STRIPE_API_KEY=sk_test_...          ← tu clave secreta de Stripe
STRIPE_WEBHOOK_SECRET=whsec_...     ← se genera al crear el webhook

# Email (SendGrid)
SENDGRID_API_KEY=SG....
SENDGRID_FROM=noreply@goldies.com
ADMIN_EMAIL=admin@goldies.com       ← email del admin que recibe los canjes

# Frontend (para CORS)
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:9000
```

> ⚠️ **Nunca subir el .env a git.** Asegurarse de que `.env` esté en `.gitignore`.

---

## 11. Estructura de carpetas del proyecto

```
goldies-backend/
├── src/
│   ├── modules/
│   │   ├── goldie/                     ← módulo de puntos y canjes
│   │   │   ├── index.ts
│   │   │   ├── service.ts
│   │   │   └── models/
│   │   │       ├── goldie-transaction.ts
│   │   │       └── redemption-request.ts
│   │   └── company/                    ← módulo de empresas, employers y employees
│   │       ├── index.ts
│   │       ├── service.ts
│   │       └── models/
│   │           ├── company.ts
│   │           ├── employer.ts
│   │           └── employee.ts
│   │
│   ├── api/
│   │   ├── admin/                      ← rutas exclusivas del super admin
│   │   │   ├── companies/
│   │   │   ├── transactions/
│   │   │   └── redemptions/
│   │   ├── employer/                   ← rutas del empleador
│   │   │   ├── company/
│   │   │   ├── employees/
│   │   │   └── transactions/
│   │   ├── employee/                   ← rutas del empleado
│   │   │   ├── me/
│   │   │   ├── products/
│   │   │   ├── redeem/
│   │   │   └── transactions/
│   │   └── webhooks/
│   │       └── stripe/
│   │
│   ├── workflows/                      ← lógica de negocio secuencial con rollback
│   │   ├── assign-goldies-to-company.ts
│   │   ├── assign-goldies-to-employee.ts
│   │   ├── initiate-redemption.ts
│   │   └── confirm-redemption.ts
│   │
│   ├── subscribers/                    ← listeners de eventos internos
│   │   ├── on-redemption-confirmed.ts  ← envía emails post-pago
│   │   └── on-goldies-assigned.ts      ← notifica al empleado que recibió puntos
│   │
│   └── admin/                          ← extensiones del panel Medusa Admin
│       └── widgets/
│           └── company-goldies-widget.tsx
│
├── medusa-config.ts
├── .env
└── package.json
```

---

## 12. Decisiones de diseño

### ¿Por qué `Employer` y `Employee` son tablas separadas y no una sola con `role`?
Tienen responsabilidades, accesos y datos completamente distintos: el employer no tiene saldo de goldies, accede a una página diferente, y es creado por el admin (no se registra solo). Mezclarlos en una tabla con un campo `role` crearía columnas nullable innecesarias y haría más difícil razonar sobre permisos. Tablas separadas = código más claro.

### ¿Por qué el admin crea las cuentas de employer y no se registran solos?
El employer es un usuario de confianza que administra dinero (goldies) de una empresa. Que el admin los cree manualmente agrega una capa de control. Además simplifica el flujo: no hay formulario de registro, no hay verificación de email, el admin simplemente genera la cuenta y le pasa las credenciales.

### ¿Por qué goldies son integers y no decimales?
Simplicidad. Los puntos se asignan en números enteros y se consumen enteros. No hay fracciones de goldie.

### ¿Por qué el canje no descuenta puntos inmediatamente al iniciar?
Para evitar situaciones donde el pago de Stripe falla pero ya descontamos los puntos. El flujo correcto es: pago confirmado por webhook → descuento de puntos → notificación. Si el pago falla, el `RedemptionRequest` queda en `failed` y los goldies nunca se tocaron.

### ¿Por qué usamos Medusa para el catálogo si no es una tienda tradicional?
Medusa ya tiene CRUD de productos con imágenes, variantes, categorías y un panel de admin. Reutilizarlo nos ahorra semanas de trabajo. Solo le agregamos `goldie_price` y `company_category`.

### ¿Por qué no usamos el sistema de órdenes de Medusa?
El flujo de canje es demasiado custom (pago simbólico + notificación al admin + gestión manual). Sería más trabajo adaptar las órdenes de Medusa que construir nuestro propio `RedemptionRequest`.

### ¿Por qué `GoldieTransaction` tiene `amount` negativo para canjes?
Permite calcular el saldo en cualquier momento sumando todas las transacciones de una entidad: `SUM(amount)`. Negativo = salida de puntos. Positivo = entrada. Esto también hace más fácil construir un historial con una sola query.

---

## 13. Roadmap de desarrollo

### Fase 1 — Setup y estructura base (1-2 días)
- [ ] Instalar WSL2, Node 20, Docker, VS Code
- [ ] Crear proyecto Medusa 2
- [ ] Configurar PostgreSQL local con Docker
- [ ] Crear módulo `company` con modelos `Company`, `Employer`, `Employee`
- [ ] Crear módulo `goldie` con modelos `GoldieTransaction`, `RedemptionRequest`

### Fase 2 — Rutas de admin (2-3 días)
- [ ] CRUD de empresas (`/admin/companies`)
- [ ] Crear cuentas de employer y employee desde admin
- [ ] Asignación masiva de goldies a empresa
- [ ] Ver historial de transacciones y canjes

### Fase 3 — Rutas de empleador (1-2 días)
- [ ] Ver info y saldo de su empresa
- [ ] Listar, agregar y desactivar empleados
- [ ] Asignar goldies a empleados individuales

### Fase 4 — Rutas de empleado + catálogo (2-3 días)
- [ ] Ver perfil y saldo personal
- [ ] Catálogo filtrado por categoría de empresa
- [ ] Flujo de canje con cobro de 1€ (Stripe)
- [ ] Webhook de Stripe para confirmar pago y descontar goldies

### Fase 5 — Emails (1 día)
- [ ] Email al empleado: puntos recibidos
- [ ] Email al admin: nueva solicitud de canje (con todos los datos)
- [ ] Email al empleado: canje confirmado / cancelado

### Fase 6 — Testing y deployment (1-2 días)
- [ ] Variables de entorno de producción
- [ ] Deploy (a definir con el equipo)
- [ ] Configurar dominio y CORS

**Estimación total:** ~10-13 días de desarrollo

---

*Documento generado como base de trabajo. Actualizar a medida que evolucione el proyecto.*
