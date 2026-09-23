import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('vehicle')
@UseGuards(AuthGuard('jwt'))
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) { }

  @Post()
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @GetUser() user: User
  ) {
    return this.vehicleService.create(createVehicleDto, user);
  }

  @Get()
  findAll(
    @GetUser() user: User
  ) {
    return this.vehicleService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.vehicleService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @GetUser() user: User) {
    return this.vehicleService.update(id, updateVehicleDto, user);
  }
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.vehicleService.remove(id, user);
  }
}
