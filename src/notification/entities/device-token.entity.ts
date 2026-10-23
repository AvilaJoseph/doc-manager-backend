import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';

export enum DevicePlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

/**
 * Token de notificaciones push (FCM / APNs / Web Push) de un dispositivo.
 * Sin DB_SYNCHRONIZE, crear la tabla con el SQL de docs/notificaciones.sql.
 */
@Entity('device_tokens')
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  idDeviceToken: string;

  // Único global: si otro usuario inicia sesión en el mismo teléfono, el token pasa a esa cuenta
  @Column({ type: 'varchar', length: 512, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 10 })
  platform: DevicePlatform;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastSeenAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
