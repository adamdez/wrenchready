import { NextResponse } from "next/server";
import { syncJeffCalendar } from "@/lib/jeff-field-assistant";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

async function syncCalendar(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const limitValue = Number(url.searchParams.get("limit") || "50");
  const response = await syncJeffCalendar({
    limit: Number.isFinite(limitValue) ? limitValue : 50,
    dryRun: url.searchParams.get("dryRun") === "true",
  });

  return NextResponse.json(response, { status: response.success ? 200 : 503 });
}

export { syncCalendar as GET, syncCalendar as POST };
