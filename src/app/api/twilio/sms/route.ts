import { NextRequest, NextResponse } from "next/server";
import { sendHighRiskInboundAlert } from "@/lib/promise-crm/alerts";
import { createInboundRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

const XML_HEADERS = {
  "Content-Type": "text/xml; charset=utf-8",
} as const;

function buildResponse(message: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`,
    { status: 200, headers: XML_HEADERS },
  );
}

async function handler(request: NextRequest) {
  const formData = await request.formData();
  const from = (formData.get("From") as string | null) || "";
  const body = (formData.get("Body") as string | null) || "";
  const profileName = (formData.get("ProfileName") as string | null) || "Text lead";

  const inbound = await createInboundRecord({
    source: "text",
    customerName: profileName,
    customerPhone: from,
    preferredContact: "text",
    vehicle: "Unknown vehicle",
    requestedService: body || "Inbound text request",
    address: "Needs territory check",
    timingLabel: "No timing yet",
    notes: body,
    rawPayload: {
      from,
      body,
      profileName,
    },
  });

  await sendOpsWebhook({
    event: "twilio_sms_inbound",
    business: "wrenchready",
    payload: {
      from,
      body,
      inboundId: inbound?.id || null,
    },
  });

  if (inbound) {
    await sendHighRiskInboundAlert(inbound).catch(() => false);
  }

  return buildResponse(
    "Thanks for texting WrenchReady. We received your message and will screen the job before we promise timing.",
  );
}

export { handler as GET, handler as POST };
