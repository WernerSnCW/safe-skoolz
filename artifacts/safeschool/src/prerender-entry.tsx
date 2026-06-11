import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import type { ComponentType } from "react";
import HomePage from "@/pages/home";
import SchoolsPage from "@/pages/schools";
import ParentsPage from "@/pages/parents";
import PtasPage from "@/pages/ptas";
import CoalitionsPage from "@/pages/coalitions";
import ResourcesPage from "@/pages/resources";
import AboutPage from "@/pages/about";
import ParentsJoinPta from "@/pages/parents-join-pta";
import PtasOperatingPack from "@/pages/ptas-operating-pack";
import PtasSchoolEngagement from "@/pages/ptas-school-engagement";
import Schools10DayRollout from "@/pages/schools-10-day-rollout";
import SchoolsCaseStudy from "@/pages/schools-case-study";

// SSR entry for the build-time prerender step (driven by ../prerender.mjs via
// Vite's ssrLoadModule). Each public marketing route renders to static HTML so
// crawlers see real content; the client SPA takes over on mount. Register new
// public routes here as Phase 3 ports them.

export const PUBLIC_ROUTES: string[] = [
  "/",
  "/schools",
  "/parents",
  "/ptas",
  "/coalitions",
  "/resources",
  "/about",
  "/schools/10-day-rollout",
  "/schools/case-study",
  "/parents/join-pta",
  "/ptas/operating-pack",
  "/ptas/school-engagement",
];

const ROUTE_COMPONENTS: Record<string, ComponentType> = {
  "/": HomePage,
  "/schools": SchoolsPage,
  "/parents": ParentsPage,
  "/ptas": PtasPage,
  "/coalitions": CoalitionsPage,
  "/resources": ResourcesPage,
  "/about": AboutPage,
  "/schools/10-day-rollout": Schools10DayRollout,
  "/schools/case-study": SchoolsCaseStudy,
  "/parents/join-pta": ParentsJoinPta,
  "/ptas/operating-pack": PtasOperatingPack,
  "/ptas/school-engagement": PtasSchoolEngagement,
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
