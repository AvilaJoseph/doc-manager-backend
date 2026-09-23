import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateVehicleDocumentDto } from './dto/create-vehicledocument.dto';
import { VehicleDocument } from './entities/vehicledocument.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class VehicledocumentService {
  constructor(
    @InjectRepository(VehicleDocument)
    private readonly docRepository: Repository<VehicleDocument>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) { }

  async create(createDto: CreateVehicleDocumentDto, user: User) {
    const { vehicleId, ...docData } = createDto;

    const vehicle = await this.vehicleRepository.findOne({
      where: { idVehicle: vehicleId, user: { id: user.id }, isActive: true },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehículo no encontrado en tu flota`);
    }

    const document = this.docRepository.create({
      ...docData,
      vehicle,
      user,
    });

    await this.docRepository.save(document);

    const { user: _, ...result } = document;
    return result;
  }

  async findAll(user: User) {
    return await this.docRepository.find({
      where: { user: { id: user.id }, isActive: true },
      relations: { vehicle: true },
    });
  }

  async findOne(id: string, user: User) {
    const document = await this.docRepository.findOne({
      where: { idVehicleDocument: id, user: { id: user.id }, isActive: true },
      relations: { vehicle: true },
    });

    if (!document) {
      throw new NotFoundException(`Documento con id ${id} no encontrado`);
    }

    return document;
  }

  async remove(id: string, user: User) {
    const document = await this.findOne(id, user);
    document.isActive = false;
    await this.docRepository.save(document);

    return { message: `Documento desactivado correctamente` };
  }
}