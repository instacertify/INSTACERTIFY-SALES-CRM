import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instacertify CRM",
  description: "Instacertify sales, operations, quotes and document CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
