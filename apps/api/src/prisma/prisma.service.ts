import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL (localhost:5432 / personal_os_db)');
      await this.seedInitialData();
    } catch (err: any) {
      this.logger.error(`PostgreSQL connection failed: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async seedInitialData() {
    try {
      // Seed default operators if not present
      const rupesh = await this.user.upsert({
        where: { email: 'ry993494787@gmail.com' },
        update: {},
        create: {
          id: 'user-rupesh',
          name: 'Rupesh Yadav',
          email: 'ry993494787@gmail.com',
        },
      });

      await this.user.upsert({
        where: { email: 'alex.chen@designcraft.io' },
        update: {},
        create: {
          id: 'user-alex',
          name: 'Alex Chen',
          email: 'alex.chen@designcraft.io',
        },
      });

      // Seed initial Resumes for user-rupesh if none
      const existingResumes = await this.resumeProfile.count({ where: { userId: rupesh.id } });
      if (existingResumes === 0) {
        await this.resumeProfile.createMany({
          data: [
            {
              userId: rupesh.id,
              title: 'Fullstack-AWS-v3.md',
              fileName: 'Fullstack-AWS-v3.md',
              targetRole: 'Full Stack Developer',
              tags: ['React', 'TypeScript', 'Node.js', 'AWS', 'PostgreSQL'],
              contentMarkdown: '# Rupesh Yadav\nSenior Full Stack & AI Systems Engineer\nEmail: ry993494787@gmail.com\n\n## Experience\n- Lead engineer for distributed AI agents and Next.js platforms.',
              isDefault: true,
            },
            {
              userId: rupesh.id,
              title: 'Backend-Systems-v2.md',
              fileName: 'Backend-Systems-v2.md',
              targetRole: 'Backend Engineer',
              tags: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis', 'Docker'],
              contentMarkdown: '# Rupesh Yadav\nSenior Backend & Cloud Architect\nEmail: ry993494787@gmail.com\n\n## Experience\n- Architected high-throughput NestJS microservices and streaming engines.',
              isDefault: false,
            },
          ],
        });
      }

      // Seed initial Transactions if none exist
      const txCount = await this.transaction.count();
      if (txCount === 0) {
        await this.transaction.createMany({
          data: [
            {
              userId: rupesh.id,
              amount: 1499,
              category: 'Tech & Cloud',
              merchant: 'AWS Cloud Services',
              description: 'Monthly compute & ECS container runtime',
              status: 'posted',
            },
            {
              userId: rupesh.id,
              amount: 2200,
              category: 'AI Tooling',
              merchant: 'Anthropic & OpenAI',
              description: 'API inference token credits',
              status: 'posted',
            },
            {
              userId: rupesh.id,
              amount: 450,
              category: 'Productivity',
              merchant: 'GitHub Copilot Enterprise',
              description: 'Developer workspace license',
              status: 'posted',
            },
          ],
        });
      }
    } catch (e: any) {
      this.logger.warn(`Initial seed skipped: ${e.message}`);
    }
  }
}
