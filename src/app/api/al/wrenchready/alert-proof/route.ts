import { NextResponse } from "next/server";
import { getOpsAlertProofSnapshot } from "@/lib/promise-crm/alert-proof";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    alertProof: await getOpsAlertProofSnapshot(),
  });
}
