import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { CustomersModule } from './customers/customers.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { QuotationsModule } from './quotations/quotations.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CertificationModule } from './certification/certification.module';
import { TestingModule } from './testing/testing.module';
import { SamplesModule } from './samples/samples.module';
import { DocumentsModule } from './documents/documents.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { CatalogModule } from './catalog/catalog.module';
import { PortalsModule } from './portals/portals.module';
import { WorkLibraryModule } from './work-library/work-library.module';
import { StorageModule } from './storage/storage.module';

const redisEnabled = process.env.ENABLE_REDIS === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ...(redisEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              connection: {
                host: config.get<string>('REDIS_HOST', 'localhost'),
                port: Number(config.get<string>('REDIS_PORT', '6379')),
              },
            }),
          }),
        ]
      : []),
    PrismaModule,
    StorageModule,
    CommonModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    CustomersModule,
    OpportunitiesModule,
    QuotationsModule,
    ProjectsModule,
    TasksModule,
    CertificationModule,
    TestingModule,
    SamplesModule,
    DocumentsModule,
    InvoicesModule,
    NotificationsModule,
    ReportsModule,
    AdminModule,
    CatalogModule,
    PortalsModule,
    WorkLibraryModule,
  ],
})
export class AppModule {}
