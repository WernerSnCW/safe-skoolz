import { describe, it, expect, vi, beforeEach } from "vitest";

const baseOpts = {
  to: "test@example.com",
  toName: "Test User",
  subject: "Test Subject",
  bodyText: "Test body",
  trigger: "test_trigger",
  recipientId: "user-1",
  schoolId: "school-1",
};

describe("sendEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("when RESEND_API_KEY is not set: resolves void, writeAudit not called", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    delete process.env.RESEND_API_KEY;

    vi.doMock("resend", () => ({
      Resend: class { emails = { send: vi.fn() }; },
    }));
    const mockAudit = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../lib/auditHelper", () => ({ writeAudit: mockAudit }));

    const { sendEmail } = await import("../lib/emailHelper");
    await expect(sendEmail(baseOpts)).resolves.toBeUndefined();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it("when Resend returns { error }: resolves void, writeAudit called with email_send_failed", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");

    const mockSend = vi.fn().mockResolvedValue({ error: { message: "Bad request" } });
    vi.doMock("resend", () => ({
      Resend: class { emails = { send: mockSend }; },
    }));
    const mockAudit = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../lib/auditHelper", () => ({ writeAudit: mockAudit }));

    const { sendEmail } = await import("../lib/emailHelper");
    await expect(sendEmail(baseOpts)).resolves.toBeUndefined();
    expect(mockAudit).toHaveBeenCalledOnce();
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "email_send_failed" })
    );
  });

  it("when Resend throws: resolves void, writeAudit called with email_send_failed", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");

    const mockSend = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.doMock("resend", () => ({
      Resend: class { emails = { send: mockSend }; },
    }));
    const mockAudit = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../lib/auditHelper", () => ({ writeAudit: mockAudit }));

    const { sendEmail } = await import("../lib/emailHelper");
    await expect(sendEmail(baseOpts)).resolves.toBeUndefined();
    expect(mockAudit).toHaveBeenCalledOnce();
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "email_send_failed" })
    );
  });

  it("when Resend succeeds: resolves void, writeAudit not called", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");

    const mockSend = vi.fn().mockResolvedValue({ id: "email-123" });
    vi.doMock("resend", () => ({
      Resend: class { emails = { send: mockSend }; },
    }));
    const mockAudit = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../lib/auditHelper", () => ({ writeAudit: mockAudit }));

    const { sendEmail } = await import("../lib/emailHelper");
    await expect(sendEmail(baseOpts)).resolves.toBeUndefined();
    expect(mockAudit).not.toHaveBeenCalled();
  });
});
