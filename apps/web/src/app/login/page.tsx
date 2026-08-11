"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-wash px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(10,74,108,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(235,125,45,0.18),transparent_40%)]" />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md rounded-3xl border border-brand-line bg-white/95 p-8 shadow-panel"
      >
        <p className="font-display text-3xl font-semibold text-brand-teal">
          Instacertify
        </p>
        <p className="mt-2 text-sm text-brand-grey">
          Sign in to the project CRM
        </p>
        <label className="mt-6 block text-sm font-semibold">
          Email
          <input
            name="email"
            type="email"
            required
            defaultValue="admin@instacertify.in"
            className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <input
            name="password"
            type="password"
            required
            defaultValue="Admin@123"
            className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <button
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
