"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReloadableAsset } from "@/hooks/use-reloadable-asset";

type HeroVideoBackgroundProps = {
  /** Single short looping background clip (H.264 MP4). */
  videoSrc: string;
  /** Poster / still frame while video loads and when motion is reduced. */
  posterSrc: string;
  /** If the hero poster fails after retries, show this still (e.g. legacy stock). */
  posterFallbackSrc?: string;
  /** Accessible description of the scene (for context; hero copy is primary). */
  decorativeDescription: string;
};

function HeroVideoBackgroundInner({
  videoSrc,
  posterSrc,
  posterFallbackSrc = "/hero-main.png",
  decorativeDescription,
}: HeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [videoSrcState, setVideoSrcState] = useState(videoSrc);
  const videoRetries = useRef(0);

  const {
    src: posterSrcState,
    onError: onPosterError,
  } = useReloadableAsset(posterSrc, {
    maxRetries: 2,
    fallbackSrc: posterFallbackSrc,
  });

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
  }, [reduceMotion, videoFailed, videoSrcState]);

  const showVideo = !reduceMotion && !videoFailed;

  function onVideoError() {
    const base = videoSrc.split("?")[0];
    if (videoRetries.current < 2) {
      videoRetries.current += 1;
      setVideoSrcState(`${base}?reload=${videoRetries.current}&t=${Date.now()}`);
      return;
    }
    setVideoFailed(true);
  }

  return (
    <div className="absolute inset-0 -z-20">
      <span className="sr-only">{decorativeDescription}</span>

      <Image
        key={posterSrcState}
        src={posterSrcState}
        alt=""
        aria-hidden
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        onError={onPosterError}
        className={`object-cover transition-opacity duration-700 ${
          showVideo && playing ? "opacity-0" : "opacity-100"
        }`}
      />

      {showVideo && (
        <video
          key={videoSrcState}
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
          poster={posterSrcState}
          muted
          playsInline
          loop
          preload="metadata"
          aria-hidden
          onError={onVideoError}
        >
          <source src={videoSrcState} type="video/mp4" />
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

/**
 * Full-bleed hero background: one MP4, poster preload, prefers-reduced-motion,
 * and graceful fallback when autoplay fails or the source errors.
 */
export function HeroVideoBackground(props: HeroVideoBackgroundProps) {
  return (
    <HeroVideoBackgroundInner
      key={`${props.videoSrc}|${props.posterSrc}`}
      {...props}
    />
  );
}
