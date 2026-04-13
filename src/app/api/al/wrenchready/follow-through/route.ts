import { NextResponse } from "next/server";
import { getFollowThroughWorklist } from "@/lib/promise-crm/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getFollowThroughWorklist();

  return NextResponse.json({
    success: true,
    ...snapshot,
  });
}
