# Frontend Changelog (Backend → Frontend)

Registro numerado de cambios de API/flujos que el frontend debe consumir o implementar.
Cada entrada es autocontenida: endpoints, contratos, páginas requeridas y breaking changes.

**Convención:** incrementar el número mayor solo en breaking changes; el menor en features/fixes compatibles.

---

## v1 — Password reset + invite emails (2026-05-30)

### Resumen

- Reset de password nativo Medusa disponible para **admin** (`user`) y **agent/employee** (`customer`).
- Emails de reset e invite se generan en backend; en dev se loguean en terminal (provider local).
- Invites ahora emiten evento `invite.created` (workflow); el email incluye link a registro.

### Variables de entorno (backend)

| Variable | Uso |
|----------|-----|
| `STORE_URL` | Base del frontend store (agent/employee). Ej: `http://localhost:3000` |
| `MEDUSA_BACKEND_URL` | Base del backend para links de admin reset. Ej: `http://localhost:9000` |

---

### Flujo A — Forgot password (agent / employee)

**Actor Medusa:** `customer`

#### Paso 1 — Pantalla "Olvidé mi contraseña"

El frontend llama al backend (no usa `reset_url` acá):

```
POST /auth/customer/emailpass/reset-password
Content-Type: application/json

{ "identifier": "user@example.com" }
```

- Siempre responde éxito vacío (204/201) aunque el email no exista → **no mostrar** "email no encontrado".
- Mostrar mensaje genérico: *"Si el email existe, recibirás instrucciones"*.

#### Paso 2 — Email al usuario

El backend envía un email con link:

```
{STORE_URL}/reset-password?token={JWT}&email={email}
```

Ejemplo: `http://localhost:3000/reset-password?token=eyJhbG...&email=user%40example.com`

> **`reset_url` no es un endpoint.** Es la URL de una **página del frontend** que vos tenés que crear.

#### Paso 3 — Página `/reset-password` (frontend)

1. Leer query params: `token`, `email`
2. Mostrar formulario: nueva contraseña (+ confirmación)
3. Al submit:

```
POST /auth/customer/emailpass/update
Content-Type: application/json
Authorization: Bearer {token}    ← el token del query param, sin "Bearer" duplicado

{
  "email": "user@example.com",   ← del query param (decodeURIComponent)
  "password": "NuevaPass123!"
}
```

Respuesta OK: `{ "success": true }` → redirigir a login.

Errores comunes:
- `401` → token expirado o inválido (~15–20 min TTL default)
- `400` → password inválida según reglas del provider

---

### Flujo B — Forgot password (admin)

**Actor Medusa:** `user`

Mismo flujo que A, pero:

| Paso | Diferencia |
|------|------------|
| Request reset | `POST /auth/user/emailpass/reset-password` |
| Link en email | `{MEDUSA_BACKEND_URL}/app/reset-password?token=...&email=...` |
| Confirm reset | `POST /auth/user/emailpass/update` + `Authorization: Bearer {token}` |

Si el admin usa Medusa Admin embebido (`/app`), esa ruta ya existe ahí. Si tenés admin custom, creá la página equivalente.

---

### Flujo C — Invite (agent / employee onboarding)

#### Email al invitado

Link en el email:

```
{STORE_URL}/register?token={invite_token}
```

Ejemplo: `http://localhost:3000/register?token=abc123...`

#### Página `/register` (frontend)

1. Leer `token` del query param
2. Formulario: password (+ confirmación). Nombre/email vienen del invite server-side.
3. Al submit:

```
POST /auth/invite
Content-Type: application/json

{
  "token": "abc123...",
  "password": "MiPass123!"
}
```

Respuesta OK: `{ "success": true }` → redirigir a login (`POST /auth/customer/emailpass`).

#### Endpoints que disparan el email (no los llama el invitado)

| Quién | Endpoint |
|-------|----------|
| Admin | `POST /admin/companies/:id/agents` |
| Agent | `POST /agent/employees` |

Response (cambio): `{ "invite": { "id", "email", "token", "expires_at", "metadata", ... } }`  
Antes agents devolvía array; ahora siempre `{ invite: objeto }`.

---

### Flujo D — Cambio de password estando logueado (sin reset_url)

Ya existía; no usa email ni token.

```
PUT /employee/me/password   (employee, bearer token)
PUT /agent/me/password      (agent, bearer token)

{ "new_password": "..." }
```

---

### Páginas que el frontend debe implementar

| Ruta | Params | Acción backend al submit |
|------|--------|--------------------------|
| `/reset-password` | `token`, `email` | `POST /auth/customer/emailpass/update` o `/auth/user/...` según rol |
| `/register` | `token` | `POST /auth/invite` |
| Forgot password form | — | `POST /auth/.../reset-password` |

---

### Diagrama reset (agent/employee)

```
[Frontend forgot form]
        │
        ▼
POST /auth/customer/emailpass/reset-password
        │
        ▼ (email con link)
[Usuario abre reset_url en browser]
        │
        ▼
[Frontend /reset-password?token&email]
        │
        ▼
POST /auth/customer/emailpass/update  (Bearer token)
        │
        ▼
[Login]
```

---

### Notas

- Agent y employee comparten actor `customer`; el rol se resuelve post-login en middleware backend.
- En dev, los emails no salen por SMTP: revisar logs del backend para ver `reset_url` / `invite_url`.
- Prod: se reemplazará notification-local por SendGrid/Resend (mismos links, distinto delivery).
