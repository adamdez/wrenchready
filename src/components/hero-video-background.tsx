"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { heroMedia } from "@/data/media-production";

type HeroVideoBackgroundProps = {
  /** Alt for the poster image (SEO + a11y). */
  posterAlt: string;
  /** Overlay darkness — keep at least 55% black when poster shows competitor branding (CLAUDE.md). */
  overlayClassName?: string;
};

/**
 * Desktop-only ambient hero video: loads only when motion is OK, viewport is wide enough,
 * and the hero is on-screen. Mobile and `prefers-reduced-motion` get poster only (no extra bytes).
 */
export function HeroVideoBackground({
  posterAlt,
  overlayClassName = "bg-black/60",
}: HeroVideoBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mountVideo, setMountVideo] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqCoarse = window.matchMedia("(max-width: 768px)");

    function evaluate() {
      const conn =
        typeof navigator !== "undefined" && "connection" in navigator
          ? (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
          : undefined;
      const saveData = Boolean(conn?.saveData);
      const allow = !mqReduce.matches && !mqCoarse.matches && !saveData;
      setMountVideo(allow);
    }

    evaluate();
    mqReduce.addEventListener("change", evaluate);
    mqCoarse.addEventListener("change", evaluate);
    return () => {
      mqReduce.removeEventListener("change", evaluate);
      mqCoarse.removeEventListener("change", evaluate);
    };
  }, []);

  useEffect(() => {
    if (!mountVideo || !containerRef.current) return;

    const el = containerRef.current;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting && entry.intersectionRatio > 0.1);
      },
      { rootMargin: "80px 0px", threshold: [0, 0.1, 0.25] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mountVideo]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !inView) return;
    v.play().catch(() => {
      /* Autoplay blocked — poster remains visible; no retry loop */
    });
  }, [inView]);

  return (
    <div ref={containerRef} className="absolute inset-0 -z-20">
      <Image
        src={heroMedia.posterSrc}
        alt={posterAlt}
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />

      {mountVideo && inView && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          loop
          preload="none"
          poster={heroMedia.posterSrc}
          aria-hidden
        >
          <source src={heroMedia.videoWebm} type="video/webm" />
          <source src={heroMedia.videoMp4} type="video/mp4" />
        </video>
      )}

      <div className={`absolute inset-0 ${overlayClassName}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
    </div>
  );
}
