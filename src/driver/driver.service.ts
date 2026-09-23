import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'; // 👈 Corregido el paquete
import { EntityManager, Repository } from 'typeorm';

import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './entities/driver.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) { }

  async create(createDriverDto: CreateDriverDto, user: User) {
    const { assignedVehicleId, ...driverData } = createDriverDto;

    const vehicle = assignedVehicleId
      ? await this.findAssignableVehicle(assignedVehicleId, user)
      : null;

    const driverId = await this.driverRepository.manager.transaction(async (manager) => {
      const driver = await manager.save(
        manager.create(Driver, { ...driverData, user }),
      );

      if (vehicle) {
        await this.assignVehicle(manager, driver, vehicle);
      }

      return driver.idDriver;
    });

    const { user: _, ...result } = await this.findOne(driverId, user);
    return result;
  }

  async findAll(user: User) {
    return await this.driverRepository.find({
      where: { user: { id: user.id }, isActive: true },
      relations: { assignedVehicle: true },
    });
  }

  async findOne(id: string, user: User) {
    const driver = await this.driverRepository.findOne({
      where: { idDriver: id, user: { id: user.id }, isActive: true },
      relations: { assignedVehicle: true },
    });

    if (!driver) {
      throw new NotFoundException(`Conductor con id ${id} no encontrado`);
    }

    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto, user: User) {
    const { assignedVehicleId, ...driverData } = updateDriverDto;

    const driver = await this.findOne(id, user);

    const vehicle = assignedVehicleId
      ? await this.findAssignableVehicle(assignedVehicleId, user)
      : null;

    await this.driverRepository.manager.transaction(async (manager) => {
      // undefined = el body no trae el campo, no se toca la asignación
      if (assignedVehicleId === null) {
        await this.unassignVehicle(manager, driver);
      } else if (vehicle) {
        await this.assignVehicle(manager, driver, vehicle);
      }

      if (Object.keys(driverData).length > 0) {
        await manager.update(Driver, { idDriver: driver.idDriver }, driverData);
      }
    });

    return this.findOne(id, user);
  }

  async remove(id: string, user: User) {
    const driver = await this.findOne(id, user);

    driver.isActive = false;
    await this.driverRepository.save(driver);

    return { message: `Conductor ${driver.fullName} desactivado correctamente` };
  }

  private async findAssignableVehicle(idVehicle: string, user: User) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { idVehicle, user: { id: user.id }, isActive: true },
    });

    if (!vehicle) {
      throw new NotFoundException(`El vehículo asignado no existe o no pertenece a tu flota`);
    }

    return vehicle;
  }

  /**
   * La FK (driver_id) vive en `vehicles`: Driver.assignedVehicle es el lado inverso
   * de la relación y TypeORM ignora lo que se le asigne al guardar el conductor.
   * Toda (des)asignación se escribe sobre el vehículo.
   */
  private async unassignVehicle(manager: EntityManager, driver: Driver) {
    await manager.update(
      Vehicle,
      { assignedDriver: { idDriver: driver.idDriver } },
      { assignedDriver: null },
    );
  }

  private async assignVehicle(manager: EntityManager, driver: Driver, vehicle: Vehicle) {
    // driver_id es UNIQUE: primero se libera el vehículo que el conductor tuviera antes.
    await this.unassignVehicle(manager, driver);
    // Sobrescribir driver_id libera también al conductor previo del vehículo nuevo.
    await manager.update(
      Vehicle,
      { idVehicle: vehicle.idVehicle },
      { assignedDriver: { idDriver: driver.idDriver } },
    );
  }
}
