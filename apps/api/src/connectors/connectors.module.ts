import { Module, forwardRef } from '@nestjs/common';
import { GreenhouseConnector } from './greenhouse.connector';
import { WebSearchConnector } from './web-search.connector';
import { GoogleConnector } from './google.connector';
import { ConnectorRegistryService } from './connector-registry.service';
import { ConnectorsController } from './connectors.controller';
import { LlmModule } from '../llm/llm.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [LlmModule, forwardRef(() => JobsModule)],
  controllers: [ConnectorsController],
  providers: [
    GreenhouseConnector,
    WebSearchConnector,
    GoogleConnector,
    ConnectorRegistryService,
  ],
  exports: [
    GreenhouseConnector,
    WebSearchConnector,
    GoogleConnector,
    ConnectorRegistryService,
  ],
})
export class ConnectorsModule {}
