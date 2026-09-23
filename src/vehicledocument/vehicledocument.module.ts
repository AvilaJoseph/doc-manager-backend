import { Module } from '@nestjs/common';
import { VehicledocumentService } from './vehicledocument.service';
import { VehicledocumentController } from './vehicledocument.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleDocument } from './entities/vehicledocument.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleDocument, Vehicle])
  ],
  controllers: [VehicledocumentController],
  providers: [VehicledocumentService],
  exports: [
    TypeOrmModule, VehicledocumentService
  ]
})
export class VehicledocumentModule { }
