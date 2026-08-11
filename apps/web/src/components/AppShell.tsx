"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, type ApiUser } from "@/lib/api-client";

const NAV_GROUPS: { title: string; items: { href: string; label: string }[] }[] =
  [
    {
      title: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/reports", label: "Reports" },
      ],
    },
    {
      title: "CRM",
      items: [
        { href: "/customers", label: "Customers" },
        { href: "/leads", label: "Leads" },
        { href: "/opportunities", label: "Opportunities" },
        { href: "/quotations", label: "Quotations" },
      ],
    },
    {
      title: "Delivery",
      items: [
        { href: "/projects", label: "Projects" },
        { href: "/tasks", label: "Tasks" },
        { href: "/testing", label: "Testing catalog" },
        { href: "/samples", label: "Samples" },
        { href: "/documents", label: "Documents" },
        { href: "/work-library", label: "Work library" },
      ],
    },
    {
      title: "Finance",
      items: [
        { href: "/invoices", label: "Invoices" },
        { href: "/purchase-orders", label: "Purchase orders" },
        { href: "/expenses", label: "Expenses" },
        { href: "/vendors", label: "Vendors" },
      ],
    },
    {
      title: "Org",
      items: [{ href: "/users", label: "Team / HR" }],
    },
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
    <div className="min-h-screen bg-app-wash lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-brand-line bg-white/90 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="px-2 pb-5">
            <p className="font-display text-2xl font-semibold text-brand-teal">
              Instacertify
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-brand-grey">
              Cert + Testing ERP
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-grey">
                  {group.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-brand-teal text-white shadow-soft"
                            : "text-brand-ink/80 hover:bg-brand-soft hover:text-brand-teal"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
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
