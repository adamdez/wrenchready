import { NextResponse } from "next/server";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";
import { handleJeffVapiServerPayload } from "@/lib/jeff-field-assistant/vapi-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const response = await handleJeffVapiServerPayload(payload);

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Jeff Vapi server handler failed.",
      },
      { status: 500 },
    );
  }
}
