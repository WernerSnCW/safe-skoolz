// Build-time prerender of the public marketing routes.
//
// Runs after `vite build`. Uses Vite's own dev server (createServer +
// ssrLoadModule) purely as a module loader so JSX, the "@/" alias, and env are
// resolved exactly as in the app — no separate tsx/esbuild config to drift.
// For each route in PUBLIC_ROUTES it renderToString()s the page and injects the
// markup into the built index.html's #root, writing dist/public/<route>/index.html.
//
// Plain .mjs so it runs on bare `node` (no tsx needed). Requires PORT and
// BASE_PATH in env because vite.config.ts validates them (the build sets both).

import { createServer } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "dist/public");
const templatePath = path.join(distDir, "index.html");
const PLACEHOLDER = "<!--app-html-->";

const vite = await createServer({
  root: __dirname,
  configFile: path.resolve(__dirname, "vite.config.ts"),
  logLevel: "warn",
  server: { middlewareMode: true },
  appType: "custom",
  // We only ssrLoadModule the prerender entry — skip Vite's client dep-optimizer
  // scan, which would otherwise crawl the whole app (i18n → locale JSON, etc.)
  // and is irrelevant to SSR module loading.
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const { PUBLIC_ROUTES, renderRoute } = await vite.ssrLoadModule(
    "/src/prerender-entry.tsx",
  );

  const template = await readFile(templatePath, "utf-8");
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(
      `Could not find ${PLACEHOLDER} in ${templatePath}. Ensure index.html has ` +
        `<div id="root"><!--app-html--></div> and run a fresh \`vite build\` first.`,
    );
  }

  for (const route of PUBLIC_ROUTES) {
    const appHtml = renderRoute(route);
    const html = template.replace(PLACEHOLDER, appHtml);
    const outDir =
      route === "/" ? distDir : path.join(distDir, route.replace(/^\/+/, ""));
    await mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, "index.html");
    await writeFile(outFile, html, "utf-8");
    console.log(`[prerender] ${route} -> ${path.relative(distDir, outFile)}`);
  }
} finally {
  await vite.close();
}
