import Image from "next/image";

export function BrandMark({
  size = "md",
  showTagline = false,
}: {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}) {
  const heights = { sm: 36, md: 52, lg: 72 };
  const h = heights[size];
  return (
    <div className="brand-mark">
      <Image
        src="/logo.svg"
        alt="Instacertify"
        width={Math.round(h * 4.3)}
        height={h}
        priority
        className="brand-logo"
      />
      {showTagline ? (
        <span className="sr-only">certifications made simple</span>
      ) : null}
    </div>
  );
}
