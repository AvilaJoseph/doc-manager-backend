-- =============================================================================
-- Notificaciones (web y apps móviles) — ejecutar UNA vez en la base de producción
-- (Supabase > SQL Editor). Es idempotente: volver a ejecutarlo no cambia nada.
-- Sin estas tablas, /notifications responde 500 y la campana usa las alertas
-- del dashboard como respaldo.
-- =============================================================================

-- Los nombres de las llaves foráneas son los que genera TypeORM: así el modo
-- DB_SYNCHRONIZE de desarrollo no intenta recrearlas.

-- Notificaciones guardadas por usuario: estado leída/no leída compartido entre clientes
CREATE TABLE IF NOT EXISTS "notifications" (
  "idNotification" uuid NOT NULL DEFAULT gen_random_uuid(),
  "type" varchar(40) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "title" varchar(150) NOT NULL,
  "body" varchar(500) NOT NULL,
  "link" varchar(200),
  "data" jsonb,
  "sourceKey" varchar(120) NOT NULL,
  "readAt" timestamptz,
  "resolvedAt" timestamptz,
  "pushedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "user_id" uuid NOT NULL,
  CONSTRAINT "PK_notifications" PRIMARY KEY ("idNotification"),
  CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Evita duplicados: una notificación por documento, vencimiento y nivel
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_notifications_user_source_severity"
  ON "notifications" ("user_id", "sourceKey", "severity");

-- Conteo de pendientes de la campana
CREATE INDEX IF NOT EXISTS "IDX_notifications_user_pending"
  ON "notifications" ("user_id", "resolvedAt", "readAt");

-- Tokens push de los dispositivos (FCM / APNs / Web Push) para la futura app móvil
CREATE TABLE IF NOT EXISTS "device_tokens" (
  "idDeviceToken" uuid NOT NULL DEFAULT gen_random_uuid(),
  "token" varchar(512) NOT NULL,
  "platform" varchar(10) NOT NULL,
  "lastSeenAt" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "user_id" uuid NOT NULL,
  CONSTRAINT "PK_device_tokens" PRIMARY KEY ("idDeviceToken"),
  CONSTRAINT "UQ_device_tokens_token" UNIQUE ("token"),
  CONSTRAINT "FK_17e1f528b993c6d55def4cf5bea" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);
