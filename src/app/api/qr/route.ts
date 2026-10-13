import QRCode from "qrcode";
import { apiUser, unauthorized } from "@/lib/http";

/** GET ?text=… — QR code as SVG, for printing review links. */
export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const text = new URL(req.url).searchParams.get("text")?.slice(0, 500) ?? "";
  if (!text) return new Response("Missing text", { status: 400 });
  const svg = await QRCode.toString(text, { type: "svg", margin: 2, width: 512, errorCorrectionLevel: "M" });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=3600" } });
}
