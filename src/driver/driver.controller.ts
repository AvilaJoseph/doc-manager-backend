import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { DriverService } from './driver.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';

@Controller('driver')
@UseGuards(AuthGuard('jwt'))
export class DriverController {
  constructor(private readonly driverService: DriverService) { }

  @Post()
  create(
    @Body() createDriverDto: CreateDriverDto,
    @GetUser() user: User
  ) {
    return this.driverService.create(createDriverDto, user);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.driverService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User
  ) {
    return this.driverService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDriverDto: UpdateDriverDto,
    @GetUser() user: User
  ) {
    return this.driverService.update(id, updateDriverDto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User
  ) {
    return this.driverService.remove(id, user);
  }
}