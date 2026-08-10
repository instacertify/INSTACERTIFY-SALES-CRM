import { prisma } from "@/lib/prisma";
import { quoteRevenue } from "@/lib/constants";

export async function upsertCustomer(input: {
  email: string;
  customerName: string;
  company: string;
  phone?: string | null;
  country?: string | null;
  state?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return null;

  return prisma.customer.upsert({
    where: { email },
    update: {
      customerName: input.customerName,
      company: input.company,
      phone: input.phone || undefined,
      country: input.country || undefined,
      state: input.state || undefined,
      lastActivityAt: new Date(),
      status: "ACTIVE",
    },
    create: {
      email,
      customerName: input.customerName,
      company: input.company,
      phone: input.phone || null,
      country: input.country || "India",
      state: input.state || null,
      lastActivityAt: new Date(),
    },
  });
}

export async function refreshCustomerMetrics(customerId: string) {
  const [projects, quotes] = await Promise.all([
    prisma.project.findMany({
      where: { customerId },
      select: { projectValue: true, status: true, lastActivityAt: true },
    }),
    prisma.quote.findMany({
      where: { customerId },
      select: {
        consultingPrice: true,
        testingPrice: true,
        otherCommercials: true,
        status: true,
      },
    }),
  ]);

  const lifetimeValue = projects.reduce((s, p) => s + Number(p.projectValue || 0), 0);
  const lastActivityAt =
    projects
      .map((p) => p.lastActivityAt)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0] || new Date();

  await prisma.customer.update({
    where: { id: customerId },
    data: { lifetimeValue, lastActivityAt },
  });

  return { lifetimeValue, quotes: quotes.length, projects: projects.length };
}

export async function nextProjectNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.project.count({
    where: { projectNumber: { startsWith: `IC-${year}-` } },
  });
  return `IC-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function ensureProjectForLead(leadId: string, userId?: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { assignedTo: true },
  });
  if (!lead) throw new Error("LEAD_NOT_FOUND");

  const existing = await prisma.project.findFirst({
    where: {
      leadId,
      status: { notIn: ["COMPLETED", "CLOSED", "LOST"] },
    },
  });
  if (existing) return existing;

  const customer = await upsertCustomer({
    email: lead.email,
    customerName: lead.customerName,
    company: lead.company,
    phone: lead.phone,
    country: lead.country,
    state: lead.state,
  });

  const ownerId = lead.assignedToId || userId || lead.createdById;
  const project = await prisma.project.create({
    data: {
      projectNumber: await nextProjectNumber(),
      title: `${lead.company} — ${lead.serviceName || lead.customerName}`,
      status: lead.status === "WON" ? "ACCEPTED" : "NOT_STARTED",
      serviceName: lead.serviceName || null,
      projectValue: lead.expectedValue || 0,
      expectedCompletion: lead.expectedClose,
      startDate: lead.status === "WON" ? new Date() : null,
      customerId: customer?.id,
      leadId: lead.id,
      commercialOwnerId: ownerId,
      deliveryOwnerId: ownerId,
      customerName: lead.customerName,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      country: lead.country,
      state: lead.state,
      lastActivityAt: new Date(),
    },
  });

  if (customer) await refreshCustomerMetrics(customer.id);
  return project;
}

export async function ensureProjectForQuote(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lead: true, createdBy: true },
  });
  if (!quote) throw new Error("QUOTE_NOT_FOUND");

  const existing = await prisma.project.findFirst({
    where: {
      OR: [
        { quoteId: quote.id },
        quote.leadId
          ? { leadId: quote.leadId, status: { notIn: ["COMPLETED", "CLOSED", "LOST"] } }
          : { id: "__none__" },
      ],
    },
  });

  const customer = await upsertCustomer({
    email: quote.email,
    customerName: quote.customerName,
    company: quote.company,
    phone: quote.phone,
    country: quote.country,
    state: quote.state,
  });

  const value = quoteRevenue(quote);
  const ownerId = quote.lead?.assignedToId || quote.createdById;

  if (existing) {
    return prisma.project.update({
      where: { id: existing.id },
      data: {
        quoteId: quote.id,
        customerId: customer?.id,
        projectValue: value || existing.projectValue,
        serviceName: quote.serviceName || existing.serviceName,
        status:
          quote.status === "ACCEPTED"
            ? existing.status === "NOT_STARTED" || existing.status === "QUOTED"
              ? "ACCEPTED"
              : existing.status
            : quote.status === "SHARED" && existing.status === "NOT_STARTED"
              ? "QUOTED"
              : existing.status,
        startDate:
          quote.status === "ACCEPTED" && !existing.startDate
            ? new Date()
            : existing.startDate,
        lastActivityAt: new Date(),
      },
    });
  }

  const project = await prisma.project.create({
    data: {
      projectNumber: await nextProjectNumber(),
      title: `${quote.company} — ${quote.serviceName}`,
      status:
        quote.status === "ACCEPTED"
          ? "ACCEPTED"
          : quote.status === "SHARED"
            ? "QUOTED"
            : "NOT_STARTED",
      serviceName: quote.serviceName,
      projectValue: value,
      startDate: quote.status === "ACCEPTED" ? new Date() : null,
      customerId: customer?.id,
      leadId: quote.leadId,
      quoteId: quote.id,
      commercialOwnerId: ownerId,
      deliveryOwnerId: ownerId,
      customerName: quote.customerName,
      company: quote.company,
      email: quote.email,
      phone: quote.phone,
      country: quote.country,
      state: quote.state,
      scopeSummary: quote.description,
      lastActivityAt: new Date(),
    },
  });

  if (customer) await refreshCustomerMetrics(customer.id);
  return project;
}

export const PROJECT_STATUSES = [
  "NOT_STARTED",
  "QUOTED",
  "ACCEPTED",
  "DOCUMENTS_PENDING",
  "DOCUMENTS_COMPLETE",
  "TESTING",
  "APPLICATION",
  "AUTHORITY_PENDING",
  "CLIENT_ACTION",
  "COMPLETED",
  "CLOSED",
  "LOST",
] as const;

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "WAITING", "COMPLETED"] as const;

export const WAITING_FOR = [
  "Client",
  "Lab",
  "Government",
  "Payment",
  "Sample",
  "Internal",
  "Other",
] as const;

export function labelStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
