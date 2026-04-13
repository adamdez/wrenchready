function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined;

  let normalized = value.trim().replace(/\\r\\n/g, "").trim();

  if (normalized.startsWith('"') && normalized.endsWith('"') && normalized.length >= 2) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

export function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}
