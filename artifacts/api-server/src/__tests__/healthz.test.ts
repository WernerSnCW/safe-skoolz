import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { Server } from "node:http";

// Hoisted query mock so vi.mock factory can reference it.
const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@workspace/db", () => ({
  pool: { query: queryMock },
  db: {},
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
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

describe("GET /api/healthz", () => {
  it("returns 200 with checks.db === 'ok' when SELECT 1 succeeds", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });
    const res = await fetch(`${baseUrl}/api/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", checks: { db: "ok" } });
  });

  it("returns 503 with checks.db === 'down' when the DB client throws", async () => {
    queryMock.mockRejectedValueOnce(new Error("connection refused"));
    const res = await fetch(`${baseUrl}/api/healthz`);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ status: "degraded", checks: { db: "down" } });
  });
});
