import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function GET() {
  const pkg = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  ) as { version?: string };

  return Response.json({
    ok: true,
    service: "ask-sera",
    version: pkg.version ?? "0.1.0",
  });
}
