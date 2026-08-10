import { prisma } from "@/lib/prisma";
import { PageHeader, Panel } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";

export default async function NewLeadPage() {
  const sources = await prisma.leadSource.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader
        title="Create lead"
        subtitle="Select source, company size, and India state when country is India."
      />
      <Panel>
        <LeadForm sources={sources} />
      </Panel>
    </div>
  );
}
