import { Resend } from "resend";
import { writeAudit } from "./auditHelper";

let resendClient: Resend | null = null;
// Process-scoped latch: write at most one missing-key audit row per process so we
// surface the misconfig without spamming the audit log on every subsequent send.
let missingKeyAuditWritten = false;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendEmail(opts: {
  to: string;
  toName: string;
  subject: string;
  bodyText: string;
  trigger: string;
  recipientId: string;
  schoolId: string;
}): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn(`[email] Resend not configured (RESEND_API_KEY missing). Skipping email: ${opts.trigger}`);
    if (!missingKeyAuditWritten) {
      missingKeyAuditWritten = true;
      try {
        await writeAudit({
          schoolId: opts.schoolId,
          eventType: "email_send_failed",
          targetType: "email",
          targetId: opts.recipientId,
          details: {
            trigger: opts.trigger,
            recipientId: opts.recipientId,
            reason: "missing_api_key",
          },
        });
      } catch {
        // Audit failure must not propagate — sendEmail is fire-and-forget by contract.
      }
    }
    return;
  }

  const from = process.env.EMAIL_FROM_ADDRESS ?? "noreply@safeskoolz.com";

  try {
    const { error } = await client.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.bodyText,
    });

    if (error) {
      console.error(`[email] Resend API error for ${opts.trigger}:`, error.message);
      try {
        await writeAudit({
          schoolId: opts.schoolId,
          eventType: "email_send_failed",
          targetType: "email",
          targetId: opts.recipientId,
          details: {
            trigger: opts.trigger,
            recipientId: opts.recipientId,
            error: error.message,
          },
        });
      } catch {}
    }
  } catch (err: any) {
    console.error(`[email] Resend exception for ${opts.trigger}:`, err?.message || err);
    try {
      await writeAudit({
        schoolId: opts.schoolId,
        eventType: "email_send_failed",
        targetType: "email",
        targetId: opts.recipientId,
        details: {
          trigger: opts.trigger,
          recipientId: opts.recipientId,
          error: err?.message || String(err),
        },
      });
    } catch {}
  }
}
