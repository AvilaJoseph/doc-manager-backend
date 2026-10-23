import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';

export enum NotificationType {
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED',
  LICENSE_EXPIRING = 'LICENSE_EXPIRING',
  LICENSE_EXPIRED = 'LICENSE_EXPIRED',
}

// Mismos niveles y límites que usa el frontend para las alertas
export enum NotificationSeverity {
  EXPIRED = 'EXPIRED',
  CRITICAL = 'CRITICAL', // ≤ 5 días
  WARNING = 'WARNING', // ≤ 15 días
  UPCOMING = 'UPCOMING', // ≤ 30 días
}

/**
 * Notificación guardada por usuario: la comparten la web y las apps móviles
 * (mismo estado de leída). Sin DB_SYNCHRONIZE, crear la tabla con el SQL de
 * docs/notificaciones.sql.
 */
@Entity('notifications')
// Una notificación por documento, vencimiento y nivel: volver a sincronizar no la duplica
@Index(
  'UQ_notifications_user_source_severity',
  ['user', 'sourceKey', 'severity'],
  {
    unique: true,
  },
)
@Index('IDX_notifications_user_pending', ['user', 'resolvedAt', 'readAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  idNotification: string;

  @Column({ type: 'varchar', length: 40 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 20 })
  severity: NotificationSeverity;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  body: string;

  // Ruta de la web a la que lleva la notificación; la app móvil usa `data`
  @Column({ type: 'varchar', length: 200, nullable: true })
  link: string | null;

  // Ids y fechas del origen, para abrir la pantalla correcta en cualquier cliente
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, string> | null;

  // Origen de la alerta: "doc:<id>:<vencimiento>" o "license:<idDriver>:<vencimiento>"
  @Column({ type: 'varchar', length: 120 })
  sourceKey: string;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  // El documento se renovó, se eliminó o pasó a un nivel más grave: deja de contar como pendiente
  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  // Reservado para el envío push: el despachador marcará aquí cuándo la envió
  @Column({ type: 'timestamptz', nullable: true })
  pushedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
