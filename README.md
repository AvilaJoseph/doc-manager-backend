# 🚛 FamilyTruck — API Backend

**Gestión de flotas de camiones como servicio (SaaS).**
FamilyTruck centraliza vehículos, conductores y documentación legal de una flota, y avisa **antes** de que un SOAT, una revisión tecnomecánica o una licencia de conducción se venzan. Menos multas, menos camiones inmovilizados y cero hojas de cálculo.

Este repositorio contiene la API REST que da servicio a la plataforma.

---

## ¿Para quién es?

Para empresas transportadoras, propietarios de uno o varios camiones y flotas familiares que necesitan:

- Saber en todo momento qué documentos están **vencidos o por vencer**.
- Tener el inventario de vehículos y la hoja de vida de sus conductores en un solo lugar.
- Llevar el control del **costo** de cada póliza y documento.
- Separar la información de cada cliente de forma segura (cada cuenta solo ve su flota).

## Funcionalidades

| Módulo | Qué ofrece |
| --- | --- |
| **Cuentas y acceso** | Registro e inicio de sesión con contraseñas cifradas (bcrypt) y sesiones con token JWT (2 h). |
| **Vehículos** | Alta, consulta, edición y baja lógica de camiones: placa, código interno, marca, modelo, año y kilometraje. Placa única dentro de cada flota. |
| **Conductores** | Hoja de vida del conductor: tipo y número de documento (CC, CE, pasaporte), teléfono, licencia y fecha de vencimiento. |
| **Documentos del vehículo** | SOAT, tecnomecánica, seguro de responsabilidad, póliza todo riesgo y otros, con fechas de expedición y vencimiento y costo. |
| **Dashboard de alertas** | Un solo endpoint con métricas de la flota y alertas de documentos y licencias **vencidos o que vencen en los próximos 30 días**, ordenados por urgencia. |

### Planes

Cada cuenta tiene un plan que limita cuántos vehículos activos puede registrar (campo `maxVehicles` del usuario). Al llegar al límite, la API responde `403` con un mensaje invitando a mejorar el plan.

| Plan | Pensado para | Vehículos (referencia) |
| --- | --- | --- |
| `FREE` | Probar el servicio / propietario de un camión | 1 |
| `PRO` | Flotas pequeñas | 5 |
| `ENTERPRISE` | Empresas transportadoras | Ilimitados |

> Todas las cuentas nuevas se crean en `FREE`. Por ahora la API no tiene cambio de plan ni cobros (ver [Hoja de ruta](#hoja-de-ruta)).

---

## Arquitectura

- **NestJS 11** + **TypeScript**
- **PostgreSQL 15** con **TypeORM**
- **Passport JWT** para autenticación
- **class-validator / class-transformer** para validar las entradas

```
src/
├── auth/              # Registro, login, estrategia JWT y decorador @GetUser()
├── user/              # Entidad User (tenant), plan y límites
├── vehicle/           # CRUD de vehículos
├── driver/            # CRUD de conductores (1:1 con vehículo)
├── vehicledocument/   # Documentos por vehículo (1:N)
└── dashboard/         # Métricas y alertas agregadas (sin tablas propias)
```

### Multi-tenant y seguridad

- **Aislamiento por cliente:** cada vehículo, conductor y documento pertenece a un `User`. Toda consulta filtra explícitamente por `user.id`, así que pedir el ID de un recurso ajeno devuelve `404`, no los datos.
- **Validación estricta:** `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`. Cualquier campo que no esté en el DTO (`user`, `isActive`, `plan`, `maxVehicles`…) se rechaza con `400`.
- **IDs seguros:** todos los parámetros `:id` pasan por `ParseUUIDPipe`.
- **Sin datos sensibles en las respuestas:** el hash de la contraseña nunca se selecciona (`select: false`) y las respuestas no incluyen el objeto `User`.
- **Baja lógica:** eliminar marca `isActive = false`, así se conserva el historial. Lo inactivo no aparece en listados, métricas ni alertas.

---

## Puesta en marcha

### Requisitos

- Node.js 20+
- Docker (para PostgreSQL) o una instancia de PostgreSQL 15+

### 1. Variables de entorno

```bash
cp .env.example .env
```

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto HTTP de la API (por defecto `3000`) |
| `APP_TIMEZONE` | Zona horaria IANA para calcular vencimientos (por defecto `America/Bogota`) |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Conexión a PostgreSQL (también las usa `docker-compose.yml`) |
| `JWT_SECRET` | Secreto para firmar tokens. Usa uno largo y aleatorio. |

### 2. Base de datos

```bash
docker compose up -d        # PostgreSQL en DB_PORT + Adminer en http://localhost:8080
```

### 3. API

```bash
npm install
npm run start:dev           # modo desarrollo con recarga
# npm run build && npm run start:prod
```

En desarrollo, TypeORM sincroniza el esquema automáticamente (`synchronize: true`).

---

## Referencia de la API

Todas las rutas, salvo `/auth/*`, requieren la cabecera `Authorization: Bearer <token>`.

### Autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/auth/register` | Crea una cuenta y devuelve el token. Body: `email`, `password`, `fullName` |
| `POST` | `/auth/login` | Inicia sesión y devuelve el token. Body: `email`, `password` |

La contraseña de registro debe tener mínimo 6 caracteres, una mayúscula, una minúscula y un número o carácter especial.

### Vehículos — `/vehicle`

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/vehicle` | Registra un vehículo (respeta el límite del plan) |
| `GET` | `/vehicle` | Lista los vehículos activos (año descendente) |
| `GET` | `/vehicle/:id` | Detalle de un vehículo |
| `PATCH` | `/vehicle/:id` | Actualiza un vehículo |
| `DELETE` | `/vehicle/:id` | Da de baja un vehículo |

### Conductores — `/driver`

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/driver` | Registra un conductor (opcional: `assignedVehicleId`) |
| `GET` | `/driver` | Lista los conductores activos |
| `GET` | `/driver/:id` | Detalle de un conductor |
| `PATCH` | `/driver/:id` | Actualiza un conductor |
| `DELETE` | `/driver/:id` | Desactiva un conductor |

### Documentos del vehículo — `/vehicle-document`

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/vehicle-document` | Registra un documento. `type`: `SOAT`, `TECNOMECANICA`, `SEGURO_RESPONSABILIDAD`, `POLIZA_ALL_RISK`, `OTRO` |
| `GET` | `/vehicle-document` | Lista los documentos activos con su vehículo |
| `GET` | `/vehicle-document/:id` | Detalle de un documento |
| `DELETE` | `/vehicle-document/:id` | Desactiva un documento |

Las fechas se envían en formato `YYYY-MM-DD`.

### Dashboard — `GET /dashboard/alerts`

Devuelve las métricas de la flota y las alertas de vencimiento de los próximos 30 días. `daysRemaining` es negativo si el documento ya venció.

```json
{
  "referenceDate": "2026-09-22",
  "alertWindowDays": 30,
  "metrics": {
    "activeVehicles": 1,
    "activeDrivers": 1,
    "expiredDocuments": 1,
    "expiringDocuments": 1,
    "expiredLicenses": 0,
    "expiringLicenses": 1
  },
  "alerts": {
    "vehicleDocuments": [
      {
        "idVehicleDocument": "e54fb420-…",
        "type": "SOAT",
        "documentNumber": "A-001",
        "expirationDate": "2026-09-01",
        "daysRemaining": -21,
        "isExpired": true,
        "vehicle": { "idVehicle": "17f41f0b-…", "licensePlate": "ABC123", "internalCode": null }
      }
    ],
    "driverLicenses": [
      {
        "idDriver": "c3ccec11-…",
        "fullName": "Juan Pérez",
        "licenseNumber": "LIC-001",
        "licenseExpirationDate": "2026-10-01",
        "daysRemaining": 9,
        "isExpired": false,
        "assignedVehicle": null
      }
    ]
  }
}
```

### Ejemplo rápido con cURL

```bash
TOKEN=$(curl -s -X POST localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@familytruck.co","password":"Demo123!"}' | jq -r .token)

curl -s localhost:3000/dashboard/alerts -H "Authorization: Bearer $TOKEN" | jq
```

---

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run start:dev` | Desarrollo con recarga automática |
| `npm run build` / `npm run start:prod` | Compilar y ejecutar en producción |
| `npm run lint` | ESLint + Prettier |
| `npm run test` / `npm run test:e2e` | Pruebas unitarias / end-to-end |

---

## Hoja de ruta

- [ ] Guardar correctamente la asignación conductor → vehículo (la relación 1:1 hoy no se persiste desde `Driver`) y evitar asignar un vehículo que ya tiene conductor.
- [ ] Gestión de planes y cobro de la suscripción (cambio de plan, `planExpiresAt`).
- [ ] Quitar `roles` del DTO de registro y hacer que el login no revele si un correo existe.
- [ ] Retirar los endpoints de ejemplo (`/user`, `/auth/private2`).
- [ ] Migraciones de TypeORM en lugar de `synchronize` para producción.
- [ ] Notificaciones automáticas (correo / WhatsApp) de vencimientos.
- [ ] Edición de documentos del vehículo (`PATCH /vehicle-document/:id`).

---

## Licencia

Software propietario. Todos los derechos reservados. Prohibido copiarlo, distribuirlo o usarlo sin autorización del titular.
