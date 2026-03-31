"use client";

import { motion } from "framer-motion";

type OrbConfig = {
  color: string;
  size: string;
  position: string;
  delay: number;
  duration: number;
};

const heroOrbs: OrbConfig[] = [
  {
    color: "oklch(0.62 0.19 255 / 15%)",
    size: "w-[600px] h-[600px]",
    position: "-top-40 -right-40",
    delay: 0,
    duration: 18,
  },
  {
    color: "oklch(0.72 0.14 195 / 10%)",
    size: "w-[500px] h-[500px]",
    position: "top-1/3 -left-60",
    delay: 2,
    duration: 22,
  },
  {
    color: "oklch(0.55 0.16 290 / 8%)",
    size: "w-[400px] h-[400px]",
    position: "bottom-0 right-1/4",
    delay: 4,
    duration: 25,
  },
  {
    color: "oklch(0.78 0.14 85 / 6%)",
    size: "w-[350px] h-[350px]",
    position: "-bottom-20 -left-20",
    delay: 6,
    duration: 20,
  },
];

function Orb({ color, size, position, delay, duration }: OrbConfig) {
  return (
    <motion.div
      className={`absolute ${size} ${position} rounded-full blur-[100px]`}
      style={{ background: color }}
      animate={{
        x: [0, 30, -20, 10, 0],
        y: [0, -25, 15, -10, 0],
        scale: [1, 1.08, 0.95, 1.03, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function HeroGradientBg() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {heroOrbs.map((orb, i) => (
        <Orb key={i} {...orb} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}

type SectionOrbsProps = {
  variant?: "blue" | "teal" | "gold" | "purple";
};

const sectionOrbConfigs: Record<string, OrbConfig[]> = {
  blue: [
    { color: "oklch(0.62 0.19 255 / 8%)", size: "w-[400px] h-[400px]", position: "-top-40 right-0", delay: 0, duration: 20 },
    { color: "oklch(0.72 0.14 195 / 5%)", size: "w-[300px] h-[300px]", position: "bottom-0 -left-20", delay: 3, duration: 24 },
  ],
  teal: [
    { color: "oklch(0.72 0.14 195 / 10%)", size: "w-[450px] h-[450px]", position: "-top-20 -left-40", delay: 0, duration: 22 },
    { color: "oklch(0.62 0.19 255 / 5%)", size: "w-[300px] h-[300px]", position: "bottom-20 right-0", delay: 4, duration: 18 },
  ],
  gold: [
    { color: "oklch(0.78 0.14 85 / 8%)", size: "w-[400px] h-[400px]", position: "top-0 right-1/4", delay: 0, duration: 20 },
    { color: "oklch(0.62 0.19 255 / 5%)", size: "w-[350px] h-[350px]", position: "-bottom-20 -left-20", delay: 2, duration: 25 },
  ],
  purple: [
    { color: "oklch(0.55 0.16 290 / 8%)", size: "w-[400px] h-[400px]", position: "-top-20 right-0", delay: 0, duration: 22 },
    { color: "oklch(0.62 0.19 255 / 6%)", size: "w-[300px] h-[300px]", position: "bottom-0 left-1/4", delay: 3, duration: 18 },
  ],
};

export function SectionOrbs({ variant = "blue" }: SectionOrbsProps) {
  const orbs = sectionOrbConfigs[variant];
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {orbs.map((orb, i) => (
        <Orb key={i} {...orb} />
      ))}
    </div>
  );
}
