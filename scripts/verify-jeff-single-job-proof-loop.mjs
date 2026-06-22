import "./load-local-env.mjs";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;

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
    throw new Error(`${path} returned non-JSON: ${text.slice(0, 240)}`);
  }

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json).slice(0, 400)}`);
  }

  return json;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function assertActionState(result, expectedState, label) {
  assert(result.actionState, `${label} should include actionState`);
  assert(
    result.actionState.state === expectedState,
    `${label} should be ${expectedState}; got ${result.actionState.state}`,
  );
}

function assertFactLedger(ledger) {
  assert(ledger && Array.isArray(ledger.facts), "field note should return factLedger.facts");
  assert(Array.isArray(ledger.evidence), "field note should return factLedger.evidence");

  const evidenceIds = new Set(ledger.evidence.map((entry) => entry.id));
  const proved = ledger.facts.filter((fact) => fact.status === "proved");
  const suspected = ledger.facts.filter((fact) => fact.status === "suspected");

  assert(proved.length >= 3, "proof loop should capture multiple proved facts");
  assert(suspected.length >= 1, "proof loop should capture at least one suspected fact");

  for (const fact of proved) {
    assert(fact.evidenceIds?.length > 0, `proved fact lacks evidence: ${fact.value}`);
    for (const evidenceId of fact.evidenceIds) {
      assert(evidenceIds.has(evidenceId), `proved fact evidence does not resolve: ${evidenceId}`);
    }
  }

  for (const fact of suspected) {
    assert(!proved.some((provedFact) => provedFact.value === fact.value), `suspected fact was also promoted to proved: ${fact.value}`);
  }

  return { proved, suspected, evidenceIds };
}

function assertCloseoutProvenance(closeout, factIds) {
  const provenance = closeout?.factProvenance;
  assert(provenance, "closeout should return factProvenance");
  assert(provenance.missingProvenance === false, "closeout should not be missing provenance");

  const provedFactIds = array(provenance.provedFactIds);
  const suspectedFactIds = array(provenance.suspectedFactIds);
  assert(provedFactIds.length >= 2, "closeout should cite proved fact ids");
  assert(suspectedFactIds.length >= 1, "closeout should cite suspected fact ids separately");

  for (const id of [...provedFactIds, ...suspectedFactIds]) {
    assert(factIds.has(id), `closeout cites unknown fact id: ${id}`);
  }

  for (const id of suspectedFactIds) {
    assert(!provedFactIds.includes(id), `suspected fact was promoted to proved in closeout: ${id}`);
  }
}

const jobId = "jeff-fixture-tammy-chrysler";
const runId = Date.now();
const rawRequest = `Proof loop ${runId}: Chrysler no-start. Static battery is 12.5V, drops to 9.0V under crank, one click, terminals have corrosion. Starter is still only suspected until voltage-drop test.`;

const active = await request("/api/al/wrenchready/jeff/tools/get-active-field-job", {
  customerName: "Tammy",
  vehicle: "Chrysler",
});
assert(active.success, "active job lookup should succeed");
assert(
  active.data?.job?.id === jobId,
  "single-job proof loop requires Jeff fixtures. Start server with: npm run dev:jeff:fixtures -- --port 3001",
);

const note = await request("/api/al/wrenchready/jeff/tools/record-field-note", {
  jobId,
  note: rawRequest,
  channel: "voice",
  sender: "Simon",
  symptomsObserved: ["No start", "One click on crank"],
  testsPerformed: ["Static battery voltage", "Under-crank battery voltage"],
  readings: ["Static battery 12.5V", "Under-crank battery 9.0V"],
  suspectedCause: "Starter or high-current crank circuit fault",
  nextAction: "Voltage-drop the B+ feed and starter ground while cranking.",
});
assert(note.success, "field note should save");
assertActionState(note, "verified", "field note");
assert(note.data?.event?.summary === rawRequest, "raw technician request should persist verbatim in the field event");

const { proved, suspected } = assertFactLedger(note.data?.factLedger);
const factIds = new Set(note.data.factLedger.facts.map((fact) => fact.id));
const provedFactIds = proved.slice(0, 3).map((fact) => fact.id);
const suspectedFactIds = suspected.slice(0, 1).map((fact) => fact.id);

const photo = await request("/api/al/wrenchready/jeff/tools/record-field-photo-upload", {
  jobId,
  label: "Battery terminal proof",
  note: "Photo captured for proof loop.",
  uploadedBy: "Simon",
  photos: [
    {
      fileName: `proof-loop-terminal-${runId}.jpg`,
      contentType: "image/jpeg",
      sizeBytes: 128,
      dataUrl:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAVEAEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAABrA//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QP//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QP//Z",
    },
  ],
});
assert(photo.success, "photo should save");
assertActionState(photo, "verified", "photo upload");
assert(photo.data?.photos?.length === 1, "photo upload should return one linked photo");
assert(photo.data.photos[0].id, "photo should have a stable id");

const purchase = await request("/api/al/wrenchready/jeff/tools/purchase-or-reserve-part", {
  jobId,
  requestedPart: "starter",
  vendor: "O'Reilly",
  spokenRequest: "Buy the starter and tell Simon it is ordered.",
});
assert(purchase.success === false, "purchase should remain blocked");
assertActionState(purchase, "blocked", "purchase request");
assert(purchase.data?.purchaseStatus === "blocked", "purchase data should record blocked status");

const closeout = await request("/api/al/wrenchready/jeff/tools/start-closeout", {
  jobId,
  workCompleted:
    "Proof loop closeout draft: no-start captured, static 12.5V and under-crank 9.0V recorded; starter/high-current circuit remains suspected pending voltage-drop proof.",
  partsUsed: [],
  paymentStatus: "not-collected",
  provedFactIds,
  suspectedFactIds,
});
assert(closeout.success, "closeout should draft");
assertActionState(closeout, "drafted", "closeout");
assertCloseoutProvenance(closeout.data?.closeout, factIds);
assert(
  !/ordered|purchased|charged|booked|sent to customer/i.test(closeout.assistantSay || ""),
  "closeout assistantSay should not claim side effects",
);

const context = await request("/api/al/wrenchready/jeff/tools/get-current-field-context", { jobId });
assert(context.success, "field context should load after proof loop");
assert(
  array(context.data?.context?.latestEvents).some((event) => event.id === note.data.event.id),
  "field context should include the proof-loop field note",
);
assert(
  array(context.data?.context?.latestPhotos).some((entry) => entry.id === photo.data.photos[0].id),
  "field context should include the proof-loop photo",
);

console.log(JSON.stringify({
  success: true,
  baseUrl,
  jobId,
  eventId: note.data.event.id,
  photoId: photo.data.photos[0].id,
  provedFacts: proved.length,
  suspectedFacts: suspected.length,
  actionStates: {
    note: note.actionState.state,
    photo: photo.actionState.state,
    purchase: purchase.actionState.state,
    closeout: closeout.actionState.state,
  },
  invariants: [
    "raw request persisted verbatim",
    "proved facts have resolvable evidence",
    "suspected facts remain separate",
    "photo evidence linked to job",
    "purchase action blocked with typed state",
    "closeout cites fact provenance",
    "context retrieves note and photo artifacts",
  ],
}, null, 2));
