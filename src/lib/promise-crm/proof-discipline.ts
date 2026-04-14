import type {
  PromiseProofAsset,
  PromiseRecord,
  ProofDisciplineTask,
} from "@/lib/promise-crm/types";

function getApprovedAssets(assets: PromiseProofAsset[] = []) {
  return assets.filter((asset) => asset.permissionStatus === "customer-approved");
}

export function getProofDisciplineForPromise(
  promise: PromiseRecord,
): Omit<ProofDisciplineTask, "customerName" | "owner" | "serviceScope" | "territory"> {
  const proof = promise.closeout?.proofCapture;
  const blockers: string[] = [];
  let score = 0;

  if (proof?.bookingReason) score += 20;
  else blockers.push("Capture why the customer booked.");

  if (proof?.promiseThatMatteredMost) score += 20;
  else blockers.push("Capture which promise mattered most.");

  if (proof?.customerReliefQuote) score += 20;
  else blockers.push("Capture a customer relief quote or recap line.");

  if (proof?.proofNotes) score += 10;
  else blockers.push("Add one proof note worth keeping.");

  const assets = proof?.assets || [];
  if (assets.length > 0) score += 10;
  else blockers.push("Save at least one proof asset.");

  const approvedAssets = getApprovedAssets(assets).length;
  if (approvedAssets > 0) score += 20;
  else blockers.push("No customer-approved proof asset is marked safe yet.");

  const needsPermission =
    assets.length > 0 &&
    approvedAssets === 0 &&
    assets.some((asset) => asset.permissionStatus !== "customer-approved");

  return {
    promiseId: promise.id,
    proofScore: score,
    needsPermission,
    approvedAssets,
    blockers,
    nextStep:
      blockers[0] ||
      "Proof is strong enough to reuse in site, outreach, or review-support content.",
  };
}
