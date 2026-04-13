import { NextResponse } from "next/server";
import { getTomorrowReadinessSnapshot } from "@/lib/promise-crm/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getTomorrowReadinessSnapshot();

  return NextResponse.json({
    success: true,
    ...snapshot,
  });
}
