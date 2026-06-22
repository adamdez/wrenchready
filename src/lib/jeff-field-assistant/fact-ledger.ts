import type {
  JeffFieldEvent,
  JeffFieldFactLedger,
  JeffFieldFactEvidenceType,
  JeffMediaItem,
} from "@/lib/jeff-field-assistant/types";

function factSafeId(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "fact"
  );
}

function photoIdsFromRawSource(value?: string) {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith("jeff-photo-"));
}

export function buildJeffFieldFactLedgerForEvent(event: JeffFieldEvent): JeffFieldFactLedger {
  const evidence: JeffFieldFactLedger["evidence"] = [];
  const facts: JeffFieldFactLedger["facts"] = [];
  const eventId = event.id;
  const capturedAt = event.timestamp;

  function addEvidence(
    type: JeffFieldFactEvidenceType,
    label: string,
    value?: string,
    sourcePhotoId?: string,
  ) {
    const id = sourcePhotoId
      ? `${eventId}-evidence-photo-${sourcePhotoId}`
      : `${eventId}-evidence-${type}-${evidence.length + 1}`;
    evidence.push({
      id,
      type,
      label,
      value,
      sourceEventId: eventId,
      sourcePhotoId,
      capturedAt,
    });
    return id;
  }

  for (const symptom of event.extractedFacts.symptoms || []) {
    const evidenceId = addEvidence("technician-report", `Symptom reported: ${symptom}`, symptom);
    facts.push({
      id: `${eventId}-fact-symptom-${factSafeId(symptom)}`,
      status: "proved",
      category: "symptom",
      label: "Reported symptom",
      value: symptom,
      evidenceIds: [evidenceId],
      sourceEventId: eventId,
    });
  }

  for (const test of event.extractedFacts.testsPerformed || []) {
    const evidenceId = addEvidence("test-performed", `Test performed: ${test}`, test);
    facts.push({
      id: `${eventId}-fact-test-${factSafeId(test)}`,
      status: "proved",
      category: "test",
      label: "Test performed",
      value: test,
      evidenceIds: [evidenceId],
      sourceEventId: eventId,
    });
  }

  for (const reading of event.extractedFacts.readings || []) {
    const evidenceId = addEvidence("reading", `Reading captured: ${reading}`, reading);
    facts.push({
      id: `${eventId}-fact-reading-${factSafeId(reading)}`,
      status: "proved",
      category: "reading",
      label: "Reading captured",
      value: reading,
      evidenceIds: [evidenceId],
      sourceEventId: eventId,
    });
  }

  for (const photoId of photoIdsFromRawSource(event.rawSourceReference)) {
    addEvidence("photo", "Field photo attached", undefined, photoId);
  }

  if (event.extractedFacts.partNeeded) {
    const evidenceId = addEvidence(
      "technician-report",
      `Part need reported: ${event.extractedFacts.partNeeded}`,
      event.extractedFacts.partNeeded,
    );
    facts.push({
      id: `${eventId}-fact-part-${factSafeId(event.extractedFacts.partNeeded)}`,
      status: "suspected",
      category: "part",
      label: "Part need",
      value: event.extractedFacts.partNeeded,
      evidenceIds: [evidenceId],
      sourceEventId: eventId,
    });
  }

  if (event.extractedFacts.suspectedCause) {
    facts.push({
      id: `${eventId}-fact-diagnosis-${factSafeId(event.extractedFacts.suspectedCause)}`,
      status: "suspected",
      category: "diagnosis",
      label: "Suspected cause",
      value: event.extractedFacts.suspectedCause,
      evidenceIds: evidence.map((entry) => entry.id),
      sourceEventId: eventId,
    });
  }

  return { facts, evidence };
}

export function buildJeffFieldFactLedger(
  events: JeffFieldEvent[],
  media: JeffMediaItem[] = [],
): JeffFieldFactLedger {
  const facts = new Map<string, JeffFieldFactLedger["facts"][number]>();
  const evidence = new Map<string, JeffFieldFactLedger["evidence"][number]>();

  for (const event of events) {
    const ledger = buildJeffFieldFactLedgerForEvent(event);
    for (const fact of ledger.facts) facts.set(fact.id, fact);
    for (const entry of ledger.evidence) evidence.set(entry.id, entry);
  }

  for (const item of media) {
    if (!item.photoId || !item.fieldEventId) continue;
    const id = `${item.fieldEventId}-evidence-photo-${item.photoId}`;
    if (evidence.has(id)) continue;
    evidence.set(id, {
      id,
      type: "photo",
      label: item.label || item.fileName || "Field photo attached",
      sourceEventId: item.fieldEventId,
      sourcePhotoId: item.photoId,
      capturedAt: item.uploadedAt,
    });
  }

  return {
    facts: [...facts.values()],
    evidence: [...evidence.values()],
  };
}
