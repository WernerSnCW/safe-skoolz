import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";

const ALLOWED = "https://allowed.example.com";
const DISALLOWED = "https://evil.example.com";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.CORS_ALLOWED_ORIGINS = ALLOWED;
  process.env.NODE_ENV = "production"; // exercise prod path so localhost/replit fallback is off
  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("CORS allowlist", () => {
  it("allowed origin gets access-control-allow-origin echoed back", async () => {
    const res = await fetch(`${baseUrl}/api/healthz`, {
      headers: { Origin: ALLOWED },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED);
  });

  it("disallowed origin does NOT get access-control-allow-origin", async () => {
    const res = await fetch(`${baseUrl}/api/healthz`, {
      headers: { Origin: DISALLOWED },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
