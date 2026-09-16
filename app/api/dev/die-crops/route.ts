import { parseCropUpload, storeCrops } from "../../../camera/die-crops/store-crops";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 8_000_000;

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let batch: ReturnType<typeof parseCropUpload>;
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
    batch = parseCropUpload(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return Response.json({ error: "Invalid die crop capture" }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
  try {
    const name = await storeCrops(batch);
    return Response.json({ path: `docs/dice-crops/captures/${name}` });
  } catch {
    return Response.json({ error: "Could not save die crops" }, { status: 500 });
  }
}
