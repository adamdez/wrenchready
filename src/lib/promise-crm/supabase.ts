import { readEnv } from "@/lib/env";

type SupabaseMethod = "GET" | "POST" | "PATCH";
const SUPABASE_REST_TIMEOUT_MS = 10000;

export type PromiseCrmSupabaseCredentialKind = "service-role" | "secret" | "anon" | "none";

export type PromiseCrmSupabaseConnection = {
  configured: boolean;
  urlConfigured: boolean;
  credentialKind: PromiseCrmSupabaseCredentialKind;
  projectHost: string | null;
  writeCredentialReady: boolean;
};

function getSupabaseConfig() {
  const url = readEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const secretKey = readEnv("SUPABASE_SECRET_KEY");
  const anonKey = readEnv(
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  const key = serviceRoleKey || secretKey || anonKey;
  const credentialKind: PromiseCrmSupabaseCredentialKind = serviceRoleKey
    ? "service-role"
    : secretKey
      ? "secret"
      : anonKey
        ? "anon"
        : "none";

  if (!url || !key) {
    return null;
  }

  return { url, key, credentialKind };
}

export function hasPromiseCrmSupabase() {
  return !!getSupabaseConfig();
}

export function getPromiseCrmSupabaseConnection(): PromiseCrmSupabaseConnection {
  const url = readEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const config = getSupabaseConfig();
  let projectHost: string | null = null;

  if (url) {
    try {
      projectHost = new URL(url).host;
    } catch {
      projectHost = "invalid-url";
    }
  }

  return {
    configured: Boolean(config),
    urlConfigured: Boolean(url),
    credentialKind: config?.credentialKind ?? "none",
    projectHost,
    writeCredentialReady: config?.credentialKind === "service-role" || config?.credentialKind === "secret",
  };
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

  const method = init?.method || "GET";
  const isWrite = method === "POST" || method === "PATCH";
  if (isWrite && config.credentialKind !== "service-role" && config.credentialKind !== "secret") {
    throw new Error("Supabase Promise CRM writes require SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_REST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.url}/rest/v1/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Prefer: init?.prefer || "return=representation",
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Supabase request failed for ${path}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Supabase request timed out for ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
