import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Host-based root routing: on the supernova-sprint.xyz domain, the apex (/) serves the
// FLAGSHIP onchain experience (/onchain.html — every tap a real transaction, with the
// 5-chain finality comparison as the reveal). The simulation-only game stays reachable
// at /supernova-sprint. Middleware runs before the framework's filesystem/routes, so this
// reliably overrides the Next `/` route for that host only. Every other host
// (bon-dashboard.vercel.app) and every other path is untouched (the matcher only runs on "/").
const SPRINT_HOSTS = new Set(["supernova-sprint.xyz", "www.supernova-sprint.xyz"]);

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (SPRINT_HOSTS.has(host)) {
    const url = req.nextUrl.clone();
    url.pathname = "/onchain.html";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
