import { Module, forwardRef } from '@nestjs/common';
import { GreenhouseConnector } from './greenhouse.connector';
import { WebSearchConnector } from './web-search.connector';
import { GoogleConnector } from './google.connector';
import { ConnectorsController } from './connectors.controller';
import { LlmModule } from '../llm/llm.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [LlmModule, forwardRef(() => JobsModule)],
  controllers: [ConnectorsController],
  providers: [GreenhouseConnector, WebSearchConnector, GoogleConnector],
  exports: [GreenhouseConnector, WebSearchConnector, GoogleConnector],
})
export class ConnectorsModule {}
