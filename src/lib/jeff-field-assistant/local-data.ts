import os from "node:os";
import path from "node:path";
import { readEnv } from "@/lib/env";

function isVercelRuntime() {
  return Boolean(readEnv("VERCEL"));
}

export function getJeffLocalDataRoot() {
  const configured = readEnv("JEFF_LOCAL_DATA_DIR");
  if (configured) return configured;

  if (isVercelRuntime()) {
    return path.join(os.tmpdir(), "wrenchready-jeff");
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "jeff");
}

export function getJeffLocalDataPath(...segments: string[]) {
  return path.join(getJeffLocalDataRoot(), ...segments);
}

export function getJeffLocalDataRootStatus() {
  return {
    kind: isVercelRuntime() ? "vercel-tmp" : "workspace-local",
    durableAcrossDeployments: !isVercelRuntime(),
  };
}
