import { NextResponse } from "next/server";
import {
  authorizeJeffToolRequest,
  getJeffFieldFiles,
} from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const { fieldFiles, warnings } = await getJeffFieldFiles();
  return NextResponse.json({
    success: true,
    fieldFiles,
    warnings,
  });
}
