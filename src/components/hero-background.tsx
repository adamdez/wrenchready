"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  HERO_POSTER_SRC,
  HERO_VIDEO_MP4_SRC,
} from "@/data/hero-media";

/**
 * Full-bleed hero media: poster always (LCP), optional looping MP4 on md+ when
 * motion is allowed. Mobile and prefers-reduced-motion use poster only.
 */
export function HeroBackground() {
  const [videoOk, setVideoOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    function sync() {
      setVideoOk(mq.matches && !reduced.matches);
    }

    sync();
    mq.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-20">
      <Image
        src={HERO_POSTER_SRC}
        alt=""
        fill
        className="object-cover"
        priority
        sizes="100vw"
        aria-hidden
      />

      {videoOk ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_POSTER_SRC}
          aria-hidden
          onError={() => setVideoOk(false)}
        >
          <source src={HERO_VIDEO_MP4_SRC} type="video/mp4" />
        </video>
      ) : null}

      {/* Minimum 55% effective darkening for stock hero; gradient keeps text readable */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-black/25" />
    </div>
  );
}
