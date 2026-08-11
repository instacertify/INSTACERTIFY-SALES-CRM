"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge, statusTone, EmptyState } from "@/components/ui";

type Task = {
  id: string;
  title: string;
  status: string;
  waitingFor?: string | null;
  assignedTo?: { name: string } | null;
  project: { id: string; projectNumber: string; company: string };
};

export default function TasksPage() {
  const [rows, setRows] = useState<Task[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Task[]>("/tasks")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Cross-project work queue with waiting-for tracking."
      />
      {error ? <p className="text-rose-600">{error}</p> : null}
      <Panel>
        {!rows.length && !error ? (
          <EmptyState title="No tasks" body="Tasks appear on projects as delivery work is planned." />
        ) : (
          <div className="space-y-2">
            {rows.map((t) => (
              <div
                key={t.id}
                className="flex flex-col justify-between gap-2 rounded-xl border border-brand-line px-3 py-3 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <Link
                    href={`/projects/${t.project.id}`}
                    className="text-sm text-brand-teal"
                  >
                    {t.project.projectNumber} · {t.project.company}
                  </Link>
                  <p className="text-xs text-brand-grey">
                    {t.assignedTo?.name || "Unassigned"}
                    {t.waitingFor ? ` · waiting ${t.waitingFor}` : ""}
                  </p>
                </div>
                <Badge tone={statusTone(t.status)}>{t.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
