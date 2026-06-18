import "./load-local-env.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;
const isLocalBaseUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(baseUrl);
const sessionStoreFile = path.join(process.cwd(), ".data", "jeff", "sessions.json");
const reviewStoreFile = path.join(process.cwd(), ".data", "jeff", "pilot-reviews.json");

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
assert(config.config?.model?.functions?.some((tool) => tool.name === "get_recent_jeff_messages"), "config should include get_recent_jeff_messages function");
assert(config.config?.model?.functions?.some((tool) => tool.name === "analyze_field_photo"), "config should include field photo analysis function");
assert(config.config?.model?.functions?.some((tool) => tool.name === "send_simon_recap_email"), "config should include Simon recap email function");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "get_active_field_job"), "config should include get_active_field_job Vapi tool");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "get_recent_jeff_messages"), "config should include get_recent_jeff_messages Vapi tool");
assert(config.config?.model?.tools?.some((tool) => tool.function?.name === "analyze_field_photo"), "config should include field photo analysis Vapi tool");
assert(config.config?.brain?.middlemanPolicy?.includes("OpenAI"), "config should document OpenAI as Jeff's brain");
assert(config.config?.brain?.reasoningEffort === "low", "config should default Jeff backend reasoning effort to low");
assert(!/customer or vehicle you are on/i.test(config.config?.firstMessage || ""), "first message should not force job context before helping");

const assistantRequest = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "assistant-request",
    call: {
      id: "call-test-assistant-request",
      customer: { number: "+15095550102" },
    },
  },
});
assert(assistantRequest.assistantId || assistantRequest.assistant, "assistant request should return an assistant id or transient assistant");

const sessionsAfterAnswer = await request("/api/al/wrenchready/jeff/session");
const answerSession = sessionsAfterAnswer.sessions?.find(
  (session) => session.callId === "call-test-assistant-request",
);
assert(sessionsAfterAnswer.success, "Jeff session list endpoint should load");
assert(
  answerSession?.callId === "call-test-assistant-request",
  "assistant request should create a live Jeff session",
);
if (isLocalBaseUrl) {
  const persistedSessionsAfterAnswer = readJson(sessionStoreFile);
  assert(
    persistedSessionsAfterAnswer.sessions?.some((session) => session.callId === "call-test-assistant-request"),
    "assistant request should persist the Jeff session locally",
  );
}

const toolCalls = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "tool-calls",
    call: {
      id: "call-test-tools",
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

if (isLocalBaseUrl) {
  const sessionsAfterTools = await request("/api/al/wrenchready/jeff/session");
  const toolSession = sessionsAfterTools.sessions?.find(
    (session) => session.callId === "call-test-tools",
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
      id: "call-test-nested-tools",
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
      id: "call-test-review",
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
    persistedReviews.reviews?.some((entry) => entry.callId === "call-test-review"),
    "end-of-call transcript review should persist locally",
  );
}

const orientationReview = await request("/api/al/wrenchready/jeff/vapi/server", {
  message: {
    type: "end-of-call-report",
    call: {
      id: "call-test-orientation",
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
      id: "call-test-short-call",
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
      id: "call-test-context-narration",
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
      id: "personal-call-email-test",
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

console.log("Jeff Vapi server smoke test passed.");
