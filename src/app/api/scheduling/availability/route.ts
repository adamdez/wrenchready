import { NextRequest, NextResponse } from "next/server";
import { evaluateAvailability } from "@/lib/scheduling/engine";
import type { AvailabilityRequest } from "@/lib/scheduling/types";

function isAvailabilityRequest(body: unknown): body is AvailabilityRequest {
  if (!body || typeof body !== "object") return false;

  const candidate = body as Record<string, unknown>;
  const address = candidate.address as Record<string, unknown> | undefined;

  return typeof candidate.service === "string" && !!address && typeof address === "object";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!isAvailabilityRequest(body)) {
      return NextResponse.json(
        {
          error: "Invalid scheduling request. Expected service and address.",
        },
        { status: 400 },
      );
    }

    const evaluation = evaluateAvailability(body);

    return NextResponse.json({
      success: true,
      stage: evaluation.requiredIntegrationsReady ? "integration-ready" : "scaffolded",
      ...evaluation,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to evaluate availability." },
      { status: 500 },
    );
  }
}
