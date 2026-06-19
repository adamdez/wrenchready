import { createJeffToolRoute } from "@/lib/jeff-field-assistant/route-handler";
import { checkStripePaymentStatus } from "@/lib/jeff-field-assistant";

export const dynamic = "force-dynamic";
export const POST = createJeffToolRoute(checkStripePaymentStatus);
