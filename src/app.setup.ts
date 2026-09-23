import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Orígenes permitidos si no se define CORS_ORIGINS: servidores de desarrollo de Vite y Next.js
const DEFAULT_CORS_ORIGINS =
  'http://localhost:5173,http://localhost:3000,http://localhost:3001';

// Configuración compartida entre el servidor local (main.ts) y la función serverless (serverless.ts)
export function configureApp(app: INestApplication): void {
  // Sin este pipe los decoradores de class-validator de los DTOs no se ejecutan
  // y cualquier propiedad del body (user, isActive, plan, maxVehicles...) llega al ORM.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // El frontend corre en otro dominio: sin CORS el navegador bloquea las peticiones.
  // En producción: CORS_ORIGINS=https://tu-frontend.vercel.app (separados por coma)
  const origins = app
    .get(ConfigService)
    .get<string>('CORS_ORIGINS', DEFAULT_CORS_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
