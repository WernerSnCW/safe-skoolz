import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireRole } from "../lib/auth";
import {
  ADMIN_ALLOWED_ROLES,
  aggregateProtocolCounts,
} from "../routes/admin";

describe("aggregateProtocolCounts", () => {
  it("returns zero totals for an empty result set", () => {
    expect(aggregateProtocolCounts([])).toEqual({ total: 0, by_status: {} });
  });

  it("sums counts and groups by status", () => {
    const result = aggregateProtocolCounts([
      { status: "open", count: 3 },
      { status: "closed", count: 2 },
      { status: "in_progress", count: 1 },
    ]);
    expect(result.total).toBe(6);
    expect(result.by_status).toEqual({ open: 3, closed: 2, in_progress: 1 });
  });

  it("coerces non-numeric counts to 0", () => {
    const result = aggregateProtocolCounts([
      { status: "open", count: "5" as unknown as number },
      { status: "bad", count: NaN as unknown as number },
    ]);
    expect(result.total).toBe(5);
    expect(result.by_status).toEqual({ open: 5, bad: 0 });
  });
});

describe("ADMIN_ALLOWED_ROLES", () => {
  it("is coordinator-only", () => {
    expect([...ADMIN_ALLOWED_ROLES]).toEqual(["coordinator"]);
  });
});

function makeReq(role: string | undefined) {
  return { user: role ? { role, userId: "u", schoolId: "s" } : undefined } as unknown as Request;
}
function makeRes() {
  const res: Partial<Response> & { _status?: number; _json?: unknown } = {};
  res.status = vi.fn((code: number) => {
    res._status = code;
    return res as Response;
  }) as unknown as Response["status"];
  res.json = vi.fn((body: unknown) => {
    res._json = body;
    return res as Response;
  }) as unknown as Response["json"];
  return res as Response & { _status?: number; _json?: unknown };
}

describe("requireRole gate for /api/admin/overview", () => {
  it("403s a pupil hitting the admin overview gate", () => {
    const middleware = requireRole(...ADMIN_ALLOWED_ROLES);
    const req = makeReq("pupil");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res._status).toBe(403);
    expect(res._json).toEqual({ error: "Insufficient permissions" });
    expect(next).not.toHaveBeenCalled();
  });

  it("403s a parent, teacher, head_teacher, and senco (only coordinator passes)", () => {
    const middleware = requireRole(...ADMIN_ALLOWED_ROLES);
    for (const role of ["parent", "teacher", "head_teacher", "senco", "pta", "support_staff", "head_of_year"]) {
      const res = makeRes();
      const next = vi.fn() as unknown as NextFunction;
      middleware(makeReq(role), res, next);
      expect(res._status, `role=${role} should be 403`).toBe(403);
      expect(next, `role=${role} should not call next`).not.toHaveBeenCalled();
    }
  });

  it("calls next() for a coordinator", () => {
    const middleware = requireRole(...ADMIN_ALLOWED_ROLES);
    const req = makeReq("coordinator");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res._status).toBeUndefined();
  });

  it("401s when no user is attached to the request", () => {
    const middleware = requireRole(...ADMIN_ALLOWED_ROLES);
    const req = makeReq(undefined);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
