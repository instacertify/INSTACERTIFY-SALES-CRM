import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { quotePublicUrl, documentPublicUrl } from "@/lib/quotes";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: Request, { params }: Params) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "quote";

  let url = "";
  if (type === "document") {
    const doc = await prisma.documentRequest.findUnique({
      where: { publicToken: token },
    });
    if (!doc) return new Response("Not found", { status: 404 });
    url = documentPublicUrl(token);
  } else {
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
    });
    if (!quote) return new Response("Not found", { status: 404 });
    url = quotePublicUrl(token);
  }

  // QR codes open the unique customer quote URL.
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width: 280,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
