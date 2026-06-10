import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import type { ComponentType } from "react";
import HomePage from "@/pages/home";
import SchoolsPage from "@/pages/schools";

// SSR entry for the build-time prerender step (driven by ../prerender.mjs via
// Vite's ssrLoadModule). Each public marketing route renders to static HTML so
// crawlers see real content; the client SPA takes over on mount. Register new
// public routes here as Phase 3 ports them.

export const PUBLIC_ROUTES: string[] = ["/", "/schools"];

const ROUTE_COMPONENTS: Record<string, ComponentType> = {
  "/": HomePage,
  "/schools": SchoolsPage,
};

export function renderRoute(route: string): string {
  const Page = ROUTE_COMPONENTS[route];
  if (!Page) {
    throw new Error(`No prerender component registered for route "${route}"`);
  }
  // wouter's Router takes an ssrPath so Link/useLocation resolve without window.
  return renderToString(
    <Router ssrPath={route}>
      <Page />
    </Router>,
  );
}
