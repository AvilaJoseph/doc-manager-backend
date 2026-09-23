import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as pg from 'pg';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { DriverModule } from './driver/driver.module';
import { VehicledocumentModule } from './vehicledocument/vehicledocument.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdvisorModule } from './advisor/advisor.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const sslCa = configService.get<string>('DB_SSL_CA');

        return {
          type: 'postgres',
          // Driver explícito: TypeORM lo carga dinámicamente y el bundler de Vercel no lo detectaría
          driver: pg,
          // DATABASE_URL (Supabase / producción) tiene prioridad sobre las variables sueltas (Docker local)
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: configService.get<string>('DB_HOST'),
                port: Number(configService.get<string>('DB_PORT', '5432')),
                username: configService.get<string>('DB_USERNAME'),
                password: configService.get<string>('DB_PASSWORD') ?? '',
                database: configService.get<string>('DB_NAME'),
              }),
          // Con DB_SSL_CA (certificado de Supabase) se verifica el servidor;
          // sin él la conexión va cifrada pero sin validar la cadena de certificados.
          ssl:
            configService.get<string>('DB_SSL') === 'true'
              ? sslCa
                ? { ca: sslCa.replace(/\\n/g, '\n'), rejectUnauthorized: true }
                : { rejectUnauthorized: false }
              : false,
          // Pool pequeño en serverless: cada instancia de la función abre su propio pool
          extra: {
            max: Number(configService.get<string>('DB_POOL_MAX', '10')),
          },
          autoLoadEntities: true,
          // Nunca activar en producción: puede borrar columnas y datos al cambiar entidades
          synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
        };
      },
    }),
    UserModule,
    AuthModule,
    VehicleModule,
    DriverModule,
    VehicledocumentModule,
    DashboardModule,
    AdvisorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
