import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToOne
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';

export enum DocumentType {
    CC = 'CC',
    CE = 'CE',
    PASSPORT = 'PASSPORT',
    OTHER = 'OTHER',
}

@Entity('drivers')
export class Driver {
    @PrimaryGeneratedColumn('uuid')
    idDriver: string;

    @Column({ type: 'varchar', length: 150 })
    fullName: string;

    @Column({
        type: 'enum',
        enum: DocumentType,
        default: DocumentType.CC,
    })
    documentType: DocumentType;

    @Column({ type: 'varchar', length: 20 })
    documentId: string;

    @Column({ type: 'varchar', length: 20 })
    phone: string;

    @Column({ type: 'varchar', length: 50 })
    licenseNumber: string;

    @Column({ type: 'date' })
    licenseExpirationDate: string; // YYYY-MM-DD (TypeORM hidrata columnas `date` como string)

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @OneToOne(() => Vehicle, (vehicle) => vehicle.assignedDriver)
    assignedVehicle?: Vehicle;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}