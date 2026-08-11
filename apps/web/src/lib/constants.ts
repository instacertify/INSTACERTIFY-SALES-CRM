export const BRAND = {
  name: "Instacertify",
  legalName: "Instacertify Labs Pvt Ltd",
  tagline: "certifications made simple",
  domain: "instacertify.in",
  colors: {
    teal: "#0A4A6C",
    orange: "#EB7D2D",
    grey: "#5F5E6B",
    ink: "#12233A",
    soft: "#F3F7FA",
    line: "#D7E2EA",
  },
};

export const COMPANY_SIZES = ["MICRO", "SMALL", "MEDIUM", "LARGE"] as const;

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTATION",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const ACTIVE_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTATION",
  "NEGOTIATION",
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export const COUNTRIES = [
  "India",
  "United States",
  "United Arab Emirates",
  "United Kingdom",
  "Singapore",
  "Germany",
  "Australia",
  "Canada",
  "Other",
] as const;

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function quoteRevenue(quote: {
  consultingPrice: number;
  testingPrice: number;
  otherCommercials: number;
}) {
  return (
    Number(quote.consultingPrice || 0) +
    Number(quote.testingPrice || 0) +
    Number(quote.otherCommercials || 0)
  );
}
