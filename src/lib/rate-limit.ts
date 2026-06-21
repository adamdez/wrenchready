import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readEnv } from "@/lib/env";

type RateLimitResponseKind = "json" | "twiml";

type RateLimitPolicy = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
  subject?: string | null;
  responseKind?: RateLimitResponseKind;
};

type VolatileBucket = {
  count: number;
  resetAt: number;
};

const volatileBuckets = new Map<string, VolatileBucket>();
const MAX_VOLATILE_BUCKETS = 5000;

function clientIp(request: NextRequest | Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown-ip";
}

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function bucketKey(request: NextRequest | Request, policy: RateLimitPolicy) {
  const subject = policy.subject?.trim() || "anonymous";
  return `${policy.keyPrefix}:${hashKey(`${subject}:${clientIp(request)}`)}`;
}

function pruneVolatileBuckets(now: number) {
  if (volatileBuckets.size < MAX_VOLATILE_BUCKETS) return;

  for (const [key, bucket] of volatileBuckets.entries()) {
    if (bucket.resetAt <= now) {
      volatileBuckets.delete(key);
    }
  }
}

function responseHeaders(remaining: number, resetAt: number, store: string) {
  return {
    "Retry-After": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": new Date(resetAt).toISOString(),
    "X-WrenchReady-RateLimit-Store": store,
  };
}

function rateLimitedResponse(policy: RateLimitPolicy, headers: Record<string, string>) {
  if (policy.responseKind === "twiml") {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>WrenchReady is receiving too many requests. Try again shortly.</Message>
</Response>`,
      {
        status: 429,
        headers: {
          ...headers,
          "Content-Type": "text/xml; charset=utf-8",
        },
      },
    );
  }

  return NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    { status: 429, headers },
  );
}

async function durableLimit(
  key: string,
  policy: RateLimitPolicy,
): Promise<{ count: number; resetAt: number; store: string } | null> {
  const store = readEnv("WR_RATE_LIMIT_STORE");
  const url = readEnv("UPSTASH_REDIS_REST_URL");
  const token = readEnv("UPSTASH_REDIS_REST_TOKEN");

  if (store !== "upstash" || !url || !token) {
    return null;
  }

  const resetAt = Date.now() + policy.windowMs;
  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, String(policy.windowMs)],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Rate limit store failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as Array<{ result?: unknown }>;
  const count = Number(data[0]?.result || 0);

  return { count, resetAt, store: "upstash" };
}

function volatileLimit(key: string, policy: RateLimitPolicy) {
  const now = Date.now();
  pruneVolatileBuckets(now);

  const existing = volatileBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + policy.windowMs };

  bucket.count += 1;
  volatileBuckets.set(key, bucket);

  return {
    count: bucket.count,
    resetAt: bucket.resetAt,
    store: process.env.NODE_ENV === "production" ? "volatile-production-fallback" : "volatile-dev",
  };
}

export function getRateLimitRuntimeStatus() {
  const store = readEnv("WR_RATE_LIMIT_STORE");
  const upstashReady =
    store === "upstash" &&
    Boolean(readEnv("UPSTASH_REDIS_REST_URL")) &&
    Boolean(readEnv("UPSTASH_REDIS_REST_TOKEN"));

  return {
    durableConfigured: upstashReady,
    activeStore: upstashReady ? "upstash" : "volatile",
    productionDurableBlocked: process.env.NODE_ENV === "production" && !upstashReady,
    requiredEnv: [
      "WR_RATE_LIMIT_STORE=upstash",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ],
  };
}

export async function enforceRateLimit(
  request: NextRequest | Request,
  policy: RateLimitPolicy,
) {
  const key = bucketKey(request, policy);
  let result: { count: number; resetAt: number; store: string };

  try {
    result = (await durableLimit(key, policy)) ?? volatileLimit(key, policy);
  } catch (error) {
    console.error("[rate-limit] durable store unavailable", error);

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Public write protection is unavailable. Try again shortly." },
        { status: 503 },
      );
    }

    result = volatileLimit(key, policy);
  }

  const remaining = policy.limit - result.count;
  const headers = responseHeaders(remaining, result.resetAt, result.store);

  if (result.count > policy.limit) {
    return rateLimitedResponse(policy, headers);
  }

  return null;
}
