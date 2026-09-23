import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { VehicleDocument } from 'src/vehicledocument/entities/vehicledocument.entity';

@Entity('vehicles')
// La placa es única por tenant, no global: evita que un usuario bloquee o descubra placas de otro
@Index(['licensePlate', 'user'], { unique: true })
export class Vehicle {
    @PrimaryGeneratedColumn('uuid')
    idVehicle: string;

    @Column({ type: 'varchar', length: 10 })
    licensePlate: string;

    @Column({ type: 'varchar', nullable: true })
    internalCode?: string;

    @Column({ type: 'varchar' })
    brand: string;

    @Column({ type: 'varchar' })
    model: string;

    @Column({ type: 'int' })
    year: number;

    @Column({ type: 'int', default: 0 })
    currentMileage: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => User, (user) => user.vehicles, { onDelete: 'CASCADE' })
    user: User;

    @OneToOne(() => Driver, (driver) => driver.assignedVehicle, { nullable: true })
    @JoinColumn({ name: 'driver_id' })
    assignedDriver?: Driver;

    @OneToMany(() => VehicleDocument, (document) => document.vehicle)
    documents?: VehicleDocument[];
}