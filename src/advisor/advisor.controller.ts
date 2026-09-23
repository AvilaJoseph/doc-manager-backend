import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AdvisorService, FinanceAdviceResponse } from './advisor.service';
import { FinanceAdviceDto } from './dto/finance-advice.dto';

@Controller('advisor')
@UseGuards(AuthGuard('jwt'))
export class AdvisorController {
  constructor(private readonly advisorService: AdvisorService) {}

  // 200 y no 201: es una consulta, no crea ningún recurso
  @Post('finance')
  @HttpCode(HttpStatus.OK)
  getFinanceAdvice(
    @Body() dto: FinanceAdviceDto,
  ): Promise<FinanceAdviceResponse> {
    return this.advisorService.getFinanceAdvice(dto);
  }
}
