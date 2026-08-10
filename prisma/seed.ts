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
