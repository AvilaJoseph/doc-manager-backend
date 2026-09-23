import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { VehicleDocument } from 'src/vehicledocument/entities/vehicledocument.entity';
import { User } from 'src/user/entities/user.entity';
import {
  DashboardResponse,
  DriverLicenseAlert,
  VehicleDocumentAlert,
  VehicleSummary,
} from './interfaces/dashboard-response.interface';

const ALERT_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  private readonly timeZone: string;

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(VehicleDocument)
    private readonly docRepository: Repository<VehicleDocument>,
    configService: ConfigService,
  ) {
    this.timeZone = configService.get<string>('APP_TIMEZONE', 'America/Bogota');
  }

  async getMetricsAndAlerts(user: User): Promise<DashboardResponse> {
    const today = this.todayDateString();
    const limitDate = this.addDays(today, ALERT_WINDOW_DAYS);

    // Las cuatro consultas son independientes: se ejecutan en paralelo.
    // Todas filtran explícitamente por user.id (aislamiento multi-tenant).
    const [activeVehicles, activeDrivers, documents, drivers] =
      await Promise.all([
        this.vehicleRepository.count({
          where: { user: { id: user.id }, isActive: true },
        }),
        this.driverRepository.count({
          where: { user: { id: user.id }, isActive: true },
        }),
        this.docRepository.find({
          select: {
            idVehicleDocument: true,
            type: true,
            documentNumber: true,
            expirationDate: true,
            vehicle: {
              idVehicle: true,
              licensePlate: true,
              internalCode: true,
            },
          },
          where: {
            user: { id: user.id },
            isActive: true,
            expirationDate: LessThanOrEqual(limitDate),
            // Documentos de vehículos dados de baja no generan alertas
            vehicle: { isActive: true },
          },
          relations: { vehicle: true },
          order: { expirationDate: 'ASC' },
        }),
        this.driverRepository.find({
          select: {
            idDriver: true,
            fullName: true,
            licenseNumber: true,
            licenseExpirationDate: true,
            assignedVehicle: {
              idVehicle: true,
              licensePlate: true,
              internalCode: true,
              isActive: true,
            },
          },
          where: {
            user: { id: user.id },
            isActive: true,
            licenseExpirationDate: LessThanOrEqual(limitDate),
          },
          relations: { assignedVehicle: true },
          order: { licenseExpirationDate: 'ASC' },
        }),
      ]);

    const vehicleDocuments: VehicleDocumentAlert[] = documents.map((doc) => {
      const daysRemaining = this.diffInDays(doc.expirationDate, today);
      return {
        idVehicleDocument: doc.idVehicleDocument,
        type: doc.type,
        documentNumber: doc.documentNumber,
        expirationDate: doc.expirationDate,
        daysRemaining,
        isExpired: daysRemaining < 0,
        vehicle: this.toVehicleSummary(doc.vehicle),
      };
    });

    const driverLicenses: DriverLicenseAlert[] = drivers.map((driver) => {
      const daysRemaining = this.diffInDays(
        driver.licenseExpirationDate,
        today,
      );
      const vehicle = driver.assignedVehicle;
      return {
        idDriver: driver.idDriver,
        fullName: driver.fullName,
        licenseNumber: driver.licenseNumber,
        licenseExpirationDate: driver.licenseExpirationDate,
        daysRemaining,
        isExpired: daysRemaining < 0,
        assignedVehicle: vehicle?.isActive
          ? this.toVehicleSummary(vehicle)
          : null,
      };
    });

    const expiredDocuments = vehicleDocuments.filter((d) => d.isExpired).length;
    const expiredLicenses = driverLicenses.filter((d) => d.isExpired).length;

    return {
      referenceDate: today,
      alertWindowDays: ALERT_WINDOW_DAYS,
      metrics: {
        activeVehicles,
        activeDrivers,
        expiredDocuments,
        expiringDocuments: vehicleDocuments.length - expiredDocuments,
        expiredLicenses,
        expiringLicenses: driverLicenses.length - expiredLicenses,
      },
      alerts: { vehicleDocuments, driverLicenses },
    };
  }

  private toVehicleSummary(vehicle: Vehicle): VehicleSummary {
    return {
      idVehicle: vehicle.idVehicle,
      licensePlate: vehicle.licensePlate,
      internalCode: vehicle.internalCode ?? null,
    };
  }

  /** Fecha de hoy (YYYY-MM-DD) en la zona horaria del negocio, no la del servidor. */
  private todayDateString(): string {
    // 'en-CA' formatea como YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private addDays(date: string, days: number): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days))
      .toISOString()
      .slice(0, 10);
  }

  /** Días de calendario entre dos fechas YYYY-MM-DD (to - from). */
  private diffInDays(to: string, from: string): number {
    return Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        MS_PER_DAY,
    );
  }
}
