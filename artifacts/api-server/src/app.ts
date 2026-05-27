import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { PgRateLimitStore } from "./lib/rateLimitStore";

const app: Express = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

// Helmet MUST be the first middleware so security headers attach to every response.
// CSP choice: keep `'unsafe-inline'` in style-src — Tailwind v4 injects runtime styles
// and the demo UI breaks without it. script-src stays strict ('self'); no inline scripts
// in safeschool/index.html today (verified before mount). Connect-src enumerates the
// outbound APIs the server-side code talks to (OpenAI, Resend) plus self for XHR.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.resend.com"],
      frameAncestors: ["'none'"],
    },
  },
}));

// CORS allowlist driven by CORS_ALLOWED_ORIGINS (comma-separated). In non-production we
// additionally permit localhost (any port) and `*.replit.dev` so the dev workflow and
// Replit preview iframes work without configuring env vars per branch. Rejections are
// logged as structured warnings so production misconfig surfaces in the log stream.
function isOriginAllowed(origin: string): boolean {
  const list = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.includes(origin)) return true;
  try {
    const u = new URL(origin);
    // Production custom domain(s) for the deployed demo.
    if (u.hostname === "safeskoolz.com" || u.hostname === "www.safeskoolz.com") return true;
    // Replit-hosted preview + deployment domains are always trusted.
    if (u.hostname.endsWith(".replit.dev")) return true;
    if (u.hostname.endsWith(".replit.app")) return true;
    if (process.env.NODE_ENV !== "production") {
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
    }
  } catch {
    // Malformed origin string — fall through to rejection.
  }
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    // No Origin header => same-origin or non-browser caller (curl, server-to-server). Allow.
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) return callback(null, true);
    console.warn(JSON.stringify({ level: "warn", event: "cors_rejected", origin }));
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Limits unchanged (auth: 30 / 15min, newsletter: 10 / 1hr). Switched to a
// Postgres-backed Store so counters survive restarts and are shared across replicas.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
  store: new PgRateLimitStore("auth"),
});

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  store: new PgRateLimitStore("newsletter"),
});

app.use("/api/auth/pupil/start", authLimiter);
app.use("/api/auth/pupil/login", authLimiter);
app.use("/api/auth/staff/login", authLimiter);
app.use("/api/auth/parent/login", authLimiter);
app.use("/api/auth/demo-login", authLimiter);
app.use("/api/newsletter", newsletterLimiter);

app.use("/api", router);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
