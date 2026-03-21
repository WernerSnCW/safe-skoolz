import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "./auth";

const PII_FIELDS = new Set([
  "firstName", "lastName", "email", "pinHash", "passwordHash",
  "parentOf", "avatarImageUrl", "fullName",
  "senderEmail", "recipientEmail",
  "senderFirstName", "senderLastName",
  "submitterFirstName", "submitterLastName",
  "userFirstName", "userLastName",
  "reporterName", "reporterEmail", "reporterFirstName", "reporterLastName",
  "victimName", "victimFirstName", "victimLastName",
  "perpetratorName", "perpetratorFirstName", "perpetratorLastName",
  "witnessName", "witnessFirstName", "witnessLastName",
  "childFirstName", "childLastName", "childName",
  "parentFirstName", "parentLastName", "parentName", "parentEmail",
  "staffFirstName", "staffLastName", "staffName", "staffEmail",
  "phone", "phoneNumber", "mobileNumber", "address",
  "dateOfBirth", "dob",
  "victimIds", "perpetratorIds", "witnessIds",
]);

function stripPiiFromValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stripPiiFromValue);
  if (typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (PII_FIELDS.has(key)) continue;
      cleaned[key] = stripPiiFromValue(val);
    }
    return cleaned;
  }
  return value;
}

export function ptaPiiMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as JwtPayload | undefined;
  if (!user || user.role !== "pta") {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const cleaned = stripPiiFromValue(body);
    return originalJson(cleaned);
  } as any;

  next();
}
