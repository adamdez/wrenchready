import { createJeffToolRoute } from "@/lib/jeff-field-assistant/route-handler";
import { recordFieldPhotoUpload } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

export const POST = createJeffToolRoute(recordFieldPhotoUpload);
