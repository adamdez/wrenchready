import type { PromiseRecord } from "@/lib/promise-crm/types";

export function isQuoteScheduleReview(record: PromiseRecord) {
  const customerNotApproved = record.customerApproval.status !== "approved";
  const notSentToCustomer = record.quotePacket?.customerSendStatus !== "sent";
  const noLivePaymentLink =
    !record.paymentCollection?.depositCheckoutUrl &&
    !record.paymentCollection?.balanceCheckoutUrl &&
    record.quotePacket?.paymentLinkStatus !== "ready";

  return (
    record.jobStage === "quoted" &&
    customerNotApproved &&
    notSentToCustomer &&
    noLivePaymentLink
  );
}

export function promiseBoardStatusLabel(record: PromiseRecord) {
  if (isQuoteScheduleReview(record)) return "Quote / schedule review";
  if (record.status === "tomorrow-at-risk") return "At risk";
  if (record.status === "follow-through-due") return "Follow-up due";
  if (record.status === "completed") return "Completed";
  return "Promised";
}
