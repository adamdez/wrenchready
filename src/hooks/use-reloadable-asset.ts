"use client";

import { useCallback, useRef, useState } from "react";

type Options = {
  /** Cache-bust retries before optional fallback (default 2). */
  maxRetries?: number;
  /** Final src if all retries fail (e.g. stock hero still). */
  fallbackSrc?: string;
  /** Called when retries and optional fallback are exhausted. */
  onExhausted?: () => void;
};

/**
 * Returns a src string and onError handler that retries the same asset with a
 * cache-busting query, then optionally switches to a fallback URL once.
 */
export function useReloadableAsset(initialSrc: string, options?: Options) {
  const { maxRetries = 2, fallbackSrc, onExhausted } = options ?? {};
  const [src, setSrc] = useState(initialSrc);
  const retries = useRef(0);
  const usedFallback = useRef(false);

  const onError = useCallback(() => {
    const base = initialSrc.split("?")[0];
    if (retries.current < maxRetries) {
      retries.current += 1;
      setSrc(`${base}?reload=${retries.current}&t=${Date.now()}`);
      return;
    }
    if (fallbackSrc && !usedFallback.current) {
      usedFallback.current = true;
      setSrc(fallbackSrc);
      return;
    }
    onExhausted?.();
  }, [initialSrc, maxRetries, fallbackSrc, onExhausted]);

  return { src, onError };
}
