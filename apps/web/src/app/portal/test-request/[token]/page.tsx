"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type FormData = {
  status: string;
  productName?: string | null;
  modelNumber?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  sampleQuantity?: string | null;
  standards?: string | null;
  testScope?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  additionalNotes?: string | null;
  customer?: { company?: string } | null;
};

export default function PublicTestRequestPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<FormData | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`${API}/public/test-requests/${params.token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Not found");
        setData(json);
        if (json.status === "SUBMITTED" || json.status === "DOWNLOADED" || json.status === "SENT_TO_LAB") {
          setDone(true);
        }
      })
      .catch((e) => setError(e.message));
  }, [params.token]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    const res = await fetch(`${API}/public/test-requests/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Submit failed");
      return;
    }
    setData(json);
    setDone(true);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-rose-600">{error}</main>
    );
  }
  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-[#5F5E6B]">
        Loading test request…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fafc,#eef4f8)] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#D7E2EA] bg-white/95 p-6 shadow-[0_10px_30px_rgba(18,35,58,0.08)]">
        <p className="font-serif text-2xl font-semibold text-[#0A4A6C]">
          Instacertify
        </p>
        <h1 className="mt-2 text-xl font-semibold">Test request form</h1>
        <p className="mt-1 text-sm text-[#5F5E6B]">
          {data.customer?.company || "Customer"} · for laboratory submission
        </p>

        {done ? (
          <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Thank you. Your test request has been submitted. Our team will
            download this pack and share it with the lab.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 grid gap-3">
            {(
              [
                ["productName", "Product name", data.productName ?? ""],
                ["modelNumber", "Model number", data.modelNumber ?? ""],
                ["brand", "Brand", data.brand ?? ""],
                ["manufacturer", "Manufacturer", data.manufacturer ?? ""],
                ["sampleQuantity", "Sample quantity", data.sampleQuantity ?? ""],
                ["standards", "Standards", data.standards ?? ""],
                ["testScope", "Test scope", data.testScope ?? ""],
                ["contactName", "Contact name", data.contactName ?? ""],
                ["contactEmail", "Contact email", data.contactEmail ?? ""],
                ["contactPhone", "Contact phone", data.contactPhone ?? ""],
              ] as Array<[string, string, string]>
            ).map(([name, label, value]) => (
              <label key={name} className="text-sm font-semibold">
                {label}
                <input
                  name={name}
                  defaultValue={value}
                  className="mt-1 w-full rounded-xl border border-[#D7E2EA] px-3 py-2 font-normal"
                />
              </label>
            ))}
            <label className="text-sm font-semibold">
              Additional notes
              <textarea
                name="additionalNotes"
                defaultValue={data.additionalNotes ?? ""}
                className="mt-1 w-full rounded-xl border border-[#D7E2EA] px-3 py-2 font-normal"
              />
            </label>
            <button className="rounded-xl bg-[#EB7D2D] px-4 py-2.5 text-sm font-semibold text-white">
              Submit test request
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
