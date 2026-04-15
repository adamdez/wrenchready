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

export type PromiseJobStage =
  | "triage-needed"
  | "quoted"
  | "scheduled"
  | "confirmed"
  | "en-route"
  | "on-site"
  | "waiting-approval"
  | "completed"
  | "collected"
  | "warranty-issue";

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

export type PromiseCustomerRecapStatus = "not-ready" | "ready" | "sent";

export type PromiseCustomerRecap = {
  status: PromiseCustomerRecapStatus;
  channel?: "email" | "text";
  sentAt?: string;
  summary?: string;
};

export type PromiseProofAssetKind = "photo" | "testimonial" | "recap" | "review";
export type PromiseProofPermissionStatus =
  | "unknown"
  | "internal-only"
  | "customer-approved";

export type PromiseProofAsset = {
  kind: PromiseProofAssetKind;
  label: string;
  url?: string;
  note?: string;
  permissionStatus?: PromiseProofPermissionStatus;
};

export type PromiseProofCapture = {
  bookingReason?: string;
  promiseThatMatteredMost?: string;
  customerReliefQuote?: string;
  proofNotes?: string;
  assets: PromiseProofAsset[];
};

export type PromiseFieldExecutionPacket = {
  serviceGoal?: string;
  partsChecklist: string[];
  photosRequired: string[];
  inspectionChecklist: string[];
  handoffChecklist: string[];
  comebackPreventionSteps: string[];
  notesTemplate?: string;
  upsellFocus: string[];
  closeoutSteps: string[];
};

export type PromisePaymentMethod =
  | "not-set"
  | "card"
  | "apple-pay"
  | "google-pay"
  | "cash-app-pay"
  | "paypal"
  | "venmo"
  | "link"
  | "invoice"
  | "cash"
  | "bnpl"
  | "other";

export type PromisePaymentCollectionStatus =
  | "not-requested"
  | "deposit-requested"
  | "awaiting-payment"
  | "partial"
  | "paid"
  | "written-off";

export type PromisePaymentCollection = {
  status: PromisePaymentCollectionStatus;
  method?: PromisePaymentMethod;
  processor?: "stripe" | "paypal" | "manual";
  depositRequestedAmount?: number;
  depositRequestedAt?: string;
  depositSessionId?: string;
  depositCheckoutUrl?: string;
  depositPaidAt?: string;
  balanceRequestedAt?: string;
  balanceSessionId?: string;
  balanceCheckoutUrl?: string;
  balancePaidAt?: string;
  lastPaymentReference?: string;
  amountCollected?: number;
  balanceDueAmount?: number;
  collectedAt?: string;
  invoiceReference?: string;
  writeOffReason?: string;
  paymentSummary?: string;
};

export type PromiseWarrantyCaseStatus = "none" | "monitoring" | "open" | "resolved";
export type PromiseWarrantySeverity = "watch" | "trust-risk" | "down-unit";
export type PromiseWarrantyRootCause =
  | "parts"
  | "installation"
  | "diagnosis"
  | "expectation-gap"
  | "unknown";

export type PromiseWarrantyCase = {
  status: PromiseWarrantyCaseStatus;
  severity?: PromiseWarrantySeverity;
  rootCause?: PromiseWarrantyRootCause;
  issueSummary?: string;
  callbackDueAt?: string;
  makeGoodPlan?: string;
  preventionStep?: string;
  resolutionSummary?: string;
};

export type PromiseRecurringAccountStatus =
  | "not-account"
  | "lead"
  | "pitched"
  | "trial-active"
  | "active"
  | "at-risk";

export type PromiseRecurringAccountActivityKind =
  | "identified"
  | "outreach"
  | "proposal"
  | "trial-started"
  | "trial-check-in"
  | "activated"
  | "risk-flagged"
  | "note";

export type PromiseRecurringAccountActivity = {
  recordedAt: string;
  actor: RecordOwner | "System";
  kind: PromiseRecurringAccountActivityKind;
  summary: string;
};

export type PromiseRecurringAccount = {
  status: PromiseRecurringAccountStatus;
  accountName?: string;
  primaryContactName?: string;
  primaryContactRole?: string;
  contactEmail?: string;
  contactPhone?: string;
  targetLane?: "fleet-pm" | "contractor-upkeep" | "property-manager" | "nonprofit" | "mixed";
  vehicleCount?: number;
  cadenceLabel?: string;
  billingTerms?: string;
  monthlyValueEstimate?: number;
  proposalSentAt?: string;
  proposalValueEstimate?: number;
  trialStartAt?: string;
  trialReviewDueAt?: string;
  activationTargetAt?: string;
  lastTouchedAt?: string;
  nextTouchDueAt?: string;
  nextStep?: string;
  summary?: string;
  decisionMakerConfirmed?: boolean;
  pricingShared?: boolean;
  serviceMixDefined?: boolean;
  clusterWindowDefined?: boolean;
  blockerSummary?: string;
  activityHistory?: PromiseRecurringAccountActivity[];
};

export type PromiseCloseout = {
  completedAt?: string;
  workPerformedSummary?: string;
  customerConditionSummary?: string;
  now: PromiseRecapItem[];
  soon: PromiseRecapItem[];
  monitor: PromiseRecapItem[];
  customerRecap?: PromiseCustomerRecap;
  reviewRequest?: PromiseReviewRequest;
  maintenanceReminder?: PromiseMaintenanceReminderSeed;
  nextProbableVisit?: PromiseNextProbableVisit;
  proofCapture?: PromiseProofCapture;
};

export type CloseoutRecaptureSnapshot = {
  completedPromises: number;
  closeoutCompleted: number;
  closeoutMissing: number;
  closeoutQualityRate: number;
  recapReady: number;
  recapSent: number;
  reviewReady: number;
  reviewSent: number;
  reviewCompleted: number;
  reminderSeeded: number;
  reminderScheduled: number;
  nextProbableVisitCaptured: number;
  proofCaptured: number;
  proofPermissionReady: number;
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
  jobStage: PromiseJobStage;
  customerCertainty: PromiseCustomerCertainty;
  dayReadiness: PromiseDayReadiness;
  fieldExecution?: PromiseFieldExecutionPacket;
  paymentCollection?: PromisePaymentCollection;
  warrantyCase?: PromiseWarrantyCase;
  recurringAccount?: PromiseRecurringAccount;
  customerAccess: PromiseCustomerAccess;
  customerApproval: PromiseCustomerApproval;
  economics?: PromiseEconomicsSnapshot;
  commercialOutcome?: PromiseCommercialOutcome;
  closeout?: PromiseCloseout;
  outboundHistory?: PromiseOutboundEvent[];
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

export type FieldExecutionTask = {
  promiseId: string;
  customerName: string;
  owner: RecordOwner;
  territory: string;
  serviceScope: string;
  scheduledWindowLabel: string;
  jobStage: PromiseJobStage;
  fieldExecution?: PromiseFieldExecutionPacket;
  completionScore: number;
  missingPartsChecklist: boolean;
  missingPhotosChecklist: boolean;
  missingInspectionChecklist: boolean;
  missingHandoffChecklist: boolean;
  missingComebackPrevention: boolean;
  closeoutNotReady: boolean;
  taskPriority: "high" | "medium" | "low";
  nextStep: string;
};

export type FieldExecutionSnapshot = {
  generatedAt: string;
  total: number;
  needsPacket: number;
  packetReady: number;
  confirmedToday: number;
  onSiteNow: number;
  comebackPreventionWeak: number;
  closeoutAtRisk: number;
  tasks: FieldExecutionTask[];
};

export type CollectionTask = {
  promiseId: string;
  customerName: string;
  owner: RecordOwner;
  territory: string;
  serviceScope: string;
  status: PromisePaymentCollectionStatus;
  method?: PromisePaymentMethod;
  amountCollected?: number;
  balanceDueAmount?: number;
  depositRequestedAmount?: number;
  invoiceReference?: string;
  writeOffReason?: string;
  balanceCheckoutReady: boolean;
  collectionPriority: "high" | "medium" | "low";
  nextStep: string;
};

export type CollectionSnapshot = {
  generatedAt: string;
  totalOpen: number;
  awaitingPayment: number;
  partial: number;
  paid: number;
  writtenOff: number;
  totalBalanceOpen: number;
  readyForBalanceCheckout: number;
  tasks: CollectionTask[];
};

export type WarrantyTask = {
  promiseId: string;
  customerName: string;
  owner: RecordOwner;
  territory: string;
  serviceScope: string;
  status: PromiseWarrantyCaseStatus;
  severity?: PromiseWarrantySeverity;
  rootCause?: PromiseWarrantyRootCause;
  issueSummary?: string;
  callbackDueAt?: string;
  overdue: boolean;
  makeGoodPlanMissing: boolean;
  preventionMissing: boolean;
  warrantyCase?: PromiseWarrantyCase;
  nextStep: string;
};

export type WarrantySnapshot = {
  generatedAt: string;
  open: number;
  monitoring: number;
  resolved: number;
  overdue: number;
  trustRisk: number;
  downUnit: number;
  preventionMissing: number;
  tasks: WarrantyTask[];
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

export type PromiseOutboundChannel = "review-ask" | "maintenance-reminder" | "closeout-recap";
export type OutboundTransportMode = "webhook" | "direct-email" | "held";

export type OutboundTransportPolicy = {
  mode: OutboundTransportMode;
  enabled: boolean;
  reason: string;
  destinationLabel: string;
  nextStep: string;
};

export type PromiseOutboundEventStatus =
  | "delivered"
  | "responded"
  | "converted"
  | "failed";

export type PromiseOutboundConversionType =
  | "review-left"
  | "next-visit-requested"
  | "scheduled-next-visit"
  | "other";

export type PromiseOutboundEvent = {
  id: string;
  recordedAt: string;
  channelType: PromiseOutboundChannel;
  status: PromiseOutboundEventStatus;
  channel: "email" | "text";
  headline: string;
  summary?: string;
  actor: RecordOwner | "System";
  conversionType?: PromiseOutboundConversionType;
};

export type OutboundQueueItem = {
  promiseId: string;
  customerName: string;
  owner: RecordOwner;
  territory: string;
  serviceScope: string;
  channelType: PromiseOutboundChannel;
  status: PromiseOutboundDraftStatus;
  preferredChannel: "email" | "text";
  headline: string;
  subject?: string;
  body: string;
  reason: string;
  dueAt?: string;
  reviewStatus?: ReviewRequestStatus;
  reminderStatus?: MaintenanceReminderStatus;
  recapStatus?: PromiseCustomerRecapStatus;
  transport: OutboundTransportPolicy;
};

export type OutboundQueueSnapshot = {
  generatedAt: string;
  summary: {
    total: number;
    sendReady: number;
    draftOnly: number;
    held: number;
    recapReady: number;
    reviewReady: number;
    reminderReady: number;
    deliveredToday: number;
    responded: number;
    converted: number;
    failed: number;
  };
  items: OutboundQueueItem[];
  recentActivity: Array<
    PromiseOutboundEvent & {
      promiseId: string;
      customerName: string;
      serviceScope: string;
      owner: RecordOwner;
    }
  >;
};

export type WeeklyRecaptureScorecard = {
  generatedAt: string;
  windowLabel: string;
  metrics: {
    completedVisits: number;
    closeoutsDone: number;
    closeoutRate: number;
    closeoutQualityRate: number;
    proofReady: number;
    proofPermissionReady: number;
    reviewReady: number;
    reviewCompleted: number;
    recapsSent: number;
    recapResponses: number;
    reminderSeeded: number;
    reminderConversions: number;
    nextVisitCaptured: number;
    nextVisitConversions: number;
    netProfitInView: number;
    depositsRequested: number;
    depositsCollected: number;
    collectionRate: number;
    balanceOpen: number;
    callbackOpen: number;
    callbackResolved: number;
    callbackRate: number;
    recurringLeads: number;
    recurringTrialActive: number;
    recurringActive: number;
    recurringAtRisk: number;
  };
  priorities: Array<{
    title: string;
    detail: string;
    tone: "focus" | "risk" | "growth" | "trust";
  }>;
  weakCloseouts: Array<{
    promiseId: string;
    customerName: string;
    owner: RecordOwner;
    serviceScope: string;
    closeoutQualityScore: number;
    blockers: string[];
    closeout?: PromiseCloseout;
  }>;
};

export type ProofDisciplineTask = {
  promiseId: string;
  customerName: string;
  owner: RecordOwner;
  serviceScope: string;
  territory: string;
  proofScore: number;
  needsPermission: boolean;
  approvedAssets: number;
  blockers: string[];
  nextStep: string;
};

export type ProofDisciplineSnapshot = {
  generatedAt: string;
  summary: {
    completedVisits: number;
    proofReady: number;
    proofWeak: number;
    permissionSafeAssets: number;
  };
  tasks: ProofDisciplineTask[];
};

export type RecurringAccountStarterCandidate = {
  sourceType: "inbound" | "promise";
  sourceId: string;
  customerName: string;
  owner: RecordOwner;
  lane: string;
  territory: string;
  whyThisFits: string;
  nextStep: string;
};

export type RecurringAccountStarterSnapshot = {
  generatedAt: string;
  summary: {
    tracked: number;
    leads: number;
    pitched: number;
    dueNow: number;
    overdue: number;
    trialActive: number;
    active: number;
    atRisk: number;
    readyToPitch: number;
    readyToActivate: number;
    proposalDue: number;
    trialReviewDue: number;
    totalVehicles: number;
    totalMonthlyValueEstimate: number;
    activeMonthlyValueEstimate: number;
    touchDisciplineRate: number;
    trialConversionRate: number;
    proposalValueInFlight: number;
    activationValueInFlight: number;
  };
  starterOffer: {
    title: string;
    summary: string;
    bestTargets: string[];
    promise: string[];
  };
  outreachScripts: {
    opener: string;
    followUp: string;
    landingPageHeadline: string;
  };
  candidates: RecurringAccountStarterCandidate[];
  weeklyPlan: {
    headline: string;
    focusAreas: string[];
    targets: string[];
  };
  conversionBoard: Array<{
    stage:
      | "needs-proposal"
      | "proposal-sent"
      | "trial-live"
      | "activation-due"
      | "active-protection";
    label: string;
    count: number;
    estimatedMonthlyValue: number;
    detail: string;
  }>;
  ownerTargets: Array<{
    owner: RecordOwner;
    tracked: number;
    overdue: number;
    proposalDue: number;
    activationDue: number;
    active: number;
    estimatedMonthlyValue: number;
    weeklyTarget: string;
  }>;
  worklist: Array<{
    promiseId: string;
    customerName: string;
    owner: RecordOwner;
    territory: string;
    status: PromiseRecurringAccountStatus;
    overdue: boolean;
    daysUntilTouch?: number;
    healthScore: number;
    pressure: "overdue" | "due-now" | "watch" | "healthy";
    readinessBlockers: string[];
    recommendedAction: string;
    lastActivity?: PromiseRecurringAccountActivity;
    nextMilestone?: string;
    proposalStage: "not-sent" | "sent" | "review-due" | "trial-live" | "activation-target";
    recurringAccount: PromiseRecurringAccount;
  }>;
};

export type WedgeFocusAction =
  | "Lead harder"
  | "Protect the promise"
  | "Tighten follow-through"
  | "Keep testing";

export type WedgeFocusItem = {
  id:
    | "battery-no-start"
    | "brake-service"
    | "paid-diagnostic"
    | "inspection"
    | "maintenance";
  title: string;
  marketingOffer: string;
  lane: string;
  homepagePriority: "primary" | "supporting";
  inboundCount: number;
  promotedCount: number;
  promotionRate: number;
  convertedWorkCount: number;
  netProfitInView: number;
  deferredValueTotal: number;
  action: WedgeFocusAction;
  actionDetail: string;
  weeklyFocus: string;
};

export type WedgeFocusSnapshot = {
  generatedAt: string;
  headline: string;
  whyNow: string;
  focusAreas: string[];
  wedges: WedgeFocusItem[];
};

export type OperatingCadenceAction = {
  title: string;
  detail: string;
  owner: RecordOwner | "Ops";
  href: string;
  tone: "promise" | "trust" | "growth" | "system";
};

export type WeeklyOperatingCadenceSnapshot = {
  generatedAt: string;
  companyGoal: string;
  buildGoal: string;
  why: string;
  standard: string[];
  metrics: {
    closeoutRate: number;
    closeoutQualityRate: number;
    outboundSendReady: number;
    balancesOpen: number;
    callbackOpen: number;
    proofWeak: number;
    recurringCandidates: number;
    recurringOverdue: number;
    proposalDue: number;
    trialReviewDue: number;
  };
  weeklyRitual: Array<{
    label: string;
    owner: string;
    detail: string;
    href: string;
  }>;
  recurring: {
    headline: string;
    tracked: number;
    active: number;
    trialActive: number;
    activeMonthlyValueEstimate: number;
    touchDisciplineRate: number;
    trialConversionRate: number;
    readyToPitch: number;
    readyToActivate: number;
    proposalValueInFlight: number;
    activationValueInFlight: number;
    focusAreas: string[];
  };
  ownerScorecard: Array<{
    owner: RecordOwner;
    tracked: number;
    overdue: number;
    proposalDue: number;
    activationDue: number;
    active: number;
    estimatedMonthlyValue: number;
    weeklyTarget: string;
  }>;
  managementCommitments: Array<{
    title: string;
    owner: RecordOwner | "Ops";
    detail: string;
    href: string;
  }>;
  wedgeFocus: {
    headline: string;
    primaryWedge?: string;
    promotedCount: number;
    netProfitInView: number;
    focusAreas: string[];
  };
  immediateActions: OperatingCadenceAction[];
};

export type SystemNeedStatus = "ready" | "configure-now" | "buy-or-provision" | "held";
export type SystemNeedPriority = "now" | "soon" | "later";

export type SystemReadinessItem = {
  name: string;
  status: SystemNeedStatus;
  priority: SystemNeedPriority;
  summary: string;
  whyItMatters: string;
  nextStep: string;
  accessNeed: "none" | "config" | "purchase";
};

export type SystemsReadinessSnapshot = {
  generatedAt: string;
  companyGoal: string;
  buildGoal: string;
  systems: SystemReadinessItem[];
  needsNow: SystemReadinessItem[];
  needsSoon: SystemReadinessItem[];
};
