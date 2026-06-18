import { NextResponse } from "next/server";
import { authorizeJeffFieldAppRequest } from "@/lib/jeff-field-assistant/app-auth";
import { recordSimonLocationCheckIn } from "@/lib/jeff-field-assistant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = authorizeJeffFieldAppRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.message, pinRequired: auth.pinRequired },
      { status: auth.status },
    );
  }

  const payload = await request.json().catch(() => ({}));
  const result = await recordSimonLocationCheckIn(payload);

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
