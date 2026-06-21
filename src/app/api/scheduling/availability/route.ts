import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import schedulingEngine from "@/lib/scheduling/engine";
import type { AvailabilityRequest } from "@/lib/scheduling/types";

function isAvailabilityRequest(body: unknown): body is AvailabilityRequest {
  if (!body || typeof body !== "object") return false;

  const candidate = body as Record<string, unknown>;
  const address = candidate.address as Record<string, unknown> | undefined;

  return typeof candidate.service === "string" && !!address && typeof address === "object";
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, {
      keyPrefix: "public:scheduling-availability",
      limit: 20,
      windowMs: 60_000,
    });

    if (rateLimit) return rateLimit;

    const body = await request.json();

    if (!isAvailabilityRequest(body)) {
      return NextResponse.json(
        {
          error: "Invalid scheduling request. Expected service and address.",
        },
        { status: 400 },
      );
    }

    const evaluation = await schedulingEngine.evaluateAvailability(body);

    return NextResponse.json({
      success: true,
      stage: evaluation.calendarTruth.status === "verified" ? "calendar-verified" : "manual-review",
      ...evaluation,
    });
  } catch (error) {
    console.error("Scheduling availability route failed", error);
    return NextResponse.json(
      { error: "Unable to evaluate availability." },
      { status: 500 },
    );
  }
}
