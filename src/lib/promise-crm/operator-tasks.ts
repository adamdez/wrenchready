import { getFollowThroughWorklist, getInboundRecords, getPromiseRecords } from "@/lib/promise-crm/storage";
import { hasPromiseCrmSupabase, supabaseRestRequest } from "@/lib/promise-crm/supabase";
import type {
  InboundRecord,
  OperatorTask,
  OperatorTaskOwner,
  OperatorTaskPriority,
  OperatorTaskQueueSnapshot,
  OperatorTaskSourceChannel,
  OperatorTaskStatus,
  OperatorTaskType,
  PromiseRecord,
} from "@/lib/promise-crm/types";

type OperatorTaskRow = {
  id: string;
  title: string;
  detail: string;
  task_type: OperatorTaskType;
  status: OperatorTaskStatus;
  priority: OperatorTaskPriority;
  owner: OperatorTaskOwner;
  due_at: string | null;
  promise_id: string | null;
  inbound_id: string | null;
  customer_name: string | null;
  vehicle_label: string | null;
  source_channel: OperatorTaskSourceChannel;
  source_kind: string;
  source_id: string | null;
  source_url: string | null;
  blocker: string | null;
  completion_summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type UpsertOperatorTaskInput = {
  id?: string;
  title: string;
  detail: string;
  type: OperatorTaskType;
  status?: OperatorTaskStatus;
  priority?: OperatorTaskPriority;
  owner?: OperatorTaskOwner;
  dueAt?: string;
  promiseId?: string;
  inboundId?: string;
  customerName?: string;
  vehicleLabel?: string;
  sourceChannel: OperatorTaskSourceChannel;
  sourceKind: string;
  sourceId?: string;
  sourceUrl?: string;
  blocker?: string;
  completionSummary?: string;
  metadata?: Record<string, unknown>;
};

type RuntimeOperatorTaskState = {
  tasks: OperatorTask[];
};

const ACTIVE_TASK_STATUSES = new Set<OperatorTaskStatus>(["open", "in-progress", "blocked"]);

function runtimeState(): RuntimeOperatorTaskState {
  const globalState = globalThis as typeof globalThis & {
    __wrenchreadyOperatorTaskState?: RuntimeOperatorTaskState;
  };

  if (!globalState.__wrenchreadyOperatorTaskState) {
    globalState.__wrenchreadyOperatorTaskState = { tasks: [] };
  }

  return globalState.__wrenchreadyOperatorTaskState;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeIdPart(value?: string) {
  return (value || "manual")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "manual";
}

function taskId(input: UpsertOperatorTaskInput) {
  return input.id || [
    "operator-task",
    normalizeIdPart(input.sourceKind),
    normalizeIdPart(input.sourceId || input.promiseId || input.inboundId || input.customerName),
    normalizeIdPart(input.type),
  ].join("-");
}

function vehicleLabel(promise: PromiseRecord) {
  return [promise.vehicle.year || undefined, promise.vehicle.make, promise.vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function inboundVehicleLabel(record: InboundRecord) {
  return [record.vehicle.year || undefined, record.vehicle.make, record.vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function isMissingSchedule(label?: string) {
  const normalized = (label || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("tbd") ||
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("needs") ||
    normalized.includes("no timing") ||
    normalized.includes("not selected") ||
    normalized.includes("not captured")
  );
}

function mapRow(row: OperatorTaskRow): OperatorTask {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    title: row.title,
    detail: row.detail,
    type: row.task_type,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    dueAt: row.due_at || undefined,
    promiseId: row.promise_id || undefined,
    inboundId: row.inbound_id || undefined,
    customerName: row.customer_name || undefined,
    vehicleLabel: row.vehicle_label || undefined,
    sourceChannel: row.source_channel,
    sourceKind: row.source_kind,
    sourceId: row.source_id || undefined,
    sourceUrl: row.source_url || undefined,
    blocker: row.blocker || undefined,
    completionSummary: row.completion_summary || undefined,
    metadata: row.metadata || {},
  };
}

function toRow(input: UpsertOperatorTaskInput): Omit<OperatorTaskRow, "created_at" | "updated_at"> {
  return {
    id: taskId(input),
    title: input.title,
    detail: input.detail,
    task_type: input.type,
    status: input.status || (input.blocker ? "blocked" : "open"),
    priority: input.priority || "normal",
    owner: input.owner || "Ops",
    due_at: input.dueAt || null,
    promise_id: input.promiseId || null,
    inbound_id: input.inboundId || null,
    customer_name: input.customerName || null,
    vehicle_label: input.vehicleLabel || null,
    source_channel: input.sourceChannel,
    source_kind: input.sourceKind,
    source_id: input.sourceId || null,
    source_url: input.sourceUrl || null,
    blocker: input.blocker || null,
    completion_summary: input.completionSummary || null,
    metadata: input.metadata || {},
  };
}

function localUpsert(input: UpsertOperatorTaskInput): OperatorTask {
  const timestamp = nowIso();
  const row = toRow(input);
  const existing = runtimeState().tasks.find((task) => task.id === row.id);
  const task: OperatorTask = {
    id: row.id,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
    title: row.title,
    detail: row.detail,
    type: row.task_type,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    dueAt: row.due_at || undefined,
    promiseId: row.promise_id || undefined,
    inboundId: row.inbound_id || undefined,
    customerName: row.customer_name || undefined,
    vehicleLabel: row.vehicle_label || undefined,
    sourceChannel: row.source_channel,
    sourceKind: row.source_kind,
    sourceId: row.source_id || undefined,
    sourceUrl: row.source_url || undefined,
    blocker: row.blocker || undefined,
    completionSummary: row.completion_summary || undefined,
    metadata: row.metadata || {},
  };

  runtimeState().tasks = [task, ...runtimeState().tasks.filter((item) => item.id !== task.id)];
  return task;
}

function derivedTask(input: UpsertOperatorTaskInput): OperatorTask {
  const timestamp = nowIso();
  const row = toRow({ ...input, id: input.id || taskId(input) });
  return {
    id: row.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    title: row.title,
    detail: row.detail,
    type: row.task_type,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    dueAt: row.due_at || undefined,
    promiseId: row.promise_id || undefined,
    inboundId: row.inbound_id || undefined,
    customerName: row.customer_name || undefined,
    vehicleLabel: row.vehicle_label || undefined,
    sourceChannel: row.source_channel,
    sourceKind: row.source_kind,
    sourceId: row.source_id || undefined,
    sourceUrl: row.source_url || undefined,
    blocker: row.blocker || undefined,
    completionSummary: row.completion_summary || undefined,
    metadata: { ...row.metadata, derived: true },
  };
}

function deriveInboundTasks(inbound: InboundRecord[]) {
  return inbound
    .filter((record) => record.qualificationStatus !== "promoted")
    .map((record) => derivedTask({
      id: `derived-inbound-${record.id}-screen`,
      title: `Screen ${record.customer.name}`,
      detail: record.nextAction || `Confirm scope, timing, location, and whether ${record.requestedService} should become a promise.`,
      type: "inbound-screening",
      priority: record.readinessRisk === "high" ? "high" : "normal",
      owner: record.owner === "Unassigned" ? "Ops" : record.owner,
      inboundId: record.id,
      customerName: record.customer.name,
      vehicleLabel: inboundVehicleLabel(record),
      sourceChannel: record.source === "text" ? "message" : record.source === "voicemail" || record.source === "phone" ? "voice" : "crm",
      sourceKind: "inbound-record",
      sourceId: record.id,
      sourceUrl: `/ops/inbound/${record.id}`,
      metadata: { requestedService: record.requestedService, preferredWindow: record.preferredWindow.label },
    }));
}

function derivePromiseTasks(promises: PromiseRecord[]) {
  const tasks: OperatorTask[] = [];

  for (const promise of promises) {
    const owner = promise.owner === "Unassigned" ? "Ops" : promise.owner;
    const common = {
      promiseId: promise.id,
      customerName: promise.customer.name,
      vehicleLabel: vehicleLabel(promise),
      sourceChannel: "crm" as const,
      sourceUrl: `/ops/promises/${promise.id}`,
    };

    if (promise.readinessRisk === "high" || promise.status === "tomorrow-at-risk" || promise.topRisks.length > 0) {
      tasks.push(derivedTask({
        id: `derived-promise-${promise.id}-risk`,
        title: `Reduce blocker for ${promise.customer.name}`,
        detail: promise.topRisks[0] || promise.readinessSummary || promise.nextAction,
        type: "job-review",
        priority: promise.readinessRisk === "high" ? "critical" : "high",
        owner,
        blocker: promise.topRisks[0],
        sourceKind: "promise-risk",
        sourceId: promise.id,
        ...common,
      }));
    }

    if (
      promise.quotePacket &&
      (promise.quotePacket.status !== "send-ready" ||
        promise.quotePacket.customerSendStatus !== "sent" ||
        promise.quotePacket.paymentLinkStatus === "blocked")
    ) {
      tasks.push(derivedTask({
        id: `derived-promise-${promise.id}-quote`,
        title: `Review quote for ${promise.customer.name}`,
        detail: promise.quotePacket.nextAction || "Confirm internal plan, customer quote, price, assumptions, send readiness, and payment link.",
        type: "quote-review",
        priority: promise.quotePacket.status === "blocked" ? "critical" : "high",
        owner: promise.quotePacket.reviewOwner === "Adam" ? "Adam" : promise.quotePacket.reviewOwner,
        blocker: promise.quotePacket.blockers[0],
        sourceKind: "quote-packet",
        sourceId: promise.id,
        ...common,
      }));
    }

    if (isMissingSchedule(promise.scheduledWindow.label) || !promise.scheduledWindow.startIso) {
      tasks.push(derivedTask({
        id: `derived-promise-${promise.id}-schedule`,
        title: `Schedule ${promise.customer.name}`,
        detail: `Current window: ${promise.scheduledWindow.label}. Confirm route, duration, customer availability, and parts readiness before calling it scheduled.`,
        type: "schedule",
        priority: promise.quotePacket?.status === "draft-for-review" ? "high" : "normal",
        owner,
        sourceKind: "schedule-readiness",
        sourceId: promise.id,
        ...common,
      }));
    }

    const parts = promise.fieldExecution?.partsPlan || [];
    const openParts = parts.filter((part) =>
      ["research-needed", "quoted", "ordered", "ready-pickup", "return-needed"].includes(part.status),
    );
    if (openParts.length > 0 || promise.fieldExecution?.partsChecklist.length === 0) {
      tasks.push(derivedTask({
        id: `derived-promise-${promise.id}-parts`,
        title: `Parts plan for ${promise.customer.name}`,
        detail: openParts[0]
          ? `${openParts[0].label}: ${openParts[0].status}. Verify fitment, store, price, pickup, and who owns it.`
          : "Parts checklist is missing. Confirm whether the visit needs parts, supplies, or only diagnostic labor.",
        type: "parts",
        priority: openParts.some((part) => part.requiredForVisit) ? "high" : "normal",
        owner,
        sourceKind: "parts-readiness",
        sourceId: promise.id,
        ...common,
      }));
    }

    if (
      promise.jobStage === "on-site" ||
      promise.jobStage === "waiting-approval" ||
      promise.jobStage === "completed"
    ) {
      const missingProof = [
        promise.fieldExecution?.photosRequired.length ? undefined : "required photos",
        promise.fieldExecution?.inspectionChecklist.length ? undefined : "inspection checklist",
        promise.closeout ? undefined : "closeout",
      ].filter((item): item is string => Boolean(item));
      if (missingProof.length > 0) {
        tasks.push(derivedTask({
          id: `derived-promise-${promise.id}-proof`,
          title: `Capture proof for ${promise.customer.name}`,
          detail: `Missing: ${missingProof.join(", ")}. Protect the customer recap, invoice, and comeback prevention before the job cools off.`,
          type: "field-proof",
          priority: promise.jobStage === "completed" ? "high" : "normal",
          owner: "Simon",
          sourceKind: "field-proof",
          sourceId: promise.id,
          ...common,
        }));
      }
    }

    const payment = promise.paymentCollection;
    if (
      payment &&
      payment.status !== "paid" &&
      payment.status !== "written-off" &&
      (payment.balanceDueAmount || promise.jobStage === "completed" || promise.quotePacket?.paymentLinkStatus === "blocked")
    ) {
      tasks.push(derivedTask({
        id: `derived-promise-${promise.id}-payment`,
        title: `Collect or prepare payment for ${promise.customer.name}`,
        detail: payment.paymentSummary || `Payment status is ${payment.status}. Confirm invoice, payment link, and remaining balance.`,
        type: "payment",
        priority: payment.status === "awaiting-payment" || payment.status === "partial" ? "high" : "normal",
        owner: "Adam",
        sourceKind: "payment-readiness",
        sourceId: promise.id,
        ...common,
      }));
    }
  }

  return tasks;
}

async function deriveFollowThroughTasks() {
  const followThrough = await getFollowThroughWorklist();
  return followThrough.tasks.map((task) => derivedTask({
    id: `derived-promise-${task.promiseId}-follow-through-${task.reason}`,
    title: `Follow up with ${task.customerName}`,
    detail: task.recommendedAction,
    type: "customer-follow-up",
    priority: task.urgency === "overdue" ? "critical" : task.urgency === "due-now" ? "high" : "normal",
    owner: task.owner === "Unassigned" ? "Ops" : task.owner,
    dueAt: task.dueAt,
    promiseId: task.promiseId,
    inboundId: task.inboundId,
    customerName: task.customerName,
    sourceChannel: "crm",
    sourceKind: "follow-through",
    sourceId: `${task.promiseId}:${task.reason}`,
    sourceUrl: `/ops/promises/${task.promiseId}`,
    metadata: { reason: task.reason, summary: task.summary },
  }));
}

async function getDerivedOperatorTasks(promiseId?: string) {
  const [inbound, promises, followThroughTasks] = await Promise.all([
    getInboundRecords().catch(() => []),
    getPromiseRecords().catch(() => []),
    deriveFollowThroughTasks().catch(() => []),
  ]);
  const all = [
    ...deriveInboundTasks(inbound),
    ...derivePromiseTasks(promises),
    ...followThroughTasks,
  ];

  return promiseId ? all.filter((task) => task.promiseId === promiseId) : all;
}

async function listPersistedTasks(promiseId?: string) {
  if (!hasPromiseCrmSupabase()) return { tasks: runtimeState().tasks, warning: undefined };

  const promiseFilter = promiseId ? `&promise_id=eq.${encodeURIComponent(promiseId)}` : "";
  try {
    const rows = await supabaseRestRequest<OperatorTaskRow[]>(
      `wrenchready_operator_task?select=*&order=updated_at.desc&limit=200${promiseFilter}`,
      { method: "GET" },
    );
    return { tasks: rows.map(mapRow), warning: undefined };
  } catch (error) {
    return {
      tasks: runtimeState().tasks,
      warning:
        error instanceof Error
          ? `Operator task table unavailable; showing derived tasks only. ${error.message}`
          : "Operator task table unavailable; showing derived tasks only.",
    };
  }
}

function statusRank(status: OperatorTaskStatus) {
  if (status === "blocked") return 0;
  if (status === "open") return 1;
  if (status === "in-progress") return 2;
  if (status === "done") return 3;
  return 4;
}

function priorityRank(priority: OperatorTaskPriority) {
  if (priority === "critical") return 0;
  if (priority === "high") return 1;
  if (priority === "normal") return 2;
  return 3;
}

function sortTasks(tasks: OperatorTask[]) {
  return [...tasks].sort((a, b) => {
    if (statusRank(a.status) !== statusRank(b.status)) return statusRank(a.status) - statusRank(b.status);
    if (priorityRank(a.priority) !== priorityRank(b.priority)) return priorityRank(a.priority) - priorityRank(b.priority);
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getOperatorTaskQueue(options: { promiseId?: string; limit?: number } = {}): Promise<OperatorTaskQueueSnapshot> {
  const [persistedResult, derived] = await Promise.all([
    listPersistedTasks(options.promiseId),
    getDerivedOperatorTasks(options.promiseId),
  ]);
  const persistedById = new Map(persistedResult.tasks.map((task) => [task.id, task]));
  const combinedById = new Map<string, OperatorTask>();

  for (const task of persistedResult.tasks) {
    combinedById.set(task.id, task);
  }

  for (const task of derived) {
    const persisted = persistedById.get(task.id);
    if (persisted?.status === "done" || persisted?.status === "dismissed") continue;
    if (!persisted) combinedById.set(task.id, task);
  }

  const active = sortTasks([...combinedById.values()].filter((task) => ACTIVE_TASK_STATUSES.has(task.status)))
    .slice(0, Math.max(1, Math.min(options.limit || 60, 200)));
  const now = Date.now();

  return {
    generatedAt: nowIso(),
    tasks: active,
    counts: {
      open: active.filter((task) => task.status === "open").length,
      inProgress: active.filter((task) => task.status === "in-progress").length,
      blocked: active.filter((task) => task.status === "blocked").length,
      dueNow: active.filter((task) => task.dueAt && new Date(task.dueAt).getTime() <= now).length,
      critical: active.filter((task) => task.priority === "critical").length,
    },
    warnings: [persistedResult.warning].filter((warning): warning is string => Boolean(warning)),
    storageStatus: persistedResult.warning ? "derived" : hasPromiseCrmSupabase() ? "supabase" : "local",
  };
}

export async function upsertOperatorTask(input: UpsertOperatorTaskInput): Promise<OperatorTask> {
  if (!hasPromiseCrmSupabase()) return localUpsert(input);

  const row = toRow(input);
  try {
    const rows = await supabaseRestRequest<OperatorTaskRow[]>(
      "wrenchready_operator_task?on_conflict=id",
      {
        method: "POST",
        body: row,
      },
    );
    return rows[0] ? mapRow(rows[0]) : localUpsert(input);
  } catch {
    return localUpsert(input);
  }
}

export async function updateOperatorTaskStatus(input: {
  id: string;
  status: OperatorTaskStatus;
  completionSummary?: string;
}) {
  const existing = runtimeState().tasks.find((task) => task.id === input.id);
  const patch = {
    status: input.status,
    completion_summary: input.completionSummary || null,
    updated_at: nowIso(),
  };

  if (!hasPromiseCrmSupabase()) {
    if (existing) {
      localUpsert({
        ...existing,
        status: input.status,
        completionSummary: input.completionSummary,
        sourceChannel: existing.sourceChannel,
        sourceKind: existing.sourceKind,
        type: existing.type,
      });
      return existing;
    }
    return localUpsert({
      id: input.id,
      title: "Task status updated",
      detail: input.completionSummary || "Operator task was manually updated.",
      type: "other",
      status: input.status,
      priority: "normal",
      owner: "Ops",
      sourceChannel: "system",
      sourceKind: "manual-task-update",
      completionSummary: input.completionSummary,
    });
  }

  try {
    const rows = await supabaseRestRequest<OperatorTaskRow[]>(
      `wrenchready_operator_task?id=eq.${encodeURIComponent(input.id)}`,
      {
        method: "PATCH",
        body: patch,
      },
    );
    return rows[0] ? mapRow(rows[0]) : undefined;
  } catch {
    return localUpsert({
      id: input.id,
      title: "Task status update pending",
      detail: input.completionSummary || "Task table update failed; this local status keeps the derived task from disappearing during this process.",
      type: "other",
      status: input.status,
      priority: "normal",
      owner: "Ops",
      sourceChannel: "system",
      sourceKind: "manual-task-update",
      completionSummary: input.completionSummary,
    });
  }
}
