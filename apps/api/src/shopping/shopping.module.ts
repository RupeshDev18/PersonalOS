import { Module } from '@nestjs/common';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ShoppingController],
  providers: [ShoppingService],
  exports: [ShoppingService],
})
export class ShoppingModule {}
