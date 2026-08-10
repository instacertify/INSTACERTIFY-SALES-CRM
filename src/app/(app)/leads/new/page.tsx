import { prisma } from "@/lib/prisma";
import { PageHeader, Panel } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";

export default async function NewLeadPage() {
  const [sources, users] = await Promise.all([
    prisma.leadSource.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <div>
      <PageHeader
        title="Create lead"
        subtitle="Capture enquiry, service interest, expected value, and owner."
      />
      <Panel>
        <LeadForm sources={sources} users={users} />
      </Panel>
    </div>
  );
}
