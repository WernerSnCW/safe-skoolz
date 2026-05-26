import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Server cannot start without it.");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

export interface JwtPayload {
  userId: string;
  schoolId: string;
  role: string;
  email?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    // T11: mfa-challenge tokens are scoped to /api/auth/mfa/challenge only;
    // they must not authenticate any other endpoint.
    const kind = (payload as any).kind;
    if (kind === "mfa-challenge") {
      res.status(401).json({ error: "MFA challenge required" });
      return;
    }
    if (kind === "mfa-enrollment") {
      // T3: enrollment tokens are scoped to /api/auth/mfa/enroll/* only — they
      // must not authenticate any normal endpoint.
      res.status(401).json({ error: "MFA enrolment required" });
      return;
    }
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JwtPayload;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
