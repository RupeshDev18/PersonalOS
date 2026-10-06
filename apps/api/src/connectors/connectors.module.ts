import { Module } from '@nestjs/common';
import { GreenhouseConnector } from './greenhouse.connector';
import { WebSearchConnector } from './web-search.connector';
import { ConnectorsController } from './connectors.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [ConnectorsController],
  providers: [GreenhouseConnector, WebSearchConnector],
  exports: [GreenhouseConnector, WebSearchConnector],
})
export class ConnectorsModule {}
