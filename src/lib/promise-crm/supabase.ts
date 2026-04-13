import { readEnv } from "@/lib/env";

type SupabaseMethod = "GET" | "POST" | "PATCH";

function getSupabaseConfig() {
  const url = readEnv("SUPABASE_URL");
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY");

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function hasPromiseCrmSupabase() {
  return !!getSupabaseConfig();
}

export async function supabaseRestRequest<T>(
  path: string,
  init?: {
    method?: SupabaseMethod;
    body?: unknown;
    prefer?: string;
  },
): Promise<T> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase configuration is missing.");
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method: init?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Prefer: init?.prefer || "return=representation",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed for ${path}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
