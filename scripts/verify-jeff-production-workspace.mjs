import "./load-local-env.mjs";

const baseUrl = (process.argv[2] || "https://wrenchreadymobile.com").replace(/\/$/, "");
const secret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!secret) throw new Error("JEFF_FIELD_ASSISTANT_TOOL_SECRET is required.");
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required so the production test rows can be cleaned up.");
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  };
}

async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json).slice(0, 300)}`);
  }

  return json;
}

async function deleteRows(table, filter) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cleanup failed for ${table}: ${response.status} ${text.slice(0, 300)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const callId = `prod-workspace-${Date.now()}`;
const conversationId = `jeff-conversation-${callId}`;
let jobId;

try {
  const files = await request("/api/al/wrenchready/jeff/files");
  const firstFile = files.fieldFiles?.find((file) => typeof file.job?.id === "string");
  assert(firstFile, "Production should expose at least one Jeff field file through the authenticated API.");
  jobId = firstFile.job.id;

  const session = await request("/api/al/wrenchready/jeff/session", {
    callId,
    activeJobId: jobId,
    activeJobLabel: "Production workspace verification",
    status: "active",
    summary: "Temporary Jeff production workspace verification session.",
  });
  assert(session.success, "Temporary production Jeff session should save.");

  const report = await request("/api/al/wrenchready/jeff/vapi/server", {
    message: {
      type: "end-of-call-report",
      call: {
        id: callId,
        assistantId: "production-verification",
        customer: { number: "509-555-0100" },
        startedAt: new Date(Date.now() - 60000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: 60,
      },
      artifact: {
        transcript:
          "Temporary Jeff production verification call. Simon says the vehicle has a no-start concern. Jeff says to capture battery voltage, voltage-drop results, and a photo before calling any starter failed.",
        summary:
          "Temporary production verification. No repair decision made; next step is proof capture before diagnosis.",
        recordingUrl: "https://example.com/temporary-jeff-production-verification",
      },
    },
  });
  assert(report.received, "Production Vapi end-of-call report should be accepted.");
  assert(report.workspace?.conversationId === conversationId, "Production report should return the predictable conversation id.");
  assert(report.workspace?.jobId === jobId, "Production report should attach to the temporary active job.");
  assert(report.workspace?.storageStatus === "supabase-workspace", "Production report should persist through Supabase workspace storage.");

  const fieldFile = await request(`/api/al/wrenchready/jeff/files/${encodeURIComponent(jobId)}`);
  const conversations = fieldFile.fieldFile?.conversations || [];
  const summaries = fieldFile.fieldFile?.conversationSummaries || [];
  assert(conversations.some((conversation) => conversation.callId === callId), "Field file should include the temporary production conversation.");
  assert(summaries.some((summary) => summary.conversationId === conversationId), "Field file should include the temporary production summary.");
  assert(
    fieldFile.fieldFile?.context?.latestWorkspaceSnapshot?.latestConversationId === conversationId,
    "Field context should include the temporary production workspace snapshot.",
  );

  await request("/api/al/wrenchready/jeff/session", {
    callId,
    status: "closed",
    summary: "Temporary Jeff production workspace verification session closed.",
  });

  console.log(JSON.stringify({
    success: true,
    baseUrl,
    storageStatus: report.workspace.storageStatus,
    conversationVerified: true,
    summaryVerified: true,
    workspaceSnapshotVerified: true,
  }, null, 2));
} finally {
  await deleteRows(
    "wrenchready_jeff_job_workspace_snapshot",
    `latest_conversation_id=eq.${encodeURIComponent(conversationId)}`,
  );
  await deleteRows(
    "wrenchready_jeff_conversation_summary",
    `conversation_id=eq.${encodeURIComponent(conversationId)}`,
  );
  await deleteRows(
    "wrenchready_jeff_conversation",
    `id=eq.${encodeURIComponent(conversationId)}`,
  );
}
