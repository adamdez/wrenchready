import Image from "next/image";
import { cn } from "@/lib/utils";
import { brandLogos, useTransparentLogoImage } from "@/data/media-production";

type BrandWordmarkProps = {
  variant?: "hero" | "footer" | "nav";
  className?: string;
};

export function BrandWordmark({ variant = "hero", className }: BrandWordmarkProps) {
  const isHero = variant === "hero";

  if (useTransparentLogoImage) {
    return (
      <div className={cn("flex flex-col", className)}>
        <Image
          src={brandLogos.transparentFull}
          alt="Wrench Ready Mobile"
          width={240}
          height={80}
          className={cn(
            "h-auto object-contain object-left",
            variant === "footer" ? "h-10 w-auto max-w-[200px]" : "w-[min(220px,72vw)]"
          )}
          priority={isHero}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span
        className={cn(
          "font-[family-name:var(--font-display)] font-semibold tracking-tight",
          isHero ? "text-3xl text-white sm:text-4xl" : "text-2xl text-foreground sm:text-3xl"
        )}
      >
        Wrench Ready{" "}
        <span className={isHero ? "text-[--wr-teal]" : "text-primary"}>Mobile</span>
      </span>
      <span
        className={cn(
          "text-[0.65rem] font-semibold uppercase tracking-[0.35em]",
          isHero ? "text-white/55" : "text-muted-foreground"
        )}
      >
        Spokane County
      </span>
    </div>
  );
}
