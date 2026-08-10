"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateProjectButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createProject() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createProject" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not create project");
      return;
    }
    router.push(`/projects/${data.id}`);
    router.refresh();
  }

  return (
    <div className="stack">
      <button
        type="button"
        className="btn primary"
        disabled={loading}
        onClick={createProject}
      >
        {loading ? "Creating..." : "Create project"}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
