import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class ShoppingService {
  public async compareProduct(_userId: string, _query: string): Promise<never> {
    throw new ServiceUnavailableException(
      'Shopping price comparison is paused until a verified source can provide current price, stock, and delivery data.',
    );
  }
}
