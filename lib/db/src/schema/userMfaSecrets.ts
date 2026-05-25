import { pgTable, uuid, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// T11: TOTP secrets and backup codes for staff who enrol in MFA.
// `secretEncrypted` is AES-256-GCM ciphertext (see api-server src/lib/mfaCrypto.ts).
// `backupCodes` is a JSONB array of bcrypt-hashed codes; consumed entries are
// removed from the array (single-use).
export const userMfaSecretsTable = pgTable("user_mfa_secrets", {
  userId: uuid("user_id").primaryKey().references(() => usersTable.id),
  secretEncrypted: text("secret_encrypted").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  backupCodes: jsonb("backup_codes").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
