import { Module, forwardRef } from '@nestjs/common';
import { GreenhouseConnector } from './greenhouse.connector';
import { NaukriConnector } from './naukri.connector';
import { LinkedInConnector } from './linkedin.connector';
import { WellfoundConnector } from './wellfound.connector';
import { WebSearchConnector } from './web-search.connector';
import { GoogleConnector } from './google.connector';
import { AccountAggregatorConnector } from './account-aggregator.connector';
import { GitHubConnector } from './github.connector';
import { SlackConnector } from './slack.connector';
import { ConnectorRegistryService } from './connector-registry.service';
import { ConnectorsController } from './connectors.controller';
import { LlmModule } from '../llm/llm.module';
import { JobsModule } from '../jobs/jobs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [LlmModule, PrismaModule, forwardRef(() => JobsModule), NotificationsModule],
  controllers: [ConnectorsController],
  providers: [
    GreenhouseConnector,
    NaukriConnector,
    LinkedInConnector,
    WellfoundConnector,
    WebSearchConnector,
    GoogleConnector,
    AccountAggregatorConnector,
    GitHubConnector,
    SlackConnector,
    ConnectorRegistryService,
  ],
  exports: [
    GreenhouseConnector,
    NaukriConnector,
    LinkedInConnector,
    WellfoundConnector,
    WebSearchConnector,
    GoogleConnector,
    AccountAggregatorConnector,
    GitHubConnector,
    SlackConnector,
    ConnectorRegistryService,
  ],
})
export class ConnectorsModule {}
