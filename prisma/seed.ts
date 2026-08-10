import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const salesHash = await bcrypt.hash("Sales@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@instacertify.in" },
    update: {},
    create: {
      name: "Instacertify Admin",
      email: "admin@instacertify.in",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "sales@instacertify.in" },
    update: {},
    create: {
      name: "Sales User",
      email: "sales@instacertify.in",
      passwordHash: salesHash,
      role: "SALES_OPS",
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

  const bank = await prisma.bankDetail.create({
    data: {
      accountName: "Instacertify Labs Pvt Ltd",
      bankName: "HDFC Bank",
      accountNumber: "50200012345678",
      ifsc: "HDFC0001234",
      branch: "New Delhi",
      upi: "instacertify@hdfcbank",
      isDefault: true,
      notes: "Please mention quote number in payment reference.",
    },
  });

  const services = [
    {
      name: "EPR Plastic",
      description: "Extended Producer Responsibility registration for Plastic Waste.",
      docs: [
        "Company Incorporation Certificate",
        "GST Certificate",
        "PAN Card of Company",
        "Authorized Signatory Aadhaar & PAN",
        "Product details / plastic packaging data",
        "Factory / warehouse address proof",
      ],
    },
    {
      name: "EPR Battery",
      description: "EPR compliance for Battery Waste Management.",
      docs: [
        "Company Incorporation Certificate",
        "GST Certificate",
        "PAN Card",
        "Battery product catalogue",
        "Authorized Signatory ID proof",
      ],
    },
    {
      name: "BIS Certification",
      description: "Bureau of Indian Standards certification support.",
      docs: [
        "Company details",
        "Product technical specifications",
        "Test reports (if available)",
        "Manufacturing process flow",
        "Authorized signatory documents",
      ],
    },
    {
      name: "CDSCO Registration",
      description: "Medical device / drug regulatory registration support.",
      docs: [
        "Company Incorporation Certificate",
        "Device / product master file",
        "ISO / QMS certificates",
        "Authorized agent documents",
      ],
    },
  ];

  for (const service of services) {
    const created = await prisma.service.upsert({
      where: { name: service.name },
      update: { description: service.description, active: true },
      create: {
        name: service.name,
        description: service.description,
      },
    });

    const existing = await prisma.documentLibraryItem.count({
      where: { serviceId: created.id },
    });
    if (existing === 0) {
      await prisma.documentLibraryItem.createMany({
        data: service.docs.map((name) => ({
          name,
          serviceId: created.id,
          required: true,
        })),
      });
    }
  }

  await prisma.quoteTemplate.create({
    data: {
      name: "Standard EPR Plastic Quote",
      description: "Default letterhead-style EPR Plastic commercial proposal",
      serviceNote: "EPR Plastic",
      validityDays: 30,
      consultingPrice: 25000,
      testingPrice: 0,
      otherCommercials: 0,
      otherCommercialsNote: "",
      bodyHtml:
        "<p>Dear Sir/Madam,</p><p>Thank you for considering <strong>Instacertify Labs Pvt Ltd</strong> for your certification requirements. Please find below our commercial proposal for the selected service.</p><p>Our team will support end-to-end documentation, filing, and follow-up with the concerned authority.</p>",
      bankDetailId: bank.id,
      createdById: admin.id,
    },
  });

  const testingSeed = [
    {
      name: "RoHS Testing - Electronics",
      labName: "NABL Lab A",
      purchasePrice: 4500,
      salesPrice: 7500,
    },
    {
      name: "Plastic Composition Analysis",
      labName: "NABL Lab B",
      purchasePrice: 3200,
      salesPrice: 6000,
    },
    {
      name: "Heavy Metal Testing",
      labName: "Instacertify Partner Lab",
      purchasePrice: 2800,
      salesPrice: 5500,
    },
  ];

  for (const item of testingSeed) {
    const exists = await prisma.testingService.findFirst({
      where: { name: item.name, labName: item.labName },
    });
    if (!exists) {
      await prisma.testingService.create({ data: item });
    }
  }

  const sales = await prisma.user.findUnique({
    where: { email: "sales@instacertify.in" },
  });
  const source = await prisma.leadSource.findFirst({
    where: { name: "IndiaMART" },
  });

  if (sales && source) {
    const customer = await prisma.customer.upsert({
      where: { email: "ops@greenpack.in" },
      update: {
        customerName: "Ravi Sharma",
        company: "GreenPack Industries",
        phone: "9876543210",
        status: "ACTIVE",
        lastActivityAt: new Date(),
      },
      create: {
        customerName: "Ravi Sharma",
        company: "GreenPack Industries",
        email: "ops@greenpack.in",
        phone: "9876543210",
        country: "India",
        state: "Delhi",
        lifetimeValue: 85000,
        lastActivityAt: new Date(),
      },
    });

    const existingLead = await prisma.lead.findFirst({
      where: { email: "ops@greenpack.in", company: "GreenPack Industries" },
    });

    const lead =
      existingLead ||
      (await prisma.lead.create({
        data: {
          customerName: "Ravi Sharma",
          company: "GreenPack Industries",
          companySize: "MEDIUM",
          email: "ops@greenpack.in",
          phone: "9876543210",
          country: "India",
          state: "Delhi",
          product: "Plastic packaging",
          serviceName: "EPR Plastic",
          expectedValue: 85000,
          expectedClose: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
          status: "QUOTATION",
          leadSourceId: source.id,
          createdById: sales.id,
          assignedToId: sales.id,
          customerId: customer.id,
          followUpAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
          notes: "Seeded demo lead for EPR Plastic.",
          logs: {
            create: {
              message: "Demo lead seeded",
              createdById: sales.id,
            },
          },
        },
      }));

    const existingProject = await prisma.project.findFirst({
      where: { leadId: lead.id },
    });

    if (!existingProject) {
      const project = await prisma.project.create({
        data: {
          projectNumber: `IC-${new Date().getFullYear()}-00001`,
          title: "GreenPack Industries — EPR Plastic",
          status: "QUOTED",
          serviceName: "EPR Plastic",
          projectValue: 85000,
          waitingFor: "Client",
          waitingNote: "Awaiting GST and incorporation docs",
          waitingExpectedOn: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
          customerId: customer.id,
          leadId: lead.id,
          commercialOwnerId: sales.id,
          deliveryOwnerId: admin.id,
          customerName: lead.customerName,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          country: lead.country,
          state: lead.state,
          scopeSummary: "End-to-end EPR Plastic registration support.",
          lastActivityAt: new Date(),
          tasks: {
            create: [
              {
                title: "Collect company documents",
                status: "WAITING",
                waitingFor: "Client",
                sequence: 10,
                assignedToId: sales.id,
                waitingExpectedOn: new Date(
                  Date.now() + 1000 * 60 * 60 * 24 * 5,
                ),
              },
              {
                title: "Prepare EPR application draft",
                status: "TODO",
                sequence: 20,
                assignedToId: admin.id,
                dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
              },
            ],
          },
          remarks: {
            create: {
              stage: "Documents",
              remark: "Client confirmed interest; docs pending.",
              createdById: sales.id,
            },
          },
        },
      });
      console.log("Demo project:", project.projectNumber);
    }
  }

  console.log("Seed complete.");
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
