import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { NotificationService } from './notification.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(@Query() query: ListNotificationsDto, @GetUser() user: User) {
    return this.notificationService.findAll(user, query);
  }

  @Get('unread-count')
  getUnreadCount(@GetUser() user: User) {
    return this.notificationService.getUnreadCount(user);
  }

  // Antes que ':id/read' para que "read-all" no se interprete como un id
  @Patch('read-all')
  markAllAsRead(@GetUser() user: User) {
    return this.notificationService.markAllAsRead(user);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.notificationService.markAsRead(id, user);
  }

  @Post('devices')
  registerDevice(@Body() dto: RegisterDeviceDto, @GetUser() user: User) {
    return this.notificationService.registerDevice(dto, user);
  }

  @Delete('devices/:token')
  unregisterDevice(@Param('token') token: string, @GetUser() user: User) {
    return this.notificationService.unregisterDevice(token, user);
  }
}
