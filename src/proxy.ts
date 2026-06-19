import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const OPS_AUTH_REALM = "WrenchReady Ops";
const PROTECTED_PREFIXES = [
  "/ops",
  "/api/al/wrenchready/alert-proof",
  "/api/al/wrenchready/dispatch",
  "/api/al/wrenchready/follow-through",
  "/api/al/wrenchready/inbound",
  "/api/al/wrenchready/integrations",
  "/api/al/wrenchready/outbound",
  "/api/al/wrenchready/owners",
  "/api/al/wrenchready/persistence-proof",
  "/api/al/wrenchready/promises",
  "/api/al/wrenchready/systems",
  "/api/al/wrenchready/tomorrow",
];

function opsPasswordCandidates() {
  return [
    process.env.WR_OPS_AUTH_PASSWORD,
    process.env.WR_OPS_BASIC_PASSWORD,
    process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET,
  ].filter((value): value is string => Boolean(value));
}

function opsUsernameCandidate() {
  return process.env.WR_OPS_AUTH_USER?.trim();
}

function basicCredentials(authorization: string | null) {
  if (!authorization?.startsWith("Basic ")) return undefined;

  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separator = decoded.indexOf(":");
    if (separator < 0) return undefined;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return undefined;
  }
}

function unauthorized(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Basic realm="${OPS_AUTH_REALM}", charset="UTF-8"`,
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${OPS_AUTH_REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    },
  });
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isOpsHost(request: NextRequest) {
  return request.headers.get("host")?.split(":")[0].toLowerCase() === "ops.wrenchreadymobile.com";
}

function isPassThroughAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-z0-9]{2,5}$/i.test(pathname)
  );
}

function authorizeOpsRequest(request: NextRequest) {
  const passwords = opsPasswordCandidates();
  const username = opsUsernameCandidate();
  const credentials = basicCredentials(request.headers.get("authorization"));

  if (passwords.length === 0) return unauthorized(request);
  if (
    credentials &&
    passwords.includes(credentials.password) &&
    (!username || credentials.username === username)
  ) {
    return NextResponse.next();
  }

  return unauthorized(request);
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const opsHost = isOpsHost(request);

  if (!opsHost && !isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (opsHost && isPassThroughAsset(pathname)) {
    return NextResponse.next();
  }

  const authorized = authorizeOpsRequest(request);
  if (authorized.status === 401) return authorized;

  if (opsHost) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/ops")
      ? pathname
      : `/ops${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  return authorized;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
