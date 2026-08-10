"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, type ApiUser } from "@/lib/api-client";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/leads", label: "Leads" },
  { href: "/quotations", label: "Sales" },
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ApiUser;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-app-wash lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-brand-line bg-white/90 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="px-2 pb-5">
            <p className="font-display text-2xl font-semibold text-brand-teal">
              Instacertify
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-brand-grey">
              Project CRM
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
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
            <p className="text-sm font-bold text-brand-ink">{user.name}</p>
            <p className="text-xs text-brand-grey">{user.role}</p>
            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm font-semibold text-brand-teal"
              onClick={() => {
                logout();
                router.push("/login");
              }}
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
