import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
      timestamp: new Date().toISOString(),
      database,
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
