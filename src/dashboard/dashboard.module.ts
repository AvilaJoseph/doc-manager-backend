import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { VehicleDocument } from 'src/vehicledocument/entities/vehicledocument.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Driver, VehicleDocument])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
