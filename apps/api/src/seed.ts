import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const salesHash = await bcrypt.hash('Sales@123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@instacertify.in' },
    update: {},
    create: {
      name: 'Instacertify Admin',
      email: 'admin@instacertify.in',
      passwordHash,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'sales@instacertify.in' },
    update: {},
    create: {
      name: 'Sales User',
      email: 'sales@instacertify.in',
      passwordHash: salesHash,
      role: 'SALES_OPS',
    },
  });

  const sources = [
    'Consultant',
    'Google Ads',
    'Phone Call',
    'IndiaMART',
    'Referral',
  ];
  for (const name of sources) {
    await prisma.leadSource.upsert({
      where: { name },
      update: { active: true },
      create: { name },
    });
  }

  console.log('Seed complete.');
  console.log('Admin: admin@instacertify.in / Admin@123');
  console.log('Sales: sales@instacertify.in / Sales@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
