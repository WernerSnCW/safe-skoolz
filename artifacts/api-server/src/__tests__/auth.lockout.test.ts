import { describe, it, expect } from "vitest";
import {
  PUPIL_LOCK_THRESHOLD,
  PUPIL_ADMIN_RESET_THRESHOLD,
  PUPIL_LOCK_MINUTES,
  computeLockoutAction,
} from "../routes/auth";

describe("Lockout constants", () => {
  it("PUPIL_LOCK_THRESHOLD === 3", () => {
    expect(PUPIL_LOCK_THRESHOLD).toBe(3);
  });

  it("PUPIL_ADMIN_RESET_THRESHOLD === 5", () => {
    expect(PUPIL_ADMIN_RESET_THRESHOLD).toBe(5);
  });

  it("PUPIL_LOCK_MINUTES === 15", () => {
    expect(PUPIL_LOCK_MINUTES).toBe(15);
  });
});

describe("computeLockoutAction", () => {
  it("2 failed attempts (prior) → no lock", () => {
    const result = computeLockoutAction(1);
    expect(result.action).toBe("none");
    expect(result.lockedUntil).toBeNull();
    expect(result.attemptsRemaining).toBe(1);
  });

  it("3 failed attempts → timed lock (lockedUntil ≈ now + 15 min)", () => {
    const before = Date.now();
    const result = computeLockoutAction(2);
    const after = Date.now();
    expect(result.action).toBe("timed_lock");
    expect(result.lockedUntil).not.toBeNull();
    const lockTime = result.lockedUntil!.getTime();
    expect(lockTime).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(lockTime).toBeLessThanOrEqual(after + 15 * 60 * 1000);
  });

  it("5 failed attempts → admin lock (lockedUntil year = 2099)", () => {
    const result = computeLockoutAction(4);
    expect(result.action).toBe("admin_lock");
    expect(result.lockedUntil).not.toBeNull();
    expect(result.lockedUntil!.getFullYear()).toBe(2099);
  });
});
