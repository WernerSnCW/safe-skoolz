import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import router from "./routes";

const app: Express = express();

app.set("trust proxy", 1);

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(s => s.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin via proxy, server-to-server, health checks)
    if (!origin) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow Replit-hosted origins (*.replit.dev, *.replit.app, *.repl.co, *.picard.replit.dev, etc)
    if (/(^|\.)replit\.(dev|app)$|(^|\.)repl\.co$/.test(new URL(origin).hostname)) {
      return callback(null, true);
    }
    // Block all other cross-origin requests
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
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
