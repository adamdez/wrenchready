import { NextResponse } from "next/server";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";

type JeffToolHandler = (payload: unknown) => Promise<unknown>;

export function createJeffToolRoute(handler: JeffToolHandler) {
  return async function POST(request: Request) {
    const auth = authorizeJeffToolRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }

    try {
      const payload = await request.json().catch(() => ({}));
      const response = await handler(payload);

      return NextResponse.json(response);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Jeff field assistant tool failed.",
        },
        { status: 500 },
      );
    }
  };
}
