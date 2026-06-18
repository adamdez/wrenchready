import { createJeffToolRoute } from "@/lib/jeff-field-assistant/route-handler";
import { getScheduleContext } from "@/lib/jeff-field-assistant";

export const dynamic = "force-dynamic";
export const POST = createJeffToolRoute(getScheduleContext);
