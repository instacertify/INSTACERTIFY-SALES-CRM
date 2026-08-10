"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/operations", label: "Operations" },
  { href: "/quotes", label: "Quotes" },
  { href: "/templates", label: "Templates" },
  { href: "/documents", label: "Documents" },
  { href: "/testing", label: "Testing Library" },
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandMark size="sm" />
        </div>
        <nav className="sidebar-nav">
          {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <strong>{user.name}</strong>
            <span>{user.role === "ADMIN" ? "Admin" : "Sales & Operations"}</span>
          </div>
          <button
            type="button"
            className="btn ghost full"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
