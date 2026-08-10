"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-screen">
      <section className="auth-hero">
        <BrandMark size="lg" />
        <h1>Certifications made simple for every lead.</h1>
        <p>
          Capture enquiries, follow up, quote with letterhead barcodes, and
          collect customer documents — all in one Instacertify workspace.
        </p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <BrandMark size="sm" />
          <h2>Sign in to CRM</h2>
          <p className="muted">Admin and Sales & Operations access only.</p>
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                defaultValue="admin@instacertify.in"
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                defaultValue="Admin@123"
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="btn primary full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
