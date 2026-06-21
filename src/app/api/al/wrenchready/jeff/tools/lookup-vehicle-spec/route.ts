import { createJeffToolRoute } from "@/lib/jeff-field-assistant/route-handler";
import { lookupVehicleSpec } from "@/lib/jeff-field-assistant";

export const dynamic = "force-dynamic";

export const POST = createJeffToolRoute(lookupVehicleSpec);
