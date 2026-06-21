"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
};

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 30,
}: FadeInProps) {
  const reduceMotion = useReducedMotion();
  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, ...directionMap[direction] }}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={reduceMotion ? undefined : { duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
};

export function Stagger({ children, className, staggerDelay = 0.1 }: StaggerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, margin: "-60px" }}
      transition={reduceMotion ? undefined : { staggerChildren: staggerDelay }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={
        reduceMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
            }
      }
    >
      {children}
    </motion.div>
  );
}
