import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'; // 👈 Corregido el paquete
import { Repository } from 'typeorm';

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

    let vehicle: Vehicle | null = null;

    if (assignedVehicleId) {
      vehicle = await this.vehicleRepository.findOne({
        where: { idVehicle: assignedVehicleId, user: { id: user.id }, isActive: true },
      });

      if (!vehicle) {
        throw new NotFoundException(`El vehículo asignado no existe o no pertenece a tu flota`);
      }
    }

    const driver = this.driverRepository.create({
      ...driverData,
      user,
      assignedVehicle: vehicle || undefined,
    });

    await this.driverRepository.save(driver);

    const { user: _, ...result } = driver;
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

    if (assignedVehicleId !== undefined) {
      if (assignedVehicleId === null) {
        driver.assignedVehicle = undefined;
      } else {
        const vehicle = await this.vehicleRepository.findOne({
          where: { idVehicle: assignedVehicleId, user: { id: user.id }, isActive: true },
        });

        if (!vehicle) {
          throw new NotFoundException(`El vehículo asignado no existe en tu flota`);
        }

        driver.assignedVehicle = vehicle;
      }
    }

    Object.assign(driver, driverData);

    await this.driverRepository.save(driver);
    return driver;
  }

  async remove(id: string, user: User) {
    const driver = await this.findOne(id, user);

    driver.isActive = false;
    await this.driverRepository.save(driver);

    return { message: `Conductor ${driver.fullName} desactivado correctamente` };
  }
}