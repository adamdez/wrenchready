import { NextResponse } from "next/server";
import { getIntegrationSnapshot } from "@/lib/promise-crm/integrations";

export async function GET() {
  return NextResponse.json({
    success: true,
    integrations: await getIntegrationSnapshot(),
  });
}
