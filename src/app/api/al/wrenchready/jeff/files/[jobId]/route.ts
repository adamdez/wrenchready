import { NextResponse } from "next/server";
import {
  authorizeJeffToolRequest,
  getJeffFieldFile,
} from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const { jobId } = await context.params;
  const { fieldFile, warnings } = await getJeffFieldFile(decodeURIComponent(jobId));

  if (!fieldFile) {
    return NextResponse.json(
      { success: false, error: "Jeff field file not found.", warnings },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    fieldFile,
    warnings,
  });
}
