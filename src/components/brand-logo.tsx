import Image from "next/image";
import { BRAND_LOGO_MARK_SRC } from "@/data/hero-media";

type BrandLockupProps = {
  variant?: "header" | "hero" | "footer";
  className?: string;
  priority?: boolean;
};

/**
 * Transparent mark + type. No square matte background.
 * When /wr-wordmark.png ships, point a single Image here (see docs/brand-assets.md).
 */
export function BrandLockup({ variant = "header", className = "", priority = false }: BrandLockupProps) {
  const onDark = variant === "hero";

  const markClass =
    variant === "hero"
      ? "h-14 w-14 shrink-0 object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.45)] sm:h-[4.5rem] sm:w-[4.5rem]"
      : variant === "footer"
        ? "h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
        : "h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11";

  const subtitleClass = onDark ? "text-white/55" : "text-muted-foreground";

  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
      <Image
        src={BRAND_LOGO_MARK_SRC}
        alt="Wrench Ready Mobile"
        width={72}
        height={72}
        className={markClass}
        priority={priority}
      />
      <div className="flex min-w-0 flex-col">
        <span
          className={`font-semibold uppercase tracking-[0.2em] text-[--wr-teal] ${
            variant === "hero" ? "text-xs sm:text-sm" : "text-[0.65rem] sm:text-xs"
          }`}
        >
          Wrench Ready
        </span>
        <span
          className={`font-semibold tracking-tight ${
            onDark ? "text-xl text-white sm:text-2xl" : "text-base text-foreground sm:text-lg"
          }`}
        >
          Mobile
        </span>
        {variant === "hero" ? (
          <span className={`mt-1 max-w-[16rem] text-xs font-medium leading-snug sm:text-sm ${subtitleClass}`}>
            Simon on the tools. Honest work from your driveway.
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Icon-only mark for compact UI (favicon-scale). */
export function BrandMarkIcon({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={BRAND_LOGO_MARK_SRC}
      alt="Wrench Ready Mobile"
      width={44}
      height={44}
      className={`h-9 w-9 object-contain sm:h-10 sm:w-10 ${className}`}
      priority={priority}
    />
  );
}
