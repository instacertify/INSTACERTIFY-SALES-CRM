import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "SALES_OPS";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "SALES_OPS";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "SALES_OPS";
  }
}
