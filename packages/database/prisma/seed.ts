import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("Admin@123", 10);
  const salesHash = await bcrypt.hash("Sales@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@instacertify.in" },
    update: { role: "ADMIN", active: true },
    create: {
      name: "Instacertify Admin",
      email: "admin@instacertify.in",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: "sales@instacertify.in" },
    update: { role: "SALES_OPS", active: true },
    create: {
      name: "Sales User",
      email: "sales@instacertify.in",
      passwordHash: salesHash,
      role: "SALES_OPS",
    },
  });

  await prisma.employeeProfile.upsert({
    where: { userId: admin.id },
    update: { department: "Operations", title: "Admin" },
    create: {
      userId: admin.id,
      department: "Operations",
      title: "Admin",
    },
  });

  await prisma.employeeProfile.upsert({
    where: { userId: sales.id },
    update: { department: "Sales", title: "Sales Ops" },
    create: {
      userId: sales.id,
      department: "Sales",
      title: "Sales Ops",
    },
  });

  const sources = [
    "Consultant",
    "Google Ads",
    "Phone Call",
    "IndiaMART",
    "Referral",
  ];
  for (const name of sources) {
    await prisma.leadSource.upsert({
      where: { name },
      update: { active: true },
      create: { name },
    });
  }

  const lab = await prisma.partnerLab.upsert({
    where: { id: "seed-lab-nabl-a" },
    update: { active: true },
    create: {
      id: "seed-lab-nabl-a",
      name: "NABL Partner Lab A",
      country: "India",
      nabl: true,
      email: "lab@example.com",
    },
  });

  const source = await prisma.leadSource.findFirst({
    where: { name: "IndiaMART" },
  });
  if (!source) throw new Error("Lead source missing");

  const customer = await prisma.customer.upsert({
    where: { email: "ops@midea-vietnam.example" },
    update: {
      company: "Midea Vietnam",
      legalName: "Midea Vietnam Co Ltd",
      phone: "+84-900000001",
      country: "Vietnam",
      lifetimeValue: 450000,
      lastActivityAt: new Date(),
    },
    create: {
      company: "Midea Vietnam",
      legalName: "Midea Vietnam Co Ltd",
      email: "ops@midea-vietnam.example",
      phone: "+84-900000001",
      country: "Vietnam",
      status: "ACTIVE",
      lifetimeValue: 450000,
      lastActivityAt: new Date(),
      contacts: {
        create: [
          {
            name: "Nguyen An",
            email: "ops@midea-vietnam.example",
            phone: "+84-900000001",
            title: "Compliance Manager",
            isPrimary: true,
          },
        ],
      },
    },
  });

  const contactCount = await prisma.contact.count({
    where: { customerId: customer.id },
  });
  if (contactCount === 0) {
    await prisma.contact.create({
      data: {
        customerId: customer.id,
        name: "Nguyen An",
        email: "ops@midea-vietnam.example",
        phone: "+84-900000001",
        title: "Compliance Manager",
        isPrimary: true,
      },
    });
  }

  let lead = await prisma.lead.findFirst({
    where: { email: "ops@midea-vietnam.example", company: "Midea Vietnam" },
  });
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        customerName: "Nguyen An",
        company: "Midea Vietnam",
        companySize: "LARGE",
        email: "ops@midea-vietnam.example",
        phone: "+84-900000001",
        country: "Vietnam",
        product: "Air conditioner outdoor unit",
        serviceName: "BIS Certification",
        expectedValue: 180000,
        status: "WON",
        leadSourceId: source.id,
        createdById: sales.id,
        assignedToId: sales.id,
        customerId: customer.id,
        notes: "Multi-project strategic account",
      },
    });
  }

  const opportunity = await prisma.opportunity.upsert({
    where: { id: "seed-opp-midea-bis" },
    update: { stage: "WON", amount: 180000 },
    create: {
      id: "seed-opp-midea-bis",
      title: "Midea Vietnam — BIS portfolio",
      stage: "WON",
      amount: 180000,
      probability: 100,
      serviceName: "BIS Certification",
      customerId: customer.id,
      leadId: lead.id,
      ownerId: sales.id,
    },
  });

  const quotation = await prisma.quotation.upsert({
    where: { quoteNumber: "ICQ-2026-00001" },
    update: { status: "ACCEPTED" },
    create: {
      quoteNumber: "ICQ-2026-00001",
      publicToken: "seed-public-token-midea-bis",
      status: "ACCEPTED",
      customerName: "Nguyen An",
      company: "Midea Vietnam",
      email: "ops@midea-vietnam.example",
      phone: "+84-900000001",
      country: "Vietnam",
      serviceName: "BIS Certification",
      description: "BIS certification support for AC outdoor units",
      validityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      consultingPrice: 120000,
      testingPrice: 45000,
      governmentFees: 15000,
      acceptedAt: new Date(),
      leadId: lead.id,
      customerId: customer.id,
      opportunityId: opportunity.id,
      createdById: sales.id,
    },
  });

  const services = [
    {
      id: "seed-proj-midea-bis",
      projectNumber: "IC-2026-00001",
      title: "Midea Vietnam — BIS Project",
      serviceType: "BIS",
      serviceName: "BIS Certification",
      status: "TESTING",
      projectValue: 180000,
    },
    {
      id: "seed-proj-midea-wpc",
      projectNumber: "IC-2026-00002",
      title: "Midea Vietnam — WPC Project",
      serviceType: "WPC",
      serviceName: "WPC Approval",
      status: "DOCUMENTS_PENDING",
      projectValue: 95000,
    },
    {
      id: "seed-proj-midea-epr",
      projectNumber: "IC-2026-00003",
      title: "Midea Vietnam — EPR Project",
      serviceType: "EPR",
      serviceName: "EPR Plastic",
      status: "APPLICATION",
      projectValue: 75000,
    },
  ];

  for (const svc of services) {
    await prisma.project.upsert({
      where: { projectNumber: svc.projectNumber },
      update: {
        status: svc.status,
        projectValue: svc.projectValue,
        lastActivityAt: new Date(),
      },
      create: {
        id: svc.id,
        projectNumber: svc.projectNumber,
        title: svc.title,
        status: svc.status,
        serviceName: svc.serviceName,
        serviceType: svc.serviceType,
        projectValue: svc.projectValue,
        consultingFees: svc.projectValue * 0.7,
        testingFees: svc.projectValue * 0.2,
        governmentFees: svc.projectValue * 0.1,
        paymentStatus: "PARTIAL",
        startDate: new Date(),
        expectedCompletion: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
        waitingFor: svc.status === "DOCUMENTS_PENDING" ? "Client" : "Lab",
        waitingNote:
          svc.status === "DOCUMENTS_PENDING"
            ? "Awaiting manufacturer docs"
            : "Lab test in progress",
        waitingExpectedOn: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        customerId: customer.id,
        leadId: lead.id,
        quotationId: quotation.id,
        commercialOwnerId: sales.id,
        deliveryOwnerId: admin.id,
        customerName: "Nguyen An",
        company: "Midea Vietnam",
        email: "ops@midea-vietnam.example",
        phone: "+84-900000001",
        country: "Vietnam",
        scopeSummary: `${svc.serviceName} end-to-end delivery`,
        products: {
          create: [
            {
              name: "Outdoor AC Unit",
              modelNumber: "MUE-36CRN1",
              brand: "Midea",
            },
          ],
        },
        manufacturers: {
          create: [
            {
              name: "Midea Manufacturing Vietnam",
              country: "Vietnam",
              address: "Binh Duong",
            },
          ],
        },
        applicants: {
          create: [
            {
              name: "Midea Vietnam Co Ltd",
              type: "COMPANY",
              email: "ops@midea-vietnam.example",
            },
          ],
        },
        standards: {
          create: [
            {
              code: svc.serviceType === "BIS" ? "IS 1391" : svc.serviceType || "N/A",
              name: `${svc.serviceName} standard`,
              authority: svc.serviceType || "OTHER",
            },
          ],
        },
        tasks: {
          create: [
            {
              title: "Collect application dossier",
              status: "IN_PROGRESS",
              sequence: 10,
              assignedToId: sales.id,
            },
            {
              title: "Coordinate lab testing",
              status: svc.status === "TESTING" ? "WAITING" : "TODO",
              waitingFor: "Lab",
              sequence: 20,
              assignedToId: admin.id,
            },
          ],
        },
        remarks: {
          create: {
            stage: "Kickoff",
            remark: "Seeded demo project for modular CRM.",
            createdById: sales.id,
          },
        },
      },
    });
  }

  const bis = await prisma.project.findUnique({
    where: { projectNumber: "IC-2026-00001" },
  });
  if (bis) {
    const existingTest = await prisma.testingOrder.findFirst({
      where: { projectId: bis.id, testName: "Safety & performance" },
    });
    if (!existingTest) {
      await prisma.testingOrder.create({
        data: {
          projectId: bis.id,
          partnerLabId: lab.id,
          testName: "Safety & performance",
          status: "IN_PROGRESS",
          purchasePrice: 18000,
          salesPrice: 45000,
        },
      });
    }
    const existingSample = await prisma.sampleShipment.findFirst({
      where: { projectId: bis.id },
    });
    if (!existingSample) {
      await prisma.sampleShipment.create({
        data: {
          projectId: bis.id,
          partnerLabId: lab.id,
          trackingNumber: "TRACK-SEED-001",
          carrier: "DHL",
          status: "IN_TRANSIT",
          dispatchedAt: new Date(),
        },
      });
    }
    const existingCert = await prisma.certificationRecord.findFirst({
      where: { projectId: bis.id },
    });
    if (!existingCert) {
      await prisma.certificationRecord.create({
        data: {
          projectId: bis.id,
          authority: "BIS",
          status: "APPLIED",
          renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        },
      });
    }
  }

  console.log("Seed complete (PostgreSQL modular CRM).");
  console.log("Admin: admin@instacertify.in / Admin@123");
  console.log("Sales: sales@instacertify.in / Sales@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
