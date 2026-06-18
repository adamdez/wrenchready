import { NextResponse } from "next/server";
import { syncJeffGmailInbox } from "@/lib/jeff-field-assistant";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

async function syncGmail(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const maxResultsValue = Number(url.searchParams.get("maxResults") || "10");
  const response = await syncJeffGmailInbox({
    query: url.searchParams.get("q") || undefined,
    maxResults: Number.isFinite(maxResultsValue) ? maxResultsValue : 10,
  });

  return NextResponse.json(response, { status: response.success ? 200 : 503 });
}

export { syncGmail as GET, syncGmail as POST };
