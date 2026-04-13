import { NextResponse } from "next/server";
import { getPromiseOutboundSnapshot } from "@/lib/promise-crm/outbound-drafts";
import { getPromiseRecord } from "@/lib/promise-crm/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const promise = await getPromiseRecord(id);

  if (!promise) {
    return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    outbound: getPromiseOutboundSnapshot(promise),
  });
}
