import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { VehicleDocument } from 'src/vehicledocument/entities/vehicledocument.entity';
import { Driver } from 'src/driver/entities/driver.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      DeviceToken,
      VehicleDocument,
      Driver,
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
