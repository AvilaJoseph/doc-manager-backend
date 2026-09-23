import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, Vehicle])
  ],
  controllers: [DriverController],
  providers: [DriverService],
  exports: [
    TypeOrmModule,
    DriverService
  ]
})
export class DriverModule { }
