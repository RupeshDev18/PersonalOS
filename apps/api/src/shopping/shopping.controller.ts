import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShoppingService } from './shopping.service';

@ApiTags('shopping')
@Controller('api/shopping')
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  @Get('compare')
  @ApiOperation({ summary: 'Search and compare product pricing, reviews, and alternatives' })
  @ApiQuery({ name: 'query', required: true, type: String })
  compare(@Query('query') query: string) {
    return this.shoppingService.compareProduct(query);
  }
}
