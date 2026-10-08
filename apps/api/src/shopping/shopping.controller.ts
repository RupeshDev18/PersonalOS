import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShoppingService } from './shopping.service';
import { CurrentUserId } from '../auth/user.decorator';

@ApiTags('shopping')
@Controller('api/shopping')
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  @Get('compare')
  @ApiOperation({ summary: 'Compare product pricing and alternatives' })
  @ApiQuery({ name: 'query', required: true, type: String })
  async compare(
    @CurrentUserId() userId: string,
    @Query('query') query: string,
  ) {
    return this.shoppingService.compareProduct(userId, query);
  }
}
