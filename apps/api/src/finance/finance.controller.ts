import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CurrentUserId } from '../auth/user.decorator';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class EvaluateAffordabilityDto {
  @Type(() => Number)
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateTransactionDto {
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsString()
  merchant: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  accountId?: string;
}

export class ImportCsvDto {
  @IsString()
  csv: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}

@ApiTags('finance')
@Controller('api/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Monthly spending breakdown and remaining discretionary reserve' })
  getOverview(@CurrentUserId() userId: string) {
    return this.financeService.getSpendingAnalysis(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Recent transactions (read from PostgreSQL)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTransactions(
    @CurrentUserId() userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getTransactions(userId, limit ? Number(limit) : 50);
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Log a new manual transaction' })
  createTransaction(
    @CurrentUserId() userId: string,
    @Body() body: CreateTransactionDto,
  ) {
    return this.financeService.addTransaction(userId, body);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import bank statement CSV and seed real personal transactions' })
  importCsv(
    @CurrentUserId() userId: string,
    @Body() body: ImportCsvDto,
  ) {
    return this.financeService.importCsvTransactions(userId, body.csv, body.accountId);
  }

  @Post('affordability')
  @ApiOperation({ summary: 'Evaluate purchase affordability against monthly budget' })
  evaluateAffordability(
    @CurrentUserId() userId: string,
    @Body() body: EvaluateAffordabilityDto,
  ) {
    return this.financeService.evaluateAffordability(userId, body.price, body.currency);
  }
}
