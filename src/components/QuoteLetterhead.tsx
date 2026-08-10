import Image from "next/image";
import { format } from "date-fns";
import { BrandMark } from "@/components/BrandMark";
import { BRAND, formatINR, quoteRevenue } from "@/lib/constants";

type TestingItem = { name: string; labName?: string; price: number };

export function QuoteLetterhead({
  quote,
  showBarcode = true,
}: {
  quote: {
    quoteNumber: string;
    publicToken: string;
    customerName: string;
    company: string;
    email: string;
    phone: string;
    country: string;
    state?: string | null;
    serviceName: string;
    description: string;
    validityDate: string | Date;
    consultingPrice: number;
    testingPrice: number;
    otherCommercials: number;
    otherCommercialsNote?: string | null;
    testingItems?: TestingItem[];
    bodyHtml: string;
    bankSnapshot: string;
    status: string;
  };
  showBarcode?: boolean;
}) {
  const validity =
    typeof quote.validityDate === "string"
      ? new Date(quote.validityDate)
      : quote.validityDate;
  const total = quoteRevenue(quote);

  return (
    <article className="quote-letterhead">
      <header className="quote-top">
        <div>
          <BrandMark size="md" />
          <p className="muted" style={{ marginTop: 8 }}>
            {BRAND.legalName}
          </p>
        </div>
        <div className="quote-meta">
          <strong>{quote.quoteNumber}</strong>
          <div>Status: {quote.status}</div>
          <div>Valid till: {format(validity, "dd MMM yyyy")}</div>
          {showBarcode ? (
            <div className="barcode-block" style={{ marginTop: 10 }}>
              <Image
                src={`/api/barcode/${quote.publicToken}`}
                alt={`QR for ${quote.quoteNumber}`}
                width={140}
                height={140}
                unoptimized
              />
              <span className="muted">Scan with Google Lens</span>
            </div>
          ) : null}
        </div>
      </header>

      <div className="quote-body">
        <section>
          <h3>Prepared for</h3>
          <p>
            <strong>{quote.customerName}</strong>
          </p>
          <p>{quote.company}</p>
          <p className="muted">
            {quote.email} · {quote.phone}
          </p>
          <p className="muted">
            {quote.country}
            {quote.state ? `, ${quote.state}` : ""}
          </p>
        </section>

        <section className="quote-section">
          <h3>Service</h3>
          <p>
            <strong>{quote.serviceName}</strong>
          </p>
          <p>{quote.description}</p>
        </section>

        {quote.bodyHtml ? (
          <section
            className="quote-section"
            dangerouslySetInnerHTML={{ __html: quote.bodyHtml }}
          />
        ) : null}

        <section className="quote-section">
          <h3>Commercials</h3>
          <table className="price-table">
            <thead>
              <tr>
                <th>Particulars</th>
                <th>Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Commercial consulting</td>
                <td>{formatINR(quote.consultingPrice)}</td>
              </tr>
              <tr>
                <td>Testing</td>
                <td>{formatINR(quote.testingPrice)}</td>
              </tr>
              <tr>
                <td>
                  Other commercials
                  {quote.otherCommercialsNote
                    ? ` — ${quote.otherCommercialsNote}`
                    : ""}
                </td>
                <td>{formatINR(quote.otherCommercials)}</td>
              </tr>
              <tr>
                <th>Total revenue</th>
                <th>{formatINR(total)}</th>
              </tr>
            </tbody>
          </table>
        </section>

        {quote.testingItems && quote.testingItems.length ? (
          <section className="quote-section">
            <h3>Testing breakup</h3>
            <table className="price-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Lab</th>
                  <th>Sales price</th>
                </tr>
              </thead>
              <tbody>
                {quote.testingItems.map((item, idx) => (
                  <tr key={`${item.name}-${idx}`}>
                    <td>{item.name}</td>
                    <td>{item.labName || "—"}</td>
                    <td>{formatINR(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="quote-section">
          <h3>Banking details</h3>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
            {quote.bankSnapshot || "Banking details will be shared separately."}
          </pre>
        </section>

        <section className="quote-section">
          <p className="muted">
            This digital copy is uniquely identified by {quote.quoteNumber}. For
            support contact {BRAND.domain}.
          </p>
        </section>
      </div>
    </article>
  );
}
