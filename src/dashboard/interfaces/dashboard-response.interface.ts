import { DocumentType as VehicleDocumentType } from 'src/vehicledocument/entities/vehicledocument.entity';

export interface VehicleSummary {
  idVehicle: string;
  licensePlate: string;
  internalCode: string | null;
}

export interface VehicleDocumentAlert {
  idVehicleDocument: string;
  type: VehicleDocumentType;
  documentNumber: string;
  expirationDate: string; // YYYY-MM-DD
  daysRemaining: number; // negativo = días transcurridos desde el vencimiento
  isExpired: boolean;
  vehicle: VehicleSummary;
}

export interface DriverLicenseAlert {
  idDriver: string;
  fullName: string;
  licenseNumber: string;
  licenseExpirationDate: string; // YYYY-MM-DD
  daysRemaining: number;
  isExpired: boolean;
  assignedVehicle: VehicleSummary | null;
}

export interface DashboardMetrics {
  activeVehicles: number;
  activeDrivers: number;
  expiredDocuments: number;
  expiringDocuments: number;
  expiredLicenses: number;
  expiringLicenses: number;
}

export interface DashboardResponse {
  referenceDate: string; // YYYY-MM-DD en la zona horaria de la app
  alertWindowDays: number;
  metrics: DashboardMetrics;
  alerts: {
    vehicleDocuments: VehicleDocumentAlert[];
    driverLicenses: DriverLicenseAlert[];
  };
}
