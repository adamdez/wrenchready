import { createJeffToolRoute } from "@/lib/jeff-field-assistant/route-handler";
import { analyzeFieldPhoto } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

export const POST = createJeffToolRoute(analyzeFieldPhoto);
