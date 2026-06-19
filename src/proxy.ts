import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const OPS_AUTH_REALM = "WrenchReady Ops";

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

export function proxy(request: NextRequest) {
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

export const config = {
  matcher: [
    "/ops",
    "/ops/:path*",
    "/api/al/wrenchready/alert-proof",
    "/api/al/wrenchready/dispatch",
    "/api/al/wrenchready/follow-through",
    "/api/al/wrenchready/inbound",
    "/api/al/wrenchready/inbound/:path*",
    "/api/al/wrenchready/integrations",
    "/api/al/wrenchready/outbound",
    "/api/al/wrenchready/owners/:path*",
    "/api/al/wrenchready/persistence-proof",
    "/api/al/wrenchready/promises",
    "/api/al/wrenchready/promises/:path*",
    "/api/al/wrenchready/systems",
    "/api/al/wrenchready/tomorrow",
  ],
};
