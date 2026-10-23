import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { User } from 'src/user/entities/user.entity';

export enum DocumentType {
    SOAT = 'SOAT',
    TECNOMECANICA = 'TECNOMECANICA',
    SEGURO_RESPONSABILIDAD = 'SEGURO_RESPONSABILIDAD',
    POLIZA_ALL_RISK = 'POLIZA_ALL_RISK',
    OTRO = 'OTRO',
}

@Entity('vehicle_documents')
export class VehicleDocument {
    @PrimaryGeneratedColumn('uuid')
    idVehicleDocument: string;

    @Column({
        type: 'enum',
        enum: DocumentType,
        default: DocumentType.SOAT,
    })
    type: DocumentType;

    @Column({ type: 'varchar', length: 50 })
    documentNumber: string;

    @Column({ type: 'date' })
    issueDate: string; // YYYY-MM-DD

    @Column({ type: 'date' })
    expirationDate: string; // YYYY-MM-DD (TypeORM hidrata columnas `date` como string)

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    cost: number;

    // Nullable para no romper los registros existentes. Sin DB_SYNCHRONIZE, crear la columna con:
    // ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS "fileUrl" varchar(500);
    @Column({ type: 'varchar', length: 500, nullable: true })
    fileUrl: string | null;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Vehicle, (vehicle) => vehicle.documents, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}