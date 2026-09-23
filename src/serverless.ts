import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';

type ExpressHandler = (req: Request, res: Response) => void;

// La instancia se reutiliza entre invocaciones de la misma función "caliente":
// solo el arranque en frío paga el costo de levantar Nest y conectar a la BD.
let cachedServer: Promise<ExpressHandler> | undefined;

async function bootstrapServer(): Promise<ExpressHandler> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance() as ExpressHandler;
}

export default async function handler(req: Request, res: Response) {
  cachedServer ??= bootstrapServer().catch((error: unknown) => {
    // Si el arranque falla (p. ej. BD caída) la siguiente invocación lo reintenta
    cachedServer = undefined;
    throw error;
  });

  const server = await cachedServer;
  server(req, res);
}
