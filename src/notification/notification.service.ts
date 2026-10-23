import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Repository } from 'typeorm';

import { User } from 'src/user/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import {
  DocumentType,
  VehicleDocument,
} from 'src/vehicledocument/entities/vehicledocument.entity';
import {
  addDays,
  diffInDays,
  resolveTimeZone,
  todayDateString,
} from 'src/common/business-date';
import {
  Notification,
  NotificationSeverity,
  NotificationType,
} from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import {
  NotificationItem,
  NotificationListResponse,
} from './interfaces/notification-response.interface';

// Misma ventana que el dashboard de alertas
const ALERT_WINDOW_DAYS = 30;
const DEFAULT_LIMIT = 30;

// Límites inclusivos en días, iguales a los del frontend
const SEVERITY_THRESHOLDS = { CRITICAL: 5, WARNING: 15 } as const;
const SEVERITY_RANK = [
  NotificationSeverity.EXPIRED,
  NotificationSeverity.CRITICAL,
  NotificationSeverity.WARNING,
  NotificationSeverity.UPCOMING,
];

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  [DocumentType.SOAT]: 'SOAT',
  [DocumentType.TECNOMECANICA]: 'Tecnomecánica',
  [DocumentType.SEGURO_RESPONSABILIDAD]: 'Seguro de responsabilidad',
  [DocumentType.POLIZA_ALL_RISK]: 'Póliza todo riesgo',
  [DocumentType.OTRO]: 'Documento',
};

const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

// Alerta vigente calculada a partir de documentos y licencias
interface AlertSource {
  sourceKey: string;
  severity: NotificationSeverity;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  data: Record<string, string>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly timeZone: string;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private readonly deviceRepository: Repository<DeviceToken>,
    @InjectRepository(VehicleDocument)
    private readonly docRepository: Repository<VehicleDocument>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    configService: ConfigService,
  ) {
    this.timeZone = resolveTimeZone(
      configService.get<string>('APP_TIMEZONE'),
      this.logger,
    );
  }

  async findAll(
    user: User,
    options: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<NotificationListResponse> {
    await this.sync(user);

    const [items, unreadCount] = await Promise.all([
      this.notificationRepository.find({
        where: {
          user: { id: user.id },
          ...(options.unreadOnly
            ? { readAt: IsNull(), resolvedAt: IsNull() }
            : {}),
        },
        // Pendientes primero; dentro de cada grupo, la más reciente arriba
        order: {
          resolvedAt: { direction: 'DESC', nulls: 'FIRST' },
          createdAt: 'DESC',
        },
        take: options.limit ?? DEFAULT_LIMIT,
      }),
      this.countUnread(user),
    ]);

    // Las que se crean en la misma sincronización comparten fecha: entre las
    // pendientes, la más grave va primero (un vencido antes que uno por vencer)
    const pendingRank = (item: Notification) =>
      item.resolvedAt
        ? SEVERITY_RANK.length
        : SEVERITY_RANK.indexOf(item.severity);
    const sorted = items
      .map((item, index) => ({ item, index }))
      .sort(
        (a, b) =>
          pendingRank(a.item) - pendingRank(b.item) || a.index - b.index,
      )
      .map(({ item }) => this.toItem(item));

    return { items: sorted, unreadCount };
  }

  async getUnreadCount(user: User): Promise<{ unreadCount: number }> {
    await this.sync(user);
    return { unreadCount: await this.countUnread(user) };
  }

  async markAsRead(id: string, user: User): Promise<NotificationItem> {
    const notification = await this.notificationRepository.findOne({
      where: { idNotification: id, user: { id: user.id } },
    });
    if (!notification) {
      throw new NotFoundException(`Notificación con id ${id} no encontrada`);
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }
    return this.toItem(notification);
  }

  async markAllAsRead(user: User): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      { user: { id: user.id }, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }

  /** Registra (o reasigna) el token push del dispositivo con el que el usuario inició sesión. */
  async registerDevice(dto: RegisterDeviceDto, user: User) {
    await this.deviceRepository
      .createQueryBuilder()
      .insert()
      .into(DeviceToken)
      .values({
        token: dto.token,
        platform: dto.platform,
        user: { id: user.id },
      })
      .orUpdate(['platform', 'user_id', 'lastSeenAt'], ['token'])
      .execute();

    return { message: 'Dispositivo registrado para notificaciones' };
  }

  /** Al cerrar sesión en el móvil: el dispositivo deja de recibir push de esta cuenta. */
  async unregisterDevice(token: string, user: User) {
    await this.deviceRepository.delete({ token, user: { id: user.id } });
    return { message: 'Dispositivo eliminado' };
  }

  /**
   * Alinea las notificaciones guardadas con las alertas actuales:
   * - crea una por cada documento o licencia que entra a un nivel (vencido, crítico...)
   * - resuelve las de documentos renovados, eliminados o que subieron de nivel.
   * Se ejecuta bajo demanda al consultar, así funciona en serverless sin un cron.
   */
  async sync(user: User): Promise<void> {
    const alerts = await this.currentAlerts(user);

    if (alerts.length > 0) {
      // ON CONFLICT DO NOTHING: dos pestañas sincronizando a la vez no duplican ni fallan
      await this.notificationRepository
        .createQueryBuilder()
        .insert()
        .into(Notification)
        .values(alerts.map((alert) => ({ ...alert, user: { id: user.id } })))
        .orIgnore()
        .execute();
    }

    const pending = await this.notificationRepository.find({
      select: { idNotification: true, sourceKey: true, severity: true },
      where: { user: { id: user.id }, resolvedAt: IsNull() },
    });

    const active = new Set(
      alerts.map((alert) => `${alert.sourceKey}|${alert.severity}`),
    );
    const stale = pending
      .filter((item) => !active.has(`${item.sourceKey}|${item.severity}`))
      .map((item) => item.idNotification);

    if (stale.length > 0) {
      await this.notificationRepository.update(
        { idNotification: In(stale) },
        { resolvedAt: new Date() },
      );
    }
  }

  private countUnread(user: User): Promise<number> {
    return this.notificationRepository.count({
      where: { user: { id: user.id }, readAt: IsNull(), resolvedAt: IsNull() },
    });
  }

  private async currentAlerts(user: User): Promise<AlertSource[]> {
    const today = todayDateString(this.timeZone);
    const limitDate = addDays(today, ALERT_WINDOW_DAYS);

    const [documents, drivers] = await Promise.all([
      // Todos los documentos activos: hacen falta para saber cuál es el vigente de cada tipo
      this.docRepository.find({
        select: {
          idVehicleDocument: true,
          type: true,
          documentNumber: true,
          expirationDate: true,
          vehicle: { idVehicle: true, licensePlate: true, internalCode: true },
        },
        where: {
          user: { id: user.id },
          isActive: true,
          vehicle: { isActive: true },
        },
        relations: { vehicle: true },
      }),
      this.driverRepository.find({
        select: {
          idDriver: true,
          fullName: true,
          licenseNumber: true,
          licenseExpirationDate: true,
        },
        where: {
          user: { id: user.id },
          isActive: true,
          licenseExpirationDate: LessThanOrEqual(limitDate),
        },
      }),
    ]);

    const docAlerts = this.latestByType(documents)
      .filter((doc) => doc.expirationDate <= limitDate)
      .map((doc) => this.fromDocument(doc, today));
    const licenseAlerts = drivers.map((driver) =>
      this.fromDriver(driver, today),
    );

    return [...docAlerts, ...licenseAlerts];
  }

  // Si un SOAT se renovó sin desactivar el anterior, solo alerta el de vencimiento más lejano
  private latestByType(documents: VehicleDocument[]): VehicleDocument[] {
    const latest = new Map<string, VehicleDocument>();
    for (const doc of documents) {
      const key =
        doc.type === DocumentType.OTRO
          ? doc.idVehicleDocument
          : `${doc.vehicle.idVehicle}:${doc.type}`;
      const current = latest.get(key);
      if (!current || doc.expirationDate > current.expirationDate) {
        latest.set(key, doc);
      }
    }
    return [...latest.values()];
  }

  private fromDocument(doc: VehicleDocument, today: string): AlertSource {
    const severity = this.severityFor(diffInDays(doc.expirationDate, today));
    const expired = severity === NotificationSeverity.EXPIRED;
    const label = DOCUMENT_LABELS[doc.type];
    const vehicle = this.vehicleLabel(doc.vehicle);

    return {
      sourceKey: `doc:${doc.idVehicleDocument}:${doc.expirationDate}`,
      severity,
      type: expired
        ? NotificationType.DOCUMENT_EXPIRED
        : NotificationType.DOCUMENT_EXPIRING,
      title: `${label} ${expired ? 'vencido' : 'por vencer'} · ${vehicle}`,
      body: expired
        ? `Venció el ${this.formatDate(doc.expirationDate)}. Renuévalo para evitar multas o la inmovilización del vehículo.`
        : `Vence el ${this.formatDate(doc.expirationDate)}. Programa la renovación a tiempo.`,
      link: '/document',
      data: {
        idVehicleDocument: doc.idVehicleDocument,
        documentType: doc.type,
        expirationDate: doc.expirationDate,
        idVehicle: doc.vehicle.idVehicle,
        licensePlate: doc.vehicle.licensePlate,
      },
    };
  }

  private fromDriver(driver: Driver, today: string): AlertSource {
    const severity = this.severityFor(
      diffInDays(driver.licenseExpirationDate, today),
    );
    const expired = severity === NotificationSeverity.EXPIRED;
    const date = this.formatDate(driver.licenseExpirationDate);

    return {
      sourceKey: `license:${driver.idDriver}:${driver.licenseExpirationDate}`,
      severity,
      type: expired
        ? NotificationType.LICENSE_EXPIRED
        : NotificationType.LICENSE_EXPIRING,
      title: `Licencia ${expired ? 'vencida' : 'por vencer'} · ${driver.fullName}`,
      body: expired
        ? `Venció el ${date}. El conductor no debería operar hasta renovarla.`
        : `Vence el ${date}. Recuérdale al conductor renovarla.`,
      link: '/drivers',
      data: {
        idDriver: driver.idDriver,
        expirationDate: driver.licenseExpirationDate,
      },
    };
  }

  private severityFor(daysRemaining: number): NotificationSeverity {
    if (daysRemaining < 0) return NotificationSeverity.EXPIRED;
    if (daysRemaining <= SEVERITY_THRESHOLDS.CRITICAL)
      return NotificationSeverity.CRITICAL;
    if (daysRemaining <= SEVERITY_THRESHOLDS.WARNING)
      return NotificationSeverity.WARNING;
    return NotificationSeverity.UPCOMING;
  }

  private vehicleLabel(vehicle: Vehicle): string {
    return vehicle.internalCode
      ? `${vehicle.licensePlate} (${vehicle.internalCode})`
      : vehicle.licensePlate;
  }

  // "16 oct 2026" a partir de YYYY-MM-DD
  private formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    return `${day} ${MONTHS[month - 1]} ${year}`;
  }

  private toItem(notification: Notification): NotificationItem {
    return {
      idNotification: notification.idNotification,
      type: notification.type,
      severity: notification.severity,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      data: notification.data,
      isRead: notification.readAt !== null,
      isResolved: notification.resolvedAt !== null,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    };
  }
}
