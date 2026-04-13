export type IntakeSource = "website" | "phone" | "text" | "manual" | "voicemail";

export type RecordOwner = "Dez" | "Simon" | "Unassigned";

export type ReadinessRisk = "low" | "medium" | "high";
export type PromiseFit = "strong" | "conditional" | "review";
export type ServiceClass = "hero-core" | "selective" | "never-standalone";
export type MarketingRole = "hero" | "demand-capture" | "hero-b2b";
export type DispatchTier =
  | "dispatch-first"
  | "selective-screening"
  | "bundle-only"
  | "decline-standalone";
export type AcceptancePolicy =
  | "dispatch-first"
  | "screen-hard"
  | "accept-if-bundled"
  | "decline-if-standalone";

export type PromiseStatus =
  | "promises-waiting"
  | "tomorrow-at-risk"
  | "follow-through-due"
  | "completed";

export type PromiseCustomerCertainty = {
  contactConfirmed: boolean;
  arrivalWindowShared: boolean;
  pricingExpectationShared: boolean;
  updatesPlanShared: boolean;
  followUpExplained: boolean;
};

export type PromiseDayReadiness = {
  customerConfirmed: boolean;
  locationConfirmed: boolean;
  partsConfirmed: boolean;
  toolsConfirmed: boolean;
  routeLocked: boolean;
  paymentMethodReady: boolean;
};

export type CustomerApprovalStatus =
  | "not-needed"
  | "awaiting-approval"
  | "approved"
  | "declined";

export type ContactPreference = "call" | "text" | "email";

export type CustomerContact = {
  name: string;
  phone: string;
  email?: string;
  preferredContact: ContactPreference;
};

export type VehicleSummary = {
  year: number;
  make: string;
  model: string;
  mileage?: number;
};

export type LocationSummary = {
  label: string;
  city: string;
  territory: string;
  accessNotes?: string;
};

export type TimeWindow = {
  label: string;
  startIso?: string;
  endIso?: string;
};

export type PromiseEconomicsSnapshot = {
  quotedAmount?: number;
  finalInvoiceAmount?: number;
  laborHours?: number;
  travelHours?: number;
  partsCostAmount?: number;
  techPayoutAmount?: number;
  supportCostAmount?: number;
  cardFeePercent?: number;
  warrantyReservePercent?: number;
};

export type CommercialOutcomeStatus =
  | "unknown"
  | "approved-repair"
  | "completed-maintenance"
  | "diagnostic-only"
  | "deferred-work"
  | "declined";

export type PromiseCommercialOutcome = {
  outcomeStatus: CommercialOutcomeStatus;
  convertedService?: string;
  deferredValueAmount?: number;
  outcomeSummary?: string;
};

export type PromiseRecapItem = {
  title: string;
  detail?: string;
  estimatedAmount?: number;
};

export type ReviewRequestStatus = "not-ready" | "ready" | "sent" | "completed";

export type PromiseReviewRequest = {
  status: ReviewRequestStatus;
  dueAt?: string;
  sentAt?: string;
  channel?: "email" | "text";
  summary?: string;
  reviewUrl?: string;
};

export type MaintenanceReminderStatus = "not-seeded" | "seeded" | "scheduled";

export type PromiseMaintenanceReminderSeed = {
  status: MaintenanceReminderStatus;
  service: string;
  dueLabel?: string;
  dueAt?: string;
  summary?: string;
};

export type PromiseNextProbableVisit = {
  service: string;
  reason: string;
  timingLabel?: string;
  estimatedAmount?: number;
};

export type PromiseProofAssetKind = "photo" | "testimonial" | "recap" | "review";

export type PromiseProofAsset = {
  kind: PromiseProofAssetKind;
  label: string;
  url?: string;
  note?: string;
};

export type PromiseProofCapture = {
  bookingReason?: string;
  promiseThatMatteredMost?: string;
  customerReliefQuote?: string;
  proofNotes?: string;
  assets: PromiseProofAsset[];
};

export type PromiseCloseout = {
  completedAt?: string;
  workPerformedSummary?: string;
  customerConditionSummary?: string;
  now: PromiseRecapItem[];
  soon: PromiseRecapItem[];
  monitor: PromiseRecapItem[];
  reviewRequest?: PromiseReviewRequest;
  maintenanceReminder?: PromiseMaintenanceReminderSeed;
  nextProbableVisit?: PromiseNextProbableVisit;
  proofCapture?: PromiseProofCapture;
};

export type CloseoutRecaptureSnapshot = {
  completedPromises: number;
  closeoutCompleted: number;
  reviewReady: number;
  reviewSent: number;
  reviewCompleted: number;
  reminderSeeded: number;
  reminderScheduled: number;
  nextProbableVisitCaptured: number;
  nowItems: number;
  soonItems: number;
  monitorItems: number;
  deferredValueOpen: number;
};

export type FollowThroughResolutionAction =
  | "scheduled-next-step"
  | "recap-sent"
  | "parked"
  | "resolved-other";

export type PromiseFollowThroughResolution = {
  resolvedAt: string;
  resolvedBy: RecordOwner;
  action: FollowThroughResolutionAction;
  reason?: FollowThroughReason;
  summary?: string;
};

export type PromiseCustomerAccess = {
  token: string;
  sharePath: string;
};

export type PromiseCustomerApproval = {
  status: CustomerApprovalStatus;
  requestedAt?: string;
  respondedAt?: string;
  requestedService?: string;
  requestedAmount?: number;
  summary?: string;
  customerMessage?: string;
};

export type InboundRecord = {
  id: string;
  createdAt: string;
  source: IntakeSource;
  customer: CustomerContact;
  vehicle: VehicleSummary;
  location: LocationSummary;
  requestedService: string;
  normalizedService?: string;
  serviceLane?: string;
  marketingOffer?: string;
  marketingRole?: MarketingRole;
  dispatchTier?: DispatchTier;
  followOnPath?: string[];
  promiseFit?: PromiseFit;
  serviceClass?: ServiceClass;
  acceptancePolicy?: AcceptancePolicy;
  pricingGuardrails?: string[];
  symptomSummary: string;
  owner: RecordOwner;
  readinessRisk: ReadinessRisk;
  qualificationStatus: "new" | "screening" | "promoted";
  preferredWindow: TimeWindow;
  nextAction: string;
  notes: string[];
};

export type PromiseRecord = {
  id: string;
  inboundId?: string;
  createdAt: string;
  updatedAt: string;
  customer: CustomerContact;
  vehicle: VehicleSummary;
  location: LocationSummary;
  serviceScope: string;
  owner: RecordOwner;
  readinessRisk: ReadinessRisk;
  status: PromiseStatus;
  scheduledWindow: TimeWindow;
  readinessSummary: string;
  nextAction: string;
  topRisks: string[];
  notes: string[];
  customerCertainty: PromiseCustomerCertainty;
  dayReadiness: PromiseDayReadiness;
  customerAccess: PromiseCustomerAccess;
  customerApproval: PromiseCustomerApproval;
  economics?: PromiseEconomicsSnapshot;
  commercialOutcome?: PromiseCommercialOutcome;
  closeout?: PromiseCloseout;
  followThroughDueAt?: string;
  followThroughResolution?: PromiseFollowThroughResolution;
  followThroughHistory?: PromiseFollowThroughResolution[];
};

export type PromiseBoardMetrics = {
  newInbound: number;
  promisesWaiting: number;
  tomorrowAtRisk: number;
  followThroughDue: number;
};

export type PromiseEconomicsRollup = {
  trackedPromises: number;
  totalRevenue: number;
  totalNetProfitEstimate: number;
  averageNetProfitPerClockHour?: number;
};

export type FollowThroughReason =
  | "approved-next-step"
  | "deferred-work"
  | "diagnostic-recap"
  | "review-request"
  | "maintenance-reminder"
  | "open-follow-through";

export type FollowThroughUrgency = "overdue" | "due-now" | "queued";

export type FollowThroughTask = {
  promiseId: string;
  inboundId?: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string;
  owner: RecordOwner;
  territory: string;
  marketingOffer?: string;
  serviceScope: string;
  scheduledWindowLabel: string;
  dueAt?: string;
  reason: FollowThroughReason;
  urgency: FollowThroughUrgency;
  recommendedAction: string;
  outcomeStatus?: CommercialOutcomeStatus;
  convertedService?: string;
  deferredValueAmount?: number;
  netProfitEstimateAmount?: number;
  summary: string;
};

export type FollowThroughSummary = {
  total: number;
  overdue: number;
  dueNow: number;
  queued: number;
  approvedNextStep: number;
  deferredWork: number;
  diagnosticRecap: number;
  reviewRequest: number;
  maintenanceReminder: number;
  openFollowThrough: number;
  deferredValueTotal: number;
};

export type MarketingOfferPerformance = {
  marketingOffer: string;
  marketingRole: MarketingRole | "unknown";
  dispatchTier: DispatchTier | "unknown";
  inboundCount: number;
  promotedCount: number;
  promotionRate: number;
  promisesWithEconomics: number;
  resolvedPromises: number;
  convertedWorkCount: number;
  deferredWorkCount: number;
  declinedCount: number;
  revenueInView: number;
  netProfitInView: number;
  deferredValueTotal: number;
  averageNetProfitPerPromise?: number;
  followOnPath: string[];
};

export type WrenchReadyOwner = Exclude<RecordOwner, "Unassigned">;

export type OwnerExecutionMetrics = {
  inboundOwned: number;
  promisesWaiting: number;
  tomorrowAtRisk: number;
  followThroughOpen: number;
  completedTrackedPromises: number;
  revenueInView: number;
  netProfitInView: number;
  deferredValueOpen: number;
};

export type OwnerDailyPriority = {
  title: string;
  detail: string;
  href: string;
  tone: "risk" | "follow-through" | "inbound" | "execution" | "signal";
};

export type OwnerExecutionSnapshot = {
  owner: WrenchReadyOwner;
  generatedAt: string;
  metrics: OwnerExecutionMetrics;
  focusMessage: string;
  dailyPriorities: OwnerDailyPriority[];
  inbound: InboundRecord[];
  promisesWaiting: PromiseRecord[];
  tomorrowAtRisk: PromiseRecord[];
  followThrough: FollowThroughTask[];
  completedPromises: PromiseRecord[];
};

export type TomorrowReadinessItem = {
  promiseId: string;
  customerName: string;
  owner: RecordOwner;
  serviceScope: string;
  territory: string;
  scheduledWindowLabel: string;
  readinessScore: number;
  blockers: string[];
  nextAction: string;
  customerCertainty: PromiseCustomerCertainty;
  dayReadiness: PromiseDayReadiness;
  netProfitEstimateAmount?: number;
};

export type TomorrowReadinessSnapshot = {
  generatedAt: string;
  total: number;
  readyNow: number;
  needsAttention: number;
  averageReadinessScore: number;
  promises: TomorrowReadinessItem[];
};

export type PromiseOutboundDraftStatus = "not-ready" | "draft" | "send-ready";

export type PromiseOutboundDraft = {
  status: PromiseOutboundDraftStatus;
  channel: "email" | "text";
  headline: string;
  subject?: string;
  body: string;
  reason: string;
};

export type PromiseOutboundSnapshot = {
  reviewAsk: PromiseOutboundDraft;
  reminderSeed: PromiseOutboundDraft;
  closeoutRecap: PromiseOutboundDraft;
  proofSummary: string[];
};
