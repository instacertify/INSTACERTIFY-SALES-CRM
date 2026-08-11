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
    update: {
      active: true,
      scope: "EMI/EMC, Safety (IEC 62368), RF, Environmental",
      city: "Gurugram",
      nabl: true,
    },
    create: {
      id: "seed-lab-nabl-a",
      name: "NABL Partner Lab A",
      country: "India",
      city: "Gurugram",
      nabl: true,
      email: "lab@example.com",
      scope: "EMI/EMC, Safety (IEC 62368), RF, Environmental",
      accreditation: "NABL ISO/IEC 17025",
    },
  });

  const labB = await prisma.partnerLab.upsert({
    where: { id: "seed-lab-nabl-b" },
    update: { active: true, scope: "Chemical, RoHS, Heavy metals, Plastic" },
    create: {
      id: "seed-lab-nabl-b",
      name: "NABL Chemical Lab B",
      country: "India",
      city: "Pune",
      nabl: true,
      scope: "Chemical, RoHS, Heavy metals, Plastic composition",
      accreditation: "NABL ISO/IEC 17025",
    },
  });

  const catalogSeed = [
    {
      id: "seed-test-emi",
      name: "EMI/EMC — IT Equipment",
      category: "EMI",
      scope: "CISPR 32 / IEC 61000 — radiated & conducted emissions",
      standardCode: "CISPR 32",
      purchasePrice: 22000,
      salesPrice: 42000,
      partnerLabId: lab.id,
    },
    {
      id: "seed-test-safety",
      name: "Safety — IEC 62368-1",
      category: "SAFETY",
      scope: "Audio/video & IT product safety",
      standardCode: "IEC 62368-1",
      purchasePrice: 18000,
      salesPrice: 38000,
      partnerLabId: lab.id,
    },
    {
      id: "seed-test-rohs",
      name: "RoHS Chemical Screening",
      category: "CHEMICAL",
      scope: "RoHS 10 substances — plastics & electronics",
      standardCode: "RoHS",
      purchasePrice: 4500,
      salesPrice: 9500,
      partnerLabId: labB.id,
    },
  ];

  for (const item of catalogSeed) {
    await prisma.testingCatalogItem.upsert({
      where: { id: item.id },
      update: {
        purchasePrice: item.purchasePrice,
        salesPrice: item.salesPrice,
        scope: item.scope,
        active: true,
      },
      create: item,
    });
  }

  const bisService = await prisma.serviceOffering.upsert({
    where: { name: "BIS Certification" },
    update: { active: true, serviceType: "BUNDLE" },
    create: {
      name: "BIS Certification",
      serviceType: "BUNDLE",
      description:
        "End-to-end BIS consulting bundled with testing coordination",
      checklistItems: {
        create: [
          { name: "Company incorporation certificate", sequence: 10 },
          { name: "GST certificate", sequence: 20 },
          { name: "Authorized signatory ID & PAN", sequence: 30 },
          { name: "Product technical specifications", sequence: 40 },
          { name: "Manufacturing process flow", sequence: 50 },
        ],
      },
    },
  });

  const testingOnly = await prisma.serviceOffering.upsert({
    where: { name: "Laboratory Testing" },
    update: { active: true, serviceType: "TESTING" },
    create: {
      name: "Laboratory Testing",
      serviceType: "TESTING",
      description: "Standalone testing sales with lab coordination",
      checklistItems: {
        create: [
          { name: "Sample declaration", sequence: 10 },
          { name: "Product datasheet", sequence: 20 },
          { name: "Bill of materials (if chemical)", sequence: 30 },
        ],
      },
    },
  });
  void bisService;
  void testingOnly;

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

  // Enrich quotation journey + testing lines + work library
  const quote = await prisma.quotation.findUnique({
    where: { quoteNumber: "ICQ-2026-00001" },
  });
  if (quote) {
    await prisma.quotation.update({
      where: { id: quote.id },
      data: {
        status: "ACCEPTED",
        sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
        testingOptedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
        acceptedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        revisionCount: 1,
        testingPrice: 42000 + 38000,
        consultingPrice: 120000,
      },
    });

    const lineCount = await prisma.quotationLineItem.count({
      where: { quotationId: quote.id },
    });
    if (lineCount === 0) {
      await prisma.quotationLineItem.createMany({
        data: [
          {
            quotationId: quote.id,
            kind: "CONSULTING",
            title: "BIS consulting package",
            quantity: 1,
            unitPrice: 120000,
            amount: 120000,
          },
          {
            quotationId: quote.id,
            kind: "TESTING",
            title: "EMI/EMC — IT Equipment",
            catalogItemId: "seed-test-emi",
            quantity: 1,
            unitPrice: 42000,
            purchasePrice: 22000,
            amount: 42000,
          },
          {
            quotationId: quote.id,
            kind: "TESTING",
            title: "Safety — IEC 62368-1",
            catalogItemId: "seed-test-safety",
            quantity: 1,
            unitPrice: 38000,
            purchasePrice: 18000,
            amount: 38000,
          },
        ],
      });
    }

    const eventCount = await prisma.quotationEvent.count({
      where: { quotationId: quote.id },
    });
    if (eventCount === 0) {
      const base = Date.now() - 1000 * 60 * 60 * 24 * 12;
      await prisma.quotationEvent.createMany({
        data: [
          {
            quotationId: quote.id,
            event: "CREATED",
            note: "Quote drafted",
            createdAt: new Date(base),
          },
          {
            quotationId: quote.id,
            event: "SHARED",
            note: "Shared with customer",
            createdAt: new Date(base + 1000 * 60 * 60 * 24 * 2),
          },
          {
            quotationId: quote.id,
            event: "REVISION_REQUESTED",
            note: "Customer asked to add safety testing",
            createdAt: new Date(base + 1000 * 60 * 60 * 24 * 4),
          },
          {
            quotationId: quote.id,
            event: "REVISED",
            note: "Added IEC 62368 line",
            createdAt: new Date(base + 1000 * 60 * 60 * 24 * 5),
          },
          {
            quotationId: quote.id,
            event: "TESTING_OPTED",
            note: "EMI + Safety testing selected",
            createdAt: new Date(base + 1000 * 60 * 60 * 24 * 6),
          },
          {
            quotationId: quote.id,
            event: "ACCEPTED",
            note: "Customer accepted",
            createdAt: new Date(base + 1000 * 60 * 60 * 24 * 7),
          },
        ],
      });
    }

    const workCount = await prisma.workLibraryEntry.count({
      where: { customerId: customer.id },
    });
    if (workCount === 0) {
      await prisma.workLibraryEntry.createMany({
        data: [
          {
            customerId: customer.id,
            projectId: bis?.id,
            title: "Shared BIS commercial proposal",
            category: "QUOTE",
            summary: "Shared ICQ-2026-00001 covering consulting + testing.",
            valueAmount: 200000,
            createdById: sales.id,
            tags: "bis,quote",
          },
          {
            customerId: customer.id,
            projectId: bis?.id,
            title: "EMI sample coordination",
            category: "TESTING",
            summary: "Aligned sample dispatch with NABL Partner Lab A.",
            effortHours: 3,
            valueAmount: 42000,
            createdById: admin.id,
            tags: "emi,lab",
          },
          {
            customerId: customer.id,
            projectId: bis?.id,
            title: "Collected company dossier",
            category: "DOCUMENT",
            summary: "Incorporation, GST and signatory docs verified.",
            effortHours: 2,
            createdById: sales.id,
            tags: "documents",
          },
        ],
      });
    }

    const docReq = await prisma.documentRequest.findFirst({
      where: { customerId: customer.id },
    });
    if (!docReq) {
      await prisma.documentRequest.create({
        data: {
          publicToken: "seed-doc-checklist-midea",
          title: "BIS document checklist",
          status: "PARTIAL",
          customerId: customer.id,
          projectId: bis?.id,
          quotationId: quote.id,
          serviceOfferingId: bisService.id,
          createdById: sales.id,
          items: {
            create: [
              {
                name: "Company incorporation certificate",
                status: "UPLOADED",
                fileName: "incorporation.pdf",
                storedName: "incorporation.pdf",
                uploadedAt: new Date(),
              },
              { name: "GST certificate", status: "PENDING" },
              { name: "Authorized signatory ID & PAN", status: "PENDING" },
            ],
          },
        },
      });
    }

    const tr = await prisma.testRequestForm.findFirst({
      where: { customerId: customer.id },
    });
    if (!tr) {
      await prisma.testRequestForm.create({
        data: {
          publicToken: "seed-test-request-midea",
          status: "SUBMITTED",
          customerId: customer.id,
          projectId: bis?.id,
          quotationId: quote.id,
          productName: "Outdoor AC Unit",
          modelNumber: "MUE-36CRN1",
          brand: "Midea",
          manufacturer: "Midea Manufacturing Vietnam",
          sampleQuantity: "2 units",
          standards: "CISPR 32, IEC 62368-1",
          testScope: "EMI/EMC + Safety",
          contactName: "Nguyen An",
          contactEmail: "ops@midea-vietnam.example",
          contactPhone: "+84-900000001",
          submittedAt: new Date(),
          createdById: sales.id,
          formJson: JSON.stringify({ productName: "Outdoor AC Unit" }),
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
