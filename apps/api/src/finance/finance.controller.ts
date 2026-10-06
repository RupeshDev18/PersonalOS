import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';

import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class EvaluateAffordabilityDto {
  @Type(() => Number)
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

@ApiTags('finance')
@Controller('api/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get monthly spending breakdown, recurring commitments, and remaining discretionary reserve' })
  getOverview() {
    return this.financeService.getSpendingAnalysis();
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List recent financial transactions (Strictly Read-only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTransactions(@Query('limit') limit?: number) {
    return this.financeService.getTransactions(limit ? Number(limit) : 20);
  }

  @Post('affordability')
  @ApiOperation({ summary: 'Evaluate affordability of a potential purchase against monthly budget' })
  evaluateAffordability(@Body() body: EvaluateAffordabilityDto) {
    return this.financeService.evaluateAffordability(body.price, body.currency);
  }
}
