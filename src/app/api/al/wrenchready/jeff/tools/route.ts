import { NextResponse } from "next/server";
import { getJeffAssistantConfig } from "@/lib/jeff-field-assistant";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";
import { getJeffVapiPilotConfig } from "@/lib/jeff-field-assistant/vapi-server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  return NextResponse.json({
    success: true,
    assistant: getJeffAssistantConfig(),
    vapiPilot: getJeffVapiPilotConfig(),
  });
}
