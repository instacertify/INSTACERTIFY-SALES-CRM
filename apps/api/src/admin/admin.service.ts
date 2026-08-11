import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async health() {
    let database: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: '@instacertify/api',
      architecture: 'standalone-modular-monolith',
      erpnext: false,
      timestamp: new Date().toISOString(),
      database,
      redis: this.config.get('ENABLE_REDIS') === 'true' ? 'enabled' : 'disabled',
      fileStorage: this.storage.mode(),
      s3Ready: this.storage.s3Configured(),
    };
  }

  async seedStatus() {
    const [users, leadSources, customers, leads, projects, quotations] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.leadSource.count(),
        this.prisma.customer.count(),
        this.prisma.lead.count(),
        this.prisma.project.count(),
        this.prisma.quotation.count(),
      ]);

    const admin = await this.prisma.user.findUnique({
      where: { email: 'admin@instacertify.in' },
      select: { id: true, email: true, role: true, active: true },
    });
    const sales = await this.prisma.user.findUnique({
      where: { email: 'sales@instacertify.in' },
      select: { id: true, email: true, role: true, active: true },
    });

    return {
      seeded: Boolean(admin && sales && leadSources > 0),
      counts: {
        users,
        leadSources,
        customers,
        leads,
        projects,
        quotations,
      },
      users: {
        admin: admin ?? null,
        sales: sales ?? null,
      },
    };
  }
}
