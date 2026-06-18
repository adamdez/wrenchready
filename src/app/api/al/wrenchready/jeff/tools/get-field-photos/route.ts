import { createJeffToolRoute } from "@/lib/jeff-field-assistant/route-handler";
import { getFieldPhotos } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

export const POST = createJeffToolRoute(getFieldPhotos);
