import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) { }

  async create(createVehicleDto: CreateVehicleDto, user: User) {
    const currentVehicleCount = await this.vehicleRepository.count({
      where: { user: { id: user.id }, isActive: true }
    })

    if (currentVehicleCount >= user.maxVehicles) {
      throw new ForbiddenException(
        `Has alcanzado el límite máximo de vehículos (${user.maxVehicles}) para tu plan actual (${user.plan}). Actualiza tu suscripción para agregar más.`,
      )
    }

    const existingVehicle = await this.vehicleRepository.findOneBy({
      licensePlate: createVehicleDto.licensePlate.toLocaleUpperCase(),
      user: { id: user.id }
    })

    if (existingVehicle) {
      throw new BadRequestException(
        `Ya tienes un vehículo registrado con la placa ${createVehicleDto.licensePlate}`,
      )
    }

    const vehicle = this.vehicleRepository.create({
      ...createVehicleDto,
      licensePlate: createVehicleDto.licensePlate.toLocaleUpperCase(),
      user,
    })

    await this.vehicleRepository.save(vehicle)

    const { user: _, ...result } = vehicle
    return result
  }

  async findAll(user: User) {
    const vehicleData = await this.vehicleRepository.find({
      where: {
        user: { id: user.id },
        isActive: true
      },
      order: {
        year: 'DESC'
      }
    })

    return vehicleData;
  }

  async findOne(id: string, user: User): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: {
        idVehicle: id,
        user: { id: user.id },
        isActive: true
      },
    });

    if (!vehicle) {
      throw new NotFoundException(
        `Vehículo con ID ${id} no encontrado en tu flota`,
      );
    }

    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto, user: User) {
    const vehicle = await this.findOne(id, user);

    if (updateVehicleDto.licensePlate) {
      const formattedPlate = updateVehicleDto.licensePlate.toUpperCase();

      if (formattedPlate !== vehicle.licensePlate) {
        const existingVehicle = await this.vehicleRepository.findOneBy({
          licensePlate: formattedPlate,
          user: { id: user.id },
        });

        if (existingVehicle) {
          throw new BadRequestException(
            `Ya tienes otro vehículo registrado con la placa ${formattedPlate}`,
          );
        }
      }
    }

    const updatedVehicle = this.vehicleRepository.merge(vehicle, {
      ...updateVehicleDto,
      ...(updateVehicleDto.licensePlate && {
        licensePlate: updateVehicleDto.licensePlate.toUpperCase(),
      }),
    });

    return await this.vehicleRepository.save(updatedVehicle);
  }

  async remove(id: string, user: User) {
    const vehicle = await this.findOne(id, user)
    vehicle.isActive = false

    await this.vehicleRepository.save(vehicle)
    return {
      message: `Vehículo con placa ${vehicle.licensePlate} eliminado correctamente.`,
    };
  }
}
