import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instacertify CRM",
  description: "Next.js sales & delivery CRM for Instacertify",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-brand-ink">{children}</body>
    </html>
  );
}
