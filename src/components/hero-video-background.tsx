"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type HeroVideoBackgroundProps = {
  /** Single short looping background clip (H.264 MP4). */
  videoSrc: string;
  /** Poster / still frame while video loads and when motion is reduced. */
  posterSrc: string;
  /** Accessible description of the scene (for context; hero copy is primary). */
  decorativeDescription: string;
};

/**
 * Full-bleed hero background: one MP4, poster preload, prefers-reduced-motion,
 * and graceful fallback when autoplay fails or the source errors.
 */
export function HeroVideoBackground({
  videoSrc,
  posterSrc,
  decorativeDescription,
}: HeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduceMotion || videoFailed) return;
    const v = videoRef.current;
    if (!v) return;

    const tryPlay = () => {
      const p = v.play();
      if (p !== undefined) {
        p.then(() => setPlaying(true)).catch(() => setVideoFailed(true));
      }
    };

    if (v.readyState >= 2) tryPlay();
    else v.addEventListener("canplay", tryPlay, { once: true });

    return () => v.removeEventListener("canplay", tryPlay);
  }, [reduceMotion, videoFailed, videoSrc]);

  const showVideo = !reduceMotion && !videoFailed;

  return (
    <div className="absolute inset-0 -z-20">
      <span className="sr-only">{decorativeDescription}</span>

      <Image
        src={posterSrc}
        alt=""
        aria-hidden
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className={`object-cover transition-opacity duration-700 ${
          showVideo && playing ? "opacity-0" : "opacity-100"
        }`}
      />

      {showVideo && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
          poster={posterSrc}
          muted
          playsInline
          loop
          preload="metadata"
          aria-hidden
          onError={() => setVideoFailed(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Minimum ~58% dark overlay — keeps competing background branding obscured */}
      <div className="absolute inset-0 bg-black/[0.58]" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-r from-background via-background/55 to-background/15"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/25"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_75%_35%,oklch(0.52_0.14_165/14%),transparent_50%)]"
        aria-hidden
      />
    </div>
  );
}
