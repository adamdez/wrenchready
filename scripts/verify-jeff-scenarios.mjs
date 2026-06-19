import "./load-local-env.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;
const appPin = process.env.JEFF_FIELD_APP_PIN || process.env.JEFF_FIELD_PHOTO_UPLOAD_PIN;
const workspaceFile = path.join(process.cwd(), ".data", "jeff", "workspace.json");
const promptFile = path.join(process.cwd(), "src", "lib", "jeff-field-assistant", "prompt.ts");

function headers() {
  return {
    "Content-Type": "application/json",
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
  };
}

function appHeaders() {
  return {
    "Content-Type": "application/json",
    ...(appPin ? { "X-Jeff-App-Pin": appPin } : {}),
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

async function appRequest(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: appHeaders(),
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
const toolNames = catalog.assistant?.tools?.map((tool) => tool.name) || [];
assert(toolNames.includes("propose_core_memory_update"), "catalog should expose candidate memory tool");
assert(toolNames.includes("get_schedule_context"), "catalog should expose schedule context tool");
assert(toolNames.includes("evaluate_booking_request"), "catalog should expose booking evaluation tool");

const promptSource = readFileSync(promptFile, "utf8");
assert(
  /Banter is allowed/i.test(promptSource) && /take the opening/i.test(promptSource),
  "Jeff prompt should explicitly allow Simon-facing banter instead of only warning against distraction.",
);

const booking = await request("/api/al/wrenchready/jeff/tools/evaluate-booking-request", {
  service: "customer says maybe starter, maybe alternator, maybe wiring",
  vehicle: "2016 Chrysler 200",
  address: "Spokane, WA",
  targetDate: "2026-06-20",
  uncertaintyLevel: "high",
  partsPickupRequired: true,
  notes: "Unknown no-start scope with possible parts pickup.",
});
assert(booking.success, "booking evaluation should return a response");
assert(
  booking.data?.decision !== "safe-to-propose",
  "uncertain booking should not be marked safe to propose",
);
assert(
  booking.data?.reviewReasons?.length > 0,
  "uncertain booking should include review reasons",
);
assert(
  booking.data?.candidateSlots?.length === 0,
  "unsafe booking should not return customer-ready slots",
);

const memory = await request("/api/al/wrenchready/jeff/tools/propose-core-memory-update", {
  category: "operator-preference",
  memory: "Simon prefers one physical test at a time when he is under a vehicle.",
  evidence: "Pilot call scenario verification.",
  subjectType: "person",
  subjectKey: "simon",
  subjectLabel: "Simon",
});
assert(memory.success, "candidate memory should save for review");
assert(
  memory.data?.candidate?.status === "candidate",
  "candidate memory should stay pending review",
);
assert(
  /not use it in calls until it is approved/i.test(memory.assistantSay || ""),
  "candidate memory response should not claim immediate operational memory",
);

const scenarioNoteText = `Scenario note ${Date.now()}: Simon verified starter signal before requesting parts.`;
const note = await request("/api/al/wrenchready/jeff/tools/record-field-note", {
  jobId: "jeff-fixture-tammy-chrysler",
  note: scenarioNoteText,
  symptomsObserved: ["No crank"],
  testsPerformed: ["Starter signal check"],
  readings: ["Signal present"],
  suspectedCause: "Starter may be failed, but part purchase is still blocked.",
});
assert(note.success, "scenario field note should save");

const fieldFile = await request("/api/al/wrenchready/jeff/files/jeff-fixture-tammy-chrysler");
const summaries = fieldFile.fieldFile?.fieldEvents?.map((event) => event.summary) || [];
assert(
  summaries.some((summary) => summary.includes(scenarioNoteText)),
  "field file should include the scenario field note",
);

const purchase = await request("/api/al/wrenchready/jeff/tools/purchase-or-reserve-part", {
  jobId: "jeff-fixture-tammy-chrysler",
  requestedPart: "starter",
  vendor: "O'Reilly",
  spokenRequest: "Find a starter, buy it, and tell Simon when it is ready.",
});
assert(purchase.success === false, "purchase tool should remain blocked");
assert(purchase.data?.purchaseStatus === "blocked", "purchase status should remain blocked");

const vapiToolCalls = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "tool-calls",
    call: {
      id: "call-test-scheduler",
      customer: { number: "+15095550102" },
    },
    toolCallList: [
      {
        id: "tool-scheduler-1",
        name: "evaluate_booking_request",
        parameters: {
          service: "unknown electrical diagnostic",
          address: "Spokane Valley, WA",
          uncertaintyLevel: "high",
          partsPickupRequired: true,
        },
      },
      {
        id: "tool-memory-1",
        name: "propose_core_memory_update",
        parameters: {
          jobId: "jeff-fixture-tammy-chrysler",
          memory: "Simon wants Jeff to be concise during field calls.",
          evidence: "Scenario tool-call verification.",
        },
      },
    ],
  },
});
assert(Array.isArray(vapiToolCalls.results), "Vapi scenario response should include tool results");
assert(vapiToolCalls.results.length === 2, "Vapi scenario response should return both tool results");
const vapiBooking = JSON.parse(vapiToolCalls.results[0].result);
assert(
  vapiBooking.data?.decision !== "safe-to-propose",
  "Vapi booking tool should preserve scheduling guardrails",
);
const vapiMemory = JSON.parse(vapiToolCalls.results[1].result);
assert(
  vapiMemory.data?.candidate?.status === "candidate",
  "Vapi memory tool should preserve review workflow",
);

const scenarioSessionId = `scenario-session-${Date.now()}`;
const onePixelJpegDataUrl =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAVEAEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAABrA//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QP//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QP//Z";
const manualSession = await request("/api/al/wrenchready/jeff/session", {
  sessionId: scenarioSessionId,
  source: "mobile-hub",
  eventSummary: "Scenario live session created.",
});
assert(manualSession.success, "manual session should be creatable for photo inbox tests");

const staleSessionId = `closed-scenario-session-${Date.now()}`;
const staleSession = await request("/api/al/wrenchready/jeff/session", {
  sessionId: staleSessionId,
  source: "mobile-hub",
  status: "closed",
  eventSummary: "Scenario closed session created.",
});
assert(staleSession.success, "closed session should be creatable for stale-session tests");

const staleSessionPhoto = await request("/api/al/wrenchready/jeff/tools/record-field-photo-upload", {
  sessionId: staleSessionId,
  label: "Problem area",
  uploadedBy: "Simon",
  photos: [
    {
      fileName: "closed-session.jpg",
      contentType: "image/jpeg",
      sizeBytes: 128,
      dataUrl: onePixelJpegDataUrl,
    },
  ],
});
assert(
  staleSessionPhoto.success === false,
  "closed explicit session id should not accept live session photo fallback",
);

const invalidSessionPhoto = await request("/api/al/wrenchready/jeff/tools/record-field-photo-upload", {
  sessionId: "missing-session-should-not-fallback",
  label: "Problem area",
  uploadedBy: "Simon",
  photos: [
    {
      fileName: "wrong-session.jpg",
      contentType: "image/jpeg",
      sizeBytes: 128,
      dataUrl:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAVEAEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAABrA//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QP//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QP//Z",
    },
  ],
});
assert(
  invalidSessionPhoto.success === false,
  "invalid explicit session id should not fall back to another active session",
);

const sessionPhoto = await request("/api/al/wrenchready/jeff/tools/record-field-photo-upload", {
  sessionId: scenarioSessionId,
  label: "Problem area",
  note: "Photo sent while Jeff is still confirming the job.",
  uploadedBy: "Simon",
  photos: [
    {
      fileName: "unknown-job.jpg",
      contentType: "image/jpeg",
      sizeBytes: 128,
      dataUrl:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAVEAEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAABrA//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QP//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QP//Z",
    },
  ],
});
assert(sessionPhoto.success, "photo upload should succeed with only a live session");
assert(
  sessionPhoto.data?.session?.attachmentStatus === "session-inbox",
  "unmatched session photo should land in session inbox",
);
assert(
  ["google-drive", "local-file"].includes(sessionPhoto.data?.photos?.[0]?.storageStatus),
  "unmatched session photo should use Google Drive or local durable pilot storage",
);

const sessionPhotos = await request("/api/al/wrenchready/jeff/tools/get-field-photos", {
  sessionId: scenarioSessionId,
});
assert(sessionPhotos.success, "session photo list should load without a job id");
assert(sessionPhotos.data?.photos?.length >= 1, "session photo list should include the inbox photo");

const selectedJobCoach = await appRequest("/api/al/wrenchready/jeff/messages", {
  jobId: "jeff-fixture-tammy-chrysler",
  jobLabel: "Tammy / 2010 Chrysler Town & Country",
  text: "starter clicks but I have crank signal",
});
assert(selectedJobCoach.success, "Message Jeff should answer a selected-job diagnostic question");

const selectedJobWorkspace = readJson(workspaceFile);
const selectedJobConversation = selectedJobWorkspace.conversations?.find(
  (conversation) => conversation.id === selectedJobCoach.conversationId,
);
assert(selectedJobConversation, "Message Jeff selected-job diagnostic conversation should persist");
assert(
  selectedJobConversation.jobId === "jeff-fixture-tammy-chrysler",
  "selected-job diagnostic message should remain attached to the selected job",
);
assert(
  selectedJobConversation.sourcePayload?.contextMode === "selected-job",
  "selected-job diagnostic message should preserve selected-job context mode",
);
assert(
  selectedJobConversation.sourcePayload?.fieldContextStatus === "loaded",
  "selected-job diagnostic message should load the field context packet automatically",
);
assert(
  /Tammy|Chrysler|Town/i.test(selectedJobConversation.sourcePayload?.fieldContextSummary || ""),
  "selected-job field context summary should include the selected customer or vehicle",
);
assert(
  selectedJobConversation.sourcePayload?.model !== "gpt-4.1-mini",
  "Message Jeff should not use the old weak gpt-4.1-mini text fallback",
);

const appContextToken = `Astro follow-up scenario ${Date.now()}`;
const appPartsSeed = await appRequest("/api/al/wrenchready/jeff/messages", {
  jobId: "jeff-fixture-tammy-chrysler",
  jobLabel: "Tammy / 2010 Chrysler Town & Country",
  text: `${appContextToken}: Jeff where is the closest fuel pump for a 2001 Chevy Astro?`,
});
assert(appPartsSeed.success, "Message Jeff should accept the initial different-vehicle parts question");

const appPartsFollowUp = await appRequest("/api/al/wrenchready/jeff/messages", {
  jobId: "jeff-fixture-tammy-chrysler",
  jobLabel: "Tammy / 2010 Chrysler Town & Country",
  text: "No, where can I buy one?",
});
assert(appPartsFollowUp.success, "Message Jeff should accept a short parts follow-up");

const persistedWorkspace = readJson(workspaceFile);
const followUpConversation = persistedWorkspace.conversations?.find(
  (conversation) => conversation.id === appPartsFollowUp.conversationId,
);
assert(followUpConversation, "Message Jeff follow-up conversation should persist");
assert(
  !followUpConversation.jobId,
  "short different-vehicle parts follow-up should not attach to the selected job",
);
assert(
  followUpConversation.sourcePayload?.contextMode === "different-job",
  "short parts follow-up should keep different-job context",
);
assert(
  /Astro/i.test(followUpConversation.sourcePayload?.inferredVehicle || ""),
  "short parts follow-up should infer the recent Astro vehicle",
);
assert(
  /fuel pump/i.test(followUpConversation.sourcePayload?.inferredPartName || ""),
  "short parts follow-up should infer the recent fuel pump",
);
assert(
  followUpConversation.sourcePayload?.actions?.some((action) => action.tool === "find_nearby_parts_stores"),
  "short parts follow-up should run the nearby parts-store tool",
);

console.log("Jeff scenario verification passed.");
