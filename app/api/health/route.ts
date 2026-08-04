export async function GET() {
  return Response.json({
    ok: true,
    service: "sera-ask",
    version: "0.1.0",
  });
}
