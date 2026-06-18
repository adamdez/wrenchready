import { createJeffToolRoute } from "@/lib/jeff-field-assistant/route-handler";
import { findNearbyPartsStoresForSimon } from "@/lib/jeff-field-assistant";

export const dynamic = "force-dynamic";
export const POST = createJeffToolRoute(findNearbyPartsStoresForSimon);
