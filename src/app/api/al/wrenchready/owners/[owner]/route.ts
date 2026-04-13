import { NextResponse } from "next/server";
import { getOwnerExecutionSnapshot } from "@/lib/promise-crm/server";
import type { WrenchReadyOwner } from "@/lib/promise-crm/types";

type RouteContext = {
  params: Promise<{ owner: string }>;
};

export const dynamic = "force-dynamic";

function isOwner(value: string): value is WrenchReadyOwner {
  return value === "Dez" || value === "Simon";
}

export async function GET(_request: Request, context: RouteContext) {
  const { owner } = await context.params;

  if (!isOwner(owner)) {
    return NextResponse.json({ error: "Owner not found." }, { status: 404 });
  }

  const snapshot = await getOwnerExecutionSnapshot(owner);

  return NextResponse.json({
    success: true,
    ...snapshot,
  });
}
