import { NextResponse } from "next/server";
import { getPromiseCrmPersistenceProof } from "@/lib/promise-crm/integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    proof: await getPromiseCrmPersistenceProof(),
  });
}
