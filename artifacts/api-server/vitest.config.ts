import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // App boot pulls in heavy deps (drizzle, otplib, qrcode, helmet, …). Under
    // parallel file execution the default 10s hook timeout can be tripped on
    // cold starts; bump to a comfortable margin.
    hookTimeout: 30000,
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/lib/**/*.ts", "src/routes/**/*.ts"],
      exclude: ["src/lib/seed.ts"],
    },
  },
});
