"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiUser } from "@/lib/api-client";
import { AppShell } from "@/components/AppShell";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ApiUser>("/auth/me")
      .then((u) => setUser(u))
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-wash text-brand-grey">
        Loading CRM…
      </div>
    );
  }

  return <AppShell user={user}>{children}</AppShell>;
}
