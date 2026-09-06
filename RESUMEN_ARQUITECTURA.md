# Resumen Arquitectónico: PAE School Backend
**Última actualización:** 2026-09-06

Sistema monolítico modular con principios empresariales construido sobre Node.js + Express + Drizzle ORM + Supabase (PostgreSQL).

---

## 1. Tecnologías Clave

| Tecnología | Rol |
|---|---|
| Node.js + Express.js | Servidor HTTP y enrutamiento |
| PostgreSQL (Supabase) | Base de datos relacional en la nube |
| Drizzle ORM + drizzle-kit | Mapeo de tablas y migraciones (`npx drizzle-kit push`) |
| jsonwebtoken (JWT) | Autenticación stateless con tokens de 8h |
| bcrypt | Hasheo irreversible de contraseñas |
| crypto (Node built-in) | Cifrado AES-256-CBC de datos sensibles (cédula) |

---

## 2. Estructura de Directorios

```
backend/
├── server.js                  # Entry point, registra middlewares globales
├── .env                       # Variables de entorno (NO subir a git)
├── db/                        # Instancia de conexión a Supabase
├── models/schema/             # Definición de tablas (Drizzle ORM)
│   ├── roles.js
│   ├── users_credentials.js   # email, password_hash, STATUS de cuenta
│   ├── users.js               # user_profiles con id_school, id_zone
│   ├── schools.js             # schools con campo zone
│   ├── categories.js
│   ├── products.js
│   ├── inventory.js           # batch_inventory
│   └── operations.js          # daily_deliveries, daily_attendance, decrease
├── middlewares/
│   └── authMiddleware.js      # verificarToken, checkRole, checkZona
├── controllers/
│   ├── authController.js
│   ├── users.controller.js
│   ├── schools.controller.js
│   ├── roles.controller.js
│   ├── categories.controller.js
│   ├── products.controller.js
│   ├── inventoryController.js
│   ├── operationsController.js
│   ├── deliveries.controller.js
│   ├── decreases.controller.js
│   ├── transactionController.js
│   └── dashboardController.js
├── routes/
│   ├── index.js               # Concentrador de todas las rutas bajo /api
│   └── *.routes.js / *.js
└── utils/
    └── crypto.js              # encryptWithIV() y decrypt() para cédulas
```

---

## 3. Esquema de Base de Datos

### Diagrama de Relaciones

```
schools
  id_school PK
  name
  address
  zone             ← "1" a "7" (zonas educativas Ecuador)

roles
  id_role PK
  name             ← 'super admin' | 'admin zonal' | 'director' | 'soporte local' | 'operador'
  description

user_credentials
  id_credential PK
  email UNIQUE
  password_hash    ← bcrypt
  status           ← 'active' | 'suspended' | 'blocked'  (NUEVO)

user_profiles
  id_profile PK
  cedula UNIQUE    ← cifrado AES-256 en BD (NUEVO)
  name
  last_name
  phone
  id_role FK → roles
  id_credential FK → user_credentials
  id_school FK → schools  ← escuela asignada (null para Super Admin / Admin Zonal)
  id_zone          ← zona asignada al Admin Zonal (1-7, null para otros) (NUEVO)

product_categories
  id_category PK
  name

product_catalog
  id_product PK
  name
  id_category FK → product_categories

batch_inventory
  id_batch_inventory PK
  id_product FK
  id_school FK     ← multi-tenant
  total_quantity
  entry_date
  expiration_date

daily_attendance
  id_daily_attendance PK
  date
  student_quantity
  id_school FK

daily_deliveries
  id_daily_deliveries PK
  date
  id_batch_inventory FK
  quantity_delivered
  id_school FK
  id_profile FK

decrease
  id_decrease PK
  date
  id_batch_inventory FK
  quantity_leftover
  reason
  id_school FK
  id_profile FK
```

---

## 4. Sistema de Roles y Permisos

### Jerarquía

```
Super Admin
  └── Ve y gestiona TODO (todas las zonas, todas las escuelas)
  └── Sin restricción en ningún endpoint

Admin Zonal (id_zone: 1-7)
  └── Solo ve y gestiona escuelas de su zona asignada
  └── No puede crear/modificar/eliminar datos de otras zonas

Director (id_school: asignado)
  └── Opera dentro de su escuela
  └── Accede a reportes y asistencia

Soporte Local (id_school: asignado)
  └── Soporte técnico de su escuela

Operador (id_school: asignado)
  └── Registra entregas, mermas, asistencia
  └── Ve alertas de inventario
```

### Roles en BD (tabla `roles`)
Los nombres deben existir EXACTAMENTE así (en minúsculas):

| id_role | name | Nivel |
|---|---|---|
| 1 | `super admin` | Global |
| 2 | `admin zonal` | Zona 1-7 |
| 3 | `director` | Escuela |
| 4 | `soporte local` | Escuela |
| 5 | `operador` | Escuela |

### Campos importantes por rol

| Campo | Super Admin | Admin Zonal | Director/Operador |
|---|---|---|---|
| `id_school` | null | null | requerido |
| `id_zone` | null | 1-7 | null |

---

## 5. Middlewares de Seguridad

```
verificarToken → Lee y valida el JWT del header Authorization: Bearer <token>
     ↓
checkRole('Director', 'Operator') → Verifica que el rol del usuario esté permitido
     ↓
checkZona → Inyecta req.zonaFilter:
            - Super Admin  → req.zonaFilter = null  (sin restricción)
            - Admin Zonal  → req.zonaFilter = id_zone (ej: 3)
            - Otros roles  → req.zonaFilter = null
```

`req.zonaFilter` es leído por los controllers para filtrar automáticamente.

---

## 6. Cifrado de Datos Sensibles (LOPDP)

| Dato | Protección |
|---|---|
| Contraseña | bcrypt (hash irreversible) |
| Cédula en BD | AES-256-CBC cifrado (NUEVO) |
| Datos en tránsito | HTTPS/TLS |
| JWT | Firmado con JWT_SECRET |

### Cómo funciona el cifrado de cédula

- Al **crear/editar** usuario → `encryptWithIV(cedula)` antes de insertar en BD
- Al **leer** usuarios → `decrypt(cedula)` automático antes de responder
- En **login** → `decrypt(cedula)` antes de incluir en el JWT
- La **ENCRYPTION_KEY** (32 bytes, 64 hex chars) vive en `.env` — nunca en git

---

## 7. Catálogo Completo de Endpoints

### Autenticación
| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/login` | Público | Retorna JWT + perfil. Verifica status de cuenta. |

### Gestión de Usuarios
| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/users` | Admin (filtrado por zona) | Lista usuarios. Admin Zonal solo ve su zona. |
| POST | `/api/users` | Admin (filtrado por zona) | Crea usuario + credenciales. Cédula cifrada. |
| PUT | `/api/users/:id` | Admin (filtrado por zona) | Actualiza perfil. |
| DELETE | `/api/users/:id` | Admin (filtrado por zona) | Elimina perfil + credenciales. |
| **PATCH** | **`/api/users/:id/status`** | **Admin (filtrado por zona)** | **Activa / suspende / bloquea cuenta.** |

Body para cambiar estado:
```json
{ "status": "suspended" }   // "active" | "suspended" | "blocked"
```

### Gestión de Escuelas
| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/schools` | Admin (filtrado por zona) | Lista escuelas. Admin Zonal solo su zona. |
| GET | `/api/schools/:id` | Admin (filtrado por zona) | Detalle de escuela. |
| POST | `/api/schools` | Admin (filtrado por zona) | Crea escuela. Admin Zonal fuerza su zona. |
| PUT | `/api/schools/:id` | Admin (filtrado por zona) | Actualiza escuela de su zona. |
| DELETE | `/api/schools/:id` | Admin (filtrado por zona) | Elimina escuela de su zona. |

### Catálogos (lectura libre para logueados, escritura solo admin)
| Método | Endpoint | Descripción |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/roles` | CRUD de roles |
| GET/POST/PUT/DELETE | `/api/categories` | CRUD de categorías |
| GET/POST/PUT/DELETE | `/api/products` | CRUD de productos |

### Inventario
| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/inventory/batch` | Admin/Operador | Registra lote con FEFO (fecha expiración) |
| GET | `/api/inventory/batches/:id_product` | Admin/Operador | Lotes disponibles ordenados por expiración |

### Transacciones Diarias
| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/attendance` | Director/Operador | Registra asistencia del día |
| POST | `/api/deliveries` | Operador | Entrega + descuenta stock automáticamente |
| POST | `/api/decreases` | Operador | Registra merma/sobrante |

### Reportes y Alertas
| Método | Endpoint | Acceso | QueryParams | Descripción |
|---|---|---|---|---|
| GET | `/api/reports/daily` | Director/Admin | `?date=YYYY-MM-DD` | Reporte diario completo |
| GET | `/api/reports/daily` | Director/Admin | `?date=...&id_school=5` | Reporte de escuela específica |
| GET | `/api/alerts/expiring` | Operador/Admin | `?id_school=5` (opcional) | Lotes a vencer en 15 días |

**Comportamiento por rol en reportes:**
- **Super Admin**: sin `?id_school` → todas las escuelas; con `?id_school=X` → solo esa
- **Admin Zonal**: sin `?id_school` → todas las escuelas de su zona; con `?id_school=X` válido de su zona → solo esa; con escuela de otra zona → **403**

---

## 8. Estructura del JWT

El token decodificado contiene:

```json
{
  "id_profile": 1,
  "cedula": "1712345678",      ← descifrada
  "name": "Juan",
  "last_name": "Pérez",
  "email": "juan@escuela.edu",
  "phone": "0991234567",
  "role": "admin zonal",       ← nombre del rol
  "id_role": 2,
  "id_school": null,           ← null si Admin Zonal / Super Admin
  "school_name": null,
  "id_zone": 3,                ← zona asignada (null si no aplica)
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## 9. Guía para el Dashboard Web

### Vista: Super Admin
**Endpoints a consumir:**
- `GET /api/users` → tabla de todos los usuarios con estado
- `PATCH /api/users/:id/status` → cambiar estado de cuentas
- `GET /api/schools` → todas las escuelas del país
- `GET /api/reports/daily?date=...` → reporte nacional
- `GET /api/alerts/expiring` → alertas de todo el inventario
- `GET /api/roles`, `GET /api/categories`, `GET /api/products` → catálogos

**Datos del JWT para mostrar:** `name`, `last_name`, `role` = "super admin"

---

### Vista: Admin Zonal
**Endpoints a consumir:** (mismos que Super Admin, el backend filtra automáticamente)
- `GET /api/users` → solo usuarios de su zona
- `PATCH /api/users/:id/status` → solo cuentas de su zona
- `GET /api/schools` → solo escuelas de su zona
- `GET /api/reports/daily?date=...` → reporte de su zona
- `GET /api/reports/daily?date=...&id_school=X` → reporte de una escuela específica
- `GET /api/alerts/expiring` → alertas de su zona

**Datos del JWT para mostrar:** `name`, `last_name`, `role` = "admin zonal", `id_zone`

---

### Vista: Soporte Local / Director
**Endpoints a consumir:**
- `GET /api/reports/daily?date=...` → reporte de su escuela (filtra por `id_school` del JWT)
- `GET /api/alerts/expiring` → alertas de su escuela
- `GET /api/inventory/batches/:id_product` → stock disponible
- `POST /api/attendance` → registrar asistencia

**Datos del JWT para mostrar:** `name`, `last_name`, `school_name`, `role`

---

## 10. Comandos de Desarrollo

```bash
# Iniciar servidor en desarrollo
npm run dev

# Aplicar cambios de schema directamente a Supabase
npx drizzle-kit push --config=drizzle.config.js

# Generar archivo de migración SQL (sin aplicar)
npx drizzle-kit generate --config=drizzle.config.js
```

---

> [!IMPORTANT]
> La `ENCRYPTION_KEY` del `.env` nunca debe perderse. Si se pierde, todas las cédulas almacenadas son irrecuperables. Haz una copia segura de tu `.env` completo.

> [!TIP]
> Para agregar una nueva columna: modifica el schema en `models/schema/`, luego ejecuta `npx drizzle-kit push` y Supabase se actualiza automáticamente.
