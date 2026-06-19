import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getJeffEmailIntegrationStatus,
  getJeffInboundEmailSecret,
  ingestJeffInboundEmail,
} from "@/lib/jeff-field-assistant/email-ingest";
import {
  buildQuoteDraftPayloadFromText,
  summarizeQuoteDraftAction,
} from "@/lib/jeff-field-assistant/quote-intake";
import { prepareQuoteDraftForReview } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

function secretsMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function inboundSecretFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

  return (
    bearer ||
    request.headers.get("x-jeff-inbound-email-secret") ||
    request.headers.get("x-jeff-field-secret") ||
    ""
  );
}

function formValueToObject(value: FormDataEntryValue) {
  return typeof value === "string" ? value : {
    fileName: value.name,
    contentType: value.type,
    sizeBytes: value.size,
  };
}

async function requestPayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json().catch(() => ({}));
  }

  const formData = await request.formData().catch(() => undefined);
  if (!formData) return {};

  const payload: Record<string, unknown> = {};
  const attachments: unknown[] = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") {
      attachments.push(formValueToObject(value));
      continue;
    }

    if (key.toLowerCase().includes("attachment")) {
      attachments.push(formValueToObject(value));
    } else {
      payload[key] = value;
    }
  }

  if (attachments.length > 0) payload.attachments = attachments;
  return payload;
}

export function GET(request: Request) {
  const expected = getJeffInboundEmailSecret();
  const provided = inboundSecretFromRequest(request);
  if (!expected || !provided || !secretsMatch(provided, expected)) {
    return NextResponse.json({ success: false, error: "Jeff inbound email endpoint is not authorized." }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    email: getJeffEmailIntegrationStatus(),
  });
}

export async function POST(request: Request) {
  const expected = getJeffInboundEmailSecret();
  if (!expected) {
    return NextResponse.json(
      { success: false, error: "JEFF_INBOUND_EMAIL_SECRET is not configured." },
      { status: 503 },
    );
  }

  const provided = inboundSecretFromRequest(request);
  if (!provided || !secretsMatch(provided, expected)) {
    return NextResponse.json({ success: false, error: "Jeff inbound email endpoint is not authorized." }, { status: 401 });
  }

  const payload = await requestPayload(request);
  const provider = request.headers.get("x-jeff-inbound-email-provider") || request.headers.get("x-resend-provider");
  const result = await ingestJeffInboundEmail({
    ...payload,
    provider: typeof payload.provider === "string" ? payload.provider : provider || undefined,
  });
  const quoteDraftPayload = buildQuoteDraftPayloadFromText({
    text: [
      result.conversation.subjectLabel,
      result.conversation.transcript,
      result.summary.summary,
      ...result.summary.knownFacts,
    ].filter(Boolean).join("\n"),
    jobId: result.conversation.jobId,
    jobLabel: result.conversation.jobLabel || result.conversation.subjectLabel,
    sourceLabel: "Jeff inbound email",
    sourceReference: result.conversation.id,
  });
  const quoteDraftAction = quoteDraftPayload
    ? await prepareQuoteDraftForReview(quoteDraftPayload).catch((error) => ({
        success: false,
        assistantSay: "Jeff captured a quote request from inbound email, but the quote builder failed before creating a review packet.",
        error: error instanceof Error ? error.message : "Unknown quote trigger failure.",
      }))
    : undefined;

  return NextResponse.json({
    success: true,
    conversationId: result.conversation.id,
    summaryId: result.summary.id,
    jobId: result.conversation.jobId,
    jobMatchStatus: result.conversation.jobMatchStatus,
    needsReview: result.conversation.needsReview,
    storageStatus: result.storage.status,
    warning: result.storage.warning,
    quoteDraftAction: summarizeQuoteDraftAction(quoteDraftAction),
  });
}
