import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function makePublicToken() {
  return randomBytes(16).toString("hex");
}

export async function nextQuoteNumber() {
  const year = new Date().getFullYear();
  const prefix = `ICQ-${year}-`;
  const latest = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
  });
  let seq = 1;
  if (latest) {
    const part = latest.quoteNumber.split("-").pop();
    const n = Number(part);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export function bankDetailToText(bank: {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch?: string | null;
  upi?: string | null;
  notes?: string | null;
}) {
  return [
    `Account Name: ${bank.accountName}`,
    `Bank: ${bank.bankName}`,
    `Account Number: ${bank.accountNumber}`,
    `IFSC: ${bank.ifsc}`,
    bank.branch ? `Branch: ${bank.branch}` : null,
    bank.upi ? `UPI: ${bank.upi}` : null,
    bank.notes ? `Note: ${bank.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function appBaseUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function quotePublicUrl(token: string) {
  return `${appBaseUrl()}/q/${token}`;
}

export function documentPublicUrl(token: string) {
  return `${appBaseUrl()}/d/${token}`;
}
