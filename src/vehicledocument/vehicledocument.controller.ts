import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { VehicledocumentService } from './vehicledocument.service';
import { CreateVehicleDocumentDto } from './dto/create-vehicledocument.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';

@Controller('vehicle-document')
@UseGuards(AuthGuard('jwt'))
export class VehicledocumentController {
  constructor(private readonly vehicledocumentService: VehicledocumentService) { }

  @Post()
  create(
    @Body() createDto: CreateVehicleDocumentDto,
    @GetUser() user: User
  ) {
    return this.vehicledocumentService.create(createDto, user);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.vehicledocumentService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User
  ) {
    return this.vehicledocumentService.findOne(id, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User
  ) {
    return this.vehicledocumentService.remove(id, user);
  }
}