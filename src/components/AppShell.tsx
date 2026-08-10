"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/leads", label: "Leads" },
  { href: "/quotes", label: "Sales" },
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
  { href: "/documents", label: "Documents" },
  { href: "/testing", label: "Testing" },
  { href: "/reports", label: "Reports" },
  { href: "/templates", label: "Templates" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role: string };
}) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-app-wash lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-brand-line bg-white/90 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-brand-line">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="px-2 pb-5">
            <BrandMark size="sm" />
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-brand-grey">
              Sales & Delivery CRM
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-brand-teal text-white shadow-soft"
                      : "text-brand-ink/80 hover:bg-brand-soft hover:text-brand-teal"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-2xl border border-brand-line bg-brand-soft/70 p-3">
            <div className="mb-3">
              <p className="text-sm font-bold text-brand-ink">{user.name}</p>
              <p className="text-xs text-brand-grey">
                {user.role === "ADMIN" ? "Admin" : "Sales & Operations"}
              </p>
            </div>
            <button
              type="button"
              className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm font-semibold text-brand-teal transition hover:border-brand-teal"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
