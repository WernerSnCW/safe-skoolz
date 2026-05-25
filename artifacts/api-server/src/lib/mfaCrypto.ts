import crypto from "crypto";

// T11: AES-256-GCM at rest for TOTP secrets. Key is a 32-byte value, supplied
// base64-encoded via MFA_ENC_KEY. Ciphertext format:
//   base64( iv(12) || authTag(16) || ciphertext )
// IV is random per encrypt — never reused with the same key.

function getKey(): Buffer | null {
  const raw = process.env.MFA_ENC_KEY;
  if (!raw) return null;
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    return null;
  }
  if (key.length !== 32) return null;
  return key;
}

export function isMfaConfigured(): boolean {
  return getKey() !== null;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) throw new Error("MFA_ENC_KEY not configured");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(blob: string): string {
  const key = getKey();
  if (!key) throw new Error("MFA_ENC_KEY not configured");
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
