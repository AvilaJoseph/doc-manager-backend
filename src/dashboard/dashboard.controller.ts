import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { DashboardService } from './dashboard.service';
import { DashboardResponse } from './interfaces/dashboard-response.interface';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('alerts')
  getMetricsAndAlerts(@GetUser() user: User): Promise<DashboardResponse> {
    return this.dashboardService.getMetricsAndAlerts(user);
  }
}
