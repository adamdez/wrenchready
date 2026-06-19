import { createJeffToolRoute } from "@/lib/jeff-field-assistant/route-handler";
import { getDiagnosticTreeForField } from "@/lib/jeff-field-assistant";

export const dynamic = "force-dynamic";
export const POST = createJeffToolRoute(getDiagnosticTreeForField);
