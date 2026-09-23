import { Plan } from "src/auth/enums/plans.enums";
import { Vehicle } from "src/vehicle/entities/vehicle.entity";
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('user')
export class User {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text', {
        unique: true,
        nullable: false
    })
    email: string

    @Column('text', {
        select: false,
        nullable: false
    })
    password: string

    @Column('text', {
        nullable: false
    })
    fullName: string

    @Column('text', {
        array: true,
        default: ['user']
    })
    roles: string[]

    @Column('enum', {
        enum: Plan,
        default: Plan.FREE,
    })
    plan: Plan;

    @Column('int', { default: 1 })
    maxVehicles: number;

    @Column('timestamp', { nullable: true })
    planExpiresAt: Date;

    @Column('boolean', { default: true })
    isActive: boolean;

    @OneToMany(
        () => Vehicle,
        (vehicle) => vehicle.user
    )
    vehicles: Vehicle[];

    @BeforeInsert()
    @BeforeUpdate()
    checkFieldsBeforeInsert() {
        this.email = this.email.toLowerCase().trim()
    }
}
