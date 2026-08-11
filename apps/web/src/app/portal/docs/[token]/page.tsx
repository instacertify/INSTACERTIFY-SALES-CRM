"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type Item = {
  id: string;
  name: string;
  description?: string | null;
  required: boolean;
  status: string;
  fileName?: string | null;
};

type Payload = {
  title: string;
  status: string;
  teamRemark?: string | null;
  company?: string;
  serviceName?: string;
  items: Item[];
};

export default function PublicDocChecklistPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    const res = await fetch(`${API}/public/document-requests/${params.token}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Not found");
    setData(json);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [params.token]);

  async function markUploaded(e: FormEvent<HTMLFormElement>, itemId: string) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch(
      `${API}/public/document-requests/${params.token}/items/${itemId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: String(form.get("fileName") || "document.pdf"),
          customerNote: String(form.get("customerNote") || ""),
        }),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Upload failed");
      return;
    }
    setOk("Document marked as uploaded. Our team will verify.");
    setData(json);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-rose-600">{error}</main>
    );
  }
  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-brand-grey">
        Loading checklist…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fafc,#eef4f8)] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#D7E2EA] bg-white/95 p-6 shadow-[0_10px_30px_rgba(18,35,58,0.08)]">
        <p className="font-serif text-2xl font-semibold text-[#0A4A6C]">
          Instacertify
        </p>
        <h1 className="mt-2 text-xl font-semibold text-[#12233A]">{data.title}</h1>
        <p className="mt-1 text-sm text-[#5F5E6B]">
          {data.company || "Customer"} · {data.serviceName || "Service"} ·{" "}
          {data.status}
        </p>
        {data.teamRemark ? (
          <p className="mt-3 rounded-xl bg-[#F3F7FA] px-3 py-2 text-sm">
            {data.teamRemark}
          </p>
        ) : null}
        {ok ? <p className="mt-3 text-sm text-emerald-700">{ok}</p> : null}

        <div className="mt-6 space-y-4">
          {data.items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#D7E2EA] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  {item.description ? (
                    <p className="text-sm text-[#5F5E6B]">{item.description}</p>
                  ) : null}
                </div>
                <span className="text-xs font-semibold text-[#0A4A6C]">
                  {item.status}
                  {item.required ? " · required" : ""}
                </span>
              </div>
              {item.status === "PENDING" ? (
                <form
                  className="mt-3 grid gap-2"
                  onSubmit={(e) => markUploaded(e, item.id)}
                >
                  <input
                    name="fileName"
                    required
                    placeholder="File name you uploaded (e.g. gst.pdf)"
                    className="rounded-xl border border-[#D7E2EA] px-3 py-2 text-sm"
                  />
                  <input
                    name="customerNote"
                    placeholder="Note (optional)"
                    className="rounded-xl border border-[#D7E2EA] px-3 py-2 text-sm"
                  />
                  <button className="rounded-xl bg-[#0A4A6C] px-4 py-2 text-sm font-semibold text-white">
                    Mark uploaded
                  </button>
                </form>
              ) : (
                <p className="mt-2 text-xs text-[#5F5E6B]">
                  File: {item.fileName || "uploaded"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
