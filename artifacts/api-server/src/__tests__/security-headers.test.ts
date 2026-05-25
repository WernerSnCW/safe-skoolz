import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import app from "../app";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
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

describe("security headers (helmet + CSP)", () => {
  it("GET /api/healthz includes CSP, nosniff, HSTS and omits x-powered-by", async () => {
    const res = await fetch(`${baseUrl}/api/healthz`);
    expect(res.headers.get("content-security-policy")).toBeTruthy();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("strict-transport-security")).toBeTruthy();
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("CSP contains the required directives", async () => {
    const res = await fetch(`${baseUrl}/api/healthz`);
    const csp = res.headers.get("content-security-policy") || "";
    expect(csp).toMatch(/default-src 'self'/);
    expect(csp).toMatch(/script-src 'self'/);
    expect(csp).toMatch(/style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
  });
});
