import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { existsSync } from "fs";
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

// --- Unified app: serve the built front end (production only) --------------
// One Node process serves BOTH the API (under /api, above) and the built
// safeschool SPA. In development this block is skipped — Vite serves the front
// end on :5173 and proxies /api here, so responsibilities stay split. The guard
// is process.env.NODE_ENV === "production", which esbuild inlines to a literal
// in the production bundle (build.ts defines it), so dev (tsx) never mounts it.
if (process.env.NODE_ENV === "production") {
  // The bundle runs from artifacts/api-server/dist/index.cjs, so __dirname is
  // artifacts/api-server/dist; the SPA build output lives at
  // artifacts/safeschool/dist/public. __dirname is the native CJS global in the
  // esbuild bundle (correct here); this block never runs under dev/tsx (ESM),
  // so the import.meta-vs-__dirname distinction doesn't matter there.
  const spaDir = path.resolve(__dirname, "../../safeschool/dist/public");
  const indexHtml = path.join(spaDir, "index.html");

  if (existsSync(indexHtml)) {
    // Static assets first (hashed JS/CSS, fonts, images) — served from disk.
    app.use(express.static(spaDir));
    // SPA fallback: any non-API GET/HEAD that didn't match a static file gets
    // index.html so wouter can resolve the route client-side. /api is excluded
    // so an unmatched API path still falls through to the error handler /
    // 404 as before, rather than returning HTML to an API caller.
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path === "/api" || req.path.startsWith("/api/")) return next();
      res.sendFile(indexHtml);
    });
    console.log(`[boot] Serving front end from ${spaDir}`);
  } else {
    console.warn(
      `[boot] NODE_ENV=production but no SPA build at ${spaDir}; front end not served. ` +
        "Build it with: PORT=1 BASE_PATH=/ pnpm --filter @workspace/safeschool build",
    );
  }
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
