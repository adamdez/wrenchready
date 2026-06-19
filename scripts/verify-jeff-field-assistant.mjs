import "./load-local-env.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;
const photoIndexFile = path.join(process.cwd(), ".data", "jeff", "photos", "index.json");
const mediaIndexFile = path.join(process.cwd(), ".data", "jeff", "media.json");
const fieldEventsFile = path.join(process.cwd(), ".data", "jeff", "field-events.json");
const memoryFile = path.join(process.cwd(), ".data", "jeff", "memory.json");
const workspaceFile = path.join(process.cwd(), ".data", "jeff", "workspace.json");

function headers() {
  return {
    "Content-Type": "application/json",
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
  };
}

async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-JSON: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  }

  return json;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

const catalog = await request("/api/al/wrenchready/jeff/tools");
assert(catalog.success, "tool catalog should return success");
assert(catalog.assistant?.purchasing === "blocked", "catalog should mark purchasing blocked");
assert(catalog.assistant?.tools?.length >= 11, "catalog should expose Jeff tool schemas");
assert(
  catalog.assistant?.tools?.some((tool) => tool.name === "record_field_photo_upload"),
  "catalog should expose field photo upload",
);
assert(
  catalog.assistant?.tools?.some((tool) => tool.name === "get_jeff_operating_context"),
  "catalog should expose forced WrenchReady operating context",
);
assert(
  catalog.assistant?.tools?.some((tool) => tool.name === "check_stripe_payment_status"),
  "catalog should expose Stripe payment status checks",
);
assert(
  catalog.assistant?.tools?.some((tool) => tool.name === "get_diagnostic_tree"),
  "catalog should expose source-gated diagnostic tree walkthroughs",
);

const operatingContext = await request("/api/al/wrenchready/jeff/tools/get-jeff-operating-context", {
  focus: "quote parts pricing",
});
assert(operatingContext.success, "operating context should load");
assert(
  operatingContext.data?.context?.requiredQuoteFields?.some((field) => /parts list/i.test(field)),
  "operating context should preserve quote parts requirements",
);
assert(
  operatingContext.data?.context?.sourceOfTruthPolicy?.some((line) => /Promise CRM\/Supabase/i.test(line)),
  "operating context should force the active source-of-truth policy",
);
assert(
  operatingContext.data?.context?.legacyAssistantPolicy?.some((line) => /legacy archive/i.test(line)),
  "operating context should mark the old assistant folder as legacy archive",
);

const active = await request("/api/al/wrenchready/jeff/tools/get-active-field-job", {
  customerName: "Tammy",
  vehicle: "Chrysler",
});
assert(active.success, "active job lookup should succeed");
if (active.data?.job?.id !== "jeff-fixture-tammy-chrysler") {
  const selected = active.data?.job?.id || "none";
  const candidates = (active.data?.candidates || [])
    .map((candidate) => candidate.jobId || candidate.id || candidate.customerName || "unknown candidate")
    .join(", ");
  throw new Error(
    [
      "Tammy fixture should be selected.",
      `Selected: ${selected}.`,
      candidates ? `Candidates: ${candidates}.` : "No candidates returned.",
      "Start the local server with fixture jobs enabled: npm run dev:jeff:fixtures -- --port 3001",
    ].join(" "),
  );
}

const diagnosticTree = await request("/api/al/wrenchready/jeff/tools/get-diagnostic-tree", {
  jobId: "jeff-fixture-tammy-chrysler",
});
assert(diagnosticTree.success, "diagnostic tree should load for a field job");
assert(
  diagnosticTree.data?.fieldPageUrl?.includes("/ops/promises/jeff-fixture-tammy-chrysler#diagnostic-tree"),
  "diagnostic tree should include the mobile field page anchor",
);
assert(
  diagnosticTree.data?.diagnosticTree?.steps?.length >= 3,
  "diagnostic tree should return multiple field steps",
);
assert(
  diagnosticTree.data?.diagnosticTree?.sourceGates?.some((gate) => /approval|licensed|service data|stop/i.test(gate)),
  "diagnostic tree should expose source and stop gates",
);
assert(
  diagnosticTree.data?.diagnosticTree?.sourceCounts?.["licensed-source-required"] >= 1,
  "diagnostic tree should flag licensed/OEM source requirements",
);
assert(
  diagnosticTree.assistantSay && !diagnosticTree.assistantSay.includes(".."),
  "diagnostic tree spoken summary should avoid malformed punctuation",
);

const note = await request("/api/al/wrenchready/jeff/tools/record-field-note", {
  jobId: "jeff-fixture-tammy-chrysler",
  note: "Simon says static voltage is 12.5, loaded voltage drops hard, terminals have corrosion.",
  symptomsObserved: ["No start", "Low-voltage history"],
  testsPerformed: ["Static voltage", "Loaded voltage"],
  readings: ["Static 12.5V", "Loaded drop reported"],
  suspectedCause: "Battery or cable issue still being proved",
});
assert(note.success, "field note should save");
assert(note.data?.event?.type === "voice_transcript_note", "field note should become transcript event");
const persistedFieldEventsAfterNote = readJson(fieldEventsFile);
assert(
  persistedFieldEventsAfterNote.events?.some((event) => event.id === note.data?.event?.id),
  "field note should persist to the local field-event index",
);

const photoUpload = await request("/api/al/wrenchready/jeff/tools/record-field-photo-upload", {
  jobId: "jeff-fixture-tammy-chrysler",
  label: "Problem area",
  note: "Corroded terminal photo from Simon.",
  uploadedBy: "Simon",
  photos: [
    {
      fileName: "terminal.jpg",
      contentType: "image/jpeg",
      sizeBytes: 128,
      dataUrl:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAVEAEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAABrA//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QP//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QP//Z",
    },
  ],
});
assert(photoUpload.success, "field photo upload should save");
assert(photoUpload.data?.photos?.length === 1, "field photo upload should return one photo");
assert(photoUpload.data?.photos?.[0]?.hasImageData, "field photo should retain pilot image data");
assert(
  ["google-drive", "local-file"].includes(photoUpload.data?.photos?.[0]?.storageStatus),
  "field photo should be stored in Google Drive or local durable pilot storage",
);
const photoIndex = readJson(photoIndexFile);
assert(
  photoIndex.photos?.some((photo) => photo.id === photoUpload.data?.photos?.[0]?.id),
  "field photo metadata should be persisted in the local photo index",
);
const mediaIndex = readJson(mediaIndexFile);
assert(
  mediaIndex.media?.some((item) => item.id === photoUpload.data?.photos?.[0]?.mediaId),
  "field photo should be persisted in the Jeff media index",
);

const photos = await request("/api/al/wrenchready/jeff/tools/get-field-photos", {
  jobId: "jeff-fixture-tammy-chrysler",
});
assert(photos.success, "field photo list should load");
assert(photos.data?.photos?.length >= 1, "field photo list should include uploaded photo");

const photosWithImageData = await request("/api/al/wrenchready/jeff/tools/get-field-photos", {
  jobId: "jeff-fixture-tammy-chrysler",
  includeImageData: true,
});
assert(
  photosWithImageData.data?.photos?.some((photo) => photo.id === photoUpload.data?.photos?.[0]?.id && photo.dataUrl),
  "field photo list should rehydrate local photo image data when requested",
);

const conflictEvent = await request("/api/al/wrenchready/jeff/tools/record-field-event", {
  jobId: "jeff-fixture-tammy-chrysler",
  channel: "email",
  eventType: "scan_report_parsed",
  sender: "System",
  summary: "Scan report email says vehicle is a 2017 Subaru.",
  extractedFacts: {
    vehicle: "2017 Subaru Outback",
  },
});
assert(conflictEvent.success, "conflict event should save");
assert(conflictEvent.data?.conflicts?.length > 0, "vehicle mismatch should be flagged");

const context = await request("/api/al/wrenchready/jeff/tools/get-current-field-context", {
  jobId: "jeff-fixture-tammy-chrysler",
});
assert(context.success, "context should load");
assert(context.data?.context?.latestEvents?.length >= 2, "context should include field events");
assert(context.data?.context?.conflicts?.length > 0, "context should preserve conflicts");
assert(context.data?.context?.latestPhotos?.length >= 1, "context should include latest photos");
assert(
  Array.isArray(context.data?.context?.durableMemories),
  "context should include approved durable memory rows",
);

const stripeNoReference = await request("/api/al/wrenchready/jeff/tools/check-stripe-payment-status", {
  jobId: "jeff-fixture-tammy-chrysler",
});
assert(stripeNoReference.success === false, "Stripe payment check should fail closed without a Stripe reference");
assert(
  stripeNoReference.data?.reconciliation?.crmUpdated === false,
  "Stripe payment check should not update CRM without a safe Stripe reference",
);

const memoryCandidate = await request("/api/al/wrenchready/jeff/tools/propose-core-memory-update", {
  subjectType: "technician",
  subjectKey: "simon",
  subjectLabel: "Simon",
  category: "personal-preference",
  memory: "Simon prefers concise field answers during live diagnostic calls.",
  evidence: "Smoke test candidate memory.",
  sensitivity: "low",
  sourceChannel: "system",
});
assert(memoryCandidate.success, "memory candidate should save without a job id");
assert(memoryCandidate.data?.candidate?.status === "candidate", "memory candidate should require review");
const persistedMemory = readJson(memoryFile);
assert(
  persistedMemory.memories?.some((memory) => memory.id === memoryCandidate.data?.candidate?.id),
  "memory candidate should persist to the local durable-memory index",
);

const callId = `smoke-call-${Date.now()}`;
const liveSession = await request("/api/al/wrenchready/jeff/session", {
  callId,
  callerPhone: "509-555-0100",
  activeJobId: "jeff-fixture-tammy-chrysler",
  activeJobLabel: "Tammy / Chrysler 300",
  status: "active",
  summary: "Smoke test session for Tammy Chrysler.",
});
assert(liveSession.success, "live Jeff session should save");
assert(liveSession.session?.activeJobId === "jeff-fixture-tammy-chrysler", "live session should carry active job id");

const vapiEndOfCall = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: callId,
      assistantId: "test-assistant",
      customer: { number: "509-555-0100" },
      startedAt: new Date(Date.now() - 120000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 120,
    },
    artifact: {
      transcript:
        "Simon said he is on Tammy's Chrysler no-start. Static voltage is 12.5 volts and loaded voltage drops hard. Jeff told Simon to verify terminal condition, do a voltage drop test, and upload a photo before calling the starter proved.",
      summary:
        "Tammy Chrysler no-start call. Battery/cable evidence is present, starter is not proved, next action is terminal/voltage-drop proof and photo capture.",
      recordingUrl: "https://example.com/jeff-smoke-recording",
    },
  },
});
assert(vapiEndOfCall.received, "Vapi end-of-call report should be accepted");
assert(vapiEndOfCall.workspace?.storageStatus, "end-of-call report should return workspace storage status");
assert(vapiEndOfCall.workspace?.jobId === "jeff-fixture-tammy-chrysler", "workspace should attach to active job");
const persistedWorkspace = readJson(workspaceFile);
assert(
  persistedWorkspace.conversations?.some((conversation) => conversation.callId === callId),
  "end-of-call conversation should persist to local workspace index",
);
assert(
  persistedWorkspace.summaries?.some((summary) => summary.conversationId === vapiEndOfCall.workspace?.conversationId),
  "end-of-call summary should persist to local workspace index",
);

const recapDraft = await request("/api/al/wrenchready/jeff/tools/send-simon-recap-email", {
  conversationId: vapiEndOfCall.workspace?.conversationId,
  recipientEmail: "simon@wrenchreadymobile.com",
  subject: "Jeff recap: Tammy Chrysler no-start",
  body: "Tammy Chrysler no-start call. Static voltage is 12.5 volts and loaded voltage drops hard. Next: verify terminals, perform voltage-drop checks, and capture a photo before calling the starter proved.",
  sendNow: false,
});
assert(recapDraft.success, "Jeff recap email tool should be able to draft without sending");
assert(recapDraft.data?.emailStatus === "drafted", "recap email draft should be marked drafted");
assert(
  recapDraft.data?.from?.includes("jeff@wrenchreadymobile.com"),
  "Jeff recap should use Jeff's own sender identity by default",
);

const fieldFiles = await request("/api/al/wrenchready/jeff/files");
assert(fieldFiles.success, "Jeff field files should load");
const tammyFile = fieldFiles.fieldFiles?.find((file) => file.job?.id === "jeff-fixture-tammy-chrysler");
assert(tammyFile, "Jeff field files should include Tammy fixture");
assert(tammyFile.fieldEvents?.length >= 2, "Jeff field file should include saved field events");
assert(tammyFile.context?.latestEvents?.length >= 2, "Jeff field file should include current context events");
assert(tammyFile.conversations?.some((conversation) => conversation.callId === callId), "Jeff field file should include saved call conversations");
assert(tammyFile.conversationSummaries?.length >= 1, "Jeff field file should include compacted call summaries");
assert(tammyFile.workspaceSnapshot?.latestConversationId === vapiEndOfCall.workspace?.conversationId, "Jeff field file should include latest workspace snapshot");

const singleFieldFile = await request("/api/al/wrenchready/jeff/files/jeff-fixture-tammy-chrysler");
assert(singleFieldFile.success, "single Jeff field file should load");
assert(
  singleFieldFile.fieldFile?.job?.id === "jeff-fixture-tammy-chrysler",
  "single Jeff field file should return Tammy fixture",
);
assert(
  singleFieldFile.fieldFile?.context?.latestConversationSummaries?.length >= 1,
  "current context should include latest compacted conversation summaries",
);
assert(
  singleFieldFile.fieldFile?.context?.latestWorkspaceSnapshot?.latestConversationId === vapiEndOfCall.workspace?.conversationId,
  "current context should include the latest workspace snapshot",
);

const sync = await request("/api/al/wrenchready/jeff/sync");
assert(sync.generatedAt, "Jeff sync route should return a timestamp");
assert(sync.fieldEvents, "Jeff sync route should return field-event sync status");
assert(
  sync.localMirror?.files?.some((file) => file.path === ".data/jeff/field-events.json"),
  "Jeff sync route should report the local field-event mirror file",
);
assert(
  sync.localMirror?.files?.some((file) => file.path === ".data/jeff/photos/index.json"),
  "Jeff sync route should report the local photo metadata mirror file",
);
assert(
  sync.localMirror?.files?.some((file) => file.path === ".data/jeff/media.json"),
  "Jeff sync route should report the local media index file",
);

const purchase = await request("/api/al/wrenchready/jeff/tools/purchase-or-reserve-part", {
  jobId: "jeff-fixture-tammy-chrysler",
  requestedPart: "starter",
  vendor: "O'Reilly",
  spokenRequest: "Find a starter and buy it.",
});
assert(purchase.success === false, "purchase endpoint should be blocked");
assert(purchase.data?.purchaseStatus === "blocked", "purchase status should be blocked");

console.log("Jeff field assistant smoke test passed.");
