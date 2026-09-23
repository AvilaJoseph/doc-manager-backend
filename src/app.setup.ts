import { INestApplication, ValidationPipe } from '@nestjs/common';

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
}
