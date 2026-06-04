import { NextResponse } from "next/server";
import { getSystemsReadinessSnapshot } from "@/lib/promise-crm/system-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    systems: await getSystemsReadinessSnapshot(),
  });
}
