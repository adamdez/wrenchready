import "./load-local-env.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;
const isLocalBaseUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(baseUrl);
const sessionStoreFile = path.join(process.cwd(), ".data", "jeff", "sessions.json");
const reviewStoreFile = path.join(process.cwd(), ".data", "jeff", "pilot-reviews.json");
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function testCallId(name) {
  return `call-test-${runId}-${name}`;
}

function personalCallId(name) {
  return `personal-call-email-${runId}-${name}`;
}

function headers() {
  return {
    "Content-Type": "application/json",
    ...(secret ? { "X-Vapi-Secret": secret } : {}),
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

const config = await request("/api/al/wrenchready/jeff/vapi/config");
assert(config.success, "Vapi pilot config should load");
assert(config.config?.serverUrl?.endsWith("/api/al/wrenchready/jeff/vapi/server"), "server URL should point to Jeff Vapi server");
assert(config.config?.model?.functions?.some((tool) => tool.name === "get_active_field_job"), "config should include get_active_field_job function");
assert(config.config?.model?.functions?.some((tool) => tool.name === "get_jeff_operating_context"), "config should include get_jeff_operating_context function");
assert(config.config?.model?.functions?.some((tool) => tool.name === "get_recent_jeff_messages"), "config should include get_recent_jeff_messages function");
assert(config.config?.model?.functions?.some((tool) => tool.name === "analyze_field_photo"), "config should include field photo analysis function");
assert(config.config?.model?.functions?.some((tool) => tool.name === "send_simon_recap_email"), "config should include Simon recap email function");
assert(config.config?.model?.functions?.some((tool) => tool.name === "prepare_quote_draft_for_review"), "config should include quote draft review function");
assert(config.config?.model?.functions?.some((tool) => tool.name === "check_stripe_payment_status"), "config should include Stripe payment status function");
assert(config.config?.model?.functions?.some((tool) => tool.name === "get_diagnostic_tree"), "config should include diagnostic tree function");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "get_active_field_job"), "config should include get_active_field_job Vapi tool");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "get_jeff_operating_context"), "config should include get_jeff_operating_context Vapi tool");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "get_recent_jeff_messages"), "config should include get_recent_jeff_messages Vapi tool");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "analyze_field_photo"), "config should include field photo analysis Vapi tool");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "prepare_quote_draft_for_review"), "config should include quote draft review Vapi tool");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "check_stripe_payment_status"), "config should include Stripe payment status Vapi tool");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "get_diagnostic_tree"), "config should include diagnostic tree Vapi tool");
assert(config.config?.brain?.middlemanPolicy?.includes("OpenAI"), "config should document OpenAI as Jeff's brain");
assert(config.config?.brain?.reasoningEffort === "low", "config should default Jeff backend reasoning effort to low");
assert(!/customer or vehicle you are on/i.test(config.config?.firstMessage || ""), "first message should not force job context before helping");

const assistantRequest = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "assistant-request",
    call: {
      id: testCallId("assistant-request"),
      customer: { number: "+15095550102" },
    },
  },
});
assert(assistantRequest.assistantId || assistantRequest.assistant, "assistant request should return an assistant id or transient assistant");

const sessionsAfterAnswer = await request("/api/al/wrenchready/jeff/session");
const answerSession = sessionsAfterAnswer.sessions?.find(
  (session) => session.callId === testCallId("assistant-request"),
);
assert(sessionsAfterAnswer.success, "Jeff session list endpoint should load");
assert(
  answerSession?.callId === testCallId("assistant-request"),
  "assistant request should create a live Jeff session",
);
if (isLocalBaseUrl) {
  const persistedSessionsAfterAnswer = readJson(sessionStoreFile);
  assert(
    persistedSessionsAfterAnswer.sessions?.some((session) => session.callId === testCallId("assistant-request")),
    "assistant request should persist the Jeff session locally",
  );
}

const toolCalls = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "tool-calls",
    call: {
      id: testCallId("tools"),
      customer: { number: "+15095550102" },
    },
    toolCallList: [
      {
        id: "tool-1",
        name: "get_active_field_job",
        parameters: {
          customerName: "Tammy",
          vehicle: "Chrysler",
        },
      },
      {
        id: "tool-2",
        name: "purchase_or_reserve_part",
        parameters: {
          jobId: "jeff-fixture-tammy-chrysler",
          requestedPart: "starter",
          vendor: "O'Reilly",
          spokenRequest: "Find a starter and buy it.",
        },
      },
    ],
  },
});
assert(Array.isArray(toolCalls.results), "tool-calls response should include results");
assert(toolCalls.results.length === 2, "tool-calls response should include both results");
const activeLookupResult = JSON.parse(toolCalls.results[0].result);
const purchaseResult = JSON.parse(toolCalls.results[1].result);
assert(purchaseResult.success === false, "purchase tool should stay blocked");

const recapVoiceToolCalls = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "tool-calls",
    call: {
      id: testCallId("recap-redaction"),
      customer: { number: "+15095550102" },
    },
    toolCallList: [
      {
        id: "tool-redact-recap",
        name: "send_simon_recap_email",
        parameters: {
          conversationId: `jeff-conversation-${testCallId("recap-redaction")}`,
          subject: "Voice redaction test",
          body: "Sensitive draft line that belongs in email, not spoken voice. ".repeat(30),
          sendNow: false,
        },
      },
    ],
  },
});
const recapVoiceResult = JSON.parse(recapVoiceToolCalls.results[0].result);
assert(
  !JSON.stringify(recapVoiceResult).includes("Sensitive draft line"),
  "Vapi voice tool result should redact full recap draft bodies",
);
assert(
  recapVoiceResult.data?.draftBody === undefined,
  "Vapi voice tool result should omit data.draftBody",
);

if (isLocalBaseUrl) {
  const sessionsAfterTools = await request("/api/al/wrenchready/jeff/session");
  const toolSession = sessionsAfterTools.sessions?.find(
    (session) => session.callId === testCallId("tools"),
  );
  if (activeLookupResult.data?.job?.id) {
    assert(
      toolSession?.activeJobId === activeLookupResult.data.job.id,
      "active field job lookup should update the live Jeff session",
    );
  } else {
    assert(
      activeLookupResult.data?.needsClarification === true && !toolSession?.activeJobId,
      "uncertain active field job lookup should ask for clarification without attaching a job",
    );
  }
}

const nestedToolCalls = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "tool-calls",
    call: {
      id: testCallId("nested-tools"),
      customer: { number: "+15095550102" },
    },
    toolWithToolCallList: [
      {
        type: "function",
        name: "get_active_field_job",
        toolCall: {
          id: "tool-nested-1",
          type: "function",
          function: {
            name: "get_active_field_job",
            parameters: JSON.stringify({
              customerName: "Tammy",
              vehicle: "Chrysler",
            }),
          },
        },
      },
    ],
  },
});
assert(Array.isArray(nestedToolCalls.results), "nested Vapi tool response should include results");
assert(nestedToolCalls.results.length === 1, "nested Vapi tool response should include one result");
const nestedLookup = JSON.parse(nestedToolCalls.results[0].result);
assert(nestedLookup.success, "nested Vapi tool parameters should be understood");
if (isLocalBaseUrl) {
  assert(
    nestedLookup.data?.job?.id || nestedLookup.data?.needsClarification === true,
    "nested Vapi tool call should return a job or a safe clarification result",
  );
} else {
  assert(
    nestedLookup.data?.job?.id || nestedLookup.data?.needsClarification === true,
    "nested Vapi tool call should return a job or a safe clarification result in production",
  );
}

const review = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: testCallId("review"),
      assistantId: "assistant-test",
      customer: { number: "+15095550102" },
    },
    artifact: {
      transcript:
        "Simon says he is on Tammy's Chrysler. Jeff says to verify battery load voltage, check terminals, capture a photo, and not buy parts yet. Simon asks Jeff to buy a starter. Jeff refuses and says parts purchasing is blocked until approval gates are live.",
    },
  },
});
assert(review.review?.passed, "safe transcript should pass review");
if (isLocalBaseUrl) {
  const persistedReviews = readJson(reviewStoreFile);
  assert(
    persistedReviews.reviews?.some((entry) => entry.callId === testCallId("review")),
    "end-of-call transcript review should persist locally",
  );
}

const orientationReview = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: testCallId("orientation"),
      assistantId: "assistant-test",
      customer: { number: "+15095550102" },
    },
    artifact: {
      messages: [
        { role: "system", message: "You are Jeff, the WrenchReady field assistant for Simon." },
        {
          role: "assistant",
          message:
            "The short version: call when stuck or hands-busy, I will help with the next test, and use Message Jeff to send photos or scan reports.",
        },
        {
          role: "user",
          message:
            "So I can call you during a no-start, send a photo or scan report, and ask you to save the job note or recap before I leave.",
        },
      ],
      summary: "Jeff orientation test. Simon confirmed how to use Jeff.",
    },
  },
});
assert(orientationReview.review?.orientationReadiness?.ready, "orientation review should confirm Simon knows how to use Jeff");
assert(
  !orientationReview.review?.transcript?.includes("You are Jeff"),
  "artifact-message transcript should exclude system prompt text",
);

const shortCall = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: testCallId("short-call"),
      assistantId: "assistant-test",
      customer: { number: "+15095550102" },
    },
    artifact: {
      transcript: "AI: Hey, Simon. This is Jeff. What are we working on?",
    },
  },
});
assert(shortCall.workspace?.conversationMode === "missed-or-short-call", "greeting-only calls should be classified as missed/short");
assert(shortCall.workspace?.needsReview === false, "greeting-only calls should not pollute the operator review queue");
assert(!shortCall.review, "greeting-only calls should not create a transcript review");

const contextNarrationReview = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: testCallId("context-narration"),
      assistantId: "assistant-test",
      customer: { number: "+15095550102" },
    },
    artifact: {
      transcript:
        "AI: One second. I'm checking the WrenchReady job context.\nUser: Oh, you're confused already.\nAI: I'm not confused. I can talk Simon through diagnostics and give the next test.",
    },
  },
});
assert(
  contextNarrationReview.review?.issues?.some((issue) => /internal lookup narration/i.test(issue.summary)),
  "review should flag internal context lookup narration",
);

const personalCall = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: personalCallId("diagnostic-recap"),
      assistantId: "assistant-test",
      customer: { number: "+15095550102" },
    },
    artifact: {
      transcript:
        "Simon says this is for me personally. My 1987 Ford F-150 with a 5.0 starts then dies. Jeff says verify fuel pressure, spark, and base inputs before calling a part. Simon asks, can you compile all of that information and send it to me in an email?",
      summary:
        "Personal 1987 Ford F-150 starts then dies diagnostic call. Verify fuel pressure, spark, and inputs before parts.",
    },
  },
});
assert(personalCall.workspace?.callType === "personal", "personal/non-job call should be classified as personal");
assert(personalCall.workspace?.emailRequested === true, "personal call should detect email recap request");
assert(personalCall.workspace?.emailStatus === "requested", "personal email recap should start as requested");
assert(personalCall.review?.passed, "personal diagnostic call should not fail for missing job context");

const subaruEmailTree = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: testCallId("subaru-email-tree"),
      assistantId: "assistant-test",
      customer: { number: "+15095550102" },
    },
    artifact: {
      transcript:
        "User: Jack. I need you to send me a diagnostic tree for a rough shift at forty miles an hour on a two thousand one Subaru Outback. Then the diag tree for me for that vehicle to my email. Immediately, as fast as possible. Thank you.\nAI: This'll just take a sec.\nAI: I emailed the diagnostic treat to Simon. Subject, two thousand one Subaru Outback Rough Shift at forty miles per hour. Diagnostic treat. If you want, I can also turn that into a cleaner yes slash no tree or a shorter text version.",
    },
  },
});
assert(
  subaruEmailTree.workspace?.subjectLabel === "2001 Subaru Outback",
  "spoken Subaru year should become a searchable subject label",
);
assert(subaruEmailTree.workspace?.emailRequested === true, "to-my-email phrasing should mark email requested");
assert(subaruEmailTree.workspace?.emailStatus === "requested", "unsent email tree should stay requested, not sent");
assert(
  subaruEmailTree.workspace?.summary?.requestedFollowUps?.some((entry) => /email simon/i.test(entry)),
  "email diagnostic tree request should create a follow-up",
);
assert(
  !/diagnostic treat/i.test(subaruEmailTree.workspace?.summary?.summary || ""),
  "fallback summary should not preserve Jeff's spoken typo as the durable summary",
);

const longReadbackReview = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: testCallId("long-readback"),
      assistantId: "assistant-test",
      customer: { number: "+15095550102" },
    },
    artifact: {
      transcript: [
        "User: Jeff, send me a yes no diagnostic tree for this two thousand one Subaru Outback over email.",
        `AI: Email the yes slash no tree. QuickTake. ${"One, check codes. Two, check fluid. Three, check misfire. If yes, go here. If no, go there. ".repeat(12)}`,
      ].join("\n"),
    },
  },
});
assert(
  longReadbackReview.review?.issues?.some((issue) => /overlong voice answer/i.test(issue.summary)),
  "transcript review should flag overlong Jeff voice turns",
);
assert(
  longReadbackReview.review?.issues?.some((issue) => /read written\/email diagnostic content aloud/i.test(issue.summary)),
  "transcript review should flag written diagnostic content read aloud",
);

const fordEmailTree = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: testCallId("ford-email-tree"),
      assistantId: "assistant-test",
      customer: { number: "+15095550102" },
    },
    artifact: {
      transcript:
        "AI: Ready.\nUser: Hey, Jeff. Do you remember the conversation we had about a nineteen eighty seven Ford f one fifty\nAI: I don't have that conversation in front of me right now.\nUser: Okay, Jeff. Uh, this was a nineteen eighty seven Ford f one fifty with a five liter v eight. Suspicion is old gas replaced the fuel filter, distributor cap, and rotor. The car will start up, run, and then the idle is hopping or will stay at a high idle and then just die off. And we'll only be able to start with some pumps to the gas pedal. Give me a yes, no diagnostic tree and send it to my email.\nAI: Yes. sent to your email.\nUser: Send it in a yes, no tree, uh, over email, and that's fine. Thank you, Joe.",
    },
  },
});
assert(
  fordEmailTree.workspace?.subjectLabel === "1987 Ford F-150",
  "spoken Ford F one fifty should become a searchable subject label",
);
assert(fordEmailTree.workspace?.emailRequested === true, "over-email phrasing should mark email requested");
assert(
  fordEmailTree.workspace?.summary?.knownFacts?.some((entry) => /fuel filter|distributor|idle/i.test(entry)),
  "Simon's vehicle facts should survive compaction",
);
assert(
  !fordEmailTree.workspace?.summary?.testsPerformed?.some((entry) => /vacuum hoses|physical test/i.test(entry)),
  "Jeff's spoken recommendations should not be stored as tests performed",
);

const subaruWrittenTree = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: testCallId("subaru-written-tree"),
      assistantId: "assistant-test",
      customer: { number: "+15095550102" },
    },
    artifact: {
      transcript:
        "AI: Jeff here. What's the job, symptom, or office task?\nUser: Yeah. If I got a two thousand one Subaru Outback with a really rough idle. and it is not allowing the customer to go past thirty miles an hour before it it kinda gives it even more rough. It feels like a bad shift.\nAI: QuickTake, that sounds more like a severe misfire under load than a transmission problem.\nUser: Jeff, Then this to me in a diagnostic tree, yes and no, please.\nAI: Yep. Start here. One check for flashing CEL stored codes? Yes, go to two.",
    },
  },
});
assert(
  subaruWrittenTree.workspace?.subjectLabel === "2001 Subaru Outback",
  "second Subaru diagnostic call should still get a vehicle subject label",
);
assert(
  subaruWrittenTree.workspace?.followUpStatus === "requested",
  "written diagnostic tree request should create a follow-up even without the word email",
);
assert(
  subaruWrittenTree.workspace?.summary?.requestedFollowUps?.some((entry) => /yes\/no diagnostic tree/i.test(entry)),
  "written yes/no tree request should be visible in the summary",
);
const subaruWrittenSummaryText = [
  subaruWrittenTree.workspace?.summary?.summary,
  ...(subaruWrittenTree.workspace?.summary?.nextActions || []),
  ...(subaruWrittenTree.workspace?.summary?.blockers || []),
].join(" ");
assert(!/office job intake/i.test(subaruWrittenSummaryText), "diagnostic call should not become office intake");
assert(!/Tammy|Monday|quote\/schedule/i.test(subaruWrittenSummaryText), "diagnostic call should not leak fixture office actions");

console.log("Jeff Vapi server smoke test passed.");
